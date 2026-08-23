/**
 * Disproved and disputed geography: a presentation contract (KAN-426)
 *
 * Antarctica has the first population of these records, but the pattern is not
 * Antarctic. Phantom islands, speculative lakes, false mountain ranges and
 * retracted coastlines all pose the same problem: the feature is on the map
 * because somebody reported it, the report was reasonable at the time, and the
 * later correction is a separate piece of evidence rather than a verdict on the
 * person who made the claim.
 *
 * This module is deliberately programme-neutral so it can be promoted into the
 * shared TC-CORE contracts. It takes a record shaped like the one below and
 * answers three questions a feature panel has to answer: is this presentable at
 * all, what does it encode without colour, and what is the honest one-line
 * statement of its status.
 *
 * What it will not do is decide that a feature was wrong. `disproved` is a
 * property of the evidence, and `unresolved` is a real answer that must survive
 * contact with a UI that would rather show a badge.
 */

/**
 * What happened to a claim after it was made. Held apart from the evidence that
 * produced it, so a record can carry both.
 */
export const DISPROOF_STATES = [
  'confirmed',
  'modified',
  'disproved',
  'unresolved',
  'not_applicable',
] as const;
export type DisproofState = (typeof DISPROOF_STATES)[number];

/**
 * How a disputed feature is drawn. Non-colour by construction: every state has a
 * distinct dash pattern and a distinct label, so the encoding survives
 * greyscale, colour-blindness and a printed page.
 */
export interface DisproofEncoding {
  /** Dash array in pixels; empty means solid. */
  readonly dash: readonly number[];
  /** Short label shown in a legend and read by a screen reader. */
  readonly label: string;
  /** Longer text for a feature panel or a tooltip. */
  readonly description: string;
}

export const DISPROOF_ENCODINGS: Readonly<Record<DisproofState, DisproofEncoding>> = {
  confirmed: {
    dash: [],
    label: 'Confirmed',
    description: 'Independently observed again after the original claim.',
  },
  modified: {
    dash: [6, 3],
    label: 'Corrected',
    description: 'Part of the claim held and part was revised by later evidence.',
  },
  disproved: {
    dash: [2, 4],
    label: 'Disproved',
    description: 'Later evidence showed the feature was not there as claimed.',
  },
  unresolved: {
    dash: [1, 3, 6, 3],
    label: 'Unresolved',
    description: 'Neither confirmed nor disproved. The question is still open.',
  },
  not_applicable: {
    dash: [],
    label: 'Not applicable',
    description: 'The record makes no claim that a later observation could settle.',
  },
};

/**
 * The shape a disputed record has to have before it can be shown. Four fields
 * are not decoration: without them the presentation collapses into "somebody was
 * wrong", which is the reading this whole contract exists to prevent.
 */
export interface DisputedRecord {
  id: string;
  displayName: string;
  /** Who introduced the feature. */
  claimant: string;
  /** What was actually reported, in the claimant's terms. */
  whatWasReported: string;
  /** Why it was a reasonable thing to record at the time. */
  whyPlausible: string;
  /** What later evidence said. */
  laterEvidence: string;
  laterStatus: string;
  /** Where scholarship stands now, which may differ from `laterStatus`. */
  currentScholarlyStatus: string;
  /** Present only where a source supports a causal explanation. */
  attributedCause?: string | null;
  sourceId?: string | null;
  sourceLocator?: string;
}

export interface PresentabilityResult {
  presentable: boolean;
  /** Field names that are missing or empty, in a stable order. */
  missing: string[];
}

/**
 * Whether a record may be shown to a reader as a disputed feature.
 *
 * The bar is the four questions a panel must answer, not the quality of the
 * scholarship. A record can be entirely unreviewed and still presentable, so
 * long as it says who claimed what, why that was reasonable, and what happened
 * next. A record missing any of those would be presenting an error without its
 * context, which is the failure mode.
 */
export function assessPresentability(record: DisputedRecord): PresentabilityResult {
  const required: (keyof DisputedRecord)[] = [
    'claimant',
    'whatWasReported',
    'whyPlausible',
    'laterEvidence',
  ];
  const missing = required.filter((field) => !String(record[field] ?? '').trim());
  return { presentable: missing.length === 0, missing: missing.map(String) };
}

/** The non-colour encoding for a record, falling back to unresolved. */
export function encodingFor(state: string): DisproofEncoding {
  return DISPROOF_ENCODINGS[state as DisproofState] ?? DISPROOF_ENCODINGS.unresolved;
}

/**
 * True when a record asserts why an error was made rather than only that it was
 * corrected. Callers should treat a cause as a claim needing its own source: a
 * mirage explanation is far stronger than a record of non-confirmation, and the
 * two are routinely conflated.
 */
export function claimsACause(record: DisputedRecord): boolean {
  return Boolean(record.attributedCause && record.attributedCause.trim());
}

/**
 * A one-line status a panel can print without editorialising.
 *
 * It deliberately never says "wrong", "myth" or "invented". Where later status
 * and current scholarship disagree, both are shown: a feature removed from
 * charts in 1843 whose status is now argued over is a more interesting record
 * than either half alone.
 */
export function statusLine(record: DisputedRecord): string {
  const later = encodingFor(record.laterStatus).label;
  const current = encodingFor(record.currentScholarlyStatus).label;
  if (record.laterStatus === record.currentScholarlyStatus) {
    return `${later}. Claimed by ${record.claimant}.`;
  }
  return `${later} at the time; ${current.toLowerCase()} in current scholarship. Claimed by ${record.claimant}.`;
}

/**
 * A static transcript of a disputed record: the accessible fallback every
 * interactive owes, and the thing a reader gets when the map does not load.
 * Ordered so it reads as an argument rather than as a form.
 */
export function transcriptFor(record: DisputedRecord): { heading: string; body: string }[] {
  const rows = [
    { heading: 'Who claimed it', body: record.claimant },
    { heading: 'What was reported', body: record.whatWasReported },
    { heading: 'Why it was plausible', body: record.whyPlausible },
    { heading: 'What later evidence said', body: record.laterEvidence },
    { heading: 'Status', body: statusLine(record) },
  ];
  if (claimsACause(record)) {
    rows.splice(4, 0, { heading: 'Attributed cause', body: String(record.attributedCause) });
  }
  return rows.filter((row) => Boolean(row.body && row.body.trim()));
}
