/**
 * Nomen Errans, the single-name production interaction suite (KAN-345/346/347)
 *
 * Trench C's proving run: one word, Dacia, followed through each reviewed referent it
 * was made to carry, with each career resolving to the source that attests it
 * and - where the Atlas honestly covers the referent - to a map composition.
 *
 * Nothing here is authored. `scripts/dacia/build.py` compiles
 * `src/data/dacia/generated/nomen-errans.json` from the CND `name_uses` ledger,
 * the `sources` table and the reviewed Atlas routing in
 * `data/dacia/reference/nomen-errans-atlas-states.csv`. A period corrected in
 * the corpus corrects the essay on the next `make dacia`; a career demoted
 * below `reviewed` leaves the essay on the same run rather than lingering as a
 * second, older copy of the chronology.
 *
 * The one rule this module adds to the data is about links. A career is only
 * given an Atlas link where the routing says a layer actually covers its
 * referent, because a deep link that opens an empty map reads to a reader
 * exactly like a deep link that works.
 */
import slice from '../data/dacia/generated/nomen-errans.json';
import { atlasDeepLink, type AtlasShareState } from './atlas-share';

/** How a name use reaches the Atlas, or why it does not. */
export type NameUseCoverage = 'in_coverage' | 'out_of_coverage' | 'no_layer_yet';

export interface NameUseSource {
  id: string;
  shortTitle: string;
  title: string;
  creator: string;
  family: string;
  dateLabel: string;
  repository: string;
  citation: string;
  rightsStatement: string;
  reviewState: string;
}

export interface NameUseAtlasRoute {
  coverage: NameUseCoverage;
  /** Layers to switch on. Empty unless `coverage` is `in_coverage`. */
  layers: string[];
  year: number | null;
  feature: string | null;
  /** Why this composition, or why there is none. Always present. */
  note: string;
  reviewState: string;
}

/** One career of the word: a referent it was made to carry, and the witness for it. */
export interface NameCareer {
  id: string;
  lexicalForm: string;
  institution: string;
  referentKind: string;
  referentKindLabel: string;
  referentLabel: string;
  referentPlaceId: string | null;
  periodFrom: number | null;
  periodTo: number | null;
  /** The period as one line, formatted by the row's own `date_precision`. */
  periodLabel: string;
  datePrecision: string;
  datePrecisionLabel: string;
  fateClass: string;
  fateClassLabel: string;
  fateClassDefinition: string;
  locatorType: string;
  locatorTypeLabel: string;
  locator: string;
  confidence: string;
  confidenceLabel: string;
  confidenceDefinition: string;
  reviewState: string;
  reviewer: string;
  reviewDate: string;
  note: string;
  source: NameUseSource | null;
  atlas: NameUseAtlasRoute | null;
}

/** A career the corpus holds but nobody has cleared, named rather than hidden. */
export interface WithheldCareer {
  id: string;
  referentLabel: string;
  fateClass: string;
  fateClassLabel: string;
  reviewState: string;
}

/** A directed semantic/genealogical claim that a person has cleared. */
export interface NameRelation {
  id: string;
  from: string;
  to: string;
  kind: string;
  kindLabel: string;
  kindDefinition: string;
  evidenceAttestationId: string | null;
  evidenceNote: string;
  confidence: string;
  confidenceLabel: string;
  confidenceDefinition: string;
  reviewState: string;
  reviewer: string;
  reviewDate: string;
  note: string;
}

/** A recorded relation that is counted but may not be drawn yet. */
export interface WithheldRelation {
  id: string;
  from: string;
  to: string;
  kind: string;
  kindLabel: string;
  reviewState: string;
}

const CAREERS = slice.careers as NameCareer[];
const WITHHELD = slice.withheld as WithheldCareer[];
const RELATIONS = slice.relations as NameRelation[];
const WITHHELD_RELATIONS = slice.withheldRelations as WithheldRelation[];

/** The word the slice follows. One name, by design: this is the proving run. */
export const NOMEN_ERRANS_FORM = slice.lexicalForm;

/** The essay the slice is published in, and the beat the interaction sits on. */
export const NOMEN_ERRANS_ESSAY = slice.essaySlug;
export const NOMEN_ERRANS_BEAT = 'careers';

/** The release these records belong to, e.g. `cnd-0.1`. */
export const CND_RELEASE = slice.release;

export function getNameCareers(): NameCareer[] {
  return CAREERS;
}

export function getNameCareer(id: string): NameCareer | undefined {
  return CAREERS.find((career) => career.id === id);
}

/** Compiled but not cleared. The essay counts these rather than dropping them. */
export function getWithheldCareers(): WithheldCareer[] {
  return WITHHELD;
}

/** Only relationships that passed the same human-review gate as the nodes. */
export function getNameRelations(): NameRelation[] {
  return RELATIONS;
}

/** Recorded relationships below the display threshold, named rather than hidden. */
export function getWithheldRelations(): WithheldRelation[] {
  return WITHHELD_RELATIONS;
}

/**
 * The Atlas state a career opens, or `null` where no layer honestly covers it.
 *
 * `essay` is carried so the Atlas knows which passage the reader came from and
 * can offer the way back to it - the reverse leg of the slice. It names the
 * essay only; the beat is the layer's own `essayLinks` entry, so a section that
 * is renamed moves the return link with it instead of stranding a query string.
 */
export function atlasStateFor(career: NameCareer): AtlasShareState | null {
  const route = career.atlas;
  if (!route || route.coverage !== 'in_coverage' || route.layers.length === 0) return null;
  return {
    layers: route.layers,
    year: route.year ?? undefined,
    feature: route.feature ?? undefined,
    essay: NOMEN_ERRANS_ESSAY,
  };
}

/** The same state as a root-relative href, for prose and server-rendered figures. */
export function atlasUrlFor(career: NameCareer): string | null {
  const state = atlasStateFor(career);
  return state ? atlasDeepLink(state) : null;
}

/** Every layer the slice can ask the Atlas to draw, deduplicated and sorted. */
export function nameCareerLayers(): string[] {
  return [...new Set(CAREERS.flatMap((career) => career.atlas?.layers ?? []))].sort();
}
