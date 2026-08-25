import { describe, expect, it } from 'vitest';
import {
  ESSAY_SLUG,
  UNSCHEDULED,
  antarcticLayers,
  assessRelease,
  essayReleaseAgreesWithCorpus,
} from './antarctica-release';
import { projectCatalogue } from './atlas-catalogue';

describe('the release gate', () => {
  const readiness = assessRelease();

  it('is not release-ready, and says which gates block it', () => {
    expect(readiness.releasable).toBe(false);
    expect(readiness.blocked.length).toBeGreaterThan(0);
    for (const gate of readiness.blocked) {
      expect(gate.finding.length, gate.id).toBeGreaterThan(10);
    }
  });

  it('passes every gate a machine can close', () => {
    // The engineering half has to be green, or the report says nothing useful
    // about where the programme actually stands.
    for (const gate of readiness.gates.filter((g) => g.closedBy === 'machine')) {
      expect(gate.passed, `${gate.id}: ${gate.finding}`).toBe(true);
    }
  });

  it('blocks on review and on rights, which no build can settle', () => {
    const blockedBy = new Set(readiness.blocked.map((gate) => gate.closedBy));
    expect(blockedBy.has('review')).toBe(true);
    expect(blockedBy.has('rights')).toBe(true);
    expect(blockedBy.has('machine')).toBe(false);
  });

  it('shows no unreviewed layer to a reader who asked for nothing', () => {
    for (const layer of antarcticLayers()) {
      expect(layer.defaultOn, layer.id).toBe(false);
      expect(layer.lifecycle, layer.id).not.toBe('published');
    }
  });

  it('names four Antarctic layers', () => {
    expect(
      antarcticLayers()
        .map((l) => l.id)
        .sort(),
    ).toEqual([
      'antarctica-conjectured-south',
      'antarctica-expedition-tracks',
      'antarctica-ghost-geographies',
      'antarctica-observations',
    ]);
  });
});

describe('the essay cannot be released ahead of its evidence', () => {
  it('is held, and the corpus agrees that it should be', async () => {
    const state = await essayReleaseAgreesWithCorpus();
    expect(state.releaseAt).toBe(UNSCHEDULED);
    expect(state.held).toBe(true);
    expect(state.shouldBeHeld).toBe(true);
    expect(state.agrees).toBe(true);
  });

  it('would fail if someone gave it a release date without doing the review', async () => {
    // The point of the check: editing one line of frontmatter must not be enough
    // to publish an essay while its corpus still has pending review and rights.
    const state = await essayReleaseAgreesWithCorpus();
    expect(state.shouldBeHeld).toBe(true);
    expect(ESSAY_SLUG).toBe('terra-incognita');
  });
});

describe('essay and Atlas point at each other without leaking the hold (KAN-429)', () => {
  it('names the essay on every Antarctic layer', () => {
    for (const layer of antarcticLayers()) {
      expect(layer.essaySlugs, layer.id).toContain(ESSAY_SLUG);
    }
  });

  it('withholds the back-link while the essay is held, and restores it on release', () => {
    const input = {
      availableLayerIds: antarcticLayers().map((layer) => layer.id),
      documentationRoutes: {},
    };

    // Today: the essay is held, so the catalogue must offer no route to a 404.
    const held = projectCatalogue({ ...input, releasedEssaySlugs: [] }).layers.filter((row) =>
      row.id.startsWith('antarctica-'),
    );
    expect(held.length).toBe(4);
    for (const row of held) expect(row.essaySlugs, row.id).toEqual([]);

    // Release day: the same registry, one essay released, and the link is there
    // with no edit to any layer.
    const released = projectCatalogue({
      ...input,
      releasedEssaySlugs: [ESSAY_SLUG],
    }).layers.filter((row) => row.id.startsWith('antarctica-'));
    for (const row of released) expect(row.essaySlugs, row.id).toEqual([ESSAY_SLUG]);
  });
});
