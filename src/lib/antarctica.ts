/**
 * Antarctic knowledge pilot (KAN-423)
 *
 * TERRA INCOGNITA argues that conjectured, reported, observed, reconstructed and
 * disproved geography are different kinds of thing. That argument only survives
 * contact with software if the difference is carried in the data rather than in
 * the prose around it, so this module reads the compiled pilot slice and offers
 * the essay exactly the questions the argument needs to ask.
 *
 * `scripts/antarctica/build.py` compiles one projection into three assets: this
 * JSON and the two Atlas GeoJSON layers. The essay reads the first and the Atlas
 * reads the other two, and they are the same records - the mappable subset is a
 * filter and the line/point split is a MapLibre render constraint, never a
 * separate compilation. Nothing here authors a date, a position or a confidence.
 */
import pilot from '../data/antarctica/generated/pilot.json';

/**
 * The frozen evidence vocabulary (specification section 4.3). Public labels may
 * be friendlier; these values may not drift, because a stored `conjectured` that
 * silently became `reported_not_observed` would rewrite the argument.
 */
export const ANTARCTIC_EVIDENCE_CLASSES = [
  'conjectured',
  'inherited_cartography',
  'reported_not_observed',
  'direct_observation',
  'instrumental_fix',
  'dead_reckoning',
  'scholarly_reconstruction',
  'editorial_interpolation',
  'later_confirmation',
  'later_disproof',
] as const;
export type AntarcticEvidenceClass = (typeof ANTARCTIC_EVIDENCE_CLASSES)[number];

/**
 * Where a geometry came from. The distinction that matters most is the last two
 * against the rest: those are our linework, not a historical record, and no
 * interface may present them as evidence.
 */
export const ANTARCTIC_GEOMETRY_PROVENANCE = [
  'digitised_from_map',
  'transcribed_from_coordinates',
  'derived_from_log',
  'modern_reference_dataset',
  'scholarly_reconstruction',
  'editorial_interpolation',
  'editorial_generalisation',
  'not_spatial',
] as const;
export type AntarcticGeometryProvenance = (typeof ANTARCTIC_GEOMETRY_PROVENANCE)[number];

/** Provenances that are Terra Chartarum's own drawing rather than a source's. */
const OUR_OWN_LINEWORK: readonly string[] = ['editorial_interpolation', 'editorial_generalisation'];

/** Review states a record must reach before it may be argued from in public. */
const PUBLIC_STATES: readonly string[] = ['approved', 'published'];

export type AntarcticRecordKind = 'feature' | 'track' | 'observation' | 'ghost';

export interface AntarcticRecord {
  id: string;
  kind: AntarcticRecordKind;
  act: string;
  title: string;
  evidenceClass: string;
  geometryProvenance: string;
  confidence: string;
  reviewState: string;
  sourceId: string | null;
  sourceLocator: string;
  notes: string;
  geometry: unknown | null;
  validFrom?: number | null;
  validTo?: number | null;
  laterStatus?: string;
  claimant?: string;
  whatWasReported?: string;
  whyPlausible?: string;
  laterEvidence?: string;
  currentScholarlyStatus?: string;
}

/** One phase of an expedition. `underOwnPower` is the field Act VIII turns on. */
export interface AntarcticPhase {
  id: string;
  expeditionId: string;
  sequence: number;
  phaseKind: string;
  displayName: string;
  dateFrom: string;
  dateTo: string;
  datePrecision: string;
  underOwnPower: 'yes' | 'no' | 'planned';
  evidenceClass: string;
  confidence: string;
  reviewState: string;
  notes: string;
}

/**
 * One party's claim in a priority contest. There is no winner field, and adding
 * one would settle by data entry a question the historiography has not settled.
 */
export interface AntarcticPriorityClaim {
  id: string;
  contest: string;
  claimant: string;
  expeditionId: string | null;
  observationId: string | null;
  claimDate: string;
  definitionSatisfied: string;
  assertedBy: string;
  contestedBy: string;
  evidenceStrength: string;
  reviewStatus: string;
  notes: string;
}

