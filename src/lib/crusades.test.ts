import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FOURTH_CRUSADE_STATES,
  claimedAgainstHeld,
  depictedJourneyLength,
  drawableStates,
  getCrusadesRelease,
  getFourthCrusadeStates,
  getItinerary,
  statesOfKind,
  variantStages,
  vmnReferences,
} from './crusades';

describe('the Road proof: a diagram is not a map', () => {
  const stages = getItinerary();

  it('runs London to Otranto in an unbroken sequence', () => {
    expect(stages[0].manuscriptLabel).toBe('London');
    expect(stages[stages.length - 1].manuscriptLabel).toBe('Otranto');
    expect(stages.map((s) => s.sequence)).toEqual(stages.map((_, i) => i + 1));
  });

  it('gives no stage a position of its own', () => {
    // The manuscript has no projection. A stage with a longitude would invent
    // the one thing it conspicuously lacks.
    for (const stage of stages) {
      expect(Object.keys(stage)).not.toContain('lon');
      expect(Object.keys(stage)).not.toContain('lat');
      expect(Object.keys(stage)).not.toContain('geometry');
    }
  });

  it('names the modern coordinate for what it is', () => {
    for (const stage of stages) {
      expect(stage.geometryProvenance).toBe('modern_reference');
      expect(stage.modernReference).toHaveLength(2);
    }
  });

  it('keeps the manuscript label separate from the modern name', () => {
    // They coincide often and not always, and the day the corpus finds a stage
    // whose drawn name differs from its modern one, the model must already hold
    // both rather than needing a migration.
    for (const stage of stages) {
      expect(stage.manuscriptLabel.length).toBeGreaterThan(0);
      expect(stage.modernName.length).toBeGreaterThan(0);
    }
  });

  it('reports day-marks as the diagram s claim, not a journey time', () => {
    const { days, stagesWithMarks } = depictedJourneyLength();
    expect(stagesWithMarks).toBe(stages.length);
    expect(days).toBeGreaterThan(20);
  });

  it('records the stages where the witnesses branch', () => {
    const variants = variantStages().map((s) => s.manuscriptLabel);
    expect(variants).toContain('Rome');
    expect(variants.length).toBeLessThan(stages.length);
  });

  it('has read no folio yet', () => {
    for (const stage of stages) {
      expect(stage.folio).toBe('pending');
      expect(stage.reviewState).toBe('raw');
    }
  });
});

describe('the Sea proof: a claim is not a possession', () => {
  it('carries all six states', () => {
    const kinds = new Set(getFourthCrusadeStates().map((s) => s.stateKind));
    for (const kind of FOURTH_CRUSADE_STATES) expect(kinds, kind).toContain(kind);
  });

  it('records the partition as claimed and not held', () => {
    const partition = statesOfKind('partition_claim');
    expect(partition).toHaveLength(1);
    expect(partition[0].held).toBe('claimed_not_held');
    expect(partition[0].geometry).toBeNull();
  });

  it('records durable control as held, and separately', () => {
    const durable = statesOfKind('durable_control');
    expect(durable[0].held).toBe('held');
    expect(durable[0].id).not.toBe(statesOfKind('partition_claim')[0].id);
  });

  it('never merges what was claimed with what was held', () => {
    const { claimed, held } = claimedAgainstHeld();
    expect(claimed.length).toBeGreaterThan(0);
    expect(held.length).toBeGreaterThan(0);
    const claimedIds = new Set(claimed.map((s) => s.id));
    for (const state of held) expect(claimedIds.has(state.id)).toBe(false);
  });

  it('draws only the routes that were travelled', () => {
    const drawn = drawableStates();
    expect(drawn.every((s) => s.stateKind === 'travelled_route')).toBe(true);
    expect(drawn.length).toBe(2);
  });

  it('keeps the intended destination non-spatial', () => {
    // The crusade's destination was a clause in a contract. An arrow to a coast
    // it never approached would make an intention look like a movement.
    const intent = statesOfKind('intended_destination')[0];
    expect(intent.geometry).toBeNull();
    expect(intent.geometryProvenance).toBe('not_spatial');
  });

  it('points at VMN layers rather than re-authoring them', () => {
    expect(vmnReferences()).toEqual(['venetian-ports', 'venetian-possessions', 'venetian-routes']);
  });
});

describe('the Atlas reads what the essay reads', () => {
  const layers = [
    'crusades-itinerary',
    'crusades-fourth-crusade-routes',
    'crusades-fourth-crusade-events',
  ];
  const features = layers.flatMap(
    (layer) =>
      (
        JSON.parse(readFileSync(`public/geo/${layer}.geojson`, 'utf8')) as {
          features: { properties: Record<string, unknown>; geometry: { type: string } }[];
        }
      ).features,
  );

  it('reports the release the layers came from', () => {
    expect(getCrusadesRelease()).toEqual({
      release: 'cru-pilot-0.1',
      layerIds: layers,
      schemaVersion: 1,
    });
  });

  it('draws every itinerary stage at a modern reference position', () => {
    const itinerary = JSON.parse(readFileSync('public/geo/crusades-itinerary.geojson', 'utf8')) as {
      features: { properties: Record<string, unknown> }[];
    };
    expect(itinerary.features).toHaveLength(getItinerary().length);
    for (const feature of itinerary.features) {
      expect(feature.properties.geometryProvenance).toBe('modern_reference');
    }
  });

  it('never puts the partition or the durable control on a map', () => {
    const ids = new Set(features.map((f) => f.properties.id as string));
    expect(ids.has('cru-fcs-partitio')).toBe(false);
    expect(ids.has('cru-fcs-durable')).toBe(false);
    expect(ids.has('cru-fcs-intent')).toBe(false);
  });

  it('agrees with the essay about every state it does draw', () => {
    const byId = new Map(getFourthCrusadeStates().map((s) => [s.id, s]));
    for (const feature of features) {
      const state = byId.get(feature.properties.id as string);
      if (!state) continue;
      expect(feature.properties.stateKind).toBe(state.stateKind);
      expect(feature.properties.held).toBe(state.held);
      expect(feature.properties.confidence).toBe(state.confidence);
    }
  });
});
