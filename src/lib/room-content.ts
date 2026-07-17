// Room membership & cross-linking queries (TC-204 / KAN-99).
//
// The three cross-linking components (RoomBadge / RoomPath / RelatedByRoom) all
// need to answer "what belongs to this room?". This module centralises that:
// pure functions over already-loaded collections (so they unit-test without an
// Astro runtime), plus thin async wrappers that pull the live essay / corpus /
// cartographer data for pages to consume.

import { getEssays, type Essay } from './registry';
import { CORPUS, type HistoricalMap } from './corpus';
import { CARTOGRAPHERS, type Cartographer } from './cartographers';
import { GEO_LAYERS, type GeoLayer } from './geo';
import { type RoomSlug } from '../data/rooms';

/** Anything room-taggable: a required-or-optional primary plus 0–2 secondaries. */
interface RoomTagged {
  room?: RoomSlug;
  secondaryRooms?: RoomSlug[];
}

/** True when `item` belongs to `room` as its primary or (optionally) a secondary. */
export function inRoom(item: RoomTagged, room: RoomSlug, includeSecondary = true): boolean {
  if (item.room === room) return true;
  return includeSecondary && (item.secondaryRooms ?? []).includes(room);
}

/** Essays in `room` (primary or secondary), preserving the input reading order. */
export function essaysInRoom(essays: Essay[], room: RoomSlug): Essay[] {
  return essays.filter((e) => inRoom(e.data, room));
}

/** A stop on a room's reading path. */
export interface RoomPathStep {
  slug: string;
  title: string;
  href: string;
}

/** The current essay's place in its room's canonical (primary-membership) path. */
export interface RoomPathResult {
  room: RoomSlug;
  position: number;
  total: number;
  prev: RoomPathStep | null;
  next: RoomPathStep | null;
}

function toStep(essay: Essay): RoomPathStep {
  return { slug: essay.slug, title: essay.data.title, href: `/essays/${essay.slug}/` };
}

/**
 * Resolve where `currentSlug` sits among the essays whose PRIMARY room is
 * `room`, in reading order. prev/next wrap cyclically so the path is a loop;
 * a room with a single essay yields null neighbours. Returns null when the
 * current essay is not a primary member of the room.
 */
export function computeRoomPath(
  essays: Essay[],
  room: RoomSlug,
  currentSlug: string,
): RoomPathResult | null {
  const members = essays.filter((e) => e.data.room === room);
  const i = members.findIndex((e) => e.slug === currentSlug);
  if (i === -1) return null;
  const n = members.length;
  return {
    room,
    position: i + 1,
    total: n,
    prev: n > 1 ? toStep(members[(i - 1 + n) % n]) : null,
    next: n > 1 ? toStep(members[(i + 1) % n]) : null,
  };
}

export type RelatedKind = 'essay' | 'map' | 'cartographer';

/** A normalized cross-link, mixing content types on a room page. */
export interface RelatedItem {
  kind: RelatedKind;
  id: string;
  title: string;
  href: string;
  blurb?: string;
}

export interface RelatedByRoomInput {
  room: RoomSlug;
  essays: Essay[];
  maps: HistoricalMap[];
  cartographers: Cartographer[];
  /** Essay slug to omit (the essay currently being read). */
  excludeEssaySlug?: string;
  /** Hard cap on returned items (AC: 6). */
  limit?: number;
}

/**
 * Cross-links for a room, MIXING the three content types and capped at `limit`
 * (default 6). Items are round-robined across essays / maps / cartographers so a
 * type-rich room never returns an all-essays (or all-maps) list.
 */
export function relatedByRoom(input: RelatedByRoomInput): RelatedItem[] {
  const { room, essays, maps, cartographers, excludeEssaySlug, limit = 6 } = input;

  const essayItems: RelatedItem[] = essaysInRoom(essays, room)
    .filter((e) => e.slug !== excludeEssaySlug)
    .map((e) => ({
      kind: 'essay',
      id: e.slug,
      title: e.data.title,
      href: `/essays/${e.slug}/`,
      blurb: e.data.summary,
    }));

  const mapItems: RelatedItem[] = maps
    .filter((m) => inRoom(m, room))
    .map((m) => ({
      kind: 'map',
      id: m.id,
      title: m.title,
      href: `/collection/${m.id}/`,
      blurb: m.blurb,
    }));

  const cartographerItems: RelatedItem[] = cartographers
    .filter((c) => inRoom(c, room))
    .map((c) => ({
      kind: 'cartographer',
      id: c.id,
      title: c.name,
      href: `/cartographers/${c.id}/`,
      blurb: c.bio,
    }));

  // Round-robin so the capped list stays a mix of types.
  const buckets = [essayItems, mapItems, cartographerItems];
  const mixed: RelatedItem[] = [];
  for (let row = 0; mixed.length < limit; row++) {
    let advanced = false;
    for (const bucket of buckets) {
      if (row < bucket.length) {
        mixed.push(bucket[row]);
        advanced = true;
        if (mixed.length === limit) break;
      }
    }
    if (!advanced) break;
  }
  return mixed;
}

/** Live room reading-path for an essay page (async wrapper over getEssays). */
export async function getRoomPath(
  room: RoomSlug,
  currentSlug: string,
): Promise<RoomPathResult | null> {
  return computeRoomPath(await getEssays(), room, currentSlug);
}

/** Live cross-links for a room (async wrapper over the three registries). */
export async function getRelatedByRoom(
  room: RoomSlug,
  opts: { excludeEssaySlug?: string; limit?: number } = {},
): Promise<RelatedItem[]> {
  return relatedByRoom({
    room,
    essays: await getEssays(),
    maps: CORPUS,
    cartographers: CARTOGRAPHERS,
    ...opts,
  });
}

/** Item tallies for a room, counting primary AND secondary membership. */
export interface RoomCounts {
  essays: number;
  maps: number;
  layers: number;
}

export interface RoomCountsInput {
  room: RoomSlug;
  essays: Essay[];
  maps: HistoricalMap[];
  layers: GeoLayer[];
}

/**
 * Tally the essays, collection sheets, and Atlas layers that belong to `room`
 * (primary or secondary). Powers the counts on the rooms overview grid (KAN-96).
 */
export function roomCounts(input: RoomCountsInput): RoomCounts {
  const { room, essays, maps, layers } = input;
  return {
    essays: essays.filter((e) => inRoom(e.data, room)).length,
    maps: maps.filter((m) => inRoom(m, room)).length,
    layers: layers.filter((l) => inRoom(l, room)).length,
  };
}

/** Live item tallies for a room (async wrapper over the registries). */
export async function getRoomCounts(room: RoomSlug): Promise<RoomCounts> {
  return roomCounts({ room, essays: await getEssays(), maps: CORPUS, layers: GEO_LAYERS });
}
