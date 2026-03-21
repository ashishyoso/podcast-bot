/**
 * Format Claude's analysis into Slack Block Kit messages.
 * Splits into multiple messages to stay under Slack's 50-block limit.
 */

const DIVIDER = { type: 'divider' };

function header(text) {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
}

function markdown(text) {
  return {
    type: 'section',
    text: { type: 'mrkdwn', text: text.slice(0, 3000) },
  };
}

function formatCuts(cuts) {
  const blocks = [header('✂️  Cuts (AVD Optimization)')];

  if (cuts.line_cuts?.length) {
    blocks.push(markdown('*Line Cuts:*'));
    for (const cut of cuts.line_cuts) {
      blocks.push(
        markdown(
          `> *${cut.location}*\n> _"${cut.original_text.slice(0, 200)}"_\n> *Why:* ${cut.reason}\n> *Context OK:* ${cut.context_check}`
        )
      );
    }
  }

  if (cuts.segment_cuts?.length) {
    blocks.push(markdown('*Segment Cuts:*'));
    for (const cut of cuts.segment_cuts) {
      blocks.push(
        markdown(
          `> *${cut.start} → ${cut.end}*\n> ${cut.summary_of_cut}\n> *Why:* ${cut.reason}\n> *Context OK:* ${cut.context_check}`
        )
      );
    }
  }

  return blocks;
}

function formatEditorials(editorials) {
  const blocks = [header('📝  Editorials')];
  for (const ed of editorials) {
    blocks.push(
      markdown(
        `> *[${ed.type.toUpperCase()}]* at ${ed.location}\n> ${ed.suggestion}\n> _${ed.why}_`
      )
    );
  }
  return blocks;
}

function formatShorts(shorts) {
  const blocks = [header('🔥  Viral Shorts')];
  for (let i = 0; i < shorts.length; i++) {
    const s = shorts[i];
    blocks.push(
      markdown(
        `*Short ${i + 1}: ${s.title}*\n> *Clip:* ${s.start} → ${s.end}\n> *Hook:* "${s.hook}"\n> *Why viral:* ${s.why_viral}\n> *Caption:* ${s.caption}`
      )
    );
  }
  return blocks;
}

function formatYouTube(youtube) {
  const blocks = [header('🎬  YouTube Thumbnail & Title')];

  blocks.push(markdown('*Title Options:*'));
  for (let i = 0; i < youtube.titles.length; i++) {
    const t = youtube.titles[i];
    blocks.push(markdown(`> ${i + 1}. *${t.title}*\n> _Strategy: ${t.strategy}_`));
  }

  blocks.push(markdown('*Thumbnail Concepts:*'));
  for (const th of youtube.thumbnail_concepts) {
    blocks.push(
      markdown(
        `> *Text:* "${th.text_overlay}"\n> *Emotion:* ${th.emotion}\n> *Visual:* ${th.description}\n> *Layout:* ${th.composition}`
      )
    );
  }

  return blocks;
}

function formatChapters(chapters) {
  const blocks = [header('📖  Chapters & Description')];

  const chapterList = chapters.timestamps
    .map((ch) => `${ch.time} ${ch.title}`)
    .join('\n');
  blocks.push(markdown(`*Chapters:*\n\`\`\`${chapterList}\`\`\``));

  blocks.push(markdown(`*YouTube Description:*\n${chapters.description}`));

  if (chapters.tags?.length) {
    blocks.push(markdown(`*Tags:* ${chapters.tags.join(', ')}`));
  }

  return blocks;
}

/**
 * Build all Slack messages from the analysis result.
 * Returns an array of block arrays, each under 50 blocks.
 */
function formatAnalysis(analysis) {
  const sections = [
    formatCuts(analysis.cuts),
    [DIVIDER],
    formatEditorials(analysis.editorials),
    [DIVIDER],
    formatShorts(analysis.viral_shorts),
    [DIVIDER],
    formatYouTube(analysis.youtube),
    [DIVIDER],
    formatChapters(analysis.chapters),
  ];

  const allBlocks = sections.flat();

  // Split into messages of max 48 blocks (leaving room for headers)
  const messages = [];
  for (let i = 0; i < allBlocks.length; i += 48) {
    messages.push(allBlocks.slice(i, i + 48));
  }

  return messages;
}

module.exports = { formatAnalysis };
