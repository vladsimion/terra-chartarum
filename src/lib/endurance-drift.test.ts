import { describe, expect, it } from 'vitest';
import {
  DRIFT_FRAME,
  EXPEDITION_ID,
  driftFrameHeight,
  driftGeometries,
  driftPositions,
  driftSteps,
  driftTranscript,
  projectDrift,
} from './endurance-drift';
import { getPhases } from './antarctica';

describe('the Weddell Sea frame', () => {
  it('puts the frame corners at the frame edges', () => {
    const topLeft = projectDrift(DRIFT_FRAME.west, DRIFT_FRAME.north, 1000);
    expect(topLeft).toEqual({ x: 0, y: 0 });
    expect(projectDrift(DRIFT_FRAME.east, DRIFT_FRAME.north, 1000).x).toBeCloseTo(1000, 0);
  });

  it('grows southward down the plate', () => {
    expect(projectDrift(-30, -76).y).toBeGreaterThan(projectDrift(-30, -60).y);
  });

  it('keeps the frame taller than it is wide, as the drift is', () => {
    expect(driftFrameHeight(1000)).toBeGreaterThan(1000);
  });
});

describe('the eight steps', () => {
  const steps = driftSteps();

  it('runs plan, approach, beset, drift, loss, camps, Caird, coordinate', () => {
    expect(steps.map((s) => s.id)).toEqual([
      'plan',
      'approach',
      'beset',
      'drift',
      'loss',
      'ice-camps',
      'caird',
      'coordinate',
    ]);
  });

  it('subordinates the plan once the ice takes over rather than deleting it', () => {
    const drift = steps.find((s) => s.id === 'drift')!;
    expect(drift.subordinates).toContain('ant-trk-endurance-plan');
    expect(drift.shows).not.toContain('ant-trk-endurance-plan');
  });

  it('never describes the drift as sailing', () => {
    const drift = steps.find((s) => s.id === 'drift')!;
    const prose = `${drift.title} ${drift.caption}`.toLowerCase();
    expect(prose).not.toMatch(/\bsail(ed|ing|s)?\b/);
    expect(prose).not.toMatch(/\bvoyage\b(?!.*not)/);
    expect(prose).toContain('nobody steers');
  });

  it('carries the besetment date disagreement rather than hiding it', () => {
    const beset = steps.find((s) => s.id === 'beset')!;
    expect(beset.when).toContain('19 January 1915');
    expect(beset.caption).toContain('18 January');
  });

  it('keeps abandonment and sinking as one step of two events', () => {
    const loss = steps.find((s) => s.id === 'loss')!;
    expect(loss.when).toContain('27 October');
    expect(loss.when).toContain('21 November');
    expect(loss.caption).toContain('twenty-five days apart');
  });

  it('names Worsley in the boat-journey step', () => {
    expect(driftSteps().find((s) => s.id === 'caird')!.caption).toContain('Worsley');
  });

  it('draws no comparison in the coda, because neither figure is held', () => {
    const coda = driftSteps().find((s) => s.id === 'coordinate')!;
    expect(coda.caption).toContain('no comparison is drawn');
    // The one thing it may say without either coordinate.
    expect(coda.caption).toContain('a coordinate is produced by');
    // And it must not turn into a second exploration narrative.
    expect(coda.caption.toLowerCase()).not.toContain('search');
    expect(coda.caption.length).toBeLessThan(500);
  });

  it('references only phases that exist', () => {
    const known = new Set(getPhases(EXPEDITION_ID).map((phase) => phase.id));
    for (const step of steps) {
      for (const id of step.phaseIds) expect(known, step.id).toContain(id);
    }
  });
});

describe('projected geometry', () => {
  const geometries = driftGeometries();

  it('projects every record the steps refer to', () => {
    for (const step of driftSteps()) {
      for (const id of [...step.shows, ...step.subordinates]) {
        expect(geometries.has(id), id).toBe(true);
      }
    }
  });

  it('marks the plan and the drift as our own linework', () => {
    expect(geometries.get('ant-trk-endurance-plan')!.isOurs).toBe(true);
    expect(geometries.get('ant-trk-endurance-drift')!.isOurs).toBe(true);
    expect(geometries.get('ant-trk-james-caird')!.isOurs).toBe(true);
  });

  it('does not mark a transcribed position as our own', () => {
    expect(geometries.get('ant-obs-endurance-fix')!.isOurs).toBe(false);
    expect(geometries.get('ant-obs-endurance-fix')!.isPoint).toBe(true);
  });
});

describe('the static transcript', () => {
  const rows = driftTranscript();

  it('reads the plan first and the phases in order', () => {
    expect(rows[0].phase.phaseKind).toBe('planned');
    expect(rows[0].power).toBe('Never sailed');
    expect(rows.map((r) => r.phase.sequence)).toEqual(
      [...rows.map((r) => r.phase.sequence)].sort((a, b) => a - b),
    );
  });

  it('says of every phase whether the ship was carried or steered', () => {
    for (const row of rows) {
      expect(['Under her own power', 'Carried', 'Never sailed']).toContain(row.power);
    }
    expect(rows.find((r) => r.phase.phaseKind === 'drift')!.power).toBe('Carried');
  });

  it('gives a span for a phase that lasted, and a date for one that did not', () => {
    const beset = rows.find((r) => r.phase.phaseKind === 'beset')!;
    expect(beset.span).toBe('1915-01-19');
    expect(rows.find((r) => r.phase.phaseKind === 'drift')!.span).toContain(' to ');
  });
});

describe('position methods are readable without hovering', () => {
  const positions = driftPositions();

  it('lists the Act VIII positions in date order', () => {
    expect(positions.length).toBeGreaterThan(3);
    expect(positions.map((p) => p.date)).toEqual([...positions.map((p) => p.date)].sort());
  });

  it('says how each position was arrived at, in plain words', () => {
    for (const position of positions) {
      expect(position.method).toMatch(/Observed with an instrument|Reckoned from|Drawn by/);
    }
  });

  it('does not present a reckoned position as an observed one', () => {
    const beset = positions.find((p) => p.id === 'ant-obs-endurance-beset')!;
    expect(beset.method).toContain('Reckoned');
  });
});
