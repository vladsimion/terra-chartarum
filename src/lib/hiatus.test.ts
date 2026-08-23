import { describe, expect, it } from 'vitest';
import {
  filterHiatusStates,
  getHiatusAbsenceClasses,
  getHiatusSourceFamilies,
  getHiatusSpan,
  getHiatusStates,
  isArguable,
} from './hiatus';

describe('Hiatus absence timeline (KAN-349)', () => {
  it('carries the whole taxonomy, not only the classes some state earned', () => {
    // The six classes exist before any of them is earned. A filter built from
    // the states alone would offer two and call that the taxonomy.
    expect(
      getHiatusAbsenceClasses()
        .map((entry) => entry.absenceClass)
        .sort(),
    ).toEqual([
      'extra_muros',
      'named_elsewhere',
      'not_asked',
      'not_named',
      'not_surveyed',
      'survival_unknown',
    ]);

    const used = new Set(getHiatusStates().map((state) => state.absenceClass));
    expect(used.size).toBeLessThan(getHiatusAbsenceClasses().length);
  });

  it('filters by source family', () => {
    const families = getHiatusSourceFamilies();
    expect(families.length).toBeGreaterThan(1);

    const charters = filterHiatusStates({ sourceFamilies: ['charter'] });
    expect(charters.length).toBeGreaterThan(0);
    expect(charters.every((state) => state.sourceFamily === 'charter')).toBe(true);

    // An unfiltered call is every state, not none.
    expect(filterHiatusStates()).toHaveLength(getHiatusStates().length);
    expect(filterHiatusStates({ sourceFamilies: [] })).toHaveLength(getHiatusStates().length);
  });

  it('filters by date on overlap rather than containment', () => {
    // The charter family runs 1300-1526, so 1400 is inside it even though
    // neither endpoint falls in a window around 1400.
    const inside = filterHiatusStates({ from: 1400, to: 1400 });
    expect(inside.map((state) => state.stateId)).toContain('hs-charters');

    // A window before every state matches nothing, and the span says where the
    // states actually are, so an axis need not be typed into prose.
    const span = getHiatusSpan();
    expect(filterHiatusStates({ from: span.from - 200, to: span.from - 100 })).toHaveLength(0);
    expect(filterHiatusStates({ from: span.from, to: span.to })).toHaveLength(
      getHiatusStates().length,
    );
  });

  it('combines a family and a window', () => {
    const ottoman = filterHiatusStates({
      sourceFamilies: ['ottoman_fiscal'],
      from: 1600,
      to: 1700,
    });
    expect(ottoman.every((state) => state.sourceFamily === 'ottoman_fiscal')).toBe(true);
    expect(
      filterHiatusStates({ sourceFamilies: ['ottoman_fiscal'], from: 1100, to: 1200 }),
    ).toHaveLength(0);
  });

  it('refuses to call an unearned silence an argument', () => {
    // Nothing has been reviewed, so nothing here is arguable from yet. This is
    // the same rule the compiler enforces, restated where a component would
    // otherwise be tempted to render a silence as a finding.
    for (const state of getHiatusStates()) {
      expect(state.scopeReviewed).toBe(false);
      expect(isArguable(state)).toBe(false);
    }
  });

  it('never treats a weightless class as an argument, however reviewed', () => {
    // `not_surveyed` says nobody looked. Reviewing that fact does not turn it
    // into a finding, so the weightless classes stay unarguable even when the
    // scope has been read.
    const weightless = getHiatusAbsenceClasses().filter(
      (entry) => entry.evidentialWeight === 'none',
    );
    expect(weightless.length).toBeGreaterThan(0);

    for (const entry of weightless) {
      const cleared = {
        ...getHiatusStates()[0],
        absenceClass: entry.absenceClass,
        scopeReviewed: true,
        reviewStatus: 'reviewed',
      };
      expect(isArguable(cleared)).toBe(false);
    }
  });
});
