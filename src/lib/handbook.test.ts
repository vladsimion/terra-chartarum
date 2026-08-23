import { describe, it, expect } from 'vitest';
import {
  HANDBOOK_DOC_TYPES,
  HANDBOOK_INDEX_ROUTES,
  HANDBOOK_LIFECYCLES,
  HANDBOOK_ROOT,
  HandbookDocSchema,
  LAYER_ROUTE_ROOT,
  PUBLISHABLE_LIFECYCLES,
  assertNoGovernanceDependency,
  documentationRoutes,
  handbookRoute,
  isPublishable,
  validateHandbookDocs,
  type HandbookDoc,
} from './handbook';

// The Handbook content model and route contract (ATLAS-1214 / KAN-410).

function doc(overrides: Record<string, unknown> = {}): HandbookDoc {
  return HandbookDocSchema.parse({
    id: 'probe-doc',
    title: 'Probe',
    summary: 'A fixture.',
    docType: 'method',
    pattern: 'B',
    programme: 'atlas',
    routeSlug: 'probe',
    lifecycle: 'published',
    lastReviewed: '2026-08-23',
    ...overrides,
  });
}

const CONTEXT = {
  layerIds: ['venetian-ports', 'ne-boundaries', 'dacia-treaty-frontiers'],
  collectionIds: ['venetian-maritime-network'],
  releasedEssaySlugs: ['venice-sicily'],
  sourceIds: ['src-lane-1973'],
};

describe('vocabularies and routes are frozen', () => {
  it('declares the seven document types', () => {
    expect([...HANDBOOK_DOC_TYPES]).toEqual([
      'layer',
      'method',
      'evidence',
      'data-fields',
      'glossary',
      'editorial-decision',
      'technical',
    ]);
  });

  it('publishes only from published and in-review', () => {
    expect([...HANDBOOK_LIFECYCLES]).toEqual(['published', 'in-review', 'draft', 'internal']);
    expect([...PUBLISHABLE_LIFECYCLES]).toEqual(['published', 'in-review']);
    expect(isPublishable({ lifecycle: 'draft' })).toBe(false);
    expect(isPublishable({ lifecycle: 'internal' })).toBe(false);
  });

  it('routes a layer document at its canonical ID, with no alias', () => {
    expect(handbookRoute({ docType: 'layer', layerId: 'venetian-ports' })).toBe(
      `${LAYER_ROUTE_ROOT}venetian-ports/`,
    );
  });

  it('routes each shared type under the handbook root', () => {
    expect(handbookRoute({ docType: 'method', routeSlug: 'dacia-shared-gis' })).toBe(
      `${HANDBOOK_ROOT}methods/dacia-shared-gis/`,
    );
    expect(handbookRoute({ docType: 'evidence', routeSlug: 'treaty-frontiers' })).toBe(
      `${HANDBOOK_ROOT}evidence/treaty-frontiers/`,
    );
    expect(handbookRoute({ docType: 'data-fields', routeSlug: 'vmn' })).toBe(
      `${HANDBOOK_ROOT}data-fields/vmn/`,
    );
    expect(
      handbookRoute({ docType: 'editorial-decision', routeSlug: 'network-not-territory' }),
    ).toBe(`${HANDBOOK_ROOT}decisions/network-not-territory/`);
    expect(handbookRoute({ docType: 'technical', routeSlug: 'geo-release' })).toBe(
      `${HANDBOOK_ROOT}technical/geo-release/`,
    );
  });

  it('keeps the glossary a singleton route', () => {
    expect(handbookRoute({ docType: 'glossary' })).toBe(`${HANDBOOK_ROOT}glossary/`);
  });

  it('keeps every index route inside the handbook and trailing-slashed', () => {
    for (const entry of HANDBOOK_INDEX_ROUTES) {
      expect(entry.route.startsWith(HANDBOOK_ROOT), entry.route).toBe(true);
      expect(entry.route.endsWith('/'), entry.route).toBe(true);
    }
  });
});

