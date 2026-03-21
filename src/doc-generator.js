const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  BorderStyle,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} = require('docx');

// --- Reusable helpers ---

const COLORS = {
  primary: '1B4F72',
  accent: '2E86C1',
  success: '27AE60',
  warning: 'E67E22',
  danger: 'C0392B',
  muted: '7F8C8D',
  light: 'EBF5FB',
  lightGray: 'F2F3F4',
  white: 'FFFFFF',
  black: '1a1a1a',
  darkGray: '2C3E50',
};

const border = { style: BorderStyle.SINGLE, size: 1, color: 'D5D8DC' };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}

function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ size: 24, bold: true, color: COLORS.darkGray, text })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ size: 22, font: 'Arial', ...opts, text })],
  });
}

function label(labelText, valueText) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ size: 22, bold: true, color: COLORS.darkGray, text: `${labelText}: ` }),
      new TextRun({ size: 22, text: valueText }),
    ],
  });
}

function tag(text, color = COLORS.accent) {
  return new TextRun({ size: 20, bold: true, color, text: `[${text}] ` });
}

function quoteLine(text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 400 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.accent, space: 8 } },
    children: [new TextRun({ size: 21, italics: true, color: COLORS.muted, text })],
  });
}

function spacer(after = 200) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function makeRow(cells, headerRow = false) {
  return new TableRow({
    children: cells.map((cellText, i) =>
      new TableCell({
        borders,
        width: { size: Math.floor(9360 / cells.length), type: WidthType.DXA },
        margins: cellMargins,
        shading: headerRow
          ? { fill: COLORS.primary, type: ShadingType.CLEAR }
          : i % 2 === 0
            ? { fill: COLORS.white, type: ShadingType.CLEAR }
            : { fill: COLORS.white, type: ShadingType.CLEAR },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                size: 20,
                bold: headerRow,
                color: headerRow ? COLORS.white : COLORS.black,
                font: 'Arial',
                text: String(cellText),
              }),
            ],
          }),
        ],
      })
    ),
  });
}

function makeTable(headers, rows) {
  const colWidth = Math.floor(9360 / headers.length);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: headers.map(() => colWidth),
    rows: [
      makeRow(headers, true),
      ...rows.map((row) => makeRow(row)),
    ],
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 300, after: 300 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D5D8DC', space: 1 } },
    children: [],
  });
}

// --- Section builders ---

function buildOverview(overview) {
  return [
    h1('Episode Overview'),
    makeTable(
      ['Metric', 'Value'],
      [
        ['Raw Runtime', overview.estimated_raw_runtime || 'N/A'],
        ['Recommended Runtime', overview.recommended_final_runtime || 'N/A'],
        ['Total Cut Time', overview.total_cut_time || 'N/A'],
        ['Reel-worthy Moments', String(overview.reel_worthy_moments_count || 0)],
      ]
    ),
    spacer(),
  ];
}

function buildCuts(cuts) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    h1('Cuts (AVD Optimization)'),
  ];

  if (cuts.line_cuts?.length) {
    children.push(h2(`Line Cuts (${cuts.line_cuts.length})`));
    for (let i = 0; i < cuts.line_cuts.length; i++) {
      const cut = cuts.line_cuts[i];
      children.push(h3(`CUT-L${String(i + 1).padStart(2, '0')} \u2014 ${cut.cut_type || 'Line Cut'}`));
      children.push(label('Timestamp', cut.timestamp || cut.location || 'N/A'));
      children.push(label('Confidence', cut.confidence || 'MEDIUM'));
      children.push(quoteLine(cut.original_text || ''));
      children.push(label('Why it hurts AVD', cut.why_it_hurts_avd || cut.reason || ''));
      children.push(label('Context bridge', cut.context_bridge || cut.context_check || ''));
      children.push(spacer(120));
    }
  }

  if (cuts.segment_cuts?.length) {
    children.push(h2(`Segment Cuts (${cuts.segment_cuts.length})`));
    for (let i = 0; i < cuts.segment_cuts.length; i++) {
      const cut = cuts.segment_cuts[i];
      children.push(h3(`CUT-S${String(i + 1).padStart(2, '0')} \u2014 ${cut.cut_type || 'Segment Cut'}`));
      children.push(label('Range', `${cut.start} \u2192 ${cut.end}`));
      children.push(label('Duration removed', cut.duration || 'N/A'));
      children.push(label('Confidence', cut.confidence || 'MEDIUM'));
      children.push(p(cut.what_is_being_cut || cut.summary_of_cut || ''));
      children.push(label('Why it hurts AVD', cut.why_it_hurts_avd || cut.reason || ''));
      children.push(label('Context bridge', cut.context_bridge || cut.context_check || ''));
      children.push(spacer(120));
    }
  }

  if (cuts.structural_cuts?.length) {
    children.push(h2(`Structural Cuts (${cuts.structural_cuts.length})`));
    for (const cut of cuts.structural_cuts) {
      children.push(h3(cut.cut_type || 'Structural'));
      if (cut.timestamp_range) children.push(label('Range', cut.timestamp_range));
      children.push(p(cut.description || ''));
      children.push(spacer(120));
    }
  }

  return children;
}

function buildEditorials(editorials) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    h1(`Editorials (${editorials.length})`),
  ];

  for (let i = 0; i < editorials.length; i++) {
    const ed = editorials[i];
    children.push(h3(`ED-${String(i + 1).padStart(3, '0')} \u2014 ${ed.editorial_type || ed.type || ''}`));
    children.push(label('Timestamp', ed.timestamp || ed.location || ''));
    children.push(label('Position', ed.position || ''));
    children.push(label('Duration', `${ed.duration_seconds || ''}s`));
    children.push(label('Reel-ready', ed.reel_ready ? 'Yes' : 'No'));
    if (ed.trigger_line) children.push(quoteLine(ed.trigger_line));
    children.push(label('What to show', ed.what_to_show || ed.suggestion || ''));
    if (ed.editor_notes) children.push(label('Editor notes', ed.editor_notes));
    children.push(spacer(100));
  }

  return children;
}

