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

    // Acknowledge
    const ack = await client.chat.postMessage({
      channel,
      text: `\uD83C\uDFA7 Analyzing *${file.name}*...\nRunning 3-pass analysis with Claude Opus. This takes 2-3 minutes.`,
    });

    // Progress updater
    const updateProgress = async (text) => {
      try {
        await client.chat.update({ channel, ts: ack.ts, text: `\uD83C\uDFA7 *${file.name}*\n${text}` });
      } catch (e) { /* ignore update errors */ }
    };

    // Download file
    const response = await fetch(file.url_private_download, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    });
    const content = await response.text();
    const transcript = parseTranscript(content, file.name);

    // 3-pass analysis with progress updates
    const analysis = await analyzeTranscript(
      transcript.plainText,
      transcript.hasTimestamps,
      updateProgress
    );

    // Generate PPTX
    await updateProgress('Generating presentation deck...');
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

    await client.chat.update({
      channel,
      ts: ack.ts,
      text: `\u2705 *${file.name}* \u2014 Post-production deck ready! Check the thread.`,
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
  console.log('\u26A1 Podcast bot is running (3-pass Opus pipeline)');
})();
