import { describe, expect, it } from 'vitest';
import { ROOM_SLUGS } from '../data/rooms';
import {
  describeState,
  getCorpusConsumers,
  getProgrammeEntries,
  getSharedDatasets,
  getTrenches,
  getWorkstreams,
} from './dacia-programme';

describe('Corpus Chartarum Daciae programme index (KAN-370)', () => {
  it('discovers all seven trenches, published or not', () => {
    const trenches = getTrenches();
    expect(trenches).toHaveLength(7);
    // The index exists so that unfinished work is discoverable too: every
    // trench carries a room and a state whether or not it has been written.
    for (const trench of trenches) {
      expect(ROOM_SLUGS).toContain(trench.room);
      expect(trench.gates).toHaveLength(6);
      expect(describeState(trench).length).toBeGreaterThan(0);
    }
    expect(getWorkstreams().length).toBeGreaterThan(0);
  });

  it('reports gate and debt state rather than only finished work', () => {
    const trenches = getTrenches();
    // Trench A is the one with passed gates and migrated records; the rest
    // report honestly that they have neither.
    const trenchA = trenches.find((trench) => trench.id === 'ccd-a');
    expect(trenchA?.gatesPassed).toBeGreaterThan(0);
    expect(trenchA?.corpusRecords).toBeGreaterThan(0);
    expect(trenches.some((trench) => trench.gatesPassed === 0)).toBe(true);
    expect(trenches.reduce((sum, trench) => sum + trench.openDebts, 0)).toBeGreaterThan(0);
  });

  it('counts corpus consumers from the data rather than from a description', () => {
    // A trench appears here by having records in the shared corpus. Today only
    // Trench A does, and the index must not claim otherwise.
    const consumers = getCorpusConsumers();
    expect(consumers.map((entry) => entry.id)).toEqual(['ccd-a']);
    for (const consumer of consumers) expect(consumer.corpusRecords).toBeGreaterThan(0);
  });

  it('presents the shared datasets as programme infrastructure', () => {
    const datasets = getSharedDatasets();
    expect(datasets.length).toBeGreaterThan(1);
    expect(datasets.some((dataset) => dataset.kind === 'corpus')).toBe(true);

    for (const dataset of datasets) {
      expect(dataset.detail.length).toBeGreaterThan(0);
      // Every target is real: a site route or an explicit repository URL, never
      // a path the site does not serve.
      expect(dataset.href.startsWith('/') || dataset.href.startsWith('https://')).toBe(true);
    }
  });

  it('resolves a published trench to its essay and leaves the rest without one', () => {
    const withEssay = getProgrammeEntries().filter((entry) => entry.essaySlug);
    expect(withEssay.map((entry) => entry.essaySlug)).toEqual(['dacia']);
  });
});
