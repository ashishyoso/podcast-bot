require('dotenv').config();
const { App } = require('@slack/bolt');
const { parseTranscript } = require('./srt-parser');
const { analyzeTranscript } = require('./analyze');
const { generatePptx } = require('./pptx-generator');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const SUPPORTED_EXTENSIONS = ['txt', 'srt'];

app.event('file_shared', async ({ event, client }) => {
  try {
    const fileInfo = await client.files.info({ file: event.file_id });
    const file = fileInfo.file;
    const ext = file.name.split('.').pop().toLowerCase();

    if (!SUPPORTED_EXTENSIONS.includes(ext)) return;

    console.log(`Processing: ${file.name} (${file.size} bytes)`);
    const channel = event.channel_id;

    // Try to get episode context from the message that accompanied the file upload
    let episodeContext = '';
    try {
      // Get the message that shared the file
      const result = await client.conversations.history({
        channel,
        latest: event.event_ts,
        inclusive: true,
        limit: 1,
      });
      const msg = result.messages?.[0];
      if (msg?.text && msg.text.trim().length > 5) {
        episodeContext = msg.text;
        console.log(`Episode context: ${episodeContext.slice(0, 100)}`);
      }
    } catch (e) {
      // Context is optional — continue without it
    }

    // Acknowledge
    const contextNote = episodeContext
      ? `\nContext received: _${episodeContext.slice(0, 100)}${episodeContext.length > 100 ? '...' : ''}_`
      : '\n_Tip: add a message with your upload (guest name, topic, audience) for better results._';

    const ack = await client.chat.postMessage({
      channel,
      text: `\uD83C\uDFA7 Analyzing *${file.name}*...\n4-pass deep analysis with Claude Opus. This takes 3-5 minutes.${contextNote}`,
    });

    // Progress updater
    const updateProgress = async (text) => {
      try {
        await client.chat.update({ channel, ts: ack.ts, text: `\uD83C\uDFA7 *${file.name}*\n${text}` });
      } catch (e) { /* ignore */ }
    };

    // Download file
    const response = await fetch(file.url_private_download, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    });
    const content = await response.text();
    const transcript = parseTranscript(content, file.name);

    // 4-pass analysis
    const analysis = await analyzeTranscript(
      transcript.plainText,
      transcript.hasTimestamps,
      updateProgress,
      episodeContext
    );

    // Generate PPTX
    await updateProgress('Building post-production deck...');
    const episodeName = file.name.replace(/\.(txt|srt)$/i, '');
    const pptxBuffer = await generatePptx(analysis, episodeName);

    // Upload
    await client.files.uploadV2({
      channel_id: channel,
      thread_ts: ack.ts,
      file: pptxBuffer,
      filename: `${episodeName} - Post-Production Deck.pptx`,
      title: `${episodeName} - Post-Production Deck`,
    });

    // Final message with review summary
    const reviewNote = analysis.review?.summary
      ? `\nSenior review: _${analysis.review.summary}_\nQuality: *${analysis.review.overall_quality_score || 'N/A'}*`
      : '';

    await client.chat.update({
      channel,
      ts: ack.ts,
      text: `\u2705 *${file.name}* \u2014 Post-production deck ready! Check the thread.${reviewNote}`,
    });
  } catch (error) {
    console.error('Error:', error);
    try {
      await app.client.chat.postMessage({
        channel: event.channel_id,
        text: `\u274C Error analyzing transcript: ${error.message}`,
      });
    } catch (e) {
      console.error('Could not notify:', e);
    }
  }
});

(async () => {
  await app.start();
  console.log('\u26A1 Podcast bot running (4-pass Opus + extended thinking)');
})();
