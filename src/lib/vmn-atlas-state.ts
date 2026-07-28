/** Typed URL-state contract for VMN essay → Atlas deep links (KAN-190). */
export const VMN_LAYER_IDS = ['venetian-ports', 'venetian-routes', 'venetian-possessions'] as const;

export type VmnLayerId = (typeof VMN_LAYER_IDS)[number];

export interface VmnAtlasState {
  year?: number;
  zoom?: number;
  layers?: VmnLayerId[];
  beat?: string;
  port?: string;
  route?: string;
  territory?: string;
}

export interface VmnBeatState {
  beatId: string;
  targetType: 'port' | 'route' | 'possession';
  targetId: string;
  year: number;
  layerIds: VmnLayerId[];
}

const isLayerId = (value: string): value is VmnLayerId =>
  VMN_LAYER_IDS.includes(value as VmnLayerId);

export function toVmnAtlasHref(state: VmnAtlasState): string {
  const params = new URLSearchParams();
  if (state.year !== undefined) params.set('year', String(state.year));
  if (state.zoom !== undefined) params.set('zoom', String(state.zoom));
  if (state.layers?.length) params.set('layers', [...new Set(state.layers)].join(','));
  if (state.beat) params.set('beat', state.beat);
  if (state.port) params.set('port', state.port);
  if (state.route) params.set('route', state.route);
  if (state.territory) params.set('territory', state.territory);
  const query = params.toString();
  return query ? `/atlas?${query}` : '/atlas';
}

export function parseVmnAtlasState(search: string): VmnAtlasState {
  const params = new URLSearchParams(search);
  const rawYear = params.get('year') ?? params.get('date');
  const year = rawYear === null ? undefined : Number(rawYear);
  const rawZoom = params.get('zoom');
  const zoom = rawZoom === null ? undefined : Number(rawZoom);
  const layers = (params.get('layers') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(isLayerId);
  return {
    year: year !== undefined && Number.isFinite(year) ? year : undefined,
    zoom: zoom !== undefined && Number.isFinite(zoom) ? zoom : undefined,
    layers: layers.length ? [...new Set(layers)] : undefined,
    beat: params.get('beat') || undefined,
    port: params.get('port') || undefined,
    route: params.get('route') || undefined,
    territory: params.get('territory') || undefined,
  };
}

export function resolveVmnBeatState(state: VmnAtlasState, beats: VmnBeatState[]): VmnAtlasState {
  const match = state.beat ? beats.find((beat) => beat.beatId === state.beat) : undefined;
  if (!match) return state;

  const resolved: VmnAtlasState = {
    ...state,
    year: state.year ?? match.year,
    layers: state.layers ?? match.layerIds,
  };
  if (!state.port && !state.route && !state.territory) {
    if (match.targetType === 'port') resolved.port = match.targetId;
    if (match.targetType === 'route') resolved.route = match.targetId;
    if (match.targetType === 'possession') resolved.territory = match.targetId;
  }
  return resolved;
}
