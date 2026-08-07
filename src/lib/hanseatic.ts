import places from '../data/hanseatic/generated/places.json';
import kontore from '../data/hanseatic/generated/kontore.json';

export interface HanseaticPlacePhase {
  id: string;
  place_id: string;
  name: string;
  name_historic: string;
  name_modern: string;
  role: string;
  participation_class: string;
  valid_from: number;
  valid_to: number;
  region: string;
  parent_polity: string;
  certainty: 'high' | 'medium' | 'low';
  coordinates: [number, number];
  essay_anchor: string;
  source: string;
  notes: string;
}

/** Fields the compiler writes as `pending` until research establishes them. */
export const HSE_PENDING = 'pending';

export interface HanseaticKontor {
  id: string;
  kontor_id: string;
  name: string;
  host_settlement: string;
  place_id: string;
  legal_status: string;
  valid_from: string;
  valid_to: string;
  status_phase: string;
  spatial_setting: string;
  regulations: string;
  commodities: string;
  primary_witness: string;
  profile_summary: string;
  certainty_term: string;
  review_status: 'provisional' | 'reviewed' | 'approved';
  source: string;
  notes: string;
}

const PLACE_PHASES = places as HanseaticPlacePhase[];
const KONTORE = kontore as HanseaticKontor[];

/** True when research has not yet filled this field, so callers never print `pending`. */
export function isPending(value: string): boolean {
  return value.trim() === HSE_PENDING;
}

export function listHanseaticKontore(): HanseaticKontor[] {
  return KONTORE;
}

export function getHanseaticKontor(kontorId: string): HanseaticKontor {
  const found = KONTORE.find((candidate) => candidate.kontor_id === kontorId);
  if (!found) throw new Error(`Unknown Hanseatic Kontor '${kontorId}'`);
  return found;
}

export function getHanseaticPlacePhase(placeId: string): HanseaticPlacePhase {
  const phase = PLACE_PHASES.find((candidate) => candidate.place_id === placeId);
  if (!phase) throw new Error(`Unknown Hanseatic place '${placeId}'`);
  return phase;
}

/**
 * Fold case and diacritics so a typed "Lubeck" reaches "Lübeck" and a typed
 * "Wisby" reaches "Visby" by its historic spelling. Without the fold, the
 * historic names the essay actually uses are the ones hardest to search for.
 */
function foldName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Every name a place phase answers to: current, historic and modern. */
export function hanseaticPlaceNames(phase: HanseaticPlacePhase): string[] {
  return [...new Set([phase.name, phase.name_historic, phase.name_modern])].filter(Boolean);
}

/**
 * Match place phases on any of their names (KAN-311). An empty query matches
 * nothing rather than everything: this feeds a search affordance, not a listing.
 */
export function searchHanseaticPlaces(query: string): HanseaticPlacePhase[] {
  const needle = foldName(query.trim());
  if (!needle) return [];
  return PLACE_PHASES.filter((phase) =>
    hanseaticPlaceNames(phase).some((name) => foldName(name).includes(needle)),
  );
}

export function toHanseaticAtlasHref(phase: HanseaticPlacePhase): string {
  const params = new URLSearchParams({
    year: String(phase.valid_from),
    layers: 'hanseatic-places',
    feature: phase.id,
  });
  return `/atlas?${params.toString()}`;
}
