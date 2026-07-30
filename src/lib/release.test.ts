import { describe, it, expect } from 'vitest';
import { isReleased, today, UNSCHEDULED } from './release';

// Staged essay release (KAN-263). The gate decides what the build contains, so
// its boundaries are worth pinning: an essay must appear ON its release date,
// not the day after, and an unscheduled essay must never appear by accident.

const at = (iso: string) => new Date(`${iso}T12:00:00`);

describe('today', () => {
  it('formats the local date, zero-padded', () => {
    expect(today(new Date('2026-03-07T23:30:00'))).toBe('2026-03-07');
  });

  it('reports the local day, not the UTC one', () => {
    // 2026-08-30 21:00 local is already the 31st in UTC east of Greenwich; the
    // gate must follow the wall clock of the machine running the build.
    const local = new Date(2026, 7, 30, 21, 0, 0);
    expect(today(local)).toBe('2026-08-30');
  });
});

describe('isReleased', () => {
  it('releases on the date itself', () => {
    expect(isReleased('2026-08-30', at('2026-08-30'))).toBe(true);
  });

  it('holds the day before', () => {
    expect(isReleased('2026-08-30', at('2026-08-29'))).toBe(false);
  });

  it('keeps releasing afterwards', () => {
    expect(isReleased('2026-08-30', at('2027-01-01'))).toBe(true);
  });

  it('orders across month and year boundaries', () => {
    expect(isReleased('2026-09-01', at('2026-08-31'))).toBe(false);
    expect(isReleased('2027-01-01', at('2026-12-31'))).toBe(false);
    expect(isReleased('2026-12-31', at('2027-01-01'))).toBe(true);
  });

  it('never releases an unscheduled essay', () => {
    expect(isReleased(UNSCHEDULED, at('2030-01-01'))).toBe(false);
  });

  it('rejects a malformed date rather than guessing', () => {
    expect(() => isReleased('2026-8-30', at('2026-09-01'))).toThrow(/YYYY-MM-DD/);
    expect(() => isReleased('soon', at('2026-09-01'))).toThrow(/YYYY-MM-DD/);
  });
});
