import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

/**
 * Per-checkout ports for the e2e preview servers.
 *
 * Both suites used to pin a fixed port - 4321 for the main suite, 4331 for the
 * held one - with `reuseExistingServer` on locally. Playwright reuses whatever
 * already answers on that port, so a run would silently attach to a server that
 * had nothing to do with this checkout, and report results for someone else's
 * build. Two ways that happened here:
 *
 *   - 4321 is Astro's dev-server port, the one README, CONTRIBUTING, SPECS and
 *     the handbook all tell you to run. With `npm run dev` up, `npm run test:e2e`
 *     tested unbuilt dev output - precisely what building `dist/` first exists to
 *     avoid. 4331 collided the same way with the manual `astro preview` the
 *     mobile-QA instructions ask for.
 *   - This repo is worked in several git worktrees at once. A preview left
 *     running in one worktree served its `dist/` to a suite run from another.
 *     That is how KAN-432 was nearly mismeasured: the fix under test looked
 *     absent because port 4321 belonged to a different checkout's build.
 *
 * Neither failure announces itself. You get a green run against the wrong code,
 * or a red one you cannot reproduce, and the port is the last thing you suspect.
 *
 * So the port is derived from the checkout path instead of pinned: every
 * worktree gets its own, no two collide, and none of them is a port anything
 * else here listens on. Reuse becomes safe because the only server that can
 * hold this port is this checkout's own.
 *
 * The range is 43100-43899, above the 4321/4331 family so a stale server from
 * before this change can never be mistaken for a current one.
 */
export type PreviewSuite = 'default' | 'held';

export const RANGE_START = 43_100;
export const RANGE_SIZE = 800;

/**
 * The worktree root. Asking git keeps the port stable no matter which
 * subdirectory the suite is launched from; `process.cwd()` alone would hand the
 * same checkout different ports and start a redundant server.
 */
function checkoutRoot(): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return process.cwd();
  }
}

/**
 * The port `root` gets for `suite`. Pure and total, so the property that matters
 * - two checkouts never landing on one port - is testable without spawning
 * anything. See preview-port.spec.ts.
 */
export function derivePort(root: string, suite: PreviewSuite): number {
  const digest = createHash('sha256').update(`${root}\0${suite}`).digest();
  return RANGE_START + (digest.readUInt16BE(0) % RANGE_SIZE);
}

/**
 * A stable port for `suite` in this checkout. `envOverride` still wins, and
 * still means "build fresh on exactly this port" - see the reuse rule in each
 * config.
 */
export function previewPort(suite: PreviewSuite, envOverride?: string): number {
  if (envOverride) {
    const explicit = Number(envOverride);
    if (!Number.isInteger(explicit) || explicit < 1 || explicit > 65_535) {
      throw new Error(
        `Invalid preview port ${JSON.stringify(envOverride)}: expected an integer from 1 to 65535.`,
      );
    }
    return explicit;
  }

  return derivePort(checkoutRoot(), suite);
}
