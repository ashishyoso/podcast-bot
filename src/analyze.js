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
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('JSON parse error:', err.message);
    console.error('Raw (first 500):', text.slice(0, 500));
    throw new Error('Claude returned invalid JSON. Please try again.');
  }
}

async function callClaude(systemPrompt, userPrompt) {
  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return parseJSON(message.content[0].text);
}

/**
 * Run the full 3-pass analysis pipeline.
 * Returns { cuts, editorials, chapters } with onProgress callback for status updates.
 */
async function analyzeTranscript(transcript, hasTimestamps, onProgress) {
  // Pass 1: Cuts
  onProgress?.('Pass 1/3: Analyzing cuts & episode structure...');
  console.log('Pass 1: Cuts analysis...');
  const cuts = await callClaude(
    buildCutsSystemPrompt(),
    buildCutsUserPrompt(transcript, hasTimestamps)
  );
  console.log('Pass 1 complete.');

  // Pass 2: Editorials (receives cuts context)
  onProgress?.('Pass 2/3: Generating editorial overlays...');
  console.log('Pass 2: Editorials analysis...');
  const editorials = await callClaude(
    buildEditorialsSystemPrompt(),
    buildEditorialsUserPrompt(transcript, cuts)
  );
  console.log('Pass 2 complete.');

  // Pass 3: Chapters & YT (receives cuts + editorials context)
  onProgress?.('Pass 3/3: Creating chapters, titles & YT copy...');
  console.log('Pass 3: Chapters & YT...');
  const chapters = await callClaude(
    buildChaptersSystemPrompt(),
    buildChaptersUserPrompt(transcript, cuts, editorials)
  );
  console.log('Pass 3 complete.');

  return { cuts, editorials, chapters };
}

module.exports = { analyzeTranscript };
