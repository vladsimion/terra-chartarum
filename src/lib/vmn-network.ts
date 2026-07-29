import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geojson } from 'flatgeobuf';

const ROOT = process.cwd();

export interface VmnNetworkNode {
  id: string;
  label: string;
  routes: string[];
}

export interface VmnNetworkEdge {
  id: string;
  source: string;
  target: string;
  routeId: string;
}

export interface VmnNetworkRoute {
  id: string;
  name: string;
  routeType: string;
  waypoints: string[];
  commodities: string[];
}

export interface VmnCommodity {
  id: string;
  label: string;
  category: string;
  routeCount: number;
}

export interface VmnNetwork {
  nodes: VmnNetworkNode[];
  edges: VmnNetworkEdge[];
  routes: VmnNetworkRoute[];
  commodities: VmnCommodity[];
}

function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows;
  return body.map((values) =>
    Object.fromEntries(header.map((name, index) => [name, values[index] ?? ''])),
  );
}

async function readFgb(name: string): Promise<GeoJSON.Feature[]> {
  const bytes = new Uint8Array(await readFile(join(ROOT, 'public', 'geo', name)));
  const features: GeoJSON.Feature[] = [];
  for await (const feature of geojson.deserialize(bytes)) {
    features.push(feature as GeoJSON.Feature);
  }
  return features;
}

/**
 * Build the graph directly from the published routes-layer waypoint fields.
 * The two authority CSVs only supply display labels and the controlled
 * commodity vocabulary; they do not compile new routes or geometry.
 */
export async function getVmnNetwork(): Promise<VmnNetwork> {
  const [routeFeatures, portFeatures, waypointCsv, commodityCsv] = await Promise.all([
    readFgb('venetian-routes.fgb'),
    readFgb('venetian-ports.fgb'),
    readFile(join(ROOT, 'data', 'vmn', 'waypoints.csv'), 'utf8'),
    readFile(join(ROOT, 'data', 'vmn', 'commodities.csv'), 'utf8'),
  ]);

  const labels = new Map<string, string>();
  for (const feature of portFeatures) {
    const id = String(feature.properties?.port_id ?? '');
    if (id && !labels.has(id)) labels.set(id, String(feature.properties?.name ?? id));
  }
  for (const row of parseCsv(waypointCsv)) labels.set(row.waypoint_id, row.name);

  const commodityRows = parseCsv(commodityCsv);
  const commodityIds = new Set(commodityRows.map((row) => row.commodity_id));
  const routes: VmnNetworkRoute[] = routeFeatures
    .map((feature) => {
      const properties = feature.properties ?? {};
      return {
        id: String(properties.route_id ?? ''),
        name: String(properties.name ?? ''),
        routeType: String(properties.route_type ?? ''),
        waypoints: String(properties.waypoints ?? '')
          .split('|')
          .filter(Boolean),
        commodities: String(properties.commodities ?? '')
          .split('|')
          .filter(Boolean),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const route of routes) {
    const unknown = route.commodities.filter((id) => !commodityIds.has(id));
    if (unknown.length) {
      throw new Error(
        `${route.id}: commodities missing from commodities.csv: ${unknown.join(', ')}`,
      );
    }
  }

  const routeIdsByNode = new Map<string, Set<string>>();
  const edges: VmnNetworkEdge[] = [];
  for (const route of routes) {
    for (const waypoint of route.waypoints) {
      const routeIds = routeIdsByNode.get(waypoint) ?? new Set<string>();
      routeIds.add(route.id);
      routeIdsByNode.set(waypoint, routeIds);
    }
    for (let index = 1; index < route.waypoints.length; index += 1) {
      edges.push({
        id: `${route.id}:${index - 1}`,
        source: route.waypoints[index - 1],
        target: route.waypoints[index],
        routeId: route.id,
      });
    }
  }

  const nodes = [...routeIdsByNode]
    .map(([id, routeIds]) => ({
      id,
      label: labels.get(id) ?? id.replaceAll('_', ' '),
      routes: [...routeIds].sort(),
    }))
    .sort((a, b) => b.routes.length - a.routes.length || a.id.localeCompare(b.id));

  const commodities = commodityRows
    .map((row) => ({
      id: row.commodity_id,
      label: row.label,
      category: row.category,
      routeCount: routes.filter((route) => route.commodities.includes(row.commodity_id)).length,
    }))
    .sort((a, b) => b.routeCount - a.routeCount || a.label.localeCompare(b.label));

  return { nodes, edges, routes, commodities };
}
