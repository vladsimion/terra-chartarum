import { describe, expect, it } from 'vitest';
import {
  FRAME_NORTH_LIMIT,
  densify,
  projectPolar,
  toPath,
  transitionRecords,
  transitionSteps,
  transitionTranscript,
} from './antarctic-transition';

describe('south-polar projection', () => {
  it('puts the pole at the centre', () => {
    expect(projectPolar(0, -90, 1000)).toEqual({ x: 500, y: 500 });
    expect(projectPolar(137, -90, 1000)).toEqual({ x: 500, y: 500 });
  });

  it('makes latitude linear in radius, because the argument is about distance south', () => {
    const centre = 500;
    const at60 = projectPolar(0, -60, 1000);
    const at40 = projectPolar(0, -40, 1000);
    const r60 = Math.hypot(at60.x - centre, at60.y - centre);
    const r40 = Math.hypot(at40.x - centre, at40.y - centre);
    // -60 is 30 degrees from the pole, -40 is 50: the ratio must be 30/50.
    expect(r60 / r40).toBeCloseTo(30 / 50, 2);
  });

  it('clamps anything north of the frame to the frame edge', () => {
    const edge = projectPolar(0, FRAME_NORTH_LIMIT, 1000);
    expect(projectPolar(0, 0, 1000)).toEqual(edge);
    expect(projectPolar(0, 45, 1000)).toEqual(edge);
  });

  it('separates opposite meridians', () => {
    const a = projectPolar(0, -60, 1000);
    const b = projectPolar(180, -60, 1000);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(100);
  });
});

describe('densification', () => {
  it('splits a long span so a polar arc is not drawn as a chord', () => {
    const dense = densify([
      [-180, -60],
      [180, -60],
    ]);
    expect(dense.length).toBeGreaterThan(70);
    for (const [, lat] of dense) expect(lat).toBeCloseTo(-60, 6);
  });

  it('leaves a short segment alone', () => {
    expect(
      densify([
        [0, -70],
        [2, -71],
      ]),
    ).toEqual([
      [0, -70],
      [2, -71],
    ]);
  });

  it('keeps every original vertex', () => {
    const input = [
      [-100, -60],
      [0, -70],
      [100, -65],
    ];
    const dense = densify(input);
    for (const point of input) expect(dense).toContainEqual(point);
  });
});

describe('path building', () => {
  it('starts with a move and continues with lines', () => {
    const path = toPath(
      [
        [0, -70],
        [2, -71],
      ],
      1000,
    );
    expect(path.startsWith('M')).toBe(true);
    expect(path).toContain('L');
    expect(path.endsWith('Z')).toBe(false);
  });

  it('closes a ring only when asked', () => {
    expect(
      toPath(
        [
          [0, -70],
          [2, -71],
        ],
        1000,
        true,
      ).endsWith('Z'),
    ).toBe(true);
  });
});

describe('the four steps', () => {
  const steps = transitionSteps();

  it('runs inherited, tracks, withdrawal, bounded', () => {
    expect(steps.map((s) => s.id)).toEqual(['inherited', 'tracks', 'withdrawal', 'bounded']);
    expect(steps.map((s) => s.ordinal)).toEqual([1, 2, 3, 4]);
  });

  it('withdraws the continent rather than erasing it', () => {
    const withdrawal = steps.find((s) => s.id === 'withdrawal')!;
    expect(withdrawal.withdraws).toContain('ant-ftr-terra-australis-conjectured');
    // A withdrawn record is still in the drawing. Erasing it would lose the fact
    // that somebody published it.
    expect(withdrawal.shows).not.toContain('ant-ftr-terra-australis-conjectured');
    expect([...withdrawal.shows, ...withdrawal.withdraws]).toContain(
      'ant-ftr-terra-australis-conjectured',
    );
  });

  it('ends on the bounded blank with the farthest south marked', () => {
    const last = steps[steps.length - 1];
    expect(last.shows).toContain('ant-ftr-cook-southern-limit');
    expect(last.shows).toContain('ant-trk-cook-resolution');
  });

  it('never claims Cook disproved a southern continent', () => {
    // The single sentence this whole interaction is most likely to collapse into.
    const prose = steps
      .map((s) => `${s.title} ${s.caption}`)
      .join(' ')
      .toLowerCase();
    expect(prose).not.toMatch(/proved (that )?no|disproved the existence|no land exists/);
    expect(prose).toContain('not a proof');
    expect(prose).toContain('land was sighted within fifty years');
  });

  it('says what the blank is worth', () => {
    const last = transitionSteps()[3];
    expect(last.caption.toLowerCase()).toContain('the blank is the knowledge');
  });
});

describe('projected records', () => {
  it('projects every record the steps refer to', () => {
    const records = transitionRecords();
    for (const step of transitionSteps()) {
      for (const id of [...step.shows, ...step.withdraws]) {
        expect(records.has(id), id).toBe(true);
        expect(records.get(id)!.path.length).toBeGreaterThan(2);
      }
    }
  });

  it('marks the point record as a point', () => {
    const records = transitionRecords();
    expect(records.get('ant-ftr-cook-southern-limit')!.isPoint).toBe(true);
    expect(records.get('ant-trk-cook-resolution')!.isPoint).toBe(false);
  });

  it('carries each record provenance through to the drawing', () => {
    // The dash encoding is driven from this, so a record that lost its
    // provenance would be drawn as if it were a source geometry.
    const records = transitionRecords();
    expect(records.get('ant-ftr-terra-australis-conjectured')!.record.geometryProvenance).toBe(
      'editorial_generalisation',
    );
    expect(records.get('ant-ftr-cook-southern-limit')!.record.geometryProvenance).toBe(
      'transcribed_from_coordinates',
    );
  });
});

describe('static transcript', () => {
  it('gives a reader all four steps without any interaction', () => {
    const transcript = transitionTranscript();
    expect(transcript).toHaveLength(4);
    for (const row of transcript) {
      expect(row.caption.length).toBeGreaterThan(40);
      expect(row.showing.length).toBeGreaterThan(0);
    }
  });

  it('names a withdrawn record as withdrawn', () => {
    const third = transitionTranscript()[2];
    expect(third.showing.some((s) => s.includes('(withdrawn)'))).toBe(true);
  });

  it('uses record titles rather than ids', () => {
    const first = transitionTranscript()[0];
    expect(first.showing[0]).not.toMatch(/^ant-/);
    expect(first.showing[0]).toContain('Terra Australis');
  });
});
