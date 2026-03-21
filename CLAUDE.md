# Podcast Analyzer Bot

## What This Is
A Slack bot that analyzes podcast transcripts and generates a professional post-production deck. When you upload a `.txt` or `.srt` transcript file to Slack, the bot runs a 4-pass analysis using Claude Opus and returns a `.pptx` deck.

## Owner
- **Name:** Ashish Sangle
- **Email:** ashish@yosomedia.in
- **GitHub:** github.com/ashishyoso/podcast-bot

## Architecture

### Stack
- **Runtime:** Node.js 20 (Alpine Docker)
- **AI:** Claude Opus (`claude-opus-4-6`) with extended thinking (10k budget)
- **Slack:** @slack/bolt in Socket Mode
- **Output:** PPTX via pptxgenjs, DOCX via docx library
- **Hosting:** Railway (auto-deploys from GitHub main branch)

### Key Files
```
src/
  index.js          - Slack event handler, file download, orchestration
  analyze.js        - 4-pass Claude pipeline (streaming API)
  prompts.js        - System/user prompts for each pass (loads skills.md)
  pptx-generator.js - Builds the slide deck from analysis JSON
  doc-generator.js  - Builds the Word doc from analysis JSON
  srt-parser.js     - Parses .srt and .txt transcript files
  formatter.js      - Slack Block Kit formatter (legacy, not primary output)
skills.md           - Extracted skill definitions (cuts, editorials, chapters)
Dockerfile          - Alpine + npm install (NOT npm ci — no lock file on Google Drive)
```

### Pipeline Flow
```
User uploads .txt/.srt to Slack
  + optional message (speaker names, podcast name, audience)
    |
    v
Pass 1: CUTS (AVD optimization) — energy map, line/segment/structural cuts, reel-worthy moments
    |
    v
Pass 2: EDITORIALS — overlays, B-roll, quote stamps (references post-cut timeline from Pass 1)
    |
    v
Pass 3: CHAPTERS & YT — titles+thumbnails paired, chapters, YT description, viral shorts, tags
    |
    v
Pass 4: SENIOR REVIEW — reviews all 3 passes and suggests improvements
    |
    v
Generate PPTX deck → Upload to Slack thread
```

### Environment Variables (Railway)
- `SLACK_BOT_TOKEN` — xoxb-... bot token
- `SLACK_APP_TOKEN` — xapp-... app-level token for Socket Mode
- `ANTHROPIC_API_KEY` — Claude API key

## Key Decisions Made

### Model
- Using `claude-opus-4-6` (best model) — switched from Sonnet for quality
- Extended thinking enabled with 10k token budget per pass
- **Streaming API** (`client.messages.stream()`) — required because Opus + thinking can take 5-10 min per pass, non-streaming times out

### Output Format
- Primary output: `.pptx` deck uploaded to Slack thread
- DOCX generator exists (`doc-generator.js`) but PPTX is the main deliverable
- Bot sends only the file — no long Slack messages
- Title + Thumbnail are paired together (not separate sections)

### Skills
Three skill docs are embedded in `skills.md` and loaded into prompts:
1. **Podcast Episode Cuts** — AVD optimization, 3-tier cut classification, context bridge test, never-cut zones
2. **Podcast Editorials** — 8 editorial types, viral statement detection, density targets per zone
3. **Podcast Chapters & YT** — curiosity-gap chapters, 5 title+thumbnail combos, full YT description

### JSON Parsing
Claude with extended thinking sometimes outputs text around JSON. The parser:
1. Tries direct `JSON.parse`
2. Falls back to regex extraction of `{...}` from response
3. Strips markdown code fences

### Dockerfile
Uses `npm install` (not `npm ci`) because `package-lock.json` can't be generated on Google Drive due to file permission issues.

## Known Issues / Future Improvements
- **Episode context:** Bot reads the message accompanying the file upload for speaker names, podcast name, audience — improves quality significantly
- **Show history:** Could store past analyses to learn show patterns
- **Two-stage review:** Pass 4 reviews but doesn't rewrite — could do a full rewrite pass
- **Transcript with speaker labels:** Diarized transcripts (Speaker 0, Speaker 1) produce much better results

## Commands
```bash
# Local dev
npm run dev

# Deploy (push to GitHub, Railway auto-deploys)
git add -A && git commit -m "message" && git push
```