/** A coast, with the four dates that may or may not exist for it. */
export interface AntarcticCoastSegment {
  id: string;
  displayName: string;
  region: string;
  firstClaimedDate: string | null;
  firstObservedDate: string | null;
  firstChartedDate: string | null;
  firstConfirmedDate: string | null;
  claimedByExpeditionId: string | null;
  confirmedByExpeditionId: string | null;
  laterStatus: string;
  evidenceClass: string;
  confidence: string;
  reviewState: string;
  notes: string;
}

/** What a cumulative chart compiles, and which issue of it carries the entry. */
export interface AntarcticChartContribution {
  id: string;
  mapObjectId: string;
  expeditionId: string | null;
  voyageLabel: string;
  chartDates: string;
  contributionKind: string;
  presentOn1874: boolean;
  presentOn1910: boolean;
  reviewState: string;
  notes: string;
}

export interface AntarcticExpedition {
  id: string;
  act: string;
  displayName: string;
  commander: string;
  vessels: string[];
  yearFrom: number;
  yearTo: number;
  reviewState: string;
}

const RECORDS = pilot.records as AntarcticRecord[];
const EXPEDITIONS = pilot.expeditions as AntarcticExpedition[];
const PHASES = pilot.phases as AntarcticPhase[];
const PRIORITY_CLAIMS = pilot.priorityClaims as AntarcticPriorityClaim[];
const COASTLINE = pilot.coastline as AntarcticCoastSegment[];
const CHART_CONTRIBUTIONS = pilot.chartContributions as AntarcticChartContribution[];

export function getAntarcticRecords(): AntarcticRecord[] {
  return RECORDS;
}

export function getAntarcticExpeditions(): AntarcticExpedition[] {
  return EXPEDITIONS;
}

export function getAntarcticRelease(): {
  release: string;
  layerIds: string[];
  schemaVersion: number;
} {
  return { release: pilot.release, layerIds: pilot.layerIds, schemaVersion: pilot.schemaVersion };
}

/** The subset the Atlas can draw. Everything else is an argument without a place. */
export function getMappableRecords(): AntarcticRecord[] {
  return RECORDS.filter((record) => record.geometry !== null);
}

export function getRecordsByAct(act: string): AntarcticRecord[] {
  return RECORDS.filter((record) => record.act === act);
}

export function getRecordsByEvidenceClass(evidenceClass: string): AntarcticRecord[] {
  return RECORDS.filter((record) => record.evidenceClass === evidenceClass);
}

/**
 * True when the line or polygon was drawn by Terra Chartarum rather than taken
 * from a source. Callers use this to style a record as interpretation; it is not
 * a quality judgement, and an editorial line can be the most useful thing on the
 * map so long as it never passes for a record.
 */
export function isEditorialLinework(record: AntarcticRecord): boolean {
  return OUR_OWN_LINEWORK.includes(record.geometryProvenance);
}

/**
 * Which Atlas layer a record is drawn on (ANT-5 / ANT-10, KAN-424 / KAN-429).
 *
 * This mirrors the split in `scripts/antarctica/build.py`, and it is a rule
 * rather than a table on purpose: a deep link that names its layers by hand
 * goes stale the moment a record changes kind, and it goes stale silently,
 * because the Atlas simply opens with that record missing. `antarctica.test.ts`
 * asserts this function reproduces the compiled GeoJSON exactly, so the two
 * cannot drift without failing.
 *
 * A record with no geometry belongs to no layer. That is not an omission: an
 * argument with no place is precisely what the Atlas cannot show.
 */
export function layerForRecord(record: AntarcticRecord): string | null {
  if (record.geometry === null) return null;
  if (record.kind === 'track') return 'antarctica-expedition-tracks';
  if (record.kind === 'ghost') return 'antarctica-ghost-geographies';
  if (record.kind === 'observation') return 'antarctica-observations';
  if (record.kind === 'feature') {
    return record.evidenceClass === 'conjectured'
      ? 'antarctica-conjectured-south'
      : 'antarctica-observations';
  }
  return null;
}

/**
 * The Atlas composition that shows the given records: sorted, de-duplicated and
 * containing only layers that something in the list is actually drawn on.
 */
export function atlasLayersFor(recordIds: readonly string[]): string[] {
  const byId = new Map(RECORDS.map((record) => [record.id, record]));
  const layers = new Set<string>();
  for (const id of recordIds) {
    const record = byId.get(id);
    if (!record) throw new Error(`Unknown Antarctic record '${id}'`);
    const layer = layerForRecord(record);
    if (layer) layers.add(layer);
  }
  return [...layers].sort();
}

