const Anthropic = require('@anthropic-ai/sdk');
const { buildSystemPrompt, buildUserPrompt } = require('./prompts');

const client = new Anthropic();

async function analyzeTranscript(transcript, hasTimestamps, skillsDoc) {
  const systemPrompt = buildSystemPrompt(skillsDoc);
  const userPrompt = buildUserPrompt(transcript, hasTimestamps);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const responseText = message.content[0].text;

  // Parse JSON — handle potential markdown code fences
  let cleaned = responseText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Claude response as JSON:', err.message);
    console.error('Raw response:', responseText.slice(0, 500));
    throw new Error(
      'Claude returned an invalid response format. Please try again.'
    );
  }
}

module.exports = { analyzeTranscript };
