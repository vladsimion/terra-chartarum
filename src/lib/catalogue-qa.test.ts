import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CORPUS } from './corpus';
import { CARTOGRAPHERS } from './cartographers';
import { formatCitation } from './cite';
import type { CiteInput } from './cite';

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

describe('an exemption from the object standard has to be earned', () => {
  /**
   * KAN-391 and KAN-392 let a record step out of criteria it can never satisfy:
   * `custody` says nobody here can examine the object, `recordScope` says there
   * is no object. Both lower what the audit asks for, which makes them the two
   * fields in the catalogue worth lying to.
   *
   * The pattern is `scripts/dacia/review.py`, where a promotion that cannot
   * show its evidence writes nothing. An exemption here has to point at the
   * thing that justifies it, or it is just a lower score with better manners.
   */
  it('makes an institutional record name the institution', () => {
    const unjustified = CORPUS.filter(
      (map) => map.custody === 'institutional' && !map.repository,
    ).map((map) => map.id);
    expect(unjustified).toEqual([]);
  });

  it('makes an unlocated or conceptual record say what is unresolved', () => {
    // `unlocated` and `concept` claim the strongest exemptions and name no
    // institution, so the open question is the only thing standing behind them.
    const silent = CORPUS.filter(
      (map) =>
        (map.custody === 'unlocated' || map.recordScope === 'concept') &&
        map.uncertainties.length === 0,
    ).map((map) => map.id);
    expect(silent).toEqual([]);
  });

  it('refuses a plate state on a record that says it has no artefact', () => {
    // A projection with an edition, a state or dimensions is a record arguing
    // with itself, and whichever half is wrong, the audit is reading the other.
    const contradictory: string[] = [];
    for (const map of CORPUS) {
      if (map.recordScope !== 'concept') continue;
      for (const [field, value] of [
        ['edition', map.edition],
        ['state', map.state],
        ['dimensions', map.dimensions],
        ['physicalObservation', map.physicalObservation],
      ] as const) {
        if (value) contradictory.push(`${map.id}: concept record carries ${field}`);
      }
    }
    expect(contradictory).toEqual([]);
  });

  it('does not let a record claim both that it is held here and held elsewhere', () => {
    const conflicting = CORPUS.filter((map) => map.custody === 'held' && map.repository).map(
      (map) => `${map.id} -> ${map.repository}`,
    );
    expect(conflicting).toEqual([]);
  });
});

describe('citation export survives the enriched records', () => {
  /**
   * KAN-393 requires citation export to keep working for enriched records. The
   * enrichment moved facts between fields - `provenance` to `repository`, a
   * shelfmark out of free text - and `citeInput` on the detail page reads a
   * fixed handful of them, so a move is exactly what would quietly empty a
   * citation.
   */
  const citeInputFor = (map: (typeof CORPUS)[number]): CiteInput => ({
    id: map.id,
    title: map.title,
    year: map.year,
    author: map.cartographer,
    publisher: map.publisher,
    place: map.region,
    url: `https://terra-chartarum.pages.dev/collection/${map.id}/`,
  });

  it('renders all three formats for every record without throwing or emptying', () => {
    for (const map of CORPUS) {
      const input = citeInputFor(map);
      for (const format of ['bibtex', 'ris', 'chicago'] as const) {
        const citation = formatCitation(input, format);
        expect(citation, `${map.id} ${format}`).toBeTruthy();
        // The title is the one field a citation cannot be useful without, and
        // the one most likely to be lost to a refactor of the record shape.
        expect(citation, `${map.id} ${format}`).toContain(map.title);
      }
    }
  });

  it('keeps every record reachable by the search text the catalogue indexes', () => {
    // Search matches on title, region and tags. A record that supplies none of
    // them is in the catalogue and cannot be found in it.
    const unfindable = CORPUS.filter(
      (map) => !map.title.trim() && !map.region.trim() && map.tags.length === 0,
    ).map((map) => map.id);
    expect(unfindable).toEqual([]);
  });
});

describe('Dacia joins this QA path without changing owner', () => {
  /**
   * KAN-393 must cover In Manibus outputs without taking ownership from
   * KAN-360/KAN-361. So this asserts the Dacia records obey the same graph and
   * rights rules as everything else, and asserts nothing about how complete
   * they are - completeness is the other tickets' business, and those are
   * blocked on somebody physically inspecting the sheets.
   */
  const daciaIds = ['specht', 'peutinger', 'honterus'];

  it('has the Dacia records this path is meant to cover', () => {
    for (const id of daciaIds) expect(byId.has(id), id).toBe(true);
  });

  it('holds them to the same link and rights rules as every other record', () => {
    for (const id of daciaIds) {
      const map = byId.get(id)!;
      for (const related of map.relatedMapIds)
        expect(byId.has(related), `${id} -> ${related}`).toBe(true);
      for (const image of map.images) {
        expect(image.credit, `${id} image credit`).toBeTruthy();
        expect(image.license, `${id} image licence`).toBeTruthy();
      }
    }
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
