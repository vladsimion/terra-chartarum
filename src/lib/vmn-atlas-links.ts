/** ID-only essay-beat → Atlas mappings (KAN-191). */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  toVmnAtlasHref,
  type VmnAtlasState,
  type VmnLayerId,
  VMN_LAYER_IDS,
} from './vmn-atlas-state';

export type AtlasTargetType = 'port' | 'route' | 'possession';
export type AtlasDisplayMode = 'popup' | 'highlight';

export interface VmnAtlasLink {
  beatId: string;
  targetType: AtlasTargetType;
  targetId: string;
  year: number;
  layerIds: VmnLayerId[];
  displayMode: AtlasDisplayMode;
  href: string;
}

const path = join(process.cwd(), 'data', 'vmn', 'atlas_links.csv');

function parseLinks(): VmnAtlasLink[] {
  const [header, ...lines] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  if (header !== 'beat_id,target_type,target_id,year,layer_ids,display_mode') {
    throw new Error('Unexpected data/vmn/atlas_links.csv header');
  }

  const seen = new Set<string>();
  return lines.map((line, index) => {
    const [beatId, targetType, targetId, rawYear, rawLayers, displayMode] = line.split(',');
    if (
      !beatId ||
      !targetId ||
      !['port', 'route', 'possession'].includes(targetType) ||
      !['popup', 'highlight'].includes(displayMode)
    ) {
      throw new Error(`Invalid atlas link row ${index + 2}`);
    }
    if (seen.has(beatId)) throw new Error(`Duplicate atlas link beat_id: ${beatId}`);
    seen.add(beatId);

    const year = Number(rawYear);
    const layerIds = rawLayers
      .split('|')
      .filter((id): id is VmnLayerId => VMN_LAYER_IDS.includes(id as VmnLayerId));
    if (!Number.isInteger(year) || layerIds.length !== rawLayers.split('|').length) {
      throw new Error(`Invalid Atlas year/layer state on row ${index + 2}`);
    }

    const state: VmnAtlasState = { year, layers: layerIds };
    if (targetType === 'port') state.port = targetId;
    if (targetType === 'route') state.route = targetId;
    if (targetType === 'possession') state.territory = targetId;

    return {
      beatId,
      targetType: targetType as AtlasTargetType,
      targetId,
      year,
      layerIds,
      displayMode: displayMode as AtlasDisplayMode,
      href: toVmnAtlasHref(state),
    };
  });
}

const LINKS = parseLinks();

export function getVmnAtlasLinks(): VmnAtlasLink[] {
  return LINKS;
}

export function getVmnAtlasLink(beatId: string): VmnAtlasLink | null {
  return LINKS.find((link) => link.beatId === beatId) ?? null;
}

export function getPortAtlasLink(portId: string): VmnAtlasLink | null {
  return LINKS.find((link) => link.targetType === 'port' && link.targetId === portId) ?? null;
}
