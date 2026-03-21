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
} = require('docx');

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, children: [new TextRun(text)] });
}

function text(content, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ size: 22, ...opts, text: content })],
  });
}

function bold(content) {
  return text(content, { bold: true });
}

function quote(content) {
  return new Paragraph({
    spacing: { after: 100 },
    indent: { left: 720 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 8 } },
    children: [new TextRun({ size: 22, italics: true, color: '555555', text: content })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 200 }, children: [] });
}

function buildCutsSection(cuts) {
  const children = [heading('Cuts (AVD Optimization)')];

  if (cuts.line_cuts?.length) {
    children.push(heading('Line Cuts', HeadingLevel.HEADING_2));
    for (const cut of cuts.line_cuts) {
      children.push(bold(`Location: ${cut.location}`));
      children.push(quote(cut.original_text));
      children.push(text(`Why: ${cut.reason}`));
      children.push(text(`Context preserved: ${cut.context_check}`));
      children.push(spacer());
    }
  }

  if (cuts.segment_cuts?.length) {
    children.push(heading('Segment Cuts', HeadingLevel.HEADING_2));
    for (const cut of cuts.segment_cuts) {
      children.push(bold(`${cut.start} \u2192 ${cut.end}`));
      children.push(text(cut.summary_of_cut));
      children.push(text(`Why: ${cut.reason}`));
      children.push(text(`Context preserved: ${cut.context_check}`));
      children.push(spacer());
    }
  }

  return children;
}

function buildEditorialsSection(editorials) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('Editorials'),
  ];

  for (const ed of editorials) {
    children.push(bold(`[${ed.type.toUpperCase()}] at ${ed.location}`));
    children.push(text(ed.suggestion));
    children.push(quote(ed.why));
    children.push(spacer());
  }

  return children;
}

function buildShortsSection(shorts) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('Viral Shorts'),
  ];

  for (let i = 0; i < shorts.length; i++) {
    const s = shorts[i];
    children.push(heading(`Short ${i + 1}: ${s.title}`, HeadingLevel.HEADING_2));
    children.push(text(`Clip: ${s.start} \u2192 ${s.end}`));
    children.push(bold('Hook:'));
    children.push(quote(s.hook));
    children.push(text(`Why viral: ${s.why_viral}`));
    children.push(text(`Caption: ${s.caption}`));
    children.push(spacer());
  }

  return children;
}

function buildYouTubeSection(youtube) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('YouTube Thumbnail & Title'),
  ];

  children.push(heading('Title Options', HeadingLevel.HEADING_2));
  for (let i = 0; i < youtube.titles.length; i++) {
    const t = youtube.titles[i];
    children.push(bold(`${i + 1}. ${t.title}`));
    children.push(quote(`Strategy: ${t.strategy}`));
    children.push(spacer());
  }

  children.push(heading('Thumbnail Concepts', HeadingLevel.HEADING_2));
  for (const th of youtube.thumbnail_concepts) {
    children.push(bold(`Text overlay: "${th.text_overlay}"`));
    children.push(text(`Emotion: ${th.emotion}`));
    children.push(text(`Visual: ${th.description}`));
    children.push(text(`Layout: ${th.composition}`));
    children.push(spacer());
  }

  return children;
}

function buildChaptersSection(chapters) {
  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('Chapters & Description'),
  ];

  children.push(heading('Chapters', HeadingLevel.HEADING_2));
  for (const ch of chapters.timestamps) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ size: 22, bold: true, text: `${ch.time}  ` }),
          new TextRun({ size: 22, text: ch.title }),
        ],
      })
    );
  }

  children.push(spacer());
  children.push(heading('YouTube Description', HeadingLevel.HEADING_2));
  // Split description into paragraphs
  const descLines = chapters.description.split('\n');
  for (const line of descLines) {
    children.push(text(line || ' '));
  }

  if (chapters.tags?.length) {
    children.push(spacer());
    children.push(heading('Tags', HeadingLevel.HEADING_2));
    children.push(text(chapters.tags.join(', ')));
  }

  return children;
}

async function generateDocx(analysis, episodeName) {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 24 } },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Arial', color: '1a1a1a' },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: '333333' },
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
            spacing: { before: 3000, after: 400 },
            children: [new TextRun({ size: 52, bold: true, text: 'Podcast Analysis' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ size: 28, color: '666666', text: episodeName })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                size: 22,
                color: '999999',
                text: `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
              }),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),

          // Sections
          ...buildCutsSection(analysis.cuts),
          ...buildEditorialsSection(analysis.editorials),
          ...buildShortsSection(analysis.viral_shorts),
          ...buildYouTubeSection(analysis.youtube),
          ...buildChaptersSection(analysis.chapters),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateDocx };
