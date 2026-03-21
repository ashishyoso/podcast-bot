const pptxgen = require('pptxgenjs');

// ─── DESIGN SYSTEM ───
const C = {
  navy: '1E2761',
  ice: 'CADCFC',
  white: 'FFFFFF',
  offWhite: 'F4F6F9',
  dark: '0F1629',
  text: '1E293B',
  muted: '64748B',
  accent: '3B82F6',
  green: '22C55E',
  red: 'EF4444',
  amber: 'F59E0B',
  teal: '0D9488',
};
const FONT = { head: 'Georgia', body: 'Calibri' };

function shadow() {
  return { type: 'outer', color: '000000', blur: 6, offset: 2, angle: 135, opacity: 0.10 };
}

// ─── SLIDE HELPERS ───

function addFooter(slide, leftText, rightText) {
  slide.addText(leftText, { x: 0.5, y: 5.15, w: 5, h: 0.3, fontSize: 8, color: C.muted, fontFace: FONT.body });
  slide.addText(rightText, { x: 5.5, y: 5.15, w: 4, h: 0.3, fontSize: 8, color: C.muted, fontFace: FONT.body, align: 'right' });
}

function sectionSlide(pres, title, subtitle, footerLeft) {
  const slide = pres.addSlide();
  slide.background = { color: C.dark };
  slide.addText(title.toUpperCase(), { x: 0.8, y: 1.8, w: 8.4, h: 1.2, fontSize: 40, fontFace: FONT.head, color: C.white, bold: true, charSpacing: 3 });
  slide.addText(subtitle, { x: 0.8, y: 3.0, w: 8.4, h: 0.6, fontSize: 16, fontFace: FONT.body, color: C.ice });
  addFooter(slide, footerLeft, '');
}

function headerRow(cells) {
  return cells.map((text) => ({
    text: String(text),
    options: { fill: { color: C.navy }, color: C.white, bold: true, fontSize: 10, fontFace: FONT.body, align: 'left', valign: 'middle' },
  }));
}

function dataRow(cells, altRow = false) {
  return cells.map((text) => ({
    text: String(text ?? ''),
    options: { fill: { color: altRow ? C.offWhite : C.white }, color: C.text, fontSize: 9, fontFace: FONT.body, valign: 'top' },
  }));
}

// ─── SLIDES ───

function slideTitlePage(pres, overview) {
  const slide = pres.addSlide();
  slide.background = { color: C.dark };
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 5.625, fill: { color: C.dark } });
  slide.addText((overview.guest_name || 'Podcast Episode').toUpperCase(), {
    x: 0.8, y: 1.0, w: 8.4, h: 0.8, fontSize: 14, fontFace: FONT.body, color: C.ice, charSpacing: 4,
  });
  slide.addText('Post-Production Deck', {
    x: 0.8, y: 1.7, w: 8.4, h: 1.0, fontSize: 38, fontFace: FONT.head, color: C.white, bold: true,
  });
  slide.addText(`Cuts  \u2022  Editorials  \u2022  Chapters & YT Copy`, {
    x: 0.8, y: 2.7, w: 8.4, h: 0.5, fontSize: 14, fontFace: FONT.body, color: C.muted,
  });
  if (overview.episode_topic) {
    slide.addText(`EPISODE: ${overview.episode_topic}`, {
      x: 0.8, y: 3.5, w: 8.4, h: 0.5, fontSize: 13, fontFace: FONT.body, color: C.accent,
    });
  }
}

