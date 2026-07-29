import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getVmnNetwork } from './vmn-network';

describe('VMN route-waypoint network', () => {
  it('projects the published seven routes without compiling new route data', async () => {
    const network = await getVmnNetwork();
    expect(network.routes).toHaveLength(7);
    expect(network.nodes).toHaveLength(22);
    expect(network.edges).toHaveLength(38);
    expect(network.routes.find((route) => route.id === 'muda_romania')?.waypoints).toEqual([
      'venice',
      'zara',
      'ragusa',
      'modon',
      'negroponte',
      'constantinople_quarter',
      'trebizond',
      'tana',
    ]);
  });

  it('resolves every route tag through the commodity authority table', async () => {
    const network = await getVmnNetwork();
    const ids = new Set(network.commodities.map((commodity) => commodity.id));
    expect(ids).toEqual(
      new Set(['spices', 'silk', 'wax', 'fur', 'cotton', 'sugar', 'wine', 'grain', 'salt']),
    );
    for (const route of network.routes) {
      expect(route.commodities.every((commodity) => ids.has(commodity))).toBe(true);
    }
  });

  it('matches the frozen seven-route sequence contract', async () => {
    const [network, raw] = await Promise.all([
      getVmnNetwork(),
      readFile(join(process.cwd(), 'data', 'vmn', 'route-sequences.json'), 'utf8'),
    ]);
    const contract = JSON.parse(raw);
    expect(contract.status).toBe('structurally_verified');
    expect(contract.chronologyStatus).toBe('pending_page_level_verification_KAN_154');
    expect(contract.routes).toHaveLength(7);

    const published = new Map(network.routes.map((route) => [route.id, route]));
    for (const route of contract.routes) {
      expect(published.get(route.routeId)?.waypoints).toEqual(route.waypoints);
      expect(published.get(route.routeId)?.commodities).toEqual(route.commodities);
    }
  });
});
