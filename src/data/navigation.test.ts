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
      ['Bibliography', '/bibliography/'],
      ['About', '/about/'],
    ]);
  });

  it('marks both the Rooms index and room detail pages active', () => {
    expect(isPrimaryNavActive('/rooms/', '/rooms/')).toBe(true);
    expect(isPrimaryNavActive('/rooms/city/', '/rooms/')).toBe(true);
    expect(isPrimaryNavActive('/essays/cities-remember/', '/rooms/')).toBe(false);
  });

  it('marks Bibliography active without promoting Colophon', () => {
    expect(PRIMARY_NAV).toHaveLength(7);
    expect(isPrimaryNavActive('/bibliography/', '/bibliography/')).toBe(true);
    expect(PRIMARY_NAV.some(({ href }) => href === '/colophon/')).toBe(false);
  });
});
