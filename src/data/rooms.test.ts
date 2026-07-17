import { describe, it, expect } from 'vitest';
import { ROOMS, ROOM_SLUGS, getRoom } from './rooms';

describe('rooms taxonomy (KAN-92)', () => {
  it('defines exactly seven rooms', () => {
    expect(ROOMS).toHaveLength(7);
  });

  it('has unique slugs', () => {
    const slugs = ROOMS.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(7);
  });

  it('has unique, sequential cosmography order 1..7', () => {
    const orders = ROOMS.map((r) => r.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('exposes the canonical seven slugs in cosmography order', () => {
    expect([...ROOM_SLUGS]).toEqual([
      'earth',
      'map',
      'city',
      'border',
      'road',
      'archive',
      'theatre',
    ]);
  });

  it('keeps ROOM_SLUGS in sync with ROOMS declaration order', () => {
    expect([...ROOM_SLUGS]).toEqual(ROOMS.map((r) => r.slug));
  });

  it('gives every room a title, blurb, and glyph reference', () => {
    for (const room of ROOMS) {
      expect(room.title, `${room.slug} title`).toMatch(/\S/);
      expect(room.blurb, `${room.slug} blurb`).toMatch(/\S/);
      expect(room.glyph, `${room.slug} glyph`).toBe(`/rooms/glyphs/${room.slug}.svg`);
    }
  });

  it('gives every room a curatorial lede of 100–150 words (KAN-98 AC)', () => {
    for (const room of ROOMS) {
      const words = room.lede.trim().split(/\s+/).length;
      expect(words, `${room.slug} lede word count`).toBeGreaterThanOrEqual(100);
      expect(words, `${room.slug} lede word count`).toBeLessThanOrEqual(150);
    }
  });

  it('resolves rooms by slug and rejects unknown slugs', () => {
    expect(getRoom('theatre')?.title).toBe('The Theatre');
    expect(getRoom('atlas')).toBeUndefined();
  });
});
