import { describe, expect, it } from 'vitest';
import { buildMetaLensComparisonEntries } from './meta-lens-comparison';

const completeScores = {
  measure: 0.2,
  witness: 0.4,
  use: 0.6,
  cosmos: 0.8,
  power: 1,
  silence: 0,
};

describe('cross-essay meta-lens comparison', () => {
  it('serializes normalized canonical scores and preserves native vocabulary', () => {
    const [entry] = buildMetaLensComparisonEntries([
      {
        slug: 'one',
        title: 'One',
        lenses: ['Accuracy', 'Politics'],
        metaScores: completeScores,
        color: '#123456',
      },
    ]);

    expect(entry.values).toEqual([0.2, 0.4, 0.6, 0.8, 1, 0]);
    expect(entry.nativeAxes).toEqual([
      { axis: 'Accuracy', mappings: ['Measure 1'] },
      { axis: 'Politics', mappings: ['Power 1'] },
    ]);
    expect(entry.color).toBe('#123456');
  });

  it('fails closed on duplicate essays or incomplete canonical scores', () => {
    expect(() =>
      buildMetaLensComparisonEntries([
        {
          slug: 'same',
          title: 'First',
          lenses: ['Accuracy'],
          metaScores: completeScores,
        },
        {
          slug: 'same',
          title: 'Second',
          lenses: ['Accuracy'],
          metaScores: completeScores,
        },
      ]),
    ).toThrow(/Duplicate comparison essay slug/);

    expect(() =>
      buildMetaLensComparisonEntries([
        {
          slug: 'partial',
          title: 'Partial',
          lenses: ['Accuracy'],
          metaScores: { measure: 0.5 },
        },
      ]),
    ).toThrow(/invalid witness normalized score/);
  });
});
