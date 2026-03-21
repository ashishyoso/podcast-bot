/**
 * Parse .srt subtitle files and .txt transcript files into clean text.
 * For SRT files, also extracts timestamp mappings for chapter generation.
 */

function parseSRT(content) {
  const blocks = content.trim().split(/\n\s*\n/);
  const entries = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const timeLine = lines[1];
    const timeMatch = timeLine.match(
      /(\d{2}:\d{2}:\d{2}[,.]?\d*)\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]?\d*)/
    );
    if (!timeMatch) continue;

    const text = lines.slice(2).join(' ').trim();
    if (!text) continue;

    entries.push({
      start: timeMatch[1].replace(',', '.'),
      end: timeMatch[2].replace(',', '.'),
      text,
    });
  }

  return entries;
}

function srtToTranscript(content) {
  const entries = parseSRT(content);
  const plainText = entries.map((e) => e.text).join(' ');
  return {
    plainText,
    entries,
    hasTimestamps: true,
  };
}

function txtToTranscript(content) {
  return {
    plainText: content.trim(),
    entries: [],
    hasTimestamps: false,
  };
}

function parseTranscript(content, filename) {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'srt') {
    return srtToTranscript(content);
  }
  return txtToTranscript(content);
}

module.exports = { parseTranscript, parseSRT };
