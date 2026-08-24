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
  getProofGates,
  getOpenDebts,
  debtByTicket,
  gateProgress,
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

describe('the flagship records why it is stopped (KAN-384, KAN-385)', () => {
  /**
   * The Dacia programme records why a trench is stopped and which ticket owns
   * each gate. This pilot recorded neither, so five open tickets read as
   * blocked for no stated reason - the condition the debt register exists to
   * end. The registers are validated in `scripts/crusades/validate.py`; these
   * assert the compiled shape the essay actually renders.
   */
  const gates = getProofGates();
  const debts = getOpenDebts();

  it('gives both proofs all six gates', () => {
    const proofs = [...new Set(gates.map((g) => g.proof))];
    expect(proofs.sort()).toEqual(['fourth_crusade', 'matthew_paris']);
    for (const proof of proofs) {
      const forProof = gates.filter((g) => g.proof === proof);
      expect(forProof.map((g) => g.gate).sort(), proof).toEqual([
        'data',
        'editorial',
        'interaction',
        'release',
        'research',
        'rights',
      ]);
    }
  });

  it('never claims a gate has passed while the corpus is untranscribed', () => {
    // The single fact this whole register exists to keep honest. Every locator
    // reads `pending`, so nothing may report as done.
    expect(gates.filter((g) => g.status === 'passed')).toEqual([]);
  });

  it('names the ticket that owns every gate', () => {
    for (const gate of gates) {
      expect(gate.jiraKey, `${gate.proof}:${gate.gate}`).toMatch(/^KAN-\d+$/);
    }
  });

  it('reaches every ticket in this batch from the debt that blocks it', () => {
    const tickets = debtByTicket().map(({ ticket }) => ticket);
    for (const ticket of ['KAN-384', 'KAN-385', 'KAN-386', 'KAN-387', 'KAN-389']) {
      expect(tickets, ticket).toContain(ticket);
    }
  });

  it('gives every open item a gate to block and a way out', () => {
    const pairs = new Set(gates.map((g) => `${g.proof}:${g.gate}`));
    expect(debts.length).toBeGreaterThan(0);
    for (const debt of debts) {
      // An open item blocking nothing reaches no ticket, and is how an
      // outstanding item is lost while still marked open.
      expect(debt.blocks.length, debt.id).toBeGreaterThan(0);
      for (const target of debt.blocks) expect(pairs, debt.id).toContain(target);
      // A blocker with no route out is a complaint, not verification debt.
      expect(debt.resolutionPath.length, debt.id).toBeGreaterThan(20);
    }
  });

  it('separates rights debt from research debt', () => {
    // The difference between work nobody has done and work nobody is permitted
    // to publish. Collapsing them would make the rights blockers look like
    // effort rather than permission.
    const kinds = new Set(debts.map((d) => d.kind));
    expect(kinds).toContain('rights');
    expect(kinds).toContain('verification');
  });

  it('reports no progress it has not made', () => {
    for (const { passed } of gateProgress()) expect(passed).toBe(0);
  });
});
