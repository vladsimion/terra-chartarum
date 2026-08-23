import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { describe, it, expect, beforeAll } from 'vitest';
import { GEO_LAYERS } from './geo';
import { GEO_COLLECTIONS } from './geo-collections';
import {
  collectHeadings,
  extractPublicSections,
  handbookCoverage,
  headingId,
  projectHandbook,
  stripLeadingH1,
  type RawHandbookEntry,
} from './handbook-projection';

// The projection pipeline (ATLAS-1216 / KAN-412). Vitest has no content layer,
// so the real corpus is read off disk - the same approach the essay tests take.

const HANDBOOK_DIR = join(process.cwd(), 'src', 'content', 'handbook');

/**
 * Frontmatter is parsed with the same YAML library Astro uses, so what these
 * tests validate is what the content collection will hand the projection.
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('missing frontmatter');
  return { data: (parseYaml(match[1]) ?? {}) as Record<string, unknown>, body: match[2] };
}

let entries: RawHandbookEntry[];

beforeAll(async () => {
  const files = (await readdir(HANDBOOK_DIR)).filter((name) => name.endsWith('.md'));
  entries = [];
  for (const file of files) {
    const raw = await readFile(join(HANDBOOK_DIR, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const sourcePath = data.sourcePath as string | undefined;
    entries.push({
      data,
      body,
      sourceMarkdown: sourcePath
        ? await readFile(join(process.cwd(), sourcePath), 'utf8')
        : undefined,
    });
  }
});

const context = () => ({
  layerIds: GEO_LAYERS.map((l) => l.id),
  collectionIds: GEO_COLLECTIONS.map((c) => c.id),
  releasedEssaySlugs: ['dacia', 'venice-sicily', 'the-league-that-left-no-map'],
});

describe('the seeded corpus projects cleanly', () => {
  it('validates with no errors', () => {
    const projection = projectHandbook(entries, context());
    expect(projection.errors).toEqual([]);
  });

  it('publishes every seeded record and gives each a body', () => {
    const projection = projectHandbook(entries, context());
    expect(projection.docs.length).toBe(entries.length);
    for (const entry of projection.docs) {
      expect(entry.body.length, entry.doc.id).toBeGreaterThan(200);
      expect(entry.headings.length, entry.doc.id).toBeGreaterThan(0);
    }
  });

  it('routes layer records at their canonical layer ID', () => {
    const projection = projectHandbook(entries, context());
    expect(projection.routes['roman-empire-117']).toBe('/atlas/layers/roman-empire-117/');
    expect(projection.routes['map-coverage']).toBe('/atlas/layers/map-coverage/');
    expect(projection.routes['ne-boundaries']).toBe('/atlas/layers/ne-boundaries/');
  });

  it('closes the two documentation gaps the KAN-409 audit found', () => {
    const projection = projectHandbook(entries, context());
    for (const layerId of ['roman-empire-117', 'map-coverage']) {
      expect(projection.routes[layerId], layerId).toBeTruthy();
    }
  });

  it('keeps the present-day boundary record minimal and warned', () => {
    const projection = projectHandbook(entries, context());
    const record = projection.docs.find((d) => d.doc.layerId === 'ne-boundaries')!;
    expect(record.doc.minimalContext).toBe(true);
    expect(record.doc.anachronismNote).toContain('anachronism');
  });

  it('projects the Pattern A record from its repository source, not from a body', () => {
    const projection = projectHandbook(entries, context());
    const technical = projection.docs.find((d) => d.doc.id === 'technical-geo-layers')!;
    expect(technical.doc.pattern).toBe('A');
    expect(technical.body).not.toMatch(/^#\s/m);
    expect(technical.body).toContain('Terra Chartarum publishes historical GIS');
    expect(technical.route).toBe('/atlas/handbook/technical/geo-layers/');
  });

  it('sends a reader to GitHub only through an advanced technical link', () => {
    const projection = projectHandbook(entries, context());
    for (const entry of projection.docs) {
      const bodyLinks = entry.body.match(/https:\/\/github\.com\/\S+/g) ?? [];
      expect(bodyLinks, entry.doc.id).toEqual([]);
    }
  });
});

describe('public-section extraction', () => {
  it('publishes the whole document when it declares no markers', () => {
    expect(extractPublicSections('# Title\n\nBody.')).toBe('# Title\n\nBody.');
  });

  it('publishes only the marked sections when markers are present', () => {
    const source = [
      '# Doc',
      'internal preamble',
      '<!-- public:start -->',
      '## Public one',
      '<!-- public:end -->',
      'internal middle',
      '<!-- public:start -->',
      '## Public two',
      '<!-- public:end -->',
      'internal tail',
    ].join('\n');
    const extracted = extractPublicSections(source);
    expect(extracted).toBe('## Public one\n\n## Public two');
    expect(extracted).not.toContain('internal');
  });

  it("drops a projected document's own title so the page keeps one h1", () => {
    expect(stripLeadingH1('# Title\n\n## Section\n\nBody.')).toBe('## Section\n\nBody.');
    expect(stripLeadingH1('\n\n# Title\nBody.')).toBe('Body.');
  });

  it('leaves a document alone when it has no leading title', () => {
    expect(stripLeadingH1('## Section\n\n# Later')).toBe('## Section\n\n# Later');
  });

  it('refuses an unclosed marker rather than guessing where public ends', () => {
    expect(() => extractPublicSections('<!-- public:start -->\nopen forever')).toThrow(
      /Unclosed public section marker/,
    );
  });
});

describe('heading anchors are deterministic', () => {
  it('normalises text to a stable slug', () => {
    expect(headingId('Sources and evidence')).toBe('sources-and-evidence');
    expect(headingId('`geometry_provenance` and what it means')).toBe(
      'geometry_provenance-and-what-it-means',
    );
  });

  it('disambiguates repeated headings without reordering them', () => {
    const headings = collectHeadings('## Notes\n\n## Notes\n\n## Notes');
    expect(headings.map((h) => h.id)).toEqual(['notes', 'notes-1', 'notes-2']);
  });

  it('ignores headings inside fenced code', () => {
    const headings = collectHeadings('## Real\n\n```\n## Not a heading\n```\n\n## Also real');
    expect(headings.map((h) => h.text)).toEqual(['Real', 'Also real']);
  });
});

describe('the pipeline refuses to publish what it should not', () => {
  const base = {
    id: 'probe',
    title: 'Probe',
    summary: 'A fixture.',
    docType: 'method',
    pattern: 'B',
    programme: 'atlas',
    routeSlug: 'probe',
    lifecycle: 'published',
    lastReviewed: '2026-08-23',
  };

  it('rejects a Pattern B record with no body', () => {
    const projection = projectHandbook([{ data: base, body: '   ' }], context());
    expect(projection.errors.join(' ')).toContain('has no body');
  });

  it('rejects a Pattern A record that authors its own prose', () => {
    const projection = projectHandbook(
      [{ data: { ...base, pattern: 'A' }, body: 'a second copy', sourceMarkdown: '# Source' }],
      context(),
    );
    expect(projection.errors.join(' ')).toContain('must not author its own body');
  });

  it('rejects a Pattern A record with no source document', () => {
    const projection = projectHandbook([{ data: { ...base, pattern: 'A' }, body: '' }], context());
    expect(projection.errors.join(' ')).toContain('no source document to project');
  });

  it('reports a malformed record without throwing', () => {
    const projection = projectHandbook(
      [{ data: { ...base, docType: 'invented-type' }, body: 'body' }],
      context(),
    );
    expect(projection.errors.length).toBeGreaterThan(0);
    expect(projection.docs).toEqual([]);
  });

  it('keeps a draft record out of the published output', () => {
    const projection = projectHandbook(
      [{ data: { ...base, lifecycle: 'draft', lastReviewed: undefined }, body: 'body' }],
      context(),
    );
    expect(projection.errors).toEqual([]);
    expect(projection.docs).toEqual([]);
  });
});

describe('coverage report', () => {
  it('lists published layers with no documentation record', () => {
    const projection = projectHandbook(entries, context());
    const { rows, undocumented } = handbookCoverage(GEO_LAYERS, projection);
    expect(rows).toHaveLength(GEO_LAYERS.length);
    expect(undocumented).not.toContain('roman-empire-117');
    expect(undocumented).not.toContain('map-coverage');
    // The programme families are KAN-413 and KAN-414's work and are still open.
    expect(undocumented).toContain('venetian-ports');
    expect(undocumented).toContain('dacia-treaty-frontiers');
  });

  it('marks the context record as a minimal-context exemption', () => {
    const projection = projectHandbook(entries, context());
    const { rows } = handbookCoverage(GEO_LAYERS, projection);
    expect(rows.find((r) => r.layerId === 'ne-boundaries')?.minimalContext).toBe(true);
  });
});
