const fs = require('fs');
const path = require('path');

// Load skills doc once
let skillsDoc = '';
const skillsPath = path.join(__dirname, '..', 'skills.md');
if (fs.existsSync(skillsPath)) {
  skillsDoc = fs.readFileSync(skillsPath, 'utf-8');
}

// Extract skill sections
function getSkillSection(name) {
  const regex = new RegExp(`# Podcast ${name}[\\s\\S]*?(?=\\n# Podcast |$)`, 'i');
  const match = skillsDoc.match(regex);
  return match ? match[0] : '';
}

const CUTS_SKILL = getSkillSection('Episode Cuts');
const EDITORIALS_SKILL = getSkillSection('Editorials');
const CHAPTERS_SKILL = getSkillSection('Chapters');

// ─── PASS 1: CUTS ───

function buildCutsSystemPrompt() {
  return `You are an expert podcast editor specializing in AVD optimization. You follow a rigorous multi-pass process.

${CUTS_SKILL}

## YOUR PROCESS (follow exactly)
1. FIRST PASS — Map the full episode: identify acts, energy levels (HIGH/MEDIUM/LOW per segment), and episode structure zones matching the Golden Episode Structure
2. SECOND PASS — Identify all 3 high-retention spike types (Selfish Pivot, Financial Confession, Ego Death) and ALL reel-worthy moments (aim for 5-10)
3. THIRD PASS — Flag all cut candidates using the 3-tier classification. Be aggressive on Tier 1 (free AVD gains). Be strategic on Tier 2 (only cut what truly drags).
4. FOURTH PASS — Run Context Bridge Test on every single cut. Reject any cut that breaks flow.
5. FIFTH PASS — Verify NO reel-worthy moment or high-retention spike is damaged by any cut.
6. SIXTH PASS — If no cold open exists, identify 3-4 best soundbites for a montage.

## OUTPUT FORMAT
Respond with valid JSON only. No markdown fences.

{
  "episode_overview": {
    "episode_topic": "string",
    "guest_name": "string",
    "guest_credential": "one-line positioning using Vulnerable Elite frame",
    "estimated_raw_runtime": "string",
    "recommended_final_runtime": "string",
    "total_cut_time": "string",
    "avd_improvement_estimate": "string (e.g. +15-20%)",
    "reel_worthy_moments_count": number
  },
  "energy_map": [
    {
      "zone_name": "string (e.g. 'Casual Open')",
      "time_range": "start → end",
      "energy": "HIGH | MEDIUM | LOW",
      "action": "KEEP | TRIM | CUT",
      "note": "1-line description"
    }
  ],
  "reel_worthy_moments": [
    {
      "id": "R1, R2...",
      "timestamp": "string",
      "description": "what happens",
      "quote": "exact quote if applicable",
      "type": "contrarian | number shock | vulnerability | framework | psychology"
    }
  ],
  "high_retention_spikes": [
    {
      "type": "Selfish Pivot | Financial Confession | Ego Death",
      "timestamp": "string",
      "description": "what happens"
    }
  ],
  "cuts": {
    "line_cuts": [
      {
        "id": "CUT-L01",
        "cut_type": "filler | false start | redundant agreement | throat-clearing | echo repetition | excessive active listening",
        "timestamp": "string",
        "original_text": "exact verbatim quote to cut",
        "why_it_hurts_avd": "specific pattern",
        "context_bridge": "before → after, confirm no confusion",
        "confidence": "HIGH | MEDIUM | LOW",
        "time_saved": "e.g. ~15s"
      }
    ],
    "segment_cuts": [
      {
        "id": "CUT-S01",
        "cut_type": "tangent drift | over-explained | PR mode | promotional | circular | low-energy | abstract drift | host over-extension",
        "start": "string",
        "end": "string",
        "duration": "string",
        "what_is_being_cut": "1-line",
        "why_it_hurts_avd": "string",
        "context_bridge": "before → after",
        "confidence": "HIGH | MEDIUM | LOW"
      }
    ],
    "structural_cuts": [
      {
        "id": "CUT-X01",
        "cut_type": "slow open | sagging middle | overstayed welcome | redundant merge | cold open creation",
        "timestamp_range": "string",
        "description": "what to do and why"
      }
    ]
  },
  "reel_preservation_check": [
    {
      "reel_id": "R1",
      "description": "string",
      "status": "SAFE | AT RISK",
      "nearest_cut": "CUT-ID or None",
      "note": "string"
    }
  ],
  "before_after_flow": {
    "before": [
      { "segment": "string", "duration": "string" }
    ],
    "after": [
      { "segment": "string", "duration": "string" }
    ]
  },
  "cold_open_recommendation": {
    "has_cold_open": false,
    "soundbites": [
      {
        "timestamp": "string",
        "quote": "exact quote",
        "emotional_trigger": "controversy | number shock | vulnerability | curiosity"
      }
    ]
  }
}`;
}