function slideOverview(pres, overview, reelMoments, footer) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };
  slide.addText('Episode Overview', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: FONT.head, color: C.text, bold: true });

  // Stat cards
  const stats = [
    { label: 'RAW RUNTIME', value: overview.estimated_raw_runtime || '?', sub: 'Estimated from transcript' },
    { label: 'REC. RUNTIME', value: overview.recommended_final_runtime || '?', sub: 'After cuts' },
    { label: 'TOTAL CUT', value: overview.total_cut_time || '?', sub: overview.avd_improvement_estimate || '' },
    { label: 'REEL MOMENTS', value: String(overview.reel_worthy_moments_count || 0), sub: 'Preserved intact' },
  ];

  stats.forEach((s, i) => {
    const x = 0.5 + i * 2.3;
    slide.addShape(pres.shapes.RECTANGLE, { x, y: 1.1, w: 2.1, h: 1.6, fill: { color: C.white }, shadow: shadow() });
    slide.addText(s.label, { x, y: 1.2, w: 2.1, h: 0.3, fontSize: 8, fontFace: FONT.body, color: C.muted, align: 'center', charSpacing: 2 });
    slide.addText(s.value, { x, y: 1.5, w: 2.1, h: 0.7, fontSize: 28, fontFace: FONT.head, color: C.navy, bold: true, align: 'center' });
    slide.addText(s.sub, { x, y: 2.2, w: 2.1, h: 0.4, fontSize: 8, fontFace: FONT.body, color: C.muted, align: 'center' });
  });

  // Reel moments list
  if (reelMoments?.length) {
    const reelText = reelMoments.map((r) => `${r.id} ${r.description || ''}`).join('  \u2022  ');
    slide.addText([{ text: 'REEL-WORTHY MOMENTS: ', options: { bold: true, fontSize: 9 } }, { text: reelText, options: { fontSize: 9 } }], {
      x: 0.5, y: 3.0, w: 9, h: 0.8, fontFace: FONT.body, color: C.text,
    });
  }

  // Guest credential
  if (overview.guest_credential) {
    slide.addText(overview.guest_credential, { x: 0.5, y: 3.8, w: 9, h: 0.4, fontSize: 11, fontFace: FONT.body, color: C.muted, italic: true });
  }

  addFooter(slide, footer, 'Episode Overview');
}

