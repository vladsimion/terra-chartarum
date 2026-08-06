import places from '../data/hanseatic/generated/places.json';

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

const PLACE_PHASES = places as HanseaticPlacePhase[];

export function getHanseaticPlacePhase(placeId: string): HanseaticPlacePhase {
  const phase = PLACE_PHASES.find((candidate) => candidate.place_id === placeId);
  if (!phase) throw new Error(`Unknown Hanseatic place '${placeId}'`);
  return phase;
}

export function toHanseaticAtlasHref(phase: HanseaticPlacePhase): string {
  const params = new URLSearchParams({
    year: String(phase.valid_from),
    layers: 'hanseatic-places',
    feature: phase.id,
  });
  return `/atlas?${params.toString()}`;
}
