const Anthropic = require('@anthropic-ai/sdk');
const {
  buildCutsSystemPrompt,
  buildEditorialsSystemPrompt,
  buildChaptersSystemPrompt,
  buildCutsUserPrompt,
  buildEditorialsUserPrompt,
  buildChaptersUserPrompt,
} = require('./prompts');

const client = new Anthropic();

function parseJSON(text) {
  let cleaned = text.trim();

  // Remove markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Fallback: extract JSON object from text (Claude sometimes adds text before/after)
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (_) {}
    }
    console.error('JSON parse error. Raw (first 1000):', text.slice(0, 1000));
    throw new Error('Claude returned invalid JSON. Please try again.');
  }
}

/**
 * Call Claude with extended thinking + streaming to avoid timeout.
 * Uses proper system parameter for prompt caching.
 * Accepts per-pass thinking budget and max_tokens.
 */
async function callClaude(systemPrompt, userPrompt, { thinkingBudget = 10000, maxTokens = 16000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min max

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: maxTokens,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      thinking: {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      },
      messages: [{
        role: 'user',
        content: userPrompt,
      }],
    }, { signal: controller.signal });

    const message = await stream.finalMessage();
    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock) throw new Error('No text response from Claude');
    return parseJSON(textBlock.text);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Review pass — a senior editor reviews the full analysis and improves it.
 */
async function reviewPass(cuts, editorials, chapters, transcript) {
  const reviewPrompt = `You are a SENIOR podcast producer reviewing a junior editor's post-production analysis. Your job is to improve it.

You will receive the full analysis (cuts, editorials, chapters/YT metadata) plus the original transcript.

## YOUR REVIEW PROCESS
1. READ the full analysis carefully
2. CHECK cuts — are any too aggressive? Did they miss obvious dead weight? Are context bridges solid?
3. CHECK editorials — is density right per zone? Are quote stamps actually viral-worthy? Any missed number pops?
4. CHECK titles — would YOU click on these? Are they specific enough? Do they use the best hook from the episode?
5. CHECK thumbnails — do they pair well with their titles? Is the text overlay readable at mobile size?
6. CHECK chapters — are titles curiosity-gap or generic? Are there any banned generic labels?
7. CHECK viral shorts — do hooks work WITHOUT context? Are these truly the best 30-90 second clips?
8. CHECK YT description — is the hook line the single strongest insight? Are takeaways contrarian enough?
9. IMPROVE anything weak. Add anything missing. Remove anything that doesn't pass quality bar.

## OUTPUT FORMAT
Return the IMPROVED version of the full analysis as JSON. Same structure as below, but better.

{
  "cuts_improvements": {
    "added_cuts": [{"description": "what to cut and why it was missed"}],
    "removed_cuts": [{"id": "cut ID to remove", "reason": "why this cut was wrong"}],
    "modified_cuts": [{"id": "cut ID", "improvement": "what changed"}]
  },
  "editorials_improvements": {
    "added_editorials": [{"editorial_type": "type", "timestamp": "when", "what_to_show": "what", "reason": "why it was missed"}],
    "removed_editorials": [{"id": "ED ID", "reason": "why it was weak"}],
    "modified_editorials": [{"id": "ED ID", "improvement": "what changed"}]
  },
  "chapters_improvements": {
    "improved_titles": [{"rank": 1, "original": "old title", "improved": "better title", "reason": "why"}],
    "improved_chapters": [{"time": "timestamp", "original": "old title", "improved": "better title"}],
    "improved_thumbnails": [{"rank": 1, "improvement": "what changed"}],
    "description_notes": "any improvements to the YT description",
    "shorts_notes": "any improvements to viral shorts"
  },
  "overall_quality_score": "A/B/C/D — how good is this analysis overall?",
  "top_issues": ["list of the 3 biggest problems found"],
  "summary": "1-2 sentence summary of what was improved"
}`;

  const userMsg = `Review this analysis and tell me what to improve.

CUTS ANALYSIS:
${JSON.stringify(cuts)}

EDITORIALS ANALYSIS:
${JSON.stringify(editorials)}

CHAPTERS/YT ANALYSIS:
${JSON.stringify(chapters)}

ORIGINAL TRANSCRIPT (first 5000 chars for reference):
${transcript.slice(0, 5000)}`;

  const stream = await client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 8000,
    system: [{ type: 'text', text: reviewPrompt, cache_control: { type: 'ephemeral' } }],
    thinking: {
      type: 'enabled',
      budget_tokens: 5000,
    },
    messages: [{
      role: 'user',
      content: userMsg,
    }],
  });
  const message = await stream.finalMessage();

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock) return null;
  try {
    return parseJSON(textBlock.text);
  } catch {
    return null; // Review is optional — don't fail the whole pipeline
  }
}

/**
 * Run the full 4-pass analysis pipeline.
 * Pass 1: Cuts | Pass 2: Editorials | Pass 3: Chapters/YT | Pass 4: Senior Review
 */
async function analyzeTranscript(transcript, hasTimestamps, onProgress, episodeContext) {
  // Append episode context to transcript if provided
  let fullTranscript = transcript;
  if (episodeContext) {
    fullTranscript = `[EPISODE CONTEXT FROM CREATOR]\n${episodeContext}\n\n[TRANSCRIPT]\n${transcript}`;
  }

  // Pass 1: Cuts — deepest analysis, needs full thinking budget
  onProgress?.('Pass 1/4: Deep analysis of cuts & episode structure...');
  console.log('Pass 1: Cuts (with extended thinking)...');
  const cuts = await callClaude(
    buildCutsSystemPrompt(),
    buildCutsUserPrompt(fullTranscript, hasTimestamps),
    { thinkingBudget: 10000, maxTokens: 16000 }
  );
  console.log('Pass 1 complete.');

  // Pass 2: Editorials — references cuts, less complex
  onProgress?.('Pass 2/4: Generating editorial overlays...');
  console.log('Pass 2: Editorials (with extended thinking)...');
  const editorials = await callClaude(
    buildEditorialsSystemPrompt(),
    buildEditorialsUserPrompt(fullTranscript, cuts),
    { thinkingBudget: 6000, maxTokens: 16000 }
  );
  console.log('Pass 2 complete.');

  // Pass 3: Chapters & YT — uses summaries from pass 1+2, less complex
  onProgress?.('Pass 3/4: Creating titles, thumbnails & YT copy...');
  console.log('Pass 3: Chapters & YT (with extended thinking)...');
  const chapters = await callClaude(
    buildChaptersSystemPrompt(),
    buildChaptersUserPrompt(fullTranscript, cuts, editorials),
    { thinkingBudget: 6000, maxTokens: 16000 }
  );
  console.log('Pass 3 complete.');

  // Pass 4: Senior Review
  onProgress?.('Pass 4/4: Senior editor reviewing & improving...');
  console.log('Pass 4: Review pass...');
  const review = await reviewPass(cuts, editorials, chapters, transcript);
  console.log('Pass 4 complete.');

  return { cuts, editorials, chapters, review };
}

module.exports = { analyzeTranscript };
