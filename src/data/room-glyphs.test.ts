import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ROOMS } from './rooms';

// Glyph asset invariant (KAN-101): every room in the cosmography must have a
// house-style glyph SVG on disk at the path its Room record advertises. These
// assets are consumed by RoomBadge, the rooms grid, and OG images, so a missing
// or malformed file would surface as a broken image far from here — this test is
// the gate that keeps the seven glyphs in lockstep with src/data/rooms.ts.
const publicDir = fileURLToPath(new URL('../../public', import.meta.url));

describe('room glyphs (KAN-101)', () => {
  for (const room of ROOMS) {
    describe(room.title, () => {
      const svg = readFileSync(`${publicDir}${room.glyph}`, 'utf8');

      it('exists and is a well-formed SVG document', () => {
        expect(svg.trimStart().startsWith('<svg')).toBe(true);
        expect(svg).toContain('</svg>');
        expect(svg).toContain('viewBox="0 0 64 64"');
      });

      it('carries an accessible label naming the room', () => {
        expect(svg).toContain('role="img"');
        expect(svg).toContain(`aria-label="${room.title}"`);
      });

      it('uses the house-style gold medallion frame', () => {
        expect(svg).toContain('#d4b87a');
        expect(svg).toContain('r="28"');
      });
    });
  }
});
