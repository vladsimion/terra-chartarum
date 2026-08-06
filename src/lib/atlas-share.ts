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
}

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
  return url.toString();
}