function slideEnergyMap(pres, energyMap, footer) {
  if (!energyMap?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('Episode Energy Map', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: FONT.head, color: C.text, bold: true });

  const actionColors = { KEEP: C.green, TRIM: C.amber, CUT: C.red };
  const rows = energyMap.map((z, i) => [
    { text: z.zone_name || '', options: { bold: true, fontSize: 10, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: z.time_range || '', options: { fontSize: 9, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: z.energy || '', options: { fontSize: 9, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: z.action || '', options: { bold: true, fontSize: 9, fontFace: FONT.body, color: actionColors[z.action] || C.text, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: z.note || '', options: { fontSize: 9, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
  ]);

  slide.addTable([headerRow(['Zone', 'Time', 'Energy', 'Action', 'Notes']), ...rows], {
    x: 0.5, y: 1.1, w: 9, colW: [2, 1.5, 1, 1, 3.5], border: { pt: 0.5, color: 'D5D8DC' },
  });

  addFooter(slide, footer, 'Energy Map');
}

function slideCutsTable(pres, cuts, footer) {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('Structural & Segment Cuts', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: FONT.head, color: C.text, bold: true });

  const allCuts = [
    ...(cuts.structural_cuts || []).map((c) => [c.id || '', 'STRUCTURAL', c.description || '', '', c.timestamp_range || '', 'HIGH']),
    ...(cuts.segment_cuts || []).map((c) => [c.id || '', 'SEGMENT', c.what_is_being_cut || '', c.why_it_hurts_avd || '', `${c.start} \u2192 ${c.end}`, c.confidence || '']),
  ];

  if (allCuts.length) {
    const rows = allCuts.map((cells, i) => dataRow(cells, i % 2 === 1));
    slide.addTable([headerRow(['ID', 'Tier', 'What to Cut', 'Why It Hurts AVD', 'Time', 'Conf.']), ...rows], {
      x: 0.3, y: 1.0, w: 9.4, colW: [0.8, 1, 2.5, 2.5, 1.5, 0.6], border: { pt: 0.5, color: 'D5D8DC' }, autoPage: true, autoPageRepeatHeader: true,
    });
  }
  addFooter(slide, footer, 'Cuts 1/2');
}

function slideLineCuts(pres, lineCuts, footer) {
  if (!lineCuts?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('Line Cuts \u2014 Free AVD Gains', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: FONT.head, color: C.text, bold: true });

  const rows = lineCuts.map((c, i) => dataRow([c.id || '', c.original_text?.slice(0, 80) || '', c.why_it_hurts_avd || '', c.time_saved || ''], i % 2 === 1));
  slide.addTable([headerRow(['ID', 'What to Cut', 'Why', 'Saved']), ...rows.slice(0, 12)], {
    x: 0.3, y: 1.0, w: 9.4, colW: [0.8, 4, 3.5, 0.8], border: { pt: 0.5, color: 'D5D8DC' }, autoPage: true, autoPageRepeatHeader: true,
  });

  addFooter(slide, footer, 'Line Cuts');
}

function slideReelCheck(pres, reelCheck, footer) {
  if (!reelCheck?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('Reel Preservation Check', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: FONT.head, color: C.text, bold: true });

  const rows = reelCheck.map((r, i) => [
    { text: r.reel_id || '', options: { bold: true, fontSize: 10, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: r.description || '', options: { fontSize: 9, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: r.status || 'SAFE', options: { bold: true, fontSize: 10, fontFace: FONT.body, color: r.status === 'SAFE' ? C.green : C.red, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: r.nearest_cut || 'None', options: { fontSize: 9, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
  ]);

  slide.addTable([headerRow(['Reel', 'Description', 'Status', 'Nearest Cut']), ...rows], {
    x: 0.5, y: 1.0, w: 9, colW: [0.6, 4.5, 0.8, 2.5], border: { pt: 0.5, color: 'D5D8DC' },
  });
  addFooter(slide, footer, 'Reel Check');
}

function slideBeforeAfter(pres, flow, footer) {
  if (!flow?.before?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('Before / After Episode Flow', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: FONT.head, color: C.text, bold: true });

  // Before column
  slide.addText('BEFORE (RAW)', { x: 0.5, y: 1.0, w: 4, h: 0.4, fontSize: 12, fontFace: FONT.body, color: C.red, bold: true });
  flow.before.forEach((s, i) => {
    slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.5 + i * 0.45, w: 4, h: 0.4, fill: { color: i % 2 ? C.offWhite : C.white }, line: { color: 'E5E7EB', width: 0.5 } });
    slide.addText(`${s.segment}  (${s.duration})`, { x: 0.6, y: 1.5 + i * 0.45, w: 3.8, h: 0.4, fontSize: 9, fontFace: FONT.body, color: C.text, valign: 'middle' });
  });

  // Arrow
  slide.addText('\u2192', { x: 4.5, y: 2.5, w: 1, h: 0.6, fontSize: 28, fontFace: FONT.body, color: C.accent, align: 'center' });

  // After column
  slide.addText('AFTER (CUT)', { x: 5.5, y: 1.0, w: 4, h: 0.4, fontSize: 12, fontFace: FONT.body, color: C.green, bold: true });
  flow.after.forEach((s, i) => {
    slide.addShape(pres.shapes.RECTANGLE, { x: 5.5, y: 1.5 + i * 0.45, w: 4, h: 0.4, fill: { color: i % 2 ? C.offWhite : C.white }, line: { color: 'E5E7EB', width: 0.5 } });
    slide.addText(`${s.segment}  (${s.duration})`, { x: 5.6, y: 1.5 + i * 0.45, w: 3.8, h: 0.4, fontSize: 9, fontFace: FONT.body, color: C.text, valign: 'middle' });
  });

  addFooter(slide, footer, 'Before / After');
}

function slideColdOpen(pres, coldOpen, footer) {
  if (!coldOpen?.soundbites?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.dark };
  slide.addText('Cold Open Recommendation', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 24, fontFace: FONT.head, color: C.white, bold: true });
  slide.addText('Splice these soundbites into a 45-sec montage at 0:00', { x: 0.5, y: 0.85, w: 9, h: 0.4, fontSize: 12, fontFace: FONT.body, color: C.ice });

  coldOpen.soundbites.forEach((sb, i) => {
    const y = 1.4 + i * 1.0;
    slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.5, h: 0.8, fill: { color: C.accent } });
    slide.addText(String(i + 1), { x: 0.5, y, w: 0.5, h: 0.8, fontSize: 20, fontFace: FONT.head, color: C.white, align: 'center', valign: 'middle', bold: true });
    slide.addText(`"${sb.quote}"`, { x: 1.2, y, w: 7, h: 0.5, fontSize: 11, fontFace: FONT.body, color: C.white, italic: true });
    slide.addText((sb.emotional_trigger || '').toUpperCase(), { x: 1.2, y: y + 0.5, w: 7, h: 0.3, fontSize: 9, fontFace: FONT.body, color: C.amber, bold: true, charSpacing: 2 });
  });

  addFooter(slide, footer, 'Cold Open');
}

function slideEditorialOverview(pres, summary, footer) {
  if (!summary) return;
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };
  slide.addText('Editorial Overview', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: FONT.head, color: C.text, bold: true });

  const types = summary.by_type || {};
  const entries = Object.entries(types).filter(([, v]) => v > 0);
  entries.forEach(([type, count], i) => {
    const x = 0.5 + (i % 4) * 2.3;
    const y = 1.2 + Math.floor(i / 4) * 1.2;
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 2.1, h: 0.9, fill: { color: C.white }, shadow: shadow() });
    slide.addText(type.replace(/_/g, ' '), { x, y: y + 0.05, w: 2.1, h: 0.35, fontSize: 8, fontFace: FONT.body, color: C.muted, align: 'center', charSpacing: 1 });
    slide.addText(String(count), { x, y: y + 0.35, w: 2.1, h: 0.5, fontSize: 24, fontFace: FONT.head, color: C.navy, bold: true, align: 'center' });
  });

  slide.addText(`TOTAL: ${summary.total_count || 0} editorials`, { x: 0.5, y: 4.0, w: 9, h: 0.4, fontSize: 14, fontFace: FONT.body, color: C.text, bold: true });
  addFooter(slide, footer, 'Editorials Overview');
}

function slideEditorialTable(pres, editorials, footer, pageNum) {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('Editorials', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, fontFace: FONT.head, color: C.text, bold: true });

  const rows = editorials.map((ed, i) => dataRow([
    ed.id || '',
    ed.editorial_type || '',
    ed.trigger_line?.slice(0, 60) || '',
    ed.what_to_show?.slice(0, 80) || '',
    `${ed.duration_seconds || ''}s`,
    ed.reel_ready ? 'YES' : 'NO',
  ], i % 2 === 1));

  slide.addTable([headerRow(['ID', 'Type', 'Trigger', 'What to Show', 'Dur', 'Reel?']), ...rows], {
    x: 0.2, y: 0.9, w: 9.6, colW: [0.6, 1.2, 2.2, 3.2, 0.5, 0.5], border: { pt: 0.5, color: 'D5D8DC' }, autoPage: true, autoPageRepeatHeader: true,
  });
  addFooter(slide, footer, `Editorials ${pageNum}`);
}

