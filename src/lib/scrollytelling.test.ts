import { describe, it, expect } from 'vitest';
import {
  pickActiveIndex,
  prefersReducedMotion,
  createScrollSpy,
  type VisibilityRecord,
} from './scrollytelling';

const rec = (index: number, ratio: number): VisibilityRecord => ({
  index,
  isIntersecting: ratio > 0,
  intersectionRatio: ratio,
});

describe('pickActiveIndex', () => {
  it('chooses the most-visible intersecting step', () => {
    const records = [rec(0, 0.1), rec(1, 0.8), rec(2, 0.3)];
    expect(pickActiveIndex(records)).toBe(1);
  });

  it('keeps the previous active step when nothing intersects (sticky through gaps)', () => {
    const records = [rec(0, 0), rec(1, 0), rec(2, 0)];
    expect(pickActiveIndex(records, 1)).toBe(1);
  });

  it('returns the fallback when there are no records', () => {
    expect(pickActiveIndex([], -1)).toBe(-1);
  });

  it('breaks ties toward the earlier step', () => {
    const records = [rec(0, 0.5), rec(1, 0.5)];
    expect(pickActiveIndex(records)).toBe(0);
  });

  it('ignores ratio on non-intersecting records', () => {
    // A stale ratio with isIntersecting=false must not win.
    const records: VisibilityRecord[] = [
      { index: 0, isIntersecting: false, intersectionRatio: 0.9 },
      { index: 1, isIntersecting: true, intersectionRatio: 0.2 },
    ];
    expect(pickActiveIndex(records)).toBe(1);
  });
});

describe('prefersReducedMotion', () => {
  it('is true when the media query matches', () => {
    expect(prefersReducedMotion(() => ({ matches: true }))).toBe(true);
  });

  it('is false when the media query does not match', () => {
    expect(prefersReducedMotion(() => ({ matches: false }))).toBe(false);
  });

  it('defaults to false when matchMedia is unavailable (SSR)', () => {
    expect(prefersReducedMotion(undefined)).toBe(false);
  });
});

describe('createScrollSpy', () => {
  it('returns an inert handle without IntersectionObserver (SSR-safe)', () => {
    // The vitest node environment has no IntersectionObserver.
    const spy = createScrollSpy([], { onActivate: () => {} });
    expect(spy.activeIndex).toBe(-1);
    expect(() => spy.destroy()).not.toThrow();
  });
});
