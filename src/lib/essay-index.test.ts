import { describe, expect, it } from 'vitest';
import {
  groupEssaysByRoom,
  sortEssaysByRoom,
  toEssayIndexRecord,
  type RoomOwnedEssay,
} from './essay-index';

function essay(
  slug: string,
  title: string,
  room: string,
  secondaryRooms: string[] = [],
): RoomOwnedEssay {
  return { slug, data: { title, room, secondaryRooms } };
}

describe('essay index mapping', () => {
  it('projects canonical room fields into an index record', () => {
    expect(toEssayIndexRecord(essay('roads', 'Roads', 'road', ['earth', 'map']))).toEqual({
      slug: 'roads',
      title: 'Roads',
      room: 'road',
      secondaryRooms: ['earth', 'map'],
    });
  });

  it('rejects a room outside the seven-room vocabulary', () => {
    expect(() => toEssayIndexRecord(essay('invalid', 'Invalid', 'ocean'))).toThrow();
  });
});

describe('essay index grouping', () => {
  it('uses canonical room order and preserves editorial order within each room', () => {
    const groups = groupEssaysByRoom([
      essay('road-one', 'Road one', 'road'),
      essay('map-one', 'Map one', 'map'),
      essay('road-two', 'Road two', 'road'),
    ]);

    expect(groups.map(({ room }) => room.slug)).toEqual(['map', 'road']);
    expect(groups[1].records.map(({ slug }) => slug)).toEqual(['road-one', 'road-two']);
    expect(groups[1].essays.map(({ slug }) => slug)).toEqual(['road-one', 'road-two']);
  });

  it('does not emit empty room groups', () => {
    const groups = groupEssaysByRoom([essay('city-one', 'City one', 'city')]);
    expect(groups).toHaveLength(1);
    expect(groups[0].room.slug).toBe('city');
  });
});

describe('flat room-ordered essay list', () => {
  it('reorders an ungrouped run into canonical room order', () => {
    const sorted = sortEssaysByRoom([
      essay('theatre-one', 'Theatre one', 'theatre'),
      essay('map-one', 'Map one', 'map'),
      essay('earth-one', 'Earth one', 'earth'),
      essay('map-two', 'Map two', 'map'),
    ]);

    expect(sorted.map(({ slug }) => slug)).toEqual([
      'earth-one',
      'map-one',
      'map-two',
      'theatre-one',
    ]);
  });
});