function slideQuoteGallery(pres, quotes, footer) {
  if (!quotes?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.dark };
  slide.addText('Quote Stamps Gallery \u2014 Reel-Ready', { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 22, fontFace: FONT.head, color: C.white, bold: true });

  quotes.slice(0, 6).forEach((q, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 4.7;
    const y = 0.9 + row * 1.5;
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.4, h: 1.3, fill: { color: '1A2332' }, line: { color: '2A3A50', width: 0.5 } });
    slide.addText(`"${q.quote}"`, { x: x + 0.2, y: y + 0.1, w: 4, h: 0.8, fontSize: 11, fontFace: FONT.head, color: C.white, italic: true, valign: 'middle' });
    slide.addText(`\u2014 ${q.speaker || 'Guest'}`, { x: x + 0.2, y: y + 0.9, w: 4, h: 0.3, fontSize: 9, fontFace: FONT.body, color: C.ice });
  });
  addFooter(slide, footer, 'Quote Stamps');
}

function slideBroll(pres, broll, footer) {
  if (!broll?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('B-Roll Shot List', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, fontFace: FONT.head, color: C.text, bold: true });

  const rows = broll.map((b, i) => dataRow([b.when || '', b.footage_description || '', b.search_keywords || '', `${b.duration_seconds || ''}s`], i % 2 === 1));
  slide.addTable([headerRow(['When', 'Footage', 'Search Keywords', 'Dur']), ...rows], {
    x: 0.5, y: 1.0, w: 9, colW: [2, 3, 3, 0.8], border: { pt: 0.5, color: 'D5D8DC' },
  });
  addFooter(slide, footer, 'B-Roll');
}

