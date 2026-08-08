import places from '../data/hanseatic/generated/places.json';
import kontore from '../data/hanseatic/generated/kontore.json';
import routes from '../data/hanseatic/generated/routes.json';
import commodities from '../data/hanseatic/generated/commodities.json';
import events from '../data/hanseatic/generated/events.json';

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

export interface HanseaticRouteCommodity {
  id: string;
  route_id: string;
  commodity_id: string;
  directionality: string;
  certainty: 'high' | 'medium' | 'low';
  source: string;
  notes: string;
}

export interface HanseaticRoute {
  id: string;
  route_id: string;
  name: string;
  corridor_type: 'maritime' | 'riverine' | 'overland' | 'mixed';
  from_place_id: string;
  to_place_id: string;
  waypoints: string;
  valid_from: number;
  valid_to: number;
  directionality: string;
  seasonality: string;
  evidence_type:
    'documented_route' | 'repeated_commercial_connection' | 'generalized_reconstruction';
  certainty: 'high' | 'medium' | 'low';
  commodities: string;
  commodity_joins: HanseaticRouteCommodity[];
  source: string;
  notes: string;
}

export interface HanseaticCommodity {
  id: string;
  name: string;
  description: string;
  source: string;
  notes: string;
}

export interface HanseaticInstitutionalEvent {
  id: string;
  event_type: string;
  title: string;
  place_id: string;
  valid_from: number;
  valid_to: number;
  actor: string;
  target: string;
  commodity_scope: string;
  summary: string;
  source: string;
  certainty: 'high' | 'medium' | 'low';
  notes: string;
}

const PLACE_PHASES = places as HanseaticPlacePhase[];
const KONTORE = kontore as HanseaticKontor[];
const ROUTES = routes as HanseaticRoute[];
const COMMODITIES = commodities as HanseaticCommodity[];
const EVENTS = events as HanseaticInstitutionalEvent[];

export interface HanseaticNetworkNode {
  id: string;
  label: string;
  coordinates: [number, number];
  routeIds: string[];
}

export interface HanseaticNetworkEdge {
  id: string;
  source: string;
  target: string;
  routeId: string;
}

export interface HanseaticNetwork {
  nodes: HanseaticNetworkNode[];
  edges: HanseaticNetworkEdge[];
  routes: HanseaticRoute[];
}

/** True when research has not yet filled this field, so callers never print `pending`. */
export function isPending(value: string): boolean {
  return value.trim() === HSE_PENDING;
}

export function listHanseaticKontore(): HanseaticKontor[] {
  return KONTORE;
}

export function listHanseaticPlaces(): HanseaticPlacePhase[] {
  return PLACE_PHASES;
}

export function listHanseaticRoutes(): HanseaticRoute[] {
  return ROUTES;
}

export function listHanseaticCommodities(): HanseaticCommodity[] {
  return COMMODITIES;
}

export function listHanseaticEvents(): HanseaticInstitutionalEvent[] {
  return EVENTS;
}

/**
 * Build an abstract route graph from generated waypoint IDs and place
 * coordinates. This is intentionally not a voyage reconstruction: components
 * use it for relational diagrams while the Atlas keeps the authored route
 * geometry in the publication assets.
 */
export function getHanseaticNetwork(): HanseaticNetwork {
  const routesByPlace = new Map<string, Set<string>>();
  const edges: HanseaticNetworkEdge[] = [];

  for (const route of ROUTES) {
    const waypoints = route.waypoints.split('|').filter(Boolean);
    for (const placeId of waypoints) {
      const routeIds = routesByPlace.get(placeId) ?? new Set<string>();
      routeIds.add(route.id);
      routesByPlace.set(placeId, routeIds);
    }
    for (let index = 1; index < waypoints.length; index += 1) {
      edges.push({
        id: `${route.id}:${index - 1}`,
        source: waypoints[index - 1],
        target: waypoints[index],
        routeId: route.id,
      });
    }
  }

  const nodes = [...routesByPlace]
    .map(([placeId, routeIds]) => {
      const place = getHanseaticPlacePhase(placeId);
      return {
        id: placeId,
        label: place.name,
        coordinates: place.coordinates,
        routeIds: [...routeIds].sort(),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return { nodes, edges, routes: ROUTES };
}

export function listHanseaticRoutesForCommodity(commodityId: string): HanseaticRoute[] {
  return ROUTES.filter((route) =>
    route.commodity_joins.some((join) => join.commodity_id === commodityId),
  );
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

export function toHanseaticRouteAtlasHref(route: HanseaticRoute): string {
  const params = new URLSearchParams({
    year: String(route.valid_from),
    layers: 'hanseatic-routes',
    feature: route.id,
  });
  return `/atlas?${params.toString()}`;
}

export function toHanseaticEventAtlasHref(event: HanseaticInstitutionalEvent): string {
  const params = new URLSearchParams({
    year: String(event.valid_from),
    layers: 'hanseatic-events',
    feature: event.id,
  });
  return `/atlas?${params.toString()}`;
}
