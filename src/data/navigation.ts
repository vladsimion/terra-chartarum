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
  { href: '/bibliography/', label: 'Bibliography' },
  { href: '/about/', label: 'About' },
];

export function isPrimaryNavActive(path: string, href: string): boolean {
  return href === '/' ? path === '/' : path.startsWith(href);
}
