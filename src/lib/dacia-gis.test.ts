import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getGeoLayers } from './geo';

interface GisFeature {
  id: string;
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, string | number>;
}

/** The compiled asset, which is what the Atlas actually fetches. */
function layer(id: string): GisFeature[] {
  const url = getGeoLayers().find((entry) => entry.id === id)?.url;
  if (!url) throw new Error(`no registered layer ${id}`);
  return JSON.parse(readFileSync(join(process.cwd(), 'public', url), 'utf-8')).features;
}

function at(features: GisFeature[], year: number): string[] {
  return features
    .filter(
      (feature) =>
        Number(feature.properties.valid_from) <= year &&
        year <= Number(feature.properties.valid_to),
    )
    .map((feature) => feature.id);
}

describe('shared Dacia GIS layers (KAN-341, KAN-342, KAN-343)', () => {
  it('never claims a feature was digitised from a source', () => {
    // The whole family is drawn or derived. A layer that quietly upgraded its
    // provenance would be claiming an authority nobody has established.
    for (const id of [
      'dacia-roman-sites',
      'dacia-roman-network',
      'dacia-principalities',
      'dacia-josephinian-sheets',
    ]) {
      for (const feature of layer(id)) {
        expect(feature.properties.geometry_provenance).not.toBe('source_geometry');
        expect(feature.properties.geometry_provenance).not.toBe('georeferenced_source');
      }
    }
  });

  it('shows a principality phase only while it existed', () => {
    const phases = layer('dacia-principalities');

    // Habsburg Oltenia exists between Passarowitz and Belgrade and at no other
    // time. A layer that showed it in 1600 would be the timeless polygon this
    // one was built to avoid.
    expect(at(phases, 1600)).not.toContain('pp-oltenia-1718');
    expect(at(phases, 1730)).toContain('pp-oltenia-1718');
    expect(at(phases, 1800)).not.toContain('pp-oltenia-1718');

    // And Wallachia is the other half of that same fact: it holds Oltenia
    // before 1718 and after 1739, and the reduced phase stands in between.
    expect(at(phases, 1600)).toContain('pp-wallachia-1526');
    expect(at(phases, 1730)).toContain('pp-wallachia-1718');
    expect(at(phases, 1800)).toContain('pp-wallachia-1739');

    // Bessarabia is Russian only after 1812, and Bukovina Habsburg only after 1775.
    expect(at(phases, 1770)).not.toContain('pp-bukovina-1775');
    expect(at(phases, 1800)).toContain('pp-bukovina-1775');
    expect(at(phases, 1800)).not.toContain('pp-bessarabia-1812');
    expect(at(phases, 1820)).toContain('pp-bessarabia-1812');
  });

  it('gives one polity one extent at any moment', () => {
    const byPolity = new Map<string, GisFeature[]>();
    for (const feature of layer('dacia-principalities')) {
      const polity = String(feature.properties.polity_id);
      byPolity.set(polity, [...(byPolity.get(polity) ?? []), feature]);
    }
    for (const [polity, features] of byPolity) {
      for (let year = 1526; year <= 1859; year += 1) {
        const held = at(features, year);
        expect(held.length, `${polity} holds ${held.length} extents in ${year}`).toBeLessThan(2);
      }
    }
  });

  it('joins every Roman site to the corpus place it stands on', () => {
    const sites = layer('dacia-roman-sites');
    expect(sites.length).toBeGreaterThan(0);
    for (const site of sites) {
      expect(String(site.properties.place_id)).toMatch(/^plc-/);
      expect(site.geometry.type).toBe('Point');
    }
  });

  it('separates drawn frontier corridors from roads through attested stations', () => {
    const network = layer('dacia-roman-network');
    const roads = network.filter((feature) => feature.properties.feature_type === 'road');
    const limites = network.filter((feature) => feature.properties.feature_type === 'limes');

    expect(roads.length).toBeGreaterThan(0);
    expect(limites.length).toBeGreaterThan(0);
    // A road is a sequence of corpus places; a corridor is drawn and says so.
    for (const road of roads) expect(Number(road.properties.stations)).toBeGreaterThanOrEqual(2);
    for (const limes of limites) {
      expect(Number(limes.properties.stations)).toBe(0);
      expect(limes.properties.geometry_provenance).toBe('editorial_reconstruction');
    }
  });

  it('links each survey sheet to the corpus places inside its own footprint', () => {
    const sheets = layer('dacia-josephinian-sheets');
    expect(sheets.length).toBeGreaterThan(0);
    for (const sheet of sheets) {
      expect(Number(sheet.properties.covers)).toBeGreaterThan(0);
      expect(sheet.properties.scan_redistributed).toBe('no');
      expect(String(sheet.properties.source_url)).toMatch(/^https:/);
    }
  });
});
