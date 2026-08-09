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

export type WidthHint = {
  field: string;
  widths: Record<string, number>;
  fallback: number;
};

/** `circle-radius` match expression: feature `field` value → px radius, else fallback. */
export function circleRadiusExpression(g: GraduateHint): unknown[] {
  const expr: unknown[] = ['match', ['get', g.field]];
  for (const [value, r] of Object.entries(g.radius)) expr.push(value, r);
  expr.push(g.fallback);
  return expr;
}

/**
 * `line-width` match expression: feature `field` value → px width, else fallback.
 *
 * Unlike `line-dasharray` this *is* data-driven in MapLibre, so evidence strength
 * can vary within a dashed sub-layer rather than multiplying the sub-layer count.
 * Width carries evidence type while dash carries uncertainty, so the two read
 * independently and neither depends on colour (KAN-310).
 */
export function lineWidthExpression(w: WidthHint): unknown[] {
  const expr: unknown[] = ['match', ['get', w.field]];
  for (const [value, px] of Object.entries(w.widths)) expr.push(value, px);
  expr.push(w.fallback);
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

/** Add an optional exact-match region facet to an existing feature filter. */
export function withRegion(baseFilter: unknown | null, region: string): unknown | null {
  if (!region) return baseFilter;
  const r = ['==', ['get', 'region'], region];
  return baseFilter ? ['all', baseFilter, r] : r;
}

/**
 * Add declared facet selections to an existing feature filter (KAN-340).
 *
 * A field with no selected values places no constraint, which is what makes
 * "show everything" the resting state rather than a special case. Selecting
 * several values within one field widens that field (OR); selecting across
 * fields narrows (AND). That is the behaviour a reader expects from a facet
 * panel, and it is the only combination that lets you ask "every variant or
 * alternative naming, in Greek or Latin" in one pass.
 */
export function withFacets(
  baseFilter: unknown | null,
  selections: Record<string, string[]>,
): unknown | null {
  const clauses = Object.entries(selections)
    .filter(([, values]) => values.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([field, values]) => ['in', ['get', field], ['literal', [...values].sort()]]);
  if (clauses.length === 0) return baseFilter;
  return baseFilter ? ['all', baseFilter, ...clauses] : ['all', ...clauses];
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