function slideTitles(pres, titles, footer) {
  if (!titles?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };
  slide.addText('Title Options \u2014 Ranked by CTR', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: FONT.head, color: C.text, bold: true });

  titles.forEach((t, i) => {
    const y = 1.1 + i * 0.85;
    const isTop = i === 0;
    slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9, h: 0.75, fill: { color: isTop ? C.navy : C.white }, shadow: isTop ? shadow() : undefined });
    slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.08, h: 0.75, fill: { color: isTop ? C.accent : C.muted } });
    slide.addText(String(t.rank || i + 1), { x: 0.7, y, w: 0.5, h: 0.75, fontSize: 20, fontFace: FONT.head, color: isTop ? C.white : C.navy, bold: true, valign: 'middle' });
    slide.addText(t.title, { x: 1.3, y, w: 5.5, h: 0.45, fontSize: 14, fontFace: FONT.body, color: isTop ? C.white : C.text, bold: true, valign: 'bottom' });
    slide.addText(`${(t.type || '').toUpperCase()}  \u2022  ${t.emotional_driver || ''}  \u2022  ${t.char_count || t.title.length} chars`, {
      x: 1.3, y: y + 0.42, w: 5.5, h: 0.3, fontSize: 9, fontFace: FONT.body, color: isTop ? C.ice : C.muted,
    });
    if (isTop) {
      slide.addText('TOP PICK', { x: 7.5, y: y + 0.15, w: 1.5, h: 0.4, fontSize: 10, fontFace: FONT.body, color: C.white, bold: true, align: 'center', valign: 'middle' });
    }
  });
  addFooter(slide, footer, 'Title Options');
}

function slideChapters(pres, chapters, footer) {
  if (!chapters?.length) return;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('YouTube Chapters', { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 28, fontFace: FONT.head, color: C.text, bold: true });

  const rows = chapters.map((ch, i) => [
    { text: ch.time || '', options: { bold: true, fontSize: 10, fontFace: FONT.body, color: C.accent, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: ch.title || '', options: { bold: true, fontSize: 10, fontFace: FONT.body, fill: { color: i % 2 ? C.offWhite : C.white } } },
    { text: ch.hook_at_this_moment || '', options: { fontSize: 9, fontFace: FONT.body, color: C.muted, fill: { color: i % 2 ? C.offWhite : C.white } } },
  ]);

  slide.addTable([headerRow(['Time', 'Chapter Title', 'Hook at This Moment']), ...rows], {
    x: 0.3, y: 1.0, w: 9.4, colW: [0.8, 4, 4.2], border: { pt: 0.5, color: 'D5D8DC' },
  });
  addFooter(slide, footer, 'Chapters');
}

function slideDescription(pres, description, footer) {
  if (!description) return;
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('YouTube Description \u2014 Copy-Paste Ready', { x: 0.5, y: 0.2, w: 9, h: 0.5, fontSize: 22, fontFace: FONT.head, color: C.text, bold: true });

  slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0.8, w: 9, h: 4.3, fill: { color: C.offWhite }, line: { color: 'D5D8DC', width: 0.5 } });
  slide.addText(description.slice(0, 2000), { x: 0.7, y: 0.9, w: 8.6, h: 4.1, fontSize: 9, fontFace: 'Consolas', color: C.text, valign: 'top' });
  addFooter(slide, footer, 'YT Description');
}