describe('the record schema enforces its own semantics', () => {
  it('requires a layerId on a layer record and forbids it elsewhere', () => {
    expect(() => HandbookDocSchema.parse({ ...rawLayerDoc(), layerId: undefined })).toThrow(
      /must name the layer/,
    );
    expect(() => doc({ layerId: 'venetian-ports' })).toThrow(/not a layer record/);
  });

  it('forbids a slug where the identity is already canonical', () => {
    expect(() => HandbookDocSchema.parse({ ...rawLayerDoc(), routeSlug: 'ports' })).toThrow(
      /must not declare a slug/,
    );
    expect(() =>
      HandbookDocSchema.parse({
        id: 'glossary',
        title: 'Glossary',
        summary: 'Terms.',
        docType: 'glossary',
        pattern: 'B',
        programme: 'atlas',
        lifecycle: 'draft',
        routeSlug: 'glossary',
      }),
    ).toThrow(/must not declare a slug/);
  });

  it('requires a slug for every routed shared type', () => {
    expect(() => doc({ routeSlug: undefined })).toThrow(/needs a route slug/);
  });

  it('requires a review date before anything is published', () => {
    expect(() => doc({ lastReviewed: undefined })).toThrow(/last reviewed/);
    expect(doc({ lifecycle: 'draft', lastReviewed: undefined }).lifecycle).toBe('draft');
  });

  it('allows the minimal-context exemption only on a layer record', () => {
    expect(() => doc({ minimalContext: true })).toThrow(/Only a layer record/);
    const context = HandbookDocSchema.parse({
      ...rawLayerDoc(),
      layerId: 'ne-boundaries',
      minimalContext: true,
      anachronismNote: 'Present-day borders drawn over historical material.',
    });
    expect(context.anachronismNote).toBeTruthy();
  });

  it('rejects an anachronism note outside a context record', () => {
    expect(() =>
      HandbookDocSchema.parse({ ...rawLayerDoc(), anachronismNote: 'stray note' }),
    ).toThrow(/outside a context record/);
  });

  it('defaults an unspecified lifecycle to draft, so nothing publishes by accident', () => {
    const parsed = HandbookDocSchema.parse({
      id: 'unspecified',
      title: 'Unspecified',
      summary: 'No lifecycle declared.',
      docType: 'method',
      pattern: 'A',
      programme: 'atlas',
      routeSlug: 'unspecified',
    });
    expect(parsed.lifecycle).toBe('draft');
    expect(isPublishable(parsed)).toBe(false);
  });
});

function rawLayerDoc() {
  return {
    id: 'layer-venetian-ports',
    title: 'Venetian maritime ports',
    summary: 'What the port phases assert.',
    docType: 'layer' as const,
    pattern: 'B' as const,
    programme: 'vmn',
    layerId: 'venetian-ports',
    lifecycle: 'published' as const,
    lastReviewed: '2026-08-23',
  };
}

