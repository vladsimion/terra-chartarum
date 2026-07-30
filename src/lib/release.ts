/**
 * Staged essay release (KAN-263).
 *
 * The site is fully static: Cloudflare Pages rebuilds only on a push to `main`.
 * The gate below is therefore evaluated once, at build time - an essay whose
 * `releaseAt` date has passed stays invisible until the next build. Releasing
 * an essay is deliberate: edit its date, commit, push.
 *
 * `releaseAt` is distinct from `publishedAt`, which is the essay's editorial
 * date of record and only orders the RSS feed.
 */

/** The date an essay carries when it has no scheduled release. */
export const UNSCHEDULED = '2099-01-01';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date as `YYYY-MM-DD`, in the build machine's local timezone. */
export function today(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * True once the release date has arrived. Zero-padded ISO dates sort
 * lexicographically, so a string compare is both correct and timezone-free.
 */
export function isReleased(releaseAt: string, now: Date = new Date()): boolean {
  if (!ISO_DATE.test(releaseAt)) {
    throw new Error(`releaseAt must be YYYY-MM-DD, received '${releaseAt}'`);
  }
  return releaseAt <= today(now);
}

/**
 * Local authoring escape hatch: `SHOW_UNRELEASED=1 npm run dev` renders the
 * whole collection so embargoed essays can still be edited and previewed. It is
 * never set in Cloudflare Pages, so production and preview deploys both apply
 * the gate.
 *
 * Read from `process.env`, not `import.meta.env`: Vite only surfaces `.env`
 * files there, so a shell-supplied variable would silently do nothing. The gate
 * runs server-side only (Astro frontmatter), but the guard keeps it inert if
 * this module ever reaches a client bundle - where it must fail closed.
 */
export function showUnreleased(): boolean {
  return typeof process !== 'undefined' && process.env?.SHOW_UNRELEASED === '1';
}
