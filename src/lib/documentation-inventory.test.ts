import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { GEO_LAYERS } from './geo';
import {
  DOCUMENTATION_INVENTORY,
  PUBLIC_OUTCOMES,
  unmigratedDocuments,
  INVENTORY_COVERAGE,
  INVENTORY_DOCUMENTS,
  INVENTORY_LINKS,
  PUBLIC_AUDIENCES,
  coverageForLayer,
  inventoryLinksForLayer,
  layersMissingPublicDocumentation,
  sharedDocuments,
} from './documentation-inventory';

// The KAN-409 audit is only worth anything if it still describes the registry.
// These tests are the reconciliation: the inventory cannot fall behind a layer,
// a link or a rename without failing the build.

const VOCAB = DOCUMENTATION_INVENTORY.vocabularies;

describe('the inventory reconciles with the live registry', () => {
  it('inventories every documentationLinks entry exactly once', () => {
    const live = GEO_LAYERS.flatMap((layer) =>
      layer.documentationLinks.map((doc) => `${layer.id}::${doc.label}`),
    );
    const recorded = INVENTORY_LINKS.map((link) => `${link.layerId}::${link.label}`);
    expect(recorded.slice().sort()).toEqual(live.slice().sort());
    expect(new Set(recorded).size).toBe(recorded.length);
  });

  it('resolves every inventoried link to the href the registry actually publishes', () => {
    const documents = new Map(INVENTORY_DOCUMENTS.map((doc) => [doc.id, doc]));
    for (const layer of GEO_LAYERS) {
      for (const doc of layer.documentationLinks) {
        const link = inventoryLinksForLayer(layer.id).find((l) => l.label === doc.label);
        expect(link, `${layer.id} / ${doc.label}`).toBeDefined();
        expect(documents.get(link!.documentId)?.currentHref, `${layer.id} / ${doc.label}`).toBe(
          doc.href,
        );
      }
    }
  });

  it('leaves no orphan document and no orphan layer reference', () => {
    const layerIds = new Set(GEO_LAYERS.map((l) => l.id));
    const cited = new Set(INVENTORY_LINKS.map((l) => l.documentId));
    for (const doc of INVENTORY_DOCUMENTS) {
      expect(cited.has(doc.id), doc.id).toBe(true);
      for (const layerId of doc.citedByLayers) expect(layerIds.has(layerId), layerId).toBe(true);
    }
    for (const link of INVENTORY_LINKS) expect(layerIds.has(link.layerId), link.layerId).toBe(true);
  });

  it('records citedByLayers consistently with the link rows', () => {
    for (const doc of INVENTORY_DOCUMENTS) {
      const derived = INVENTORY_LINKS.filter((l) => l.documentId === doc.id).map((l) => l.layerId);
      expect(doc.citedByLayers.slice().sort(), doc.id).toEqual(derived.slice().sort());
    }
  });

  it('points every document at a file that exists in the repository', async () => {
    for (const doc of INVENTORY_DOCUMENTS) {
      await expect(
        access(join(process.cwd(), doc.repoPath)),
        doc.repoPath,
      ).resolves.toBeUndefined();
      expect(doc.currentHref, doc.id).toContain(doc.repoPath);
    }
  });
});

describe('every document has an audience, an owner and a destination', () => {
  it('classifies each document against the controlled vocabularies', () => {
    for (const doc of INVENTORY_DOCUMENTS) {
      expect(VOCAB.audience, doc.id).toContain(doc.audience);
      expect(VOCAB.pattern, doc.id).toContain(doc.pattern);
      expect(VOCAB.disposition, doc.id).toContain(doc.disposition);
      expect(doc.publicFunctions.length, doc.id).toBeGreaterThan(0);
      for (const fn of doc.publicFunctions) expect(VOCAB.publicFunction, doc.id).toContain(fn);
    }
  });

  it('names a canonical owner and argues the classification', () => {
    for (const doc of INVENTORY_DOCUMENTS) {
      expect(doc.canonicalOwner.length, doc.id).toBeGreaterThan(0);
      expect(doc.notes.length, doc.id).toBeGreaterThan(40);
    }
  });

  it('gives every public or mixed document a public route and a pattern', () => {
    for (const doc of INVENTORY_DOCUMENTS.filter((d) => PUBLIC_AUDIENCES.includes(d.audience))) {
      expect(doc.publicRoute, doc.id).toBeTruthy();
      expect(doc.pattern, doc.id).not.toBe('none');
      expect(doc.disposition, doc.id).toBe('migrate-public');
    }
  });

  it('leaves technical-only documents routeless, with the reason recorded', () => {
    for (const doc of INVENTORY_DOCUMENTS.filter((d) => !PUBLIC_AUDIENCES.includes(d.audience))) {
      expect(doc.publicRoute, doc.id).toBeNull();
      expect(doc.pattern, doc.id).toBe('none');
      expect(doc.notes.length, doc.id).toBeGreaterThan(40);
    }
  });

  it('keeps every proposed public route an internal site path', () => {
    for (const doc of INVENTORY_DOCUMENTS) {
      if (!doc.publicRoute) continue;
      expect(doc.publicRoute, doc.id).toMatch(/^\/[a-z0-9/-]*\/$/);
      expect(doc.publicRoute, doc.id).not.toContain('github.com');
      expect(doc.publicRoute, doc.id).not.toContain('atlassian.net');
    }
  });

  it('preserves the technical gateway wherever it is still needed', () => {
    // GitHub stays reachable for reproducibility; it just stops being the only
    // way to understand a layer.
    for (const doc of INVENTORY_DOCUMENTS.filter((d) => d.retainTechnicalLink)) {
      expect(doc.currentHref, doc.id).toContain('github.com');
    }
  });
});

