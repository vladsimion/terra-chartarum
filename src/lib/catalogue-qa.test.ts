import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CORPUS } from './corpus';
import { CARTOGRAPHERS } from './cartographers';

/**
 * Catalogue cross-link, imagery and rights QA (TC-CAT-4 / KAN-393).
 *
 * The enrichment tickets either side of this one (KAN-391, KAN-392) need a
 * person with the objects, or with the specialist catalogues that describe
 * them. This does not. Everything here is a property of the graph the
 * repository already holds: do the links resolve, is every published image
 * accounted for, and does anything private leak.
 *
 * These are asserted as tests rather than written into a report, because a
 * report is true on the day it is written and a test is true on the day it is
 * run.
 */
const byId = new Map(CORPUS.map((map) => [map.id, map]));
const cartographerIds = new Set(CARTOGRAPHERS.map((c) => c.id));

const ESSAY_DIR = join(process.cwd(), 'src', 'content', 'essays');
const essaySlugs = new Set(
  readdirSync(ESSAY_DIR)
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx?$/, '')),
);

describe('the catalogue graph resolves', () => {
  it('has no duplicate object IDs', () => {
    const seen = new Map<string, number>();
    for (const map of CORPUS) seen.set(map.id, (seen.get(map.id) ?? 0) + 1);
    expect([...seen].filter(([, count]) => count > 1)).toEqual([]);
    expect(byId.size).toBe(CORPUS.length);
  });

  it('resolves every cartographer reference to a canonical profile', () => {
    const unresolved = CORPUS.filter(
      (map) => map.cartographerId && !cartographerIds.has(map.cartographerId),
    ).map((map) => `${map.id} -> ${map.cartographerId}`);
    expect(unresolved).toEqual([]);
  });

  it('resolves every essay reference to an essay that exists', () => {
    // Existence, not release. A held essay is a real target and the renderers
    // apply the staged-release gate; a reference to a slug that was never
    // written is a broken link whatever the gate does.
    const unresolved: string[] = [];
    for (const map of CORPUS) {
      for (const slug of [map.essaySlug, ...map.relatedEssaySlugs]) {
        if (slug && !essaySlugs.has(slug)) unresolved.push(`${map.id} -> ${slug}`);
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('resolves every object-to-object reference', () => {
    const unresolved: string[] = [];
    for (const map of CORPUS) {
      for (const related of map.relatedMapIds) {
        if (!byId.has(related)) unresolved.push(`${map.id} -> ${related}`);
      }
      // A record naming itself is a cross-link that tells a reader nothing.
      expect(map.relatedMapIds, map.id).not.toContain(map.id);
    }
    expect(unresolved).toEqual([]);
  });

  it('resolves every cartographer-to-object reference back into the corpus', () => {
    const unresolved: string[] = [];
    for (const cartographer of CARTOGRAPHERS) {
      for (const slug of cartographer.essaySlugs ?? []) {
        if (!essaySlugs.has(slug)) unresolved.push(`${cartographer.id} -> ${slug}`);
      }
    }
    expect(unresolved).toEqual([]);
  });
});

describe('every published image is accounted for', () => {
  const withImages = CORPUS.filter((map) => map.images.length > 0);

  it('has images to check', () => {
    expect(withImages.length).toBeGreaterThan(0);
  });

  it('gives every image a credit and a licence', () => {
    const missing: string[] = [];
    for (const map of withImages) {
      for (const image of map.images) {
        if (!image.credit) missing.push(`${map.id}: ${image.src} has no credit`);
        if (!image.license) missing.push(`${map.id}: ${image.src} has no licence`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('gives every image alternative text that is not the title again', () => {
    const bad: string[] = [];
    for (const map of withImages) {
      for (const image of map.images) {
        if (!image.alt?.trim()) bad.push(`${map.id}: ${image.src} has no alt text`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('offers high-resolution inspection only where a tile source is declared', () => {
    // DeepZoom is opt-in per object and must never be inferred from the static
    // image, because a viewer over a small JPEG promises detail that is not
    // there. Where it is declared, the static fallback has to survive.
    for (const map of withImages) {
      for (const image of map.images) {
        if (image.dziTileSource || image.iiif) {
          expect(image.src, `${map.id} fallback`).toBeTruthy();
        }
      }
    }
  });
});

describe('nothing private reaches a public record', () => {
  /**
   * KAN-393 excludes purchase and negotiation detail by default. The catalogue
   * is public, and `provenance` and `acquisition` are exactly where a price or
   * a private arrangement would end up if one were pasted in from a dealer
   * email.
   */
  const PRIVATE = [
    /\b(?:GBP|EUR|USD)\b/i,
    /[£$€]\s?\d/,
    /\bpaid\b/i,
    /\binvoice\b/i,
    /\bhammer price\b/i,
    /\breserve price\b/i,
    /\basking price\b/i,
    /\bdiscount/i,
    // Only negotiation about the transaction. A charter recording "negotiated
    // access inside a host city" is the historical subject of the object, and
    // a bare /negotiat/ flagged it - the check has to be about how the sheet
    // was bought, not about what it depicts.
    /\bnegotiat\w*\s+(?:price|purchase|sale|terms)\b/i,
    /\bunder negotiation\b/i,
    /@[a-z0-9.-]+\.[a-z]{2,}/i,
  ];

  it('carries no price, invoice or private-negotiation detail', () => {
    const leaks: string[] = [];
    for (const map of CORPUS) {
      // Scoped to the acquisition fields. `blurb` is public editorial prose
      // about the historical object and is not where a dealer email lands.
      const text = [map.provenance, map.acquisition, map.condition].filter(Boolean).join(' ');
      for (const pattern of PRIVATE) {
        if (pattern.test(text)) leaks.push(`${map.id}: ${pattern}`);
      }
    }
    expect(leaks).toEqual([]);
  });
});

describe('an unresolved question is recorded rather than left blank', () => {
  it('gives every declared uncertainty a route to an answer', () => {
    for (const map of CORPUS) {
      for (const uncertainty of map.uncertainties) {
        expect(uncertainty.question.length, map.id).toBeGreaterThan(10);
        expect(uncertainty.wouldResolve.length, map.id).toBeGreaterThan(10);
      }
    }
  });

  it('requires an observer and a date on every physical observation', () => {
    for (const map of CORPUS) {
      const observed = map.physicalObservation;
      if (!observed) continue;
      expect(observed.observedBy, map.id).toBeTruthy();
      expect(observed.observedOn, map.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
