require('dotenv').config();
const { App } = require('@slack/bolt');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
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

// ═══ HTTP API for web uploads ═══
const api = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

api.use(cors());
api.use(express.json());

// Health check
api.get('/', (req, res) => res.json({ status: 'ok', service: 'podcast-analyzer' }));

// SSE endpoint for real-time progress + final PPTX download
api.post('/api/analyze', upload.single('transcript'), async (req, res) => {
  let keepAliveTimer = null;

  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filename = req.file.originalname;
    const ext = filename.split('.').pop().toLowerCase();
    if (!['txt', 'srt'].includes(ext)) {
      return res.status(400).json({ error: 'Only .txt and .srt files are supported' });
    }

    console.log(`[WEB] Processing: ${filename} (${req.file.size} bytes)`);

    // Set up SSE for progress updates
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx/proxy buffering
    res.flushHeaders();

    // Keep-alive ping every 25s to prevent Railway/proxy timeout
    keepAliveTimer = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch (_) {}
    }, 25000);

    const sendProgress = (step, text) => {
      try { res.write(`data: ${JSON.stringify({ type: 'progress', step, text })}\n\n`); } catch (_) {}
    };

    const content = req.file.buffer.toString('utf-8');
    const episodeContext = req.body?.context || '';
    const transcript = parseTranscript(content, filename);

    // 4-pass analysis with progress
    const onProgress = (text) => {
      if (text.includes('1/4')) sendProgress(1, text);
      else if (text.includes('2/4')) sendProgress(2, text);
      else if (text.includes('3/4')) sendProgress(3, text);
      else if (text.includes('4/4')) sendProgress(4, text);
      else sendProgress(0, text);
    };

    const analysis = await analyzeTranscript(
      transcript.plainText,
      transcript.hasTimestamps,
      onProgress,
      episodeContext
    );

    // Generate PPTX
    sendProgress(5, 'Building post-production deck...');
    const episodeName = filename.replace(/\.(txt|srt)$/i, '');
    const pptxBuffer = await generatePptx(analysis, episodeName);

    // Send the PPTX as base64 in the final SSE event
    const base64 = pptxBuffer.toString('base64');
    res.write(`data: ${JSON.stringify({ type: 'complete', filename: `${episodeName} - Post-Production Deck.pptx`, pptx: base64 })}\n\n`);
    clearInterval(keepAliveTimer);
    res.end();

    console.log(`[WEB] Complete: ${filename}`);
  } catch (error) {
    console.error('[WEB] Error:', error);
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    try {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    } catch (_) {
      try { res.status(500).json({ error: error.message }); } catch (__) {}
    }
  }
});

const PORT = process.env.PORT || 3000;

(async () => {
  // Start Slack bot
  await app.start();
  console.log('\u26A1 Slack bot running (4-pass Opus + extended thinking)');

  // Start HTTP API
  api.listen(PORT, () => {
    console.log(`\u26A1 HTTP API running on port ${PORT}`);
  });
})();
