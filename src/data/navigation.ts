export interface PrimaryNavItem {
  href: string;
  label: string;
}

export const PRIMARY_NAV: readonly PrimaryNavItem[] = [
  { href: '/essays/', label: 'Essays' },
  { href: '/rooms/', label: 'Rooms' },
  { href: '/atlas/', label: 'Atlas' },
  { href: '/collection/', label: 'Collection' },
  { href: '/cartographers/', label: 'Cartographers' },
  { href: '/about/', label: 'About' },
  { href: '/colophon/', label: 'Colophon' },
];

export function isPrimaryNavActive(path: string, href: string): boolean {
  return href === '/' ? path === '/' : path.startsWith(href);
}
