/**
 * Venetian Maritime Network resolver (VMN-24).
 *
 * Reads the *published* cloud-native bundle — the compiled FlatGeobuf artifacts in
 * public/geo — and projects it into typed port profiles for the essay layer. The
 * FGB is the single source of truth the atlas map already renders, so resolving
 * port content here duplicates neither geometry nor prose: name triples, phase
 * timelines, notes and route membership all come out of the same binaries. The
 * frozen data model these key on lives in docs/vmn/data-dictionary.md.
 *
 * Deliberately Astro-free (only node:fs + flatgeobuf) so the PortProfilePopover
 * island and the vitest suite share one loader.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geojson } from 'flatgeobuf';

const GEO_DIR = join(process.cwd(), 'public', 'geo');

/** Open-ended lifespan sentinel projected by the build pipeline (data-dictionary D4). */
export const OPEN_ENDED = 9999;

async function readFgb(name: string): Promise<GeoJSON.Feature[]> {
  const bytes = new Uint8Array(await readFile(join(GEO_DIR, name)));
  const features: GeoJSON.Feature[] = [];
  for await (const feature of geojson.deserialize(bytes)) {
    features.push(feature as GeoJSON.Feature);
  }
  return features;
}

/** One tenure phase of a port — a single authority-table row in the published FGB. */
export interface PortPhase {
  status: string;
  validFrom: number;
  /** 9999 = open-ended (OPEN_ENDED). */
  validTo: number;
  polityId: string;
  note: string;
  sourceKeys: string[];
}

/** A galley route (muda / private) that calls at a port, from the routes FGB. */
export interface PortRoute {
  routeId: string;
  name: string;
  routeType: string;
}

/** Everything the popover renders for one gazetteer port, resolved from data. */
export interface PortProfile {
  id: string;
  nameHistoric: string;
  nameModern: string;
  nameLocal: string;
  region: string;
  phases: PortPhase[];
  /** Representative 2–3 sentence note drawn from the phase carrying prose. */
  note: string;
  /** Routes calling here, derived from each route's published `waypoints`. */
  routes: PortRoute[];
  /** Atlas deep link for this port (VMN-28 param contract). */
  atlasHref: string;
  yearFrom: number;
  yearTo: number;
}

let cache: Promise<Map<string, PortProfile>> | null = null;

function buildRouteIndex(routeFeatures: GeoJSON.Feature[]): Map<string, PortRoute[]> {
  const byPort = new Map<string, PortRoute[]>();
  for (const feature of routeFeatures) {
    const props = feature.properties ?? {};
    const route: PortRoute = {
      routeId: String(props.route_id ?? ''),
      name: String(props.name ?? ''),
      routeType: String(props.route_type ?? ''),
    };
    const waypoints = String(props.waypoints ?? '')
      .split('|')
      .filter(Boolean);
    for (const portId of new Set(waypoints)) {
      const list = byPort.get(portId) ?? [];
      list.push(route);
      byPort.set(portId, list);
    }
  }
  return byPort;
}

async function buildProfiles(): Promise<Map<string, PortProfile>> {
  const [portFeatures, routeFeatures] = await Promise.all([
    readFgb('venetian-ports.fgb'),
    readFgb('venetian-routes.fgb'),
  ]);

  const routesByPort = buildRouteIndex(routeFeatures);

  const grouped = new Map<string, GeoJSON.Feature[]>();
  for (const feature of portFeatures) {
    const id = String(feature.properties?.port_id ?? '');
    if (!id) continue;
    const list = grouped.get(id) ?? [];
    list.push(feature);
    grouped.set(id, list);
  }

  const profiles = new Map<string, PortProfile>();
  for (const [id, features] of grouped) {
    const phases: PortPhase[] = features
      .map((feature) => {
        const props = feature.properties ?? {};
        return {
          status: String(props.status ?? ''),
          validFrom: Number(props.valid_from),
          validTo: Number(props.valid_to),
          polityId: String(props.polity_id ?? ''),
          note: String(props.notes ?? ''),
          sourceKeys: String(props.source_keys ?? '')
            .split(';')
            .filter(Boolean),
        };
      })
      .sort((a, b) => a.validFrom - b.validFrom);

    const head = features[0].properties ?? {};
    profiles.set(id, {
      id,
      nameHistoric: String(head.name ?? ''),
      nameModern: String(head.name_modern ?? ''),
      nameLocal: String(head.name_local ?? ''),
      region: String(head.region ?? ''),
      phases,
      note: phases.find((phase) => phase.note)?.note ?? '',
      routes: routesByPort.get(id) ?? [],
      atlasHref: `/atlas?port=${encodeURIComponent(id)}`,
      yearFrom: Math.min(...phases.map((phase) => phase.validFrom)),
      yearTo: Math.max(...phases.map((phase) => phase.validTo)),
    });
  }

  return profiles;
}

function profiles(): Promise<Map<string, PortProfile>> {
  if (!cache) cache = buildProfiles();
  return cache;
}

/** Resolve a single port by its gazetteer id, or null when no record is published. */
export async function getPortProfile(id: string): Promise<PortProfile | null> {
  return (await profiles()).get(id) ?? null;
}

export async function getPortProfiles(): Promise<PortProfile[]> {
  return [...(await profiles()).values()];
}

export async function getPortIds(): Promise<string[]> {
  return [...(await profiles()).keys()];
}

/** One phased territorial extent from the published possessions FGB (VMN-27). */
export interface PossessionPhase {
  possessionId: string;
  territory: string;
  name: string;
  status: string;
  validFrom: number;
  validTo: number;
  note: string;
  geometry: GeoJSON.MultiPolygon;
}

let possessionCache: Promise<PossessionPhase[]> | null = null;

async function buildPossessions(): Promise<PossessionPhase[]> {
  const features = await readFgb('venetian-possessions.fgb');
  return features
    .map((feature) => {
      const props = feature.properties ?? {};
      return {
        possessionId: String(props.possession_id ?? ''),
        territory: String(props.territory ?? ''),
        name: String(props.name ?? ''),
        status: String(props.status ?? ''),
        validFrom: Number(props.valid_from),
        validTo: Number(props.valid_to),
        note: String(props.notes ?? ''),
        geometry: feature.geometry as GeoJSON.MultiPolygon,
      };
    })
    .sort((a, b) => a.validFrom - b.validFrom);
}

/** All phased possession extents, ascending by valid_from. Geometry included. */
export async function getPossessionPhases(): Promise<PossessionPhase[]> {
  if (!possessionCache) possessionCache = buildPossessions();
  return possessionCache;
}
