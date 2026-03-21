# Podcast Transcript Analyzer Bot

Slack bot that analyzes podcast transcripts using Claude AI. Upload a `.txt` or `.srt` file and get:

- **Cuts** — line and segment cuts to increase AVD (with context preservation checks)
- **Editorials** — pacing, B-roll, music, and energy suggestions
- **Viral Shorts** — 3-5 clip recommendations with hooks and captions
- **YouTube Thumbnail & Title** — title options and thumbnail concepts
- **Chapters & Description** — timestamped chapters, SEO description, and tags

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it (e.g., "Podcast Analyzer") and select your workspace

### 2. Enable Socket Mode

1. Go to **Settings → Socket Mode** → Enable
2. Create an **App-Level Token** with `connections:write` scope → copy it (this is `SLACK_APP_TOKEN`)

### 3. Set Bot Permissions

Go to **OAuth & Permissions → Bot Token Scopes** and add:
- `files:read`
- `chat:write`
- `channels:history`
- `groups:history`
- `im:history`

### 4. Subscribe to Events

Go to **Event Subscriptions** → Enable → Under **Subscribe to Bot Events** add:
- `file_shared`

### 5. Install the App

1. Go to **Install App** → **Install to Workspace** → Authorize
2. Copy the **Bot User OAuth Token** (this is `SLACK_BOT_TOKEN`)

### 6. Invite the Bot

In Slack, invite the bot to your channel: `/invite @Podcast Analyzer`

## Deploy to Railway

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy on Railway

1. Go to [railway.com](https://railway.com) → New Project → Deploy from GitHub
2. Select your repo
3. Add environment variables:
   - `SLACK_BOT_TOKEN` — Bot User OAuth Token from step 5
   - `SLACK_APP_TOKEN` — App-Level Token from step 2
   - `ANTHROPIC_API_KEY` — Your Anthropic API key
4. Railway will auto-deploy. The bot connects via Socket Mode (no public URL needed).

## Usage

1. Go to the Slack channel where the bot is invited
2. Upload a `.txt` or `.srt` transcript file
3. The bot acknowledges and starts analyzing
4. Results appear as a threaded reply with all 5 sections

## Customizing Skills

Edit `skills.md` in the project root with your specific editing guidelines, brand voice, and content rules. The bot loads this file at startup and includes it in every Claude analysis prompt.

After editing, redeploy (Railway auto-deploys on push) or restart the service.

## Local Development

```bash
cp .env.example .env
# Fill in your tokens in .env
npm install
npm run dev
```