function slideThumbnailTags(pres, thumbnails, tags, distribution, footer) {
  const slide = pres.addSlide();
  slide.background = { color: C.white };
  slide.addText('Tags, Thumbnail & Distribution', { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 24, fontFace: FONT.head, color: C.text, bold: true });

  // Tags
  if (tags?.length) {
    slide.addText('TAGS', { x: 0.5, y: 0.9, w: 2, h: 0.3, fontSize: 10, fontFace: FONT.body, color: C.muted, bold: true, charSpacing: 2 });
    slide.addText(tags.join(', '), { x: 0.5, y: 1.2, w: 9, h: 0.6, fontSize: 9, fontFace: FONT.body, color: C.text });
  }

  // Thumbnails
  if (thumbnails?.length) {
    slide.addText('THUMBNAIL OPTIONS', { x: 0.5, y: 1.9, w: 4, h: 0.3, fontSize: 10, fontFace: FONT.body, color: C.muted, bold: true, charSpacing: 2 });
    thumbnails.forEach((th, i) => {
      const y = 2.3 + i * 0.7;
      slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 4.3, h: 0.6, fill: { color: C.dark } });
      slide.addText(th.text_overlay || '', { x: 0.7, y, w: 3, h: 0.6, fontSize: 16, fontFace: FONT.head, color: C.white, bold: true, valign: 'middle' });
      slide.addText(th.mood || '', { x: 5, y, w: 4.5, h: 0.6, fontSize: 9, fontFace: FONT.body, color: C.muted, valign: 'middle' });
    });
  }

  // Distribution
  if (distribution) {
    const distY = 4.2;
    slide.addText('DISTRIBUTION', { x: 0.5, y: distY, w: 4, h: 0.3, fontSize: 10, fontFace: FONT.body, color: C.muted, bold: true, charSpacing: 2 });
    if (distribution.community_post_teaser) {
      slide.addText([{ text: 'Community post: ', options: { bold: true } }, { text: distribution.community_post_teaser }], {
        x: 0.5, y: distY + 0.3, w: 9, h: 0.3, fontSize: 9, fontFace: FONT.body, color: C.text,
      });
    }
    if (distribution.social_hook_ig) {
      slide.addText([{ text: 'Social hook: ', options: { bold: true } }, { text: distribution.social_hook_ig }], {
        x: 0.5, y: distY + 0.6, w: 9, h: 0.3, fontSize: 9, fontFace: FONT.body, color: C.text,
      });
    }
  }

  addFooter(slide, footer, 'Tags & Thumbnail');
}

