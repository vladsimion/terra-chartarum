import { describe, it, expect } from 'vitest';
import { circleRadiusExpression, temporalFilter, withTemporal, dashSubLayers } from './geo-style';

describe('circleRadiusExpression (VMN-20 graduated ports, B3)', () => {
  it('builds a match on the field with a trailing fallback', () => {
    const expr = circleRadiusExpression({
      field: 'type',
      radius: { metropole: 9, staging: 4 },
      fallback: 4,
    });
    expect(expr).toEqual(['match', ['get', 'type'], 'metropole', 9, 'staging', 4, 4]);
  });
});

describe('temporalFilter (VMN-2 blocker B2, inclusive years)', () => {
  it('reveals features whose inclusive span contains the cutoff', () => {
    expect(temporalFilter(1400)).toEqual([
      'all',
      ['<=', ['get', 'valid_from'], 1400],
      ['>=', ['get', 'valid_to'], 1400],
    ]);
  });

  it('keeps open-ended (9999 sentinel) features visible at any cutoff', () => {
    // valid_to >= cutoff holds for 9999 at every plausible slider position.
    const upper = (temporalFilter(1400) as unknown[])[2];
    expect(upper).toEqual(['>=', ['get', 'valid_to'], 1400]);
  });
});

describe('withTemporal', () => {
  it('ANDs a base filter with the temporal reveal', () => {
    expect(withTemporal(['==', ['get', 'route_type'], 'muda'], 1400)).toEqual([
      'all',
      ['==', ['get', 'route_type'], 'muda'],
      temporalFilter(1400),
    ]);
  });

  it('returns the bare temporal filter when there is no base filter', () => {
    expect(withTemporal(null, 1400)).toEqual(temporalFilter(1400));
  });
});

describe('dashSubLayers (VMN-20 routes dashed by route_type, B3)', () => {
  it('emits one filtered sub-layer per value; empty pattern renders solid', () => {
    const subs = dashSubLayers({
      field: 'route_type',
      patterns: { muda: [], private: [2, 1.5] },
    });
    expect(subs).toEqual([
      { value: 'muda', dashArray: [], filter: ['==', ['get', 'route_type'], 'muda'] },
      { value: 'private', dashArray: [2, 1.5], filter: ['==', ['get', 'route_type'], 'private'] },
    ]);
  });
});