describe('corpus validation catches what a single record cannot', () => {
  it('passes a coherent corpus', () => {
    const docs = [
      HandbookDocSchema.parse(rawLayerDoc()),
      doc({ id: 'method-shared', routeSlug: 'shared', relatedLayerIds: ['venetian-ports'] }),
    ];
    expect(validateHandbookDocs(docs, CONTEXT)).toEqual([]);
  });

  it('rejects two documents owning the same layer', () => {
    const docs = [
      HandbookDocSchema.parse(rawLayerDoc()),
      HandbookDocSchema.parse({ ...rawLayerDoc(), id: 'layer-ports-again' }),
    ];
    const errors = validateHandbookDocs(docs, CONTEXT);
    expect(errors.some((e) => e.includes('both claim route'))).toBe(true);
    expect(errors.some((e) => e.includes('2 owners'))).toBe(true);
  });

  it('rejects a duplicate document ID', () => {
    const docs = [doc(), doc({ routeSlug: 'probe-two' })];
    expect(
      validateHandbookDocs(docs, CONTEXT).some((e) => e.includes('Duplicate document ID')),
    ).toBe(true);
  });

  it('rejects unresolved layer, collection, source and document references', () => {
    const errors = validateHandbookDocs(
      [
        doc({
          relatedLayerIds: ['no-such-layer'],
          relatedCollectionIds: ['no-such-collection'],
          relatedSourceIds: ['no-such-source'],
          referencesDocIds: ['no-such-doc'],
        }),
      ],
      CONTEXT,
    );
    expect(errors).toHaveLength(4);
    expect(errors.join(' ')).toContain('unknown layer');
    expect(errors.join(' ')).toContain('unknown collection');
    expect(errors.join(' ')).toContain('unknown source');
    expect(errors.join(' ')).toContain('unknown document');
  });

  it('rejects a layer document explaining a layer that does not exist', () => {
    const docs = [HandbookDocSchema.parse({ ...rawLayerDoc(), layerId: 'ghost-layer' })];
    expect(validateHandbookDocs(docs, CONTEXT).join(' ')).toContain('explains unknown layer');
  });
});

describe('held and internal material cannot leak', () => {
  it('rejects a public document linking a held essay', () => {
    const errors = validateHandbookDocs(
      [doc({ relatedEssaySlugs: ['unreleased-essay'] })],
      CONTEXT,
    );
    expect(errors.join(' ')).toContain('links held essay');
  });

  it('allows a draft document to reference a held essay', () => {
    const errors = validateHandbookDocs(
      [doc({ lifecycle: 'draft', lastReviewed: undefined, relatedEssaySlugs: ['unreleased'] })],
      CONTEXT,
    );
    expect(errors).toEqual([]);
  });

  it('rejects a public document referencing an internal one', () => {
    const docs = [
      doc({ id: 'public-doc', routeSlug: 'public', referencesDocIds: ['internal-doc'] }),
      doc({
        id: 'internal-doc',
        routeSlug: 'internal',
        lifecycle: 'internal',
        lastReviewed: undefined,
      }),
    ];
    expect(validateHandbookDocs(docs, CONTEXT).join(' ')).toContain(
      'references non-public document',
    );
  });
});

describe('no public flow may depend on a governance surface', () => {
  it('rejects a Confluence link on a published document', () => {
    const docs = [
      doc({
        technicalLinks: [
          { label: 'Spec', href: 'https://vladsimion.atlassian.net/wiki/spaces/x/pages/1/' },
        ],
      }),
    ];
    expect(assertNoGovernanceDependency(docs).join(' ')).toContain('governance surface');
  });

  it('accepts a GitHub technical gateway', () => {
    const docs = [
      doc({
        technicalLinks: [
          { label: 'Schema', href: 'https://github.com/vladsimion/terra-chartarum/blob/main/x.md' },
        ],
      }),
    ];
    expect(assertNoGovernanceDependency(docs)).toEqual([]);
  });

  it('ignores a governance link on a document that never publishes', () => {
    const docs = [
      doc({
        lifecycle: 'internal',
        lastReviewed: undefined,
        technicalLinks: [{ label: 'Spec', href: 'https://vladsimion.atlassian.net/wiki/x/' }],
      }),
    ];
    expect(assertNoGovernanceDependency(docs)).toEqual([]);
  });
});

describe('the Atlas gets one lookup from layer ID to public route', () => {
  it('maps only published layer records', () => {
    const docs = [
      HandbookDocSchema.parse(rawLayerDoc()),
      HandbookDocSchema.parse({
        ...rawLayerDoc(),
        id: 'layer-draft',
        layerId: 'dacia-treaty-frontiers',
        lifecycle: 'draft',
        lastReviewed: undefined,
      }),
      doc({ id: 'method-x', routeSlug: 'x' }),
    ];
    expect(documentationRoutes(docs)).toEqual({
      'venetian-ports': '/atlas/layers/venetian-ports/',
    });
  });
});
