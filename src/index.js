require('dotenv').config();
const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const { parseTranscript } = require('./srt-parser');
const { analyzeTranscript } = require('./analyze');
const { generateDocx } = require('./doc-generator');

// Load skills document
let skillsDoc = '';
const skillsPath = path.join(__dirname, '..', 'skills.md');
if (fs.existsSync(skillsPath)) {
  skillsDoc = fs.readFileSync(skillsPath, 'utf-8');
  console.log('Loaded skills document');
} else {
  console.log('No skills.md found — using general best practices only');
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const SUPPORTED_EXTENSIONS = ['txt', 'srt'];

// Listen for file uploads
app.event('file_shared', async ({ event, client }) => {
  try {
    // Get file info
    const fileInfo = await client.files.info({ file: event.file_id });
    const file = fileInfo.file;
    const ext = file.name.split('.').pop().toLowerCase();

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return; // Ignore non-transcript files
    }

    console.log(`Processing file: ${file.name} (${file.size} bytes)`);

    // Find channel to post in (use the channel where file was shared)
    const channel = event.channel_id;

    // Acknowledge receipt
    const ack = await client.chat.postMessage({
      channel,
      text: `🎙️ Analyzing transcript: *${file.name}*\nThis may take a minute...`,
    });

    // Download the file
    const response = await fetch(file.url_private_download, {
      headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    });
    const content = await response.text();

    // Parse transcript
    const transcript = parseTranscript(content, file.name);

    // Analyze with Claude
    const analysis = await analyzeTranscript(
      transcript.plainText,
      transcript.hasTimestamps,
      skillsDoc
    );

    // Generate and upload Word doc
    const episodeName = file.name.replace(/\.(txt|srt)$/i, '');
    const docBuffer = await generateDocx(analysis, episodeName);
    await client.files.uploadV2({
      channel_id: channel,
      thread_ts: ack.ts,
      file: docBuffer,
      filename: `${episodeName} - Analysis.docx`,
      title: `${episodeName} - Full Analysis`,
    });

    // Update the ack message
    await client.chat.update({
      channel,
      ts: ack.ts,
      text: `\u2705 Analysis complete for *${file.name}* \u2014 check the thread for your doc`,
    });
  } catch (error) {
    console.error('Error processing file:', error);

    // Try to notify in channel
    try {
      await app.client.chat.postMessage({
        channel: event.channel_id,
        text: `❌ Error analyzing transcript: ${error.message}`,
      });
    } catch (notifyErr) {
      console.error('Could not notify channel of error:', notifyErr);
    }
  }
});

// Start
(async () => {
  await app.start();
  console.log('⚡ Podcast bot is running');
})();
