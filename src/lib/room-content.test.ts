import { describe, it, expect } from 'vitest';
import {
  inRoom,
  essaysInRoom,
  computeRoomPath,
  relatedByRoom,
  roomCounts,
  type RelatedItem,
} from './room-content';
import type { Essay } from './registry';
import type { HistoricalMap } from './corpus';
import type { Cartographer } from './cartographers';
import type { GeoLayer } from './geo';
import type { RoomSlug } from '../data/rooms';

// Room cross-linking queries (KAN-99). The async getRoomPath / getRelatedByRoom
// wrappers pull live collections (not runnable under the astro:content vitest
// shim), so the pure query logic — membership, reading-path position, and the
// mixed round-robin — is exercised here against hand-built fixtures.

/** Minimal Essay stub: only slug + the room fields the queries read. */
function essay(slug: string, room: RoomSlug, secondaryRooms: RoomSlug[] = []): Essay {
  return {
    slug,
    data: {
      title: `Essay ${slug}`,
      summary: `Summary of ${slug}`,
      room,
      secondaryRooms,
    },
  } as unknown as Essay;
}

function map(id: string, room?: RoomSlug, secondaryRooms: RoomSlug[] = []): HistoricalMap {
  return { id, title: `Map ${id}`, blurb: `Blurb ${id}`, room, secondaryRooms } as HistoricalMap;
}

function cartographer(id: string, room?: RoomSlug, secondaryRooms: RoomSlug[] = []): Cartographer {
  return { id, name: `Cartographer ${id}`, bio: `Bio ${id}`, room, secondaryRooms } as Cartographer;
}

function layer(id: string, room?: RoomSlug, secondaryRooms: RoomSlug[] = []): GeoLayer {
  return { id, title: `Layer ${id}`, room, secondaryRooms } as GeoLayer;
}

describe('inRoom', () => {
  it('matches on the primary room', () => {
    expect(inRoom({ room: 'border' }, 'border')).toBe(true);
    expect(inRoom({ room: 'border' }, 'city')).toBe(false);
  });

  it('matches on a secondary room when includeSecondary (default)', () => {
    expect(inRoom({ room: 'city', secondaryRooms: ['border'] }, 'border')).toBe(true);
  });

  it('ignores secondary rooms when includeSecondary is false', () => {
    expect(inRoom({ room: 'city', secondaryRooms: ['border'] }, 'border', false)).toBe(false);
  });

  it('handles missing room fields', () => {
    expect(inRoom({}, 'border')).toBe(false);
  });
});

describe('essaysInRoom', () => {
  it('returns primary and secondary members in input order', () => {
    const essays = [essay('a', 'border'), essay('b', 'city'), essay('c', 'city', ['border'])];
    expect(essaysInRoom(essays, 'border').map((e) => e.slug)).toEqual(['a', 'c']);
  });
});

describe('computeRoomPath', () => {
  const essays = [
    essay('first', 'border'),
    essay('mid', 'border'),
    essay('last', 'border'),
    essay('elsewhere', 'city'),
    essay('secondary-only', 'city', ['border']),
  ];

  it('reports position and total over PRIMARY members only', () => {
    const path = computeRoomPath(essays, 'border', 'mid');
    expect(path).not.toBeNull();
    expect(path!.position).toBe(2);
    expect(path!.total).toBe(3);
  });

  it('wraps prev/next cyclically', () => {
    const first = computeRoomPath(essays, 'border', 'first');
    expect(first!.prev!.slug).toBe('last');
    expect(first!.next!.slug).toBe('mid');

    const last = computeRoomPath(essays, 'border', 'last');
    expect(last!.next!.slug).toBe('first');
    expect(last!.prev!.slug).toBe('mid');
  });

  it('yields null neighbours for a single-essay room', () => {
    const solo = [essay('only', 'road')];
    const path = computeRoomPath(solo, 'road', 'only');
    expect(path!.total).toBe(1);
    expect(path!.prev).toBeNull();
    expect(path!.next).toBeNull();
  });

  it('returns null when the essay is not a PRIMARY member', () => {
    expect(computeRoomPath(essays, 'border', 'secondary-only')).toBeNull();
    expect(computeRoomPath(essays, 'border', 'missing')).toBeNull();
  });

  it('builds hrefs to the essay route', () => {
    const path = computeRoomPath(essays, 'border', 'mid');
    expect(path!.next!.href).toBe('/essays/last/');
  });
});

describe('relatedByRoom', () => {
  const essays = [
    essay('e1', 'border'),
    essay('e2', 'border'),
    essay('e3', 'border'),
    essay('e4', 'border'),
  ];
  const maps = [map('m1', 'border'), map('m2', 'border')];
  const cartographers = [cartographer('c1', 'border')];

  it('round-robins content types rather than grouping', () => {
    const items = relatedByRoom({ room: 'border', essays, maps, cartographers });
    // First pass: one of each available type before a second essay appears.
    expect(items.slice(0, 3).map((i) => i.kind)).toEqual(['essay', 'map', 'cartographer']);
  });

  it('caps at the default limit of 6', () => {
    const items = relatedByRoom({ room: 'border', essays, maps, cartographers });
    expect(items).toHaveLength(6);
  });

  it('honours a custom limit', () => {
    const items = relatedByRoom({ room: 'border', essays, maps, cartographers, limit: 2 });
    expect(items).toHaveLength(2);
  });

  it('excludes the current essay', () => {
    const items = relatedByRoom({
      room: 'border',
      essays,
      maps,
      cartographers,
      excludeEssaySlug: 'e1',
    });
    const essayIds = items.filter((i) => i.kind === 'essay').map((i: RelatedItem) => i.id);
    expect(essayIds).not.toContain('e1');
  });

  it('builds type-appropriate hrefs', () => {
    const items = relatedByRoom({ room: 'border', essays, maps, cartographers });
    const firstOf = (kind: RelatedItem['kind']) => items.find((i) => i.kind === kind)!.href;
    expect(firstOf('essay')).toBe('/essays/e1/');
    expect(firstOf('map')).toBe('/collection/m1/');
    expect(firstOf('cartographer')).toBe('/cartographers/c1/');
  });

  it('returns an empty list for a room with no content', () => {
    expect(relatedByRoom({ room: 'theatre', essays: [], maps: [], cartographers: [] })).toEqual([]);
  });
});

describe('roomCounts', () => {
  const essays = [essay('e1', 'border'), essay('e2', 'city', ['border']), essay('e3', 'road')];
  const maps = [map('m1', 'border'), map('m2', 'city')];
  const layers = [layer('l1', 'city', ['border']), layer('l2', 'road')];

  it('counts primary and secondary members across all three types', () => {
    expect(roomCounts({ room: 'border', essays, maps, layers })).toEqual({
      essays: 2, // e1 primary, e2 secondary
      maps: 1, // m1 primary
      layers: 1, // l1 secondary
    });
  });

  it('returns zeroes for a room with no content', () => {
    expect(roomCounts({ room: 'theatre', essays, maps, layers })).toEqual({
      essays: 0,
      maps: 0,
      layers: 0,
    });
  });
});
