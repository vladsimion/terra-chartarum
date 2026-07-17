/**
 * Scrollytelling scaffolding (ATLAS-404 / KAN-35).
 *
 * A small, framework-agnostic IntersectionObserver scroll-spy that any essay
 * island can reuse: give it the step elements, and it reports which step is
 * "active" as the reader scrolls, so a sticky graphic can react. It is
 * reduced-motion aware and SSR-safe — importing it never touches the DOM, and
 * `createScrollSpy` degrades to an inert handle where IntersectionObserver is
 * unavailable.
 *
 * The activation policy lives in the pure `pickActiveIndex` helper so it can be
 * unit-tested without a browser; the observer is a thin wrapper around it.
 */

/** Minimal per-step visibility record — the shared shape of IntersectionObserverEntry data. */
export interface VisibilityRecord {
  index: number;
  isIntersecting: boolean;
  intersectionRatio: number;
}

/**
 * Pure selector: given the current visibility of every tracked step, decide
 * which index should be active — the intersecting step with the greatest
 * ratio, ties broken toward the earlier step. Returns `fallback` (the previously
 * active index) when nothing is intersecting, so the active step is "sticky"
 * through the gaps between steps rather than flickering to none.
 */
export function pickActiveIndex(records: VisibilityRecord[], fallback = -1): number {
  let best = fallback;
  let bestRatio = 0;
  for (const r of records) {
    if (!r.isIntersecting) continue;
    if (r.intersectionRatio > bestRatio) {
      bestRatio = r.intersectionRatio;
      best = r.index;
    }
  }
  return best;
}

/**
 * True when the environment reports a reduced-motion preference. Accepts an
 * optional `matchMedia` (for testing); defaults to the global one and returns
 * `false` where it is unavailable (SSR / older browsers), i.e. motion is only
 * suppressed on an explicit signal.
 */
export function prefersReducedMotion(
  matchMedia: ((query: string) => { matches: boolean }) | undefined = typeof window !== 'undefined'
    ? window.matchMedia?.bind(window)
    : undefined,
): boolean {
  return matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
}

export interface ScrollSpyOptions {
  /** Fires with the newly-active step index (and element) whenever the active step changes. */
  onActivate: (index: number, step: HTMLElement) => void;
  /**
   * IntersectionObserver rootMargin. Defaults to a narrow band across the
   * viewport middle, so a step activates as it crosses the centre line.
   */
  rootMargin?: string;
  /** Threshold(s) forwarded to IntersectionObserver. */
  threshold?: number | number[];
  /** Observation root; defaults to the viewport. */
  root?: Element | null;
}

export interface ScrollSpy {
  /** Stop observing and release the IntersectionObserver. */
  destroy: () => void;
  /** Index most recently reported as active, or -1 before the first activation. */
  readonly activeIndex: number;
}

/**
 * Wire an IntersectionObserver scroll-spy over `steps`. Returns a handle whose
 * `destroy()` disconnects the observer. When IntersectionObserver is
 * unavailable, or there are no steps, it returns an inert handle so callers need
 * no environment checks of their own.
 */
export function createScrollSpy(steps: HTMLElement[], options: ScrollSpyOptions): ScrollSpy {
  const {
    onActivate,
    rootMargin = '-45% 0px -45% 0px',
    threshold = [0, 0.25, 0.5, 0.75, 1],
    root = null,
  } = options;

  let active = -1;

  if (typeof IntersectionObserver === 'undefined' || steps.length === 0) {
    return {
      destroy() {},
      get activeIndex() {
        return active;
      },
    };
  }

  const indexOf = new Map<Element, number>();
  steps.forEach((el, i) => indexOf.set(el, i));
  const ratios = new Map<number, number>();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const i = indexOf.get(entry.target);
        if (i === undefined) continue;
        ratios.set(i, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      const records: VisibilityRecord[] = steps.map((_, i) => {
        const ratio = ratios.get(i) ?? 0;
        return { index: i, isIntersecting: ratio > 0, intersectionRatio: ratio };
      });
      const next = pickActiveIndex(records, active);
      if (next !== -1 && next !== active) {
        active = next;
        onActivate(active, steps[active]);
      }
    },
    { root, rootMargin, threshold },
  );

  steps.forEach((el) => observer.observe(el));

  return {
    destroy() {
      observer.disconnect();
    },
    get activeIndex() {
      return active;
    },
  };
}
