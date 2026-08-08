import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getCorpus } from './corpus';

const root = process.cwd();
const essayPath = join(root, 'src', 'content', 'essays', 'the-league-that-left-no-map.mdx');
const read = (path: string) => readFile(join(root, path), 'utf8');

const sections = [
  'prologue-remove-network',
  'merchants-before-league',
  'four-cities-inside-other-cities',
  'city-is-unit',
  'goods-draw-different-leagues',
  'power-without-sovereignty',
  'charter-is-a-map',
  'sea-becomes-legible',
  'epilogue-sea-between-cities',
];

const interactives = [
  'NetworkReveal',
  'KontorProfile',
  'CommodityNetworkMap',
  'PrivilegeTimeline',
  'CityWitnessStrip',
  'VeniceHanseaticComparison',
];

describe('native Hanseatic essay (KAN-312)', () => {
  it('ships the approved nine-section, 5,000–8,000-word argument', async () => {
    const essay = await readFile(essayPath, 'utf8');
    const body = essay.split('---').slice(2).join(' ');
    const words = body
      .replace(/<[^>]+>/g, ' ')
      .replace(/[{}[\]()`*_#]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(5000);
    expect(words.length).toBeLessThanOrEqual(8000);
    for (const id of sections) {
      expect(essay).toContain(`id="${id}"`);
      expect(essay).toContain(`  - id: ${id}`);
    }
  });

  it('resolves high-stakes prose claims to the evidence-ledger projection', async () => {
    const essay = await readFile(essayPath, 'utf8');
    expect(essay.match(/#hse-claim-/g)?.length).toBeGreaterThanOrEqual(15);
    expect(essay).toContain('<EvidenceLedger');
    expect(essay).toContain("'hse-claim-1669-conventional-terminus'");
  });
});

describe('Hanseatic interactive suite (KAN-313)', () => {
  it('renders every required component from the native essay', async () => {
    const essay = await readFile(essayPath, 'utf8');
    for (const component of interactives) {
      expect(essay).toContain(`import ${component} from`);
      expect(essay).toContain(`<${component}`);
    }
  });

  it('keeps controls keyboard-native, exposes transcripts and respects reduced motion', async () => {
    const files = await Promise.all([
      read('src/components/hanseatic/NetworkReveal.astro'),
      read('src/components/hanseatic/CommodityNetworkMap.astro'),
      read('src/components/hanseatic/PrivilegeTimeline.astro'),
      read('src/components/hanseatic/CityWitnessStrip.astro'),
      read('src/components/hanseatic/VeniceHanseaticComparison.astro'),
    ]);
    const source = files.join('\n');
    expect(source).toContain('<button');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('<details>');
    expect(source).toContain('prefers-reduced-motion');
  });

  it('publishes eight rights-cleared catalogue witnesses', () => {
    const witnesses = getCorpus().filter(
      (map) =>
        map.essaySlug === 'the-league-that-left-no-map' &&
        map.publicationStatus === 'published_witness',
    );
    expect(witnesses).toHaveLength(8);
    for (const witness of witnesses) {
      expect(witness.repository).toBeTruthy();
      expect(witness.repositoryId).toBeTruthy();
      expect(witness.sourceUrl).toMatch(/^https:\/\//);
      expect(witness.rightsStatement).toMatch(/public domain/i);
    }
  });
});

describe('Venice–Hanseatic comparison (KAN-314)', () => {
  it('keeps VMN and HSE as separate inputs and supplies a static fallback', async () => {
    const comparison = await read('src/components/hanseatic/VeniceHanseaticComparison.astro');
    expect(comparison).toContain("from '../../lib/vmn'");
    expect(comparison).toContain("from '../../lib/vmn-network'");
    expect(comparison).toContain("from '../../lib/hanseatic'");
    expect(comparison).toContain('role="tablist"');
    expect(comparison).toContain('Read the complete comparison without interaction');
  });

  it('has three reciprocal incoming links and three outgoing links', async () => {
    const [venice, trade, cities, comparison] = await Promise.all([
      read('src/content/essays/venice-sicily.mdx'),
      read('src/content/essays/invisible-maps-trade.mdx'),
      read('src/content/essays/cities-remember.mdx'),
      read('src/components/hanseatic/VeniceHanseaticComparison.astro'),
    ]);
    for (const source of [venice, trade, cities]) {
      expect(source).toContain('/essays/the-league-that-left-no-map/#');
    }
    expect(comparison.match(/<a href="\/(?:essays|collection)\//g)).toHaveLength(3);
  });
});
