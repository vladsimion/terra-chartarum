import { describe, it, expect } from 'vitest';
import { ROOM_SLUGS } from '../data/rooms';
import { CORPUS } from './corpus';
import { CARTOGRAPHERS } from './cartographers';
import { GEO_LAYERS } from './geo';

// Retro-tagging invariant (KAN-94): every existing corpus map, cartographer, and
// atlas layer must carry a canonical primary room, and any secondary memberships
// must be canonical too (schema already caps them at 2, charter decision D2).
// `room` is optional on these three collections at the schema level so future
// records validate before they are tagged, so we assert full coverage here
// instead — this test is the "zero untagged items" gate.
const SLUGS = new Set<string>(ROOM_SLUGS);

const collections = [
  { name: 'corpus maps', items: CORPUS },
  { name: 'cartographers', items: CARTOGRAPHERS },
  { name: 'atlas layers', items: GEO_LAYERS },
] as const;

describe('room retro-tagging coverage (KAN-94)', () => {
  for (const { name, items } of collections) {
    describe(name, () => {
      it('tags every item with a canonical primary room', () => {
        for (const item of items) {
          expect(item.room, `${name} entry "${item.id}" is untagged`).toBeDefined();
          expect(SLUGS.has(item.room as string), `${name} "${item.id}" → "${item.room}"`).toBe(
            true,
          );
        }
      });

      it('keeps secondary rooms canonical, capped at 2, and distinct from primary', () => {
        for (const item of items) {
          const secondary = item.secondaryRooms ?? [];
          expect(secondary.length, `${name} "${item.id}" secondary count`).toBeLessThanOrEqual(2);
          for (const s of secondary) {
            expect(SLUGS.has(s), `${name} "${item.id}" secondary "${s}"`).toBe(true);
            expect(s, `${name} "${item.id}" secondary duplicates primary`).not.toBe(item.room);
          }
        }
      });
    });
  }
});
