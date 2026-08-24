import { test, expect } from '@playwright/test';

import { derivePort, previewPort, RANGE_START, RANGE_SIZE } from './preview-port';

/**
 * The invariant that keeps an e2e run honest.
 *
 * A pinned port let Playwright reuse whatever already answered on it - the dev
 * server on 4321, or another worktree's preview - and report that build's
 * results as this one's. These checks pin the properties that make the reuse in
 * both configs safe, so re-pinning a constant fails here rather than in a
 * fortnight, silently, on someone else's branch.
 */
test.describe('e2e preview ports', () => {
  const WELL_KNOWN = [4321, 4331];

  test('no checkout derives a port anything else here listens on', () => {
    // 4321 is `npm run dev` and bare `astro preview`; 4331 is the manual preview
    // the mobile-QA instructions ask for. The range simply excludes them.
    for (const port of WELL_KNOWN) {
      expect(port).toBeLessThan(RANGE_START);
    }

    for (const suite of ['default', 'held'] as const) {
      const port = derivePort('/any/checkout', suite);
      expect(port).toBeGreaterThanOrEqual(RANGE_START);
      expect(port).toBeLessThan(RANGE_START + RANGE_SIZE);
      expect(WELL_KNOWN).not.toContain(port);
    }
  });

  test('a checkout gets one stable port, and the two suites differ', () => {
    const root = '/Users/someone/Projects/site maps';

    // Stable: the same checkout must not start a second server on a re-run.
    expect(derivePort(root, 'default')).toBe(derivePort(root, 'default'));

    // Distinct: the held suite builds with SHOW_UNRELEASED=1, so sharing a port
    // with the normal suite would check held pages against a build that lifts
    // the very hold they assert.
    expect(derivePort(root, 'default')).not.toBe(derivePort(root, 'held'));
  });

  test('sibling worktrees do not collide', () => {
    // The real shape of the bug: the same repo checked out many times at once.
    const roots = [
      '/Users/someone/Projects/site maps',
      '/Users/someone/Projects/site maps/.claude/worktrees/alpha',
      '/Users/someone/Projects/site maps/.claude/worktrees/beta',
      '/Users/someone/Projects/site maps/.claude/worktrees/gamma',
    ];

    const ports = roots.flatMap((root) => [derivePort(root, 'default'), derivePort(root, 'held')]);
    expect(new Set(ports).size).toBe(ports.length);
  });

  test('an explicit port still wins, and a bad one is refused loudly', () => {
    // Release scrubs name a port to force a fresh build; that must keep working.
    expect(previewPort('default', '4390')).toBe(4390);

    // A typo'd override used to fall through `Number(...)` as NaN and take the
    // suite somewhere unpredictable. Fail where the mistake is.
    expect(() => previewPort('default', 'not-a-port')).toThrow(/expected an integer/);
    expect(() => previewPort('default', '70000')).toThrow(/expected an integer/);
  });
});