function slideViralShorts(pres, shorts, footer) {
  if (!shorts?.length) return;
  shorts.forEach((s, i) => {
    const slide = pres.addSlide();
    slide.background = { color: C.white };
    slide.addText(`Viral Short ${i + 1}: ${s.title}`, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 22, fontFace: FONT.head, color: C.text, bold: true });

    const rows = [
      ['Clip Range', `${s.start} \u2192 ${s.end}`],
      ['Duration', `${s.duration_seconds || ''}s`],
      ['Viral Pattern', s.viral_pattern || ''],
      ['Why Viral', s.why_viral || ''],
      ['Caption', s.caption || ''],
      ['Subtitle Highlights', s.subtitle_highlight_words || ''],
    ].map((cells, j) => dataRow(cells, j % 2 === 1));

    slide.addTable([headerRow(['Field', 'Detail']), ...rows], {
      x: 0.5, y: 1.0, w: 9, colW: [2, 7], border: { pt: 0.5, color: 'D5D8DC' },
    });

    if (s.hook_line) {
      slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.0, w: 9, h: 0.8, fill: { color: C.dark } });
      slide.addText([{ text: 'HOOK: ', options: { bold: true, color: C.amber } }, { text: `"${s.hook_line}"`, options: { italic: true, color: C.white } }], {
        x: 0.7, y: 4.0, w: 8.6, h: 0.8, fontSize: 12, fontFace: FONT.body, valign: 'middle',
      });
    }
    addFooter(slide, footer, `Short ${i + 1}`);
  });
}

// ─── MAIN EXPORT ───

async function generatePptx(analysis, episodeName) {
  const { cuts, editorials, chapters } = analysis;
  const overview = cuts.episode_overview || {};
  const footer = `${episodeName}  |  Post-Production Deck`;

  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'Podcast Bot';
  pres.title = `${episodeName} - Post-Production Deck`;

  // 1. Title
  slideTitlePage(pres, overview);

  // 2. Overview
  slideOverview(pres, overview, cuts.reel_worthy_moments, footer);

  // 3. Energy Map
  slideEnergyMap(pres, cuts.energy_map, footer);

  // --- SECTION: CUTS ---
  sectionSlide(pres, 'Part 1: Episode Cuts', `${(cuts.cuts?.line_cuts?.length || 0) + (cuts.cuts?.segment_cuts?.length || 0) + (cuts.cuts?.structural_cuts?.length || 0)} cuts identified`, footer);

  slideCutsTable(pres, cuts.cuts || {}, footer);
  slideLineCuts(pres, cuts.cuts?.line_cuts, footer);
  slideReelCheck(pres, cuts.reel_preservation_check, footer);
  slideBeforeAfter(pres, cuts.before_after_flow, footer);
  slideColdOpen(pres, cuts.cold_open_recommendation, footer);

  // --- SECTION: EDITORIALS ---
  sectionSlide(pres, 'Part 2: Editorials', `${editorials.editorial_summary?.total_count || 0} editorial overlays`, footer);

  slideEditorialOverview(pres, editorials.editorial_summary, footer);

  // Split editorials into pages of 10
  const eds = editorials.editorials || [];
  for (let i = 0; i < eds.length; i += 10) {
    slideEditorialTable(pres, eds.slice(i, i + 10), footer, `${Math.floor(i / 10) + 1}/${Math.ceil(eds.length / 10)}`);
  }

  slideBroll(pres, editorials.broll_shot_list, footer);
  slideQuoteGallery(pres, editorials.quote_stamps_gallery, footer);

  // --- SECTION: CHAPTERS & YT ---
  sectionSlide(pres, 'Part 3: Chapters & YT Copy', 'Titles, chapters, description, tags & thumbnails', footer);

  slideTitles(pres, chapters.titles, footer);
  slideChapters(pres, chapters.chapters, footer);
  slideDescription(pres, chapters.youtube_description, footer);
  slideThumbnailTags(pres, chapters.thumbnail_concepts, chapters.tags, chapters.distribution_notes, footer);

  // --- VIRAL SHORTS ---
  if (chapters.viral_shorts?.length) {
    sectionSlide(pres, 'Viral Shorts', `${chapters.viral_shorts.length} reel-ready clips`, footer);
    slideViralShorts(pres, chapters.viral_shorts, footer);
  }

  const buffer = await pres.write({ outputType: 'nodebuffer' });
  return buffer;
}

module.exports = { generatePptx };
