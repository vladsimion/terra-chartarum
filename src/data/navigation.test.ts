import { describe, expect, it } from 'vitest';
import { isPrimaryNavActive, PRIMARY_NAV } from './navigation';

describe('primary navigation', () => {
  it('places Rooms between Essays and Atlas with its canonical route target', () => {
    expect(PRIMARY_NAV.map(({ label, href }) => [label, href])).toEqual([
      ['Essays', '/essays/'],
      ['Rooms', '/rooms/'],
      ['Atlas', '/atlas/'],
      ['Collection', '/collection/'],
      ['Cartographers', '/cartographers/'],
      ['About', '/about/'],
      ['Colophon', '/colophon/'],
    ]);
  });

  it('marks both the Rooms index and room detail pages active', () => {
    expect(isPrimaryNavActive('/rooms/', '/rooms/')).toBe(true);
    expect(isPrimaryNavActive('/rooms/city/', '/rooms/')).toBe(true);
    expect(isPrimaryNavActive('/essays/cities-remember/', '/rooms/')).toBe(false);
  });
});