describe('no public flow depends on Confluence', () => {
  it('keeps every registry documentation link off Confluence', () => {
    for (const layer of GEO_LAYERS) {
      for (const doc of layer.documentationLinks) {
        expect(doc.href, `${layer.id} / ${doc.label}`).not.toContain('atlassian.net');
      }
    }
  });

  it('classifies the one known Confluence source as internal-only', () => {
    const confluence = DOCUMENTATION_INVENTORY.nonRegistryLinks.filter((link) =>
      link.href.includes('atlassian.net'),
    );
    expect(confluence).toHaveLength(1);
    expect(confluence[0].audience).toBe('internal-governance');
    expect(confluence[0].disposition).toBe('internal-only');
  });
});

describe('layer coverage is assessed for the whole registry', () => {
  it('assesses every registered layer exactly once', () => {
    expect(INVENTORY_COVERAGE.map((row) => row.layerId).sort()).toEqual(
      GEO_LAYERS.map((l) => l.id).sort(),
    );
  });

  it('exempts only context layers, and argues each exemption', () => {
    const roles = new Map(GEO_LAYERS.map((l) => [l.id, l.role]));
    for (const row of INVENTORY_COVERAGE) {
      const exempt = row.coverage === 'exempt' || row.coverage === 'exempt-with-warning';
      if (exempt) expect(roles.get(row.layerId), row.layerId).toBe('context');
      if (roles.get(row.layerId) === 'context') expect(exempt, row.layerId).toBe(true);
      expect(row.note.length, row.layerId).toBeGreaterThan(40);
    }
  });

  it('lists the missing public functions for every incomplete layer', () => {
    for (const row of INVENTORY_COVERAGE) {
      expect(VOCAB.coverage, row.layerId).toContain(row.coverage);
      if (row.coverage === 'gap' || row.coverage === 'partial') {
        expect(row.missing.length, row.layerId).toBeGreaterThan(0);
        for (const fn of row.missing) expect(VOCAB.publicFunction, row.layerId).toContain(fn);
      } else {
        expect(row.missing, row.layerId).toEqual([]);
      }
    }
  });

  it('names the two layers that publish a claim with no documentation at all', () => {
    const gaps = INVENTORY_COVERAGE.filter((row) => row.coverage === 'gap').map((r) => r.layerId);
    expect(gaps.sort()).toEqual(['map-coverage', 'roman-empire-117']);
    for (const id of gaps) {
      expect(GEO_LAYERS.find((l) => l.id === id)?.documentationLinks, id).toEqual([]);
    }
  });

  it('agrees with the registry that a gap layer really has no links', () => {
    const undocumented = GEO_LAYERS.filter(
      (l) => l.role !== 'context' && l.documentationLinks.length === 0,
    ).map((l) => l.id);
    for (const id of undocumented) expect(coverageForLayer(id)?.coverage, id).toBe('gap');
  });

  it('holds the treaty-frontier layer up as the only covered one', () => {
    const covered = INVENTORY_COVERAGE.filter((row) => row.coverage === 'covered');
    expect(covered.map((r) => r.layerId)).toEqual(['dacia-treaty-frontiers']);
  });

  it('covers the Dacia, VMN and HSE families completely', () => {
    const families = ['dacia-', 'venetian-', 'hanseatic-'];
    const family = GEO_LAYERS.filter((l) => families.some((p) => l.id.startsWith(p)));
    expect(family.length).toBeGreaterThan(0);
    for (const layer of family) expect(coverageForLayer(layer.id), layer.id).toBeDefined();
  });

  it('reports the work still outstanding before the KAN-418 cutover', () => {
    const outstanding = layersMissingPublicDocumentation();
    expect(outstanding.length).toBe(GEO_LAYERS.length - 1 - 4);
  });
});