/**
 * Records a public reader may be shown as established. Currently none, and the
 * function exists so that stays a computed fact rather than a claim in a comment.
 */
export function getPublicRecords(): AntarcticRecord[] {
  return RECORDS.filter((record) => PUBLIC_STATES.includes(record.reviewState));
}

/**
 * Ghost features, with the four things a feature panel has to answer: who
 * introduced it, what was reported, why it was plausible, and what happened
 * later. A ghost with any of those missing is just a record that someone was
 * wrong, which is the presentation the methodology rejects.
 */
export function getGhostRecords(): AntarcticRecord[] {
  return RECORDS.filter((record) => record.kind === 'ghost');
}

/**
 * The temporal filter the Atlas uses. A record with no dates is always relevant
 * rather than never: an undated claim about a coastline does not stop applying
 * because the reader moved the slider.
 */
export function isRelevantInYear(record: AntarcticRecord, year: number): boolean {
  const from = record.validFrom ?? null;
  const to = record.validTo ?? null;
  if (from === null && to === null) return true;
  if (from !== null && year < from) return false;
  if (to !== null && to !== 9999 && year > to) return false;
  return true;
}

/**
 * Expedition phases in order. Act VIII reads these rather than a single route,
 * because the expedition stopped being one kind of thing and became another.
 */
export function getPhases(expeditionId: string): AntarcticPhase[] {
  return PHASES.filter((phase) => phase.expeditionId === expeditionId).sort(
    (a, b) => a.sequence - b.sequence,
  );
}

/**
 * The phases in which the vessel actually went where it was steered. Everything
 * else was carried, planned, or walked, and a route drawn across all of them
 * would be a route nobody sailed.
 */
export function getSelfPropelledPhases(expeditionId: string): AntarcticPhase[] {
  return getPhases(expeditionId).filter((phase) => phase.underOwnPower === 'yes');
}

/** Every claim in one priority contest, in date order, with no winner marked. */
export function getPriorityContest(contest: string): AntarcticPriorityClaim[] {
  return PRIORITY_CLAIMS.filter((claim) => claim.contest === contest).sort((a, b) =>
    a.claimDate.localeCompare(b.claimDate),
  );
}

export function getPriorityContests(): string[] {
  return [...new Set(PRIORITY_CLAIMS.map((claim) => claim.contest))].sort();
}

export function getCoastlineChronology(): AntarcticCoastSegment[] {
  return COASTLINE;
}

/**
 * Segments claimed but never independently observed. The gap between those two
 * dates is what Act VI is about, and it is computed rather than asserted.
 */
export function getUnobservedClaims(): AntarcticCoastSegment[] {
  return COASTLINE.filter(
    (segment) => segment.firstClaimedDate !== null && segment.firstObservedDate === null,
  );
}

/**
 * What a reader could have known from the charted record by a given year. Uses
 * the charted date rather than the claimed one: a claim in a logbook nobody has
 * read is not knowledge anyone had.
 */
export function chartedByYear(year: number): AntarcticCoastSegment[] {
  return COASTLINE.filter((segment) => {
    const charted = segment.firstChartedDate;
    return charted !== null && Number(charted.slice(0, 4)) <= year;
  });
}

export function getChartContributions(): AntarcticChartContribution[] {
  return CHART_CONTRIBUTIONS;
}

/**
 * What the 1910 issue of the ice chart added to the 1874 compilation. The whole
 * of Act VII's "layered archive" reduces to this list being non-empty, and it is
 * derived from two catalogue titles rather than asserted in prose.
 */
export function chartRevision(): {
  retained: AntarcticChartContribution[];
  added: AntarcticChartContribution[];
  dropped: AntarcticChartContribution[];
} {
  return {
    retained: CHART_CONTRIBUTIONS.filter((c) => c.presentOn1874 && c.presentOn1910),
    added: CHART_CONTRIBUTIONS.filter((c) => !c.presentOn1874 && c.presentOn1910),
    dropped: CHART_CONTRIBUTIONS.filter((c) => c.presentOn1874 && !c.presentOn1910),
  };
}
