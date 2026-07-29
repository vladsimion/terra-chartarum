import { createHash } from 'node:crypto';
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
  it('pins the Natural Earth 1:10m clipping base by release and checksum', async () => {
    const base = join(process.cwd(), 'data', 'vmn', 'base');
    const manifest = JSON.parse(await readFile(join(base, 'manifest.json'), 'utf8')) as {
      release: string;
      files: Record<string, { sha256: string }>;
    };
    expect(manifest.release).toBe('v5.1.1');
    for (const name of ['ne_10m_land.geojson', 'ne_10m_coastline.geojson']) {
      const bytes = await readFile(join(base, name));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.files[name].sha256);
    }
  });

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

    const moreaEarly = possessions.find(
      (feature) =>
        feature.properties?.territory === 'morea' && feature.properties?.valid_from === 1206,
    );
    const moreaLate = possessions.find(
      (feature) =>
        feature.properties?.territory === 'morea' && feature.properties?.valid_from === 1685,
    );
    expect(moreaEarly?.geometry.type).toBe('MultiPolygon');
    expect(moreaLate?.geometry.type).toBe('MultiPolygon');

    const longitudes = (feature: GeoJSON.Feature | undefined): number[] => {
      const values: number[] = [];
      const visit = (value: unknown) => {
        if (
          Array.isArray(value) &&
          value.length >= 2 &&
          typeof value[0] === 'number' &&
          typeof value[1] === 'number'
        ) {
          values.push(value[0]);
        } else if (Array.isArray(value)) {
          value.forEach(visit);
        }
      };
      visit((feature?.geometry as GeoJSON.MultiPolygon | undefined)?.coordinates);
      return values;
    };
    const earlyLongitudes = longitudes(moreaEarly);
    const lateLongitudes = longitudes(moreaLate);
    expect(Math.max(...earlyLongitudes) - Math.min(...earlyLongitudes)).toBeLessThan(1.5);
    expect(Math.max(...lateLongitudes) - Math.min(...lateLongitudes)).toBeGreaterThan(2.5);
  });

  it('publishes the 1489–1571 Cyprus phase as a clipped island extent', async () => {
    const possessions = await readFgb('venetian-possessions.fgb');
    const cyprus = possessions.find(
      (feature) =>
        feature.properties?.territory === 'cyprus' && feature.properties?.valid_from === 1489,
    );
    expect(cyprus?.properties).toMatchObject({
      possession_id: 'cyprus_1489',
      status: 'direct_rule',
      valid_from: 1489,
      valid_to: 1571,
    });
    expect(cyprus?.geometry.type).toBe('MultiPolygon');

    const coordinates: [number, number][] = [];
    const collectCoordinates = (value: unknown) => {
      if (
        Array.isArray(value) &&
        value.length >= 2 &&
        typeof value[0] === 'number' &&
        typeof value[1] === 'number'
      ) {
        coordinates.push([value[0], value[1]]);
      } else if (Array.isArray(value)) {
        value.forEach(collectCoordinates);
      }
    };
    collectCoordinates((cyprus?.geometry as GeoJSON.MultiPolygon).coordinates);
    const longitudes = coordinates.map((coordinate) => coordinate[0]);
    const latitudes = coordinates.map((coordinate) => coordinate[1]);
    expect(Math.min(...longitudes)).toBeGreaterThan(32);
    expect(Math.max(...longitudes)).toBeLessThan(35);
    expect(Math.min(...latitudes)).toBeGreaterThan(34);
    expect(Math.max(...latitudes)).toBeLessThan(36);
  });

  it('maps every possession territory to an inspectable public-domain plate', async () => {
    const root = join(process.cwd(), 'data', 'vmn', 'reference');
    const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
    const territories = new Set(
      manifest.plates.flatMap((plate: { territories: string[] }) => plate.territories),
    );
    expect(territories).toEqual(
      new Set(['crete', 'corfu', 'dalmatia', 'negroponte', 'morea', 'cyprus', 'albania_veneta']),
    );

    for (const plate of manifest.plates) {
      const annotation = JSON.parse(await readFile(join(root, plate.annotation), 'utf8'));
      expect(annotation.type).toBe('AnnotationPage');
      expect(annotation.items[0].motivation).toBe('georeferencing');
      expect(annotation.items[0].target.source.service).toHaveLength(1);
      expect(annotation.items[0].body.features).toHaveLength(4);
    }
  });

  it('freezes eastern merchant quarters as port-only authority records', async () => {
    const contract = JSON.parse(
      await readFile(join(process.cwd(), 'data', 'vmn', 'quarter-representations.json'), 'utf8'),
    );
    const representations = contract.representations as {
      id: string;
      portId: string;
      representation: string;
      geometry?: unknown;
      rationale: string;
    }[];

    expect(contract.status).toBe('decided');
    expect(Object.fromEntries(representations.map((record) => [record.id, record.portId]))).toEqual(
      {
        constantinople_quarter: 'constantinople_quarter',
        tana_fondaco: 'tana',
        trebizond_quarter: 'trebizond',
      },
    );
    expect(
      representations.every(
        (record) =>
          record.representation === 'port_only' &&
          record.geometry === undefined &&
          record.rationale.length > 40,
      ),
    ).toBe(true);

    const ports = await readFgb('venetian-ports.fgb');
    const portIds = new Set(ports.map((feature) => String(feature.properties?.port_id)));
    expect(representations.every((record) => portIds.has(record.portId))).toBe(true);
  });
});
