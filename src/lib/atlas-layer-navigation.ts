/**
 * Metadata-driven camera and chronology helpers for Atlas layer activation.
 *
 * A layer may author a canonical reveal year or viewport. When it does not, the
 * chronology uses the rounded midpoint of its temporal envelope and GeoJSON
 * bounds are derived from the geometry. Keeping these rules here prevents the
 * map UI from growing per-layer branches as the catalogue expands.
 */

export type AtlasBounds = [[number, number], [number, number]];

export interface NavigableLayer {
  yearFrom: number;
  yearTo: number;
  revealYear?: number;
  fitBounds?: AtlasBounds;
}

/** Resolve a range to one deterministic date unless the registry overrides it. */
export function resolveLayerRevealYear(layer: NavigableLayer): number {
  return layer.revealYear ?? Math.round(layer.yearFrom + (layer.yearTo - layer.yearFrom) / 2);
}

/** Derive a geographic envelope from any GeoJSON object that carries geometry. */
export function geoJsonBounds(value: unknown): AtlasBounds | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  const collectCoordinates = (coordinates: unknown): void => {
    if (
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number'
    ) {
      west = Math.min(west, coordinates[0]);
      south = Math.min(south, coordinates[1]);
      east = Math.max(east, coordinates[0]);
      north = Math.max(north, coordinates[1]);
      return;
    }
    if (Array.isArray(coordinates)) coordinates.forEach(collectCoordinates);
  };

  const collectGeometry = (candidate: unknown): void => {
    if (!candidate || typeof candidate !== 'object') return;
    const object = candidate as Record<string, unknown>;
    if (object.type === 'FeatureCollection' && Array.isArray(object.features)) {
      object.features.forEach(collectGeometry);
      return;
    }
    if (object.type === 'Feature') {
      collectGeometry(object.geometry);
      return;
    }
    if (object.type === 'GeometryCollection' && Array.isArray(object.geometries)) {
      object.geometries.forEach(collectGeometry);
      return;
    }
    collectCoordinates(object.coordinates);
  };

  collectGeometry(value);
  if (![west, south, east, north].every(Number.isFinite)) return null;
  return [
    [west, south],
    [east, north],
  ];
}

/** Authored bounds win; geometry is the fallback for ordinary GeoJSON layers. */
export function resolveLayerBounds(layer: NavigableLayer, geometry?: unknown): AtlasBounds | null {
  return layer.fitBounds ?? geoJsonBounds(geometry);
}
