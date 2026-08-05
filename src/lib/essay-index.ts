import { z } from 'zod';
import { ROOMS, ROOM_SLUGS, type Room } from '../data/rooms';

export interface RoomOwnedEssay {
  slug: string;
  data: {
    title: string;
    room: string;
    secondaryRooms: string[];
  };
}

export const EssayIndexRecordSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  room: z.enum(ROOM_SLUGS),
  secondaryRooms: z.array(z.enum(ROOM_SLUGS)).max(2),
});

export type EssayIndexRecord = z.infer<typeof EssayIndexRecordSchema>;

export interface EssayRoomGroup<T extends RoomOwnedEssay> {
  room: Room;
  essays: T[];
  records: EssayIndexRecord[];
}

export function toEssayIndexRecord(essay: RoomOwnedEssay): EssayIndexRecord {
  return EssayIndexRecordSchema.parse({
    slug: essay.slug,
    title: essay.data.title,
    room: essay.data.room,
    secondaryRooms: essay.data.secondaryRooms,
  });
}

/**
 * The same essays, flattened back into one list in canonical room order.
 *
 * For surfaces that show a single ungrouped run of cards (the portal's featured
 * strip) but should still read in the cosmography sequence the gallery and the
 * rooms overview use. Editorial order is preserved within each room.
 */
export function sortEssaysByRoom<T extends RoomOwnedEssay>(essays: T[]): T[] {
  return groupEssaysByRoom(essays).flatMap((group) => group.essays);
}

export function groupEssaysByRoom<T extends RoomOwnedEssay>(essays: T[]): EssayRoomGroup<T>[] {
  const entries = essays.map((essay) => ({ essay, record: toEssayIndexRecord(essay) }));
  return ROOMS.map((room) => {
    const matches = entries.filter(({ record }) => record.room === room.slug);
    return {
      room,
      essays: matches.map(({ essay }) => essay),
      records: matches.map(({ record }) => record),
    };
  }).filter((group) => group.essays.length > 0);
}