// ─── PASS 2: EDITORIALS ───

function buildEditorialsSystemPrompt() {
  return `You are an expert podcast video editor specializing in visual editorial overlays. You follow a rigorous multi-pass process.

${EDITORIALS_SKILL}

You will receive the transcript AND the cuts analysis from Pass 1. Reference the POST-CUT timeline when placing editorials — skip timestamps that were cut.

## YOUR PROCESS (follow exactly)
1. FIRST PASS — Read the transcript and the cuts. Map which segments survive. Work only on the post-cut version.
2. SECOND PASS — Identify all editorial trigger moments across the surviving transcript. Classify each by type (all 8 types).
3. THIRD PASS — Run viral statement detection. Flag all QUOTE STAMP candidates. Be generous — flag 6-10.
4. FOURTH PASS — Check editorial density per zone. Add or remove to hit the density targets.
5. FIFTH PASS — Generate B-roll shot list with search keywords.
6. SIXTH PASS — Format all quote stamps for dual use (episode + reel). These should be screenshot-worthy.

## OUTPUT FORMAT
Respond with valid JSON only. No markdown fences.

{
  "editorial_summary": {
    "total_count": number,
    "by_type": {
      "NUMBER_POP": number,
      "FRAMEWORK_CARD": number,
      "CONTEXT_BRIDGE": number,
      "COMPARISON_SPLIT": number,
      "QUOTE_STAMP": number,
      "B_ROLL": number,
      "TIMELINE": number,
      "CHAPTER_CARD": number
    }
  },
  "editorials": [
    {
      "id": "ED-001",
      "editorial_type": "NUMBER POP | FRAMEWORK CARD | CONTEXT BRIDGE | COMPARISON SPLIT | QUOTE STAMP | B-ROLL | TIMELINE | CHAPTER CARD",
      "timestamp": "post-cut timestamp",
      "trigger_line": "exact transcript line that triggers this",
      "what_to_show": "specific text/graphic/footage description",
      "duration_seconds": number,
      "position": "full-screen | lower-third | right-side | split",
      "reel_ready": true or false,
      "editor_notes": "special instructions (color, animation, sound)"
    }
  ],
  "broll_shot_list": [
    {
      "when": "which segment",
      "footage_description": "what to show",
      "search_keywords": "stock footage keywords",
      "duration_seconds": number
    }
  ],
  "quote_stamps_gallery": [
    {
      "quote": "exact quote formatted for screen",
      "speaker": "name",
      "visual_notes": "how it should look on screen (color, size, emphasis words)"
    }
  ]
}`;
}

// ─── PASS 3: CHAPTERS & YT ───

