#!/usr/bin/env node
/**
 * build-og-images (KAN-22)
 *
 * Social platforms (X/Twitter, Facebook, LinkedIn, Slack) do not render SVG for
 * `summary_large_image` cards — they need a raster at the canonical 1200×630.
 * The per-essay covers under public/covers/ are 800×500 SVGs, so this script
 * composes a fresh 1200×630 OG card per essay (matching the cover aesthetic:
 * dark canvas, gold graticule, mono eyebrow, serif title) and rasterizes it to
 * PNG with sharp. It also emits a site-level default.png for non-essay pages.
 *
 * Output lands in public/og/<slug>.png (+ default.png). Because SVG→PNG text
 * rendering depends on locally installed fonts, the PNGs are generated once and
 * committed to the repo rather than built in CI — keeping social previews
 * deterministic regardless of the runner's font stack. Re-run after adding an
 * essay or changing a title:
 *
 *   npm run build-og-images
 *
 * Requires: sharp (already present transitively via Astro's image service).
 */
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, basename } from 'node:path';
import matter from 'gray-matter';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const essaysDir = join(root, 'src', 'content', 'essays');
const outDir = join(root, 'public', 'og');

const W = 1200;
const H = 630;
const SITE = 'Terra Chartarum';

// Palette (design tokens — kept in sync with src/styles/global.css).
const CANVAS = '#0a0806';
const CANVAS_HI = '#1a1408';
const GOLD = '#d4b87a';
const INK = '#e8dec5';
const INK_MUTED = '#c0ad88';

/** Escape text for safe inclusion in SVG markup. */
function esc(s) {
  return String(s).replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c],
  );
}

/**
 * Greedy word-wrap into at most `maxLines` lines, budgeting by an approximate
 * character width so long titles don't overflow the card. Returns the lines
 * (last line ellipsized if the title didn't fit).
 */
function wrap(text, maxCharsPerLine, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharsPerLine && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    // Ran out of lines — mark truncation if there was more text.
    const consumed = lines.join(' ').length;
    if (consumed < text.length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\W?$/, '…');
  }
  return lines;
}

/** Build the OG card SVG for one essay (or the site default when title is null). */
function ogSvg({ eyebrow, title, subtitle, accent = GOLD }) {
  const titleLines = wrap(title, 22, 2);
  const titleFontSize = titleLines.some((l) => l.length > 16) ? 88 : 100;
  const titleStartY = 300 - (titleLines.length - 1) * (titleFontSize * 0.55);
  const titleTspans = titleLines
    .map(
      (l, i) =>
        `<text x="80" y="${Math.round(titleStartY + i * titleFontSize * 1.06)}" fill="${
          i === titleLines.length - 1 ? accent : INK
        }" font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" font-weight="600"${
          i === titleLines.length - 1 ? ' font-style="italic"' : ''
        }>${esc(l)}</text>`,
    )
    .join('\n    ');

  const subtitleY = Math.round(titleStartY + titleLines.length * titleFontSize * 1.06 + 40);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="72%" cy="8%" r="95%">
      <stop offset="0%" stop-color="${CANVAS_HI}"/>
      <stop offset="100%" stop-color="${CANVAS}"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g stroke="${accent}" stroke-width="1.5" fill="none" opacity="0.16">
    <circle cx="900" cy="315" r="90"/><circle cx="900" cy="315" r="180"/>
    <circle cx="900" cy="315" r="270"/><circle cx="900" cy="315" r="360"/>
    <path d="M540 315 H1200 M900 -45 V675"/>
    <path d="M660 75 L1140 555 M1140 75 L660 555"/>
  </g>
  <text x="80" y="120" fill="${INK_MUTED}" font-family="'IBM Plex Mono', monospace" font-size="26" letter-spacing="8">${esc(
    eyebrow,
  )}</text>
    ${titleTspans}
  <text x="80" y="${subtitleY}" fill="${INK_MUTED}" font-family="Georgia, serif" font-size="34" font-style="italic">${esc(
    subtitle,
  )}</text>
  <rect x="0" y="${H - 8}" width="${W}" height="8" fill="${accent}" opacity="0.85"/>
</svg>`;
}

async function render(svg, outPath) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(outPath, png);
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const files = (await readdir(essaysDir)).filter((f) => /\.mdx?$/.test(f));
  const results = [];

  for (const file of files) {
    const slug = basename(file, extname(file));
    const raw = await readFile(join(essaysDir, file), 'utf8');
    const { data } = matter(raw);
    const svg = ogSvg({
      eyebrow: SITE.toUpperCase(),
      title: data.title,
      subtitle: data.subtitle ?? '',
      accent: data.accent ?? GOLD,
    });
    const out = join(outDir, `${slug}.png`);
    await render(svg, out);
    results.push(`  ${slug}.png`);
  }

  // Site-level default for non-essay pages (home, atlas, essays index).
  const defaultSvg = ogSvg({
    eyebrow: 'AN INTERACTIVE HISTORICAL ATLAS',
    title: 'Terra Chartarum',
    subtitle: 'A gallery of cartographic visual essays',
  });
  await render(defaultSvg, join(outDir, 'default.png'));
  results.push('  default.png');

  console.log(`Generated ${results.length} OG image(s) → public/og/\n${results.join('\n')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
