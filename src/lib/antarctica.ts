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