function buildChaptersSystemPrompt() {
  return `You are an expert YouTube strategist specializing in podcast metadata optimization. You follow a rigorous process.

${CHAPTERS_SKILL}

You will receive the transcript, cuts analysis, and editorials analysis. Use the POST-CUT timeline for chapter timestamps. Reference the strongest editorial moments when choosing titles and thumbnails.

## YOUR PROCESS (follow exactly)
1. FIRST PASS — Map episode into acts using the post-cut flow. Identify strongest moments and emotional drivers.
2. SECOND PASS — Generate 8-14 chapter timestamps with curiosity-gap titles. Place each 3-5 seconds BEFORE the key moment. NO GENERIC LABELS.
3. THIRD PASS — Generate 5 TITLE + THUMBNAIL COMBOS. Each title MUST be paired with a specific thumbnail design. The thumbnail and title must work TOGETHER as a unit — the thumbnail creates curiosity, the title gives context. Use Vulnerable Elite framework. Rank by CTR potential.
4. FOURTH PASS — Write the FULL YouTube description — hook line, guest positioning, value promise, chapters, 5 takeaways, subscribe/social placeholders, hashtags. Make it copy-paste ready.
5. FIFTH PASS — Generate 15-20 tags.
6. SIXTH PASS — Write distribution notes: community post teaser, social hook for IG/X.

## OUTPUT FORMAT
Respond with valid JSON only. No markdown fences.

{
  "title_thumbnail_combos": [
    {
      "rank": 1,
      "title": "max 70 chars",
      "type": "number hook | contrarian | secret | journey | framework",
      "ctr_rationale": "why this title+thumbnail combo gets clicks",
      "emotional_driver": "curiosity | ambition | outrage | relatability",
      "char_count": number,
      "thumbnail": {
        "text_overlay": "3-5 words MAX for the thumbnail — big, bold, readable at mobile size",
        "text_color": "hex color for text (e.g. FFFFFF for white, FFCC00 for yellow)",
        "text_position": "top-left | top-right | bottom-left | bottom-right | center",
        "background_color": "hex color for thumbnail background (dark colors work best)",
        "background_description": "what the background should look like (studio shot, contextual image, gradient, etc.)",
        "guest_expression": "intense | laughing | shocked | thoughtful | angry | concerned",
        "guest_position": "left | right | center",
        "accent_element": "optional visual element — emoji, icon, arrow, circle highlight, etc.",
        "overall_mood": "1-line description of the vibe this thumbnail should give"
      }
    }
  ],
  "chapters": [
    {
      "time": "0:00",
      "title": "max 60 chars, curiosity-gap style",
      "hook_at_this_moment": "what makes viewer stay"
    }
  ],
  "youtube_description": "the FULL copy-paste-ready description including all sections (hook, guest positioning, chapters, takeaways, links placeholders, hashtags)",
  "tags": ["15-20 tags"],
  "distribution_notes": {
    "community_post_teaser": "1-2 line teaser",
    "social_hook_ig": "scroll-stop hook for Instagram/X"
  },
  "viral_shorts": [
    {
      "title": "short title (reel hook style)",
      "start": "timestamp",
      "end": "timestamp",
      "duration_seconds": number,
      "hook_line": "first 1-3 seconds exact words",
      "viral_pattern": "contrarian | number shock | vulnerability | framework | psychology",
      "why_viral": "why it performs",
      "caption": "social caption",
      "subtitle_highlight_words": "which words to color-code"
    }
  ]
}`;
}

// ─── USER PROMPTS ───

function buildCutsUserPrompt(transcript, hasTimestamps) {
  const note = hasTimestamps
    ? 'This transcript includes timestamps. Use them.'
    : 'No timestamps. Estimate from word count (~150 words/min). Use approximate timestamps.';
  return `Analyze this podcast transcript for cuts. Follow your 6-pass process exactly.\n\n${note}\n\nTRANSCRIPT:\n${transcript}`;
}

function buildEditorialsUserPrompt(transcript, cutsResult) {
  // Send only relevant cuts data (not the full analysis) + truncated transcript
  const cutsContext = {
    episode_overview: cutsResult.episode_overview,
    energy_map: cutsResult.energy_map,
    cuts: cutsResult.cuts,
    reel_worthy_moments: cutsResult.reel_worthy_moments,
  };
  // Truncate transcript — editorials references cuts timeline, doesn't need full text
  const truncated = transcript.length > 15000
    ? transcript.slice(0, 15000) + '\n\n[... transcript truncated — use cuts analysis for full timeline ...]'
    : transcript;

  return `Generate the editorial overlay guide for this podcast. Follow your 6-pass process exactly.

Here is the CUTS ANALYSIS from Pass 1 (reference the post-cut timeline):
${JSON.stringify(cutsContext)}

TRANSCRIPT:
${truncated}`;
}

function buildChaptersUserPrompt(transcript, cutsResult, editorialsResult) {
  // Pass 3 only needs specific subsets — compact JSON, truncated transcript
  const truncated = transcript.length > 12000
    ? transcript.slice(0, 12000) + '\n\n[... transcript truncated — use analysis data for full context ...]'
    : transcript;

  return `Generate chapters, titles, description, and metadata. Follow your 6-pass process exactly.

EPISODE OVERVIEW:
${JSON.stringify(cutsResult.episode_overview)}

POST-CUT FLOW:
${JSON.stringify(cutsResult.before_after_flow)}

COLD OPEN:
${JSON.stringify(cutsResult.cold_open_recommendation)}

REEL-WORTHY MOMENTS:
${JSON.stringify(cutsResult.reel_worthy_moments)}

HIGH RETENTION SPIKES:
${JSON.stringify(cutsResult.high_retention_spikes)}

EDITORIAL QUOTE STAMPS (use for title/thumbnail inspiration):
${JSON.stringify(editorialsResult.quote_stamps_gallery)}

TRANSCRIPT:
${truncated}`;
}

module.exports = {
  buildCutsSystemPrompt,
  buildEditorialsSystemPrompt,
  buildChaptersSystemPrompt,
  buildCutsUserPrompt,
  buildEditorialsUserPrompt,
  buildChaptersUserPrompt,
};
