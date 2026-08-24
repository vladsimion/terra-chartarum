/**
 * The Atlas share contract (KAN-172/188-192, extended for the scalable
 * catalogue by ATLAS-1209 / KAN-405).
 *
 * Every existing parameter keeps its name and meaning: the essay deep links
 * already in published prose have to keep working, so the catalogue additions
 * are new keys rather than a new scheme.
 *
 * `layers` is the composition and is the only thing that decides what is drawn.
 * `collection` is context, not activation - arriving through a collection link
 * shows you the argument and leaves the map alone, and a link that means
 * "activate the defaults" says so by listing them in `layers`.
 */
export interface AtlasShareState {
  query?: string;
  essay?: string;
  region?: string;
  covers?: string;
  year?: number;
  zoom?: number;
  layers?: string[];
  feature?: string;
  toponyms?: boolean;
  /** Which lens the browser is showing. Cosmetic alone, but cheap and useful in a shared view. */
  lens?: AtlasShareLens;
  /** Collection context. Never implies activation. */
  collection?: string;
  /** The inspected layer. Focus is not activation, so this never draws anything. */
  layer?: string;
  /** The catalogue's "only layers relevant to the selected year" filter. */
  relevant?: boolean;
}

export const ATLAS_SHARE_LENSES = ['themes', 'collections', 'rooms'] as const;
export type AtlasShareLens = (typeof ATLAS_SHARE_LENSES)[number];

const SAFE_ID = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;

function finite(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export function parseAtlasShareState(search: string): AtlasShareState {
  const params = new URLSearchParams(search);
  const layers = (params.get('layers') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => SAFE_ID.test(value));
  const safe = (key: string) => {
    const value = params.get(key)?.trim();
    return value && SAFE_ID.test(value) ? value : undefined;
  };
  const rawLens = params.get('lens')?.trim();
  const lens = ATLAS_SHARE_LENSES.find((candidate) => candidate === rawLens);
  return {
    query: params.get('q')?.trim() || undefined,
    essay: safe('essay'),
    region: params.get('region')?.trim() || undefined,
    covers: safe('covers'),
    year: finite(params.get('year')),
    zoom: finite(params.get('zoom')),
    layers: layers.length ? [...new Set(layers)] : undefined,
    feature: safe('feature'),
    toponyms: params.get('toponyms') === '1',
    lens,
    collection: safe('collection'),
    layer: safe('layer'),
    relevant: params.get('relevant') === '1',
  };
}

export function buildAtlasShareUrl(baseUrl: string, state: AtlasShareState): string {
  const url = new URL(baseUrl);
  const set = (key: string, value?: string | number) => {
    if (value === undefined || value === '') url.searchParams.delete(key);
    else url.searchParams.set(key, String(value));
  };
  set('q', state.query);
  set('essay', state.essay);
  set('region', state.region);
  set('covers', state.covers);
  set('year', state.year);
  set('zoom', state.zoom);
  set('layers', state.layers?.length ? [...new Set(state.layers)].sort().join(',') : undefined);
  set('feature', state.feature);
  set('toponyms', state.toponyms ? '1' : undefined);
  set('lens', state.lens);
  set('collection', state.collection);
  set('layer', state.layer);
  set('relevant', state.relevant ? '1' : undefined);
  return url.toString();
}

/**
 * A root-relative Atlas deep link (ANT-5 / ANT-10, KAN-424 / KAN-429).
 *
 * `buildAtlasShareUrl` needs an absolute base because it is used in the browser,
 * where `location.href` is always at hand. Prose and server-rendered figures
 * have no origin to build from and must not invent one, so this returns the
 * path and query alone and lets the document supply the rest.
 *
 * The query is produced by the same function the share button uses, so a link
 * written into an essay and a link copied out of the Atlas cannot drift apart.
 */
export function atlasDeepLink(state: AtlasShareState): string {
  const url = new URL(buildAtlasShareUrl('https://atlas.invalid/atlas/', state));
  return `${url.pathname}${url.search}`;
}
