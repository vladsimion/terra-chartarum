/**
 * Hiatus absence timeline (KAN-349)
 *
 * Trench B argues from what the record does not say, which only works if the
 * silences are data rather than prose. The states, the witness families they
 * resolve to and the absence taxonomy are compiled by `scripts/dacia/build.py`
 * into `src/data/dacia/generated/hiatus-timeline.json`; this module is the
 * filtering the essay and its timeline consume, so no chronology is written
 * twice.
 *
 * The taxonomy travels with the states deliberately. A filter offering only the
 * classes some state happens to carry would quietly redefine the taxonomy as
 * whatever the data currently is, and the whole point of the six classes is that
 * they exist before any of them is earned.
 */
import timeline from '../data/dacia/generated/hiatus-timeline.json';

export interface HiatusAbsenceClass {
  absenceClass: string;
  definition: string;
  /** What a silence of this kind is worth: none, conditional or contextual. */
  evidentialWeight: string;
  requiresScopeReview: boolean;
  allowedBeforeReview: boolean;
}

export interface HiatusState {
  stateId: string;
  witnessId: string;
  witnessTitle: string;
  witnessQuestion: string;
  sourceFamily: string;
  periodFrom: number;
  periodTo: number;
  datePrecision: string;
  locator: string;
  absenceClass: string;
  scopeReviewed: boolean;
  reviewStatus: string;
  confidence: string;
  note: string;
}

const STATES = timeline.states as HiatusState[];
const CLASSES = timeline.absenceClasses as HiatusAbsenceClass[];

export function getHiatusStates(): HiatusState[] {
  return STATES;
}

/** All six classes, including those no state has earned yet. */
export function getHiatusAbsenceClasses(): HiatusAbsenceClass[] {
  return CLASSES;
}

/** The source families present, for a family filter that cannot go stale. */
export function getHiatusSourceFamilies(): string[] {
  return timeline.sourceFamilies as string[];
}

/** The compiled span, so a timeline axis is not a number typed into prose. */
export function getHiatusSpan(): { from: number; to: number } {
  return timeline.span as { from: number; to: number };
}

export interface HiatusFilter {
  sourceFamilies?: string[];
  absenceClasses?: string[];
  /** Inclusive year window; a state matches if its period overlaps it at all. */
  from?: number;
  to?: number;
}

export function filterHiatusStates(filter: HiatusFilter = {}): HiatusState[] {
  const families = filter.sourceFamilies?.length ? new Set(filter.sourceFamilies) : undefined;
  const classes = filter.absenceClasses?.length ? new Set(filter.absenceClasses) : undefined;

  return STATES.filter((state) => {
    if (families && !families.has(state.sourceFamily)) return false;
    if (classes && !classes.has(state.absenceClass)) return false;
    // Overlap, not containment: a family surveyed 1300-1526 is present in 1400
    // and a window that clipped it to its endpoints would hide most of it.
    if (filter.to !== undefined && state.periodFrom > filter.to) return false;
    if (filter.from !== undefined && state.periodTo < filter.from) return false;
    return true;
  });
}

/**
 * Whether a state's silence may be argued from yet.
 *
 * Two conditions, and they are different questions. `evidentialWeight: none`
 * means the class never carries an argument however well reviewed it is -
 * `not_surveyed` says nobody looked, which is an admission rather than a
 * finding, and `allowedBeforeReview` marks it assignable, not usable. The
 * classes that can carry weight then need the scope read and the state reviewed,
 * which is the same bar the compiler holds.
 */
export function isArguable(state: HiatusState): boolean {
  const definition = CLASSES.find((entry) => entry.absenceClass === state.absenceClass);
  if (!definition || definition.evidentialWeight === 'none') return false;
  if (!definition.requiresScopeReview) return true;
  return state.scopeReviewed && state.reviewStatus === 'reviewed';
}