function buildShorts(shorts) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    h1(`Viral Shorts (${shorts.length})`),
  ];

  for (let i = 0; i < shorts.length; i++) {
    const s = shorts[i];
    children.push(h2(`Short ${i + 1}: ${s.title}`));
    children.push(
      makeTable(
        ['Field', 'Detail'],
        [
          ['Clip Range', `${s.start} \u2192 ${s.end}`],
          ['Duration', `${s.duration_seconds || ''}s`],
          ['Viral Pattern', s.viral_pattern || ''],
          ['Why Viral', s.why_viral || ''],
          ['Caption', s.caption || ''],
          ['Subtitle Highlight', s.subtitle_highlight || ''],
        ]
      )
    );
    children.push(spacer(80));
    children.push(label('Hook line', ''));
    children.push(quoteLine(s.hook_line || s.hook || ''));
    children.push(spacer(150));
  }

  return children;
}

function buildYouTube(youtube) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    h1('YouTube Titles & Thumbnails'),
  ];

  children.push(h2('Title Options (ranked by CTR)'));
  if (youtube.titles?.length) {
    children.push(
      makeTable(
        ['#', 'Title', 'Type', 'Chars', 'Emotional Driver'],
        youtube.titles.map((t, i) => [
          String(i + 1),
          t.title,
          t.type || t.strategy || '',
          String(t.char_count || t.title.length),
          t.emotional_driver || '',
        ])
      )
    );
    children.push(spacer(80));
    for (const t of youtube.titles) {
      if (t.ctr_rationale) {
        children.push(label(t.title, t.ctr_rationale));
      }
    }
  }

  children.push(spacer());
  children.push(h2('Thumbnail Concepts'));
  if (youtube.thumbnail_concepts?.length) {
    for (let i = 0; i < youtube.thumbnail_concepts.length; i++) {
      const th = youtube.thumbnail_concepts[i];
      children.push(h3(`Concept ${i + 1}`));
      children.push(
        makeTable(
          ['Field', 'Detail'],
          [
            ['Text Overlay', `"${th.text_overlay || ''}"`],
            ['Guest Expression', th.guest_expression || th.emotion || ''],
            ['Background', th.background || ''],
            ['Composition', th.composition || ''],
            ['Mood', th.mood || ''],
          ]
        )
      );
      children.push(spacer(100));
    }
  }

  return children;
}

function buildChapters(chapters) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    h1('Chapters & YouTube Description'),
  ];

  children.push(h2('Chapters'));
  if (chapters.timestamps?.length) {
    children.push(
      makeTable(
        ['Timestamp', 'Chapter Title'],
        chapters.timestamps.map((ch) => [ch.time, ch.title])
      )
    );
  }

  children.push(spacer());
  children.push(h2('YouTube Description'));
  const descLines = (chapters.description || '').split('\n');
  for (const line of descLines) {
    children.push(p(line || ' '));
  }

  if (chapters.tags?.length) {
    children.push(spacer());
    children.push(h2('Tags'));
    children.push(p(chapters.tags.join(', ')));
  }

  if (chapters.distribution_notes) {
    children.push(spacer());
    children.push(h2('Distribution Notes'));
    if (chapters.distribution_notes.community_post_teaser) {
      children.push(label('Community Post Teaser', chapters.distribution_notes.community_post_teaser));
    }
    if (chapters.distribution_notes.social_hook) {
      children.push(label('Social Hook', chapters.distribution_notes.social_hook));
    }
  }

  return children;
}

function buildColdOpen(coldOpen) {
  if (!coldOpen) return [];
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    h1('Cold Open Recommendation'),
  ];

  children.push(label('Has cold open', coldOpen.has_cold_open ? 'Yes' : 'No'));

  if (coldOpen.soundbites?.length) {
    children.push(spacer(100));
    children.push(h2('Recommended Soundbites for Montage'));
    for (let i = 0; i < coldOpen.soundbites.length; i++) {
      const sb = coldOpen.soundbites[i];
      children.push(h3(`Soundbite ${i + 1}`));
      children.push(label('Timestamp', sb.timestamp || ''));
      children.push(label('Emotional Trigger', sb.emotional_trigger || ''));
      children.push(quoteLine(sb.quote || ''));
      children.push(spacer(100));
    }
  }

  return children;
}

// --- Main export ---

async function generateDocx(analysis, episodeName) {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial', color: COLORS.primary },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: COLORS.darkGray },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          // Title page
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 4000, after: 200 },
            children: [new TextRun({ size: 56, bold: true, color: COLORS.primary, text: 'Podcast Analysis' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: COLORS.accent, space: 12 } },
            children: [new TextRun({ size: 32, color: COLORS.darkGray, text: episodeName })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                size: 22,
                color: COLORS.muted,
                text: `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
              }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // Content
          ...(analysis.episode_overview ? buildOverview(analysis.episode_overview) : []),
          ...buildCuts(analysis.cuts || { line_cuts: [], segment_cuts: [], structural_cuts: [] }),
          ...buildEditorials(analysis.editorials || []),
          ...buildShorts(analysis.viral_shorts || []),
          ...buildYouTube(analysis.youtube || { titles: [], thumbnail_concepts: [] }),
          ...buildChapters(analysis.chapters || { timestamps: [], description: '', tags: [] }),
          ...buildColdOpen(analysis.cold_open_recommendation),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateDocx };
