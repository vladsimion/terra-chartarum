import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { geojson } from 'flatgeobuf';
import { describe, expect, it } from 'vitest';

async function readFgb(name: string): Promise<GeoJSON.Feature[]> {
  const bytes = new Uint8Array(await readFile(join(process.cwd(), 'public', 'geo', name)));
  const features: GeoJSON.Feature[] = [];
  for await (const feature of geojson.deserialize(bytes)) {
    features.push(feature as GeoJSON.Feature);
  }
  return features;
}

describe('VMN compiled datasets', () => {
  it('locks the enriched port migration to 86 phases / 70 stable ports', async () => {
    const features = await readFgb('venetian-ports.fgb');
    const ids = new Set(features.map((feature) => String(feature.properties?.port_id)));
    const added = [
      'antivari',
      'budua',
      'curzola',
      'dulcigno',
      'lesina',
      'malvasia',
      'pirano',
      'rovigno',
      'salonica',
      'santa_maura',
      'scutari',
    ];

    expect(features).toHaveLength(86);
    expect(ids.size).toBe(70);
    expect(added.every((id) => ids.has(id))).toBe(true);
  });

  it('carries local names and regions while normalizing bailiwick', async () => {
    const features = await readFgb('venetian-ports.fgb');
    expect(features.every((feature) => feature.properties?.name_local)).toBe(true);
    expect(features.every((feature) => feature.properties?.region)).toBe(true);
    expect(features.some((feature) => feature.properties?.status === 'bailiwick')).toBe(false);
    expect(
      features.some(
        (feature) =>
          feature.properties?.port_id === 'negroponte' &&
          feature.properties?.valid_from === 1209 &&
          feature.properties?.status === 'subject',
      ),
    ).toBe(true);
  });

  it('publishes routes and coastline-clipped possession phases', async () => {
    const [routes, possessions] = await Promise.all([
      readFgb('venetian-routes.fgb'),
      readFgb('venetian-possessions.fgb'),
    ]);

    expect(routes).toHaveLength(7);
    expect(routes.every((feature) => feature.geometry.type === 'LineString')).toBe(true);
    expect(new Set(routes.map((feature) => feature.properties?.route_type))).toEqual(
      new Set(['muda', 'private']),
    );
    expect(possessions).toHaveLength(11);
    expect(possessions.every((feature) => feature.geometry.type === 'MultiPolygon')).toBe(true);
  });
});
