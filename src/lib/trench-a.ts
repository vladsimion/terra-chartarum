/**
 * Trench A <-> CND bridge (KAN-339)
 *
 * Terra Sigillata's stelae and test pits were the corpus before there was one.
 * KAN-338 migrated them into the Corpus Nominum Daciae; this module is how the
 * essay reads them back, so that a stone and its CND source record cannot drift
 * apart the way two hand-maintained copies would.
 *
 * The data is compiled by `scripts/dacia/build.py` from the migration inventory
 * itself and committed as `src/data/dacia/generated/trench-a.json`. Nothing here
 * is authored: adding an attestation changes what the essay says about a pit on
 * the next `make dacia`, and a stone whose source has not migrated simply has no
 * entry rather than a stale one.
 */
import bridge from '../data/dacia/generated/trench-a.json';
import { buildAtlasShareUrl } from './atlas-share';

export interface TrenchAStela {
  /** The exhibition's own id for the stone, e.g. `ptolemy`. */
  stela: string;
  sourceId: string;
  shortTitle: string;
  title: string;
  sourceFamily: string;
  dateLabel: string;
  yearFrom: number | null;
  yearTo: number | null;
  repository: string;
  reviewState: string;
  attestations: number;
  silences: number;
  sampleAttestation: {
    attestationId: string;
    attestationClass: string;
    name: string;
    reviewState: string;
    placeId: string;
    placeName: string;
  } | null;
}

export interface TrenchAPitPlace {
  placeId: string;
  referenceName: string;
  placeType: string;
  region: string;
  locationStatus: string;
  /** The corpus's reference location; null on an unlocated place. */
  lon: number | null;
  lat: number | null;
}

export interface TrenchAPit {
  /** The exhibition's own id for the pit, e.g. `napoca`. */
  pit: string;
  places: TrenchAPitPlace[];
  attestations: number;
  silences: number;
  cells: number;
  localCells: number;
  /** The pit's earliest attestation, which is what the Atlas opens on. */
  feature: string;
}

/** A datum the migration deliberately left in the essay, and why. */
export interface TrenchALocal {
  ref: string;
  label: string;
  reason: string;
}

const STELAE = bridge.stelae as TrenchAStela[];
const PITS = bridge.pits as TrenchAPit[];
const LOCAL = bridge.local as TrenchALocal[];

/** The release these records belong to, e.g. `cnd-0.1`. */
export const CND_RELEASE = bridge.release;

/**
 * The Atlas layer the essay links into. CND 0.1 is a pilot: nothing has passed
 * human review, so the public tier is empty by design and a link to it would
 * open an empty map. The essay therefore points at the research tier, which is
 * the layer that says on its face that its records are not yet evidence.
 */
export const CND_ATLAS_LAYER = bridge.researchLayer;

export function getTrenchAStelae(): TrenchAStela[] {
  return STELAE;
}

export function getTrenchAStela(stela: string): TrenchAStela | undefined {
  return STELAE.find((entry) => entry.stela === stela);
}

export function getTrenchAPits(): TrenchAPit[] {
  return PITS;
}

export function getTrenchAPit(pit: string): TrenchAPit | undefined {
  return PITS.find((entry) => entry.pit === pit);
}

export function getTrenchALocal(): TrenchALocal[] {
  return LOCAL;
}

/** Every CND place Trench A's pits attest, keyed by its corpus id. */
export function getTrenchAPlaces(): Map<string, TrenchAPitPlace> {
  return new Map(PITS.flatMap((pit) => pit.places).map((place) => [place.placeId, place]));
}

/**
 * A deep link into the Atlas on the existing share contract (KAN-232): the
 * research layer on, and a named feature for the map to open. No year is set -
 * the essay is not asking the Atlas to take a position on when to look.
 */
export function atlasUrl(feature?: string): string {
  return buildAtlasShareUrl('https://terra-chartarum.pages.dev/atlas', {
    layers: [CND_ATLAS_LAYER],
    feature: feature || undefined,
  }).replace('https://terra-chartarum.pages.dev', '');
}