describe('shared documents are flagged against per-layer duplication', () => {
  it('records a duplication risk for every multi-layer document', () => {
    const flagged = new Set(DOCUMENTATION_INVENTORY.duplicationRisks.map((r) => r.documentId));
    for (const doc of sharedDocuments()) expect(flagged.has(doc.id), doc.id).toBe(true);
  });

  it('keeps the recorded citation counts honest', () => {
    for (const risk of DOCUMENTATION_INVENTORY.duplicationRisks) {
      const doc = INVENTORY_DOCUMENTS.find((d) => d.id === risk.documentId);
      expect(doc, risk.documentId).toBeDefined();
      expect(risk.citedBy, risk.documentId).toBe(doc!.citedByLayers.length);
    }
  });

  it('singles out the shared Dacia GIS document as the heaviest reuse', () => {
    const shared = sharedDocuments().sort(
      (a, b) => b.citedByLayers.length - a.citedByLayers.length,
    );
    expect(shared[0].id).toBe('doc-dacia-shared-gis-layers');
    expect(shared[0].citedByLayers).toHaveLength(5);
  });
});

describe('the audit changes nothing it is not allowed to change', () => {
  it('leaves every documentationLinks entry in place', () => {
    // KAN-409 classifies; KAN-418 cuts over. Nothing is rewritten yet.
    expect(GEO_LAYERS.flatMap((l) => l.documentationLinks)).toHaveLength(INVENTORY_LINKS.length);
    expect(INVENTORY_LINKS).toHaveLength(24);
  });

  it('retires nothing outright, and argues each demotion or repoint', () => {
    for (const retirement of DOCUMENTATION_INVENTORY.retirements) {
      expect(['demote', 'repoint', 'retire']).toContain(retirement.action);
      expect(retirement.rationale.length, retirement.documentId).toBeGreaterThan(40);
      expect(INVENTORY_DOCUMENTS.some((d) => d.id === retirement.documentId)).toBe(true);
    }
  });
});

// The cutover re-run (ATLAS-1222 / KAN-418). The audit recorded an intention;
// these assert the result, so "the documentation was migrated" is checkable.
describe('every inventoried entry reached a destination', () => {
  it('gives every document an outcome and an argued note', () => {
    for (const doc of INVENTORY_DOCUMENTS) {
      expect(DOCUMENTATION_INVENTORY.cutover.outcomes, doc.id).toContain(doc.migrationOutcome);
      expect(doc.outcomeNote.length, doc.id).toBeGreaterThan(40);
    }
  });

  it('resolves every public outcome to an internal route', () => {
    for (const doc of INVENTORY_DOCUMENTS) {
      if (!PUBLIC_OUTCOMES.includes(doc.migrationOutcome)) continue;
      expect(doc.implementedRoute, doc.id).toBeTruthy();
      expect(doc.implementedRoute, doc.id).toMatch(/^\/[a-z0-9/-]*\/$/);
      expect(doc.implementedRoute, doc.id).not.toContain('github.com');
      expect(doc.implementedRoute, doc.id).not.toContain('atlassian.net');
    }
    expect(unmigratedDocuments()).toEqual([]);
  });

  it('leaves a technical-only entry routeless, with its reason recorded', () => {
    const technical = INVENTORY_DOCUMENTS.filter(
      (doc) => doc.migrationOutcome === 'retained-technical',
    );
    expect(technical.length).toBeGreaterThan(0);
    for (const doc of technical) {
      expect(doc.implementedRoute, doc.id).toBeNull();
      expect(doc.implementedPattern, doc.id).toBe('none');
    }
  });

  it('records where the implementation deviated from the audit', () => {
    // docs/dacia/shared-gis-layers.md was audited as Pattern B and shipped as
    // Pattern A. A deviation is fine; an unrecorded one is not.
    const shared = INVENTORY_DOCUMENTS.find((doc) => doc.id === 'doc-dacia-shared-gis-layers')!;
    expect(shared.pattern).toBe('B');
    expect(shared.implementedPattern).toBe('A');
    expect(shared.outcomeNote).toMatch(/DEVIATION/);
  });

  it('repoints both first-level bibliography links to internal routes', () => {
    const repointed = DOCUMENTATION_INVENTORY.nonRegistryLinks.filter(
      (link) => link.location === 'src/pages/bibliography.astro',
    );
    expect(repointed).toHaveLength(2);
    for (const link of repointed) {
      expect(link.migrationOutcome).toBe('replaced-by-public-route');
      expect(link.implementedRoute).toMatch(/^\/atlas\/handbook\//);
    }
  });

  it('records the Crusades contract as a dependency rather than a passed check', () => {
    expect(DOCUMENTATION_INVENTORY.cutover.crusadesDependency).toMatch(/mandatory publication/i);
  });
});
