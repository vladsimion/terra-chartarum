import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every essay accent has to be readable on the canvas it is painted on
 * (KAN-389).
 *
 * This was found by an axe run, not by a person. `accent` is per-essay
 * frontmatter and the shared essay chrome paints small text with it - the
 * breadcrumb bar above the title, among other things - so an accent chosen for
 * how it looks on a cover image silently decides whether that text passes WCAG
 * AA. Two of twenty-one essays were below 4.5:1 and had been since they were
 * written: `maps-for-a-crusade` at 4.05 and `borroczyn` at 4.12.
 *
 * An axe run catches this only on a page somebody wrote a spec for, and only
 * once the essay is rendered - which for a held essay means never, since its
 * route 404s. Checking the token itself catches it at the point of choosing.
 *
 * The fix for both was to raise lightness and leave hue and saturation alone,
 * so the essays kept their colour and gained the contrast.
 */
const CANVAS = '#0a0806'; // --canvas in src/styles/tokens.css
const AA_NORMAL = 4.5;

const ESSAY_DIR = join(process.cwd(), 'src', 'content', 'essays');

function relativeLuminance(hex: string): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const accents = readdirSync(ESSAY_DIR)
  .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
  .map((file) => {
    const source = readFileSync(join(ESSAY_DIR, file), 'utf8');
    const match = /^accent:\s*'?(#[0-9a-fA-F]{6})'?/m.exec(source);
    return {
      slug: file.replace(/\.mdx?$/, ''),
      file,
      accent: match?.[1]?.toLowerCase() ?? null,
    };
  });

describe('essay accents are readable on the canvas', () => {
  it('finds accents to check', () => {
    // Guards against the frontmatter key being renamed and this whole suite
    // quietly passing over an empty list.
    expect(accents.filter((entry) => entry.accent).length).toBeGreaterThan(15);
  });

  it('uses a six-digit hex for every declared accent', () => {
    // An essay may decline to set an accent and inherit the default. What it
    // may not do is declare one in a form this check cannot read, because the
    // contrast assertion below would then skip it in silence.
    const unreadable = accents
      .filter((entry) => entry.accent === null)
      .filter((entry) => /^accent:/m.test(readFileSync(join(ESSAY_DIR, entry.file), 'utf8')))
      .map((entry) => entry.slug);
    expect(unreadable).toEqual([]);
  });

  it('meets WCAG AA for normal text against the canvas', () => {
    const failing = accents
      .filter((entry) => entry.accent)
      .map((entry) => ({ ...entry, ratio: contrast(entry.accent!, CANVAS) }))
      .filter((entry) => entry.ratio < AA_NORMAL)
      .map((entry) => `${entry.slug}: ${entry.accent} is ${entry.ratio.toFixed(2)}:1`);
    expect(failing).toEqual([]);
  });

  it('holds the two that were fixed above the threshold', () => {
    // Named so a later edit that reverts either one fails here with the reason
    // rather than in an axe run on a page whose route is 404 in production.
    for (const slug of ['maps-for-a-crusade', 'borroczyn']) {
      const entry = accents.find((candidate) => candidate.slug === slug);
      expect(entry?.accent, slug).toBeTruthy();
      expect(contrast(entry!.accent!, CANVAS), slug).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});
