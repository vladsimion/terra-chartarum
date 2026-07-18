/**
 * Pure MapLibre expression builders for GeoLayer render hints (VMN-20 / B2 / B3).
 *
 * Deliberately free of Astro and MapLibre imports so both the AtlasMap client
 * bundle and the vitest suite can exercise them. Each returns a plain MapLibre
 * expression / filter array; the island casts them at the paint / setFilter call
 * sites. The frozen data model these key on lives in docs/vmn/data-dictionary.md.
 */

export type GraduateHint = {
  field: string;
  radius: Record<string, number>;
  fallback: number;
};

export type DashHint = {
  field: string;
  patterns: Record<string, number[]>;
};

/** `circle-radius` match expression: feature `field` value → px radius, else fallback. */
export function circleRadiusExpression(g: GraduateHint): unknown[] {
  const expr: unknown[] = ['match', ['get', g.field]];
  for (const [value, r] of Object.entries(g.radius)) expr.push(value, r);
  expr.push(g.fallback);
  return expr;
}

/**
 * Inclusive per-feature temporal filter (VMN-2 blocker B2). A feature is shown
 * when valid_from <= cutoff <= valid_to; the open-ended `valid_to` sentinel 9999
 * keeps a feature visible at every later cutoff without special-casing.
 */
export function temporalFilter(cutoff: number): unknown[] {
  return ['all', ['<=', ['get', 'valid_from'], cutoff], ['>=', ['get', 'valid_to'], cutoff]];
}

/** AND a sub-layer's own base filter (if any) with the temporal reveal. */
export function withTemporal(baseFilter: unknown | null, cutoff: number): unknown[] {
  const t = temporalFilter(cutoff);
  return baseFilter ? ['all', baseFilter, t] : t;
}

/**
 * One dashed sub-layer spec per `field` value. `line-dasharray` is not a
 * data-driven paint property in MapLibre, so a dashed-by-field line is split into
 * filtered sub-layers, each with a static dash (an empty pattern renders solid).
 */
export function dashSubLayers(
  d: DashHint,
): { value: string; dashArray: number[]; filter: unknown[] }[] {
  return Object.entries(d.patterns).map(([value, dashArray]) => ({
    value,
    dashArray,
    filter: ['==', ['get', d.field], value],
  }));
}
