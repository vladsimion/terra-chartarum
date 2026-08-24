import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ANTARCTIC_EVIDENCE_CLASSES,
  ANTARCTIC_GEOMETRY_PROVENANCE,
  getAntarcticExpeditions,
  getAntarcticRecords,
  getAntarcticRelease,
  getGhostRecords,
  getMappableRecords,
  getPublicRecords,
  getRecordsByAct,
  getRecordsByEvidenceClass,
  atlasLayersFor,
  layerForRecord,
  getCoastlineChronology,
  getPhases,
  getPriorityContest,
  getPriorityContests,
  getSelfPropelledPhases,
  getUnobservedClaims,
  chartRevision,
  chartedByYear,
  isEditorialLinework,
  isRelevantInYear,
  type AntarcticRecord,
} from './antarctica';

type AtlasFeature = { properties: Record<string, unknown>; geometry: { type: string } };

/** Both Atlas assets read back as one list: the split is a render constraint. */
const ATLAS_LAYERS = [
  'antarctica-conjectured-south',
  'antarctica-expedition-tracks',
  'antarctica-observations',
  'antarctica-ghost-geographies',
];

const atlas = {
  features: ATLAS_LAYERS.flatMap(
    (layer) =>
      (
        JSON.parse(readFileSync(`public/geo/${layer}.geojson`, 'utf8')) as {
          features: AtlasFeature[];
        }
      ).features,
  ),
};

describe('Antarctic pilot slice', () => {
  it('compiles the seven acts the vertical slice has to prove', () => {
    const acts = new Set(getAntarcticRecords().map((record) => record.act));
    for (const act of ['act_i', 'act_iii', 'act_iv', 'act_v', 'act_vi', 'act_vii', 'act_viii']) {
      expect(acts, `pilot is missing ${act}`).toContain(act);
    }
  });

  it('keeps every record inside the frozen vocabularies', () => {
    for (const record of getAntarcticRecords()) {
      expect(ANTARCTIC_EVIDENCE_CLASSES).toContain(record.evidenceClass);
      expect(ANTARCTIC_GEOMETRY_PROVENANCE).toContain(record.geometryProvenance);
    }
  });

  it('declares a geometry provenance for every record that has geometry', () => {
    for (const record of getMappableRecords()) {
      expect(record.geometryProvenance).not.toBe('not_spatial');
    }
  });

  it('shows nothing to a public reader as established', () => {
    // Not a placeholder assertion: nothing in this slice has been read against a
    // source, so an empty public tier is the correct state and a regression here
    // would mean something was promoted without review.
    expect(getPublicRecords()).toEqual([]);
  });
});

describe('the essay and the Atlas read one dataset', () => {
  it('draws the Atlas layer from the same records the essay holds', () => {
    const essayIds = new Set(getAntarcticRecords().map((record) => record.id));
    const atlasIds = atlas.features.map((feature) => feature.properties.id as string);
    expect(atlasIds.length).toBeGreaterThan(0);
    for (const id of atlasIds) {
      expect(essayIds, `Atlas holds ${id}, which the essay does not`).toContain(id);
    }
  });

  it('maps exactly the records that have geometry', () => {
    const atlasIds = new Set(atlas.features.map((feature) => feature.properties.id as string));
    const mappable = new Set(getMappableRecords().map((record) => record.id));
    expect(atlasIds).toEqual(mappable);
  });

  it('agrees with the essay about what kind of evidence each record is', () => {
    const byId = new Map(getAntarcticRecords().map((record) => [record.id, record]));
    for (const feature of atlas.features) {
      const record = byId.get(feature.properties.id as string) as AntarcticRecord;
      expect(feature.properties.evidenceClass).toBe(record.evidenceClass);
      expect(feature.properties.geometryProvenance).toBe(record.geometryProvenance);
      expect(feature.properties.confidence).toBe(record.confidence);
      expect(feature.properties.reviewState).toBe(record.reviewState);
    }
  });

  it('leaves an unseen plate off the map rather than giving it a point', () => {
    const atlasIds = new Set(atlas.features.map((feature) => feature.properties.id as string));
    expect(atlasIds.has('ant-ftr-coronelli-southern-region')).toBe(false);
    expect(getRecordsByAct('act_iii').length).toBeGreaterThan(0);
  });
});

describe('evidence is separable from interpretation', () => {
  it('marks the planned crossing as our own linework, not as a record', () => {
    const plan = getAntarcticRecords().find((record) => record.id === 'ant-trk-endurance-plan');
    expect(plan).toBeDefined();
    expect(isEditorialLinework(plan!)).toBe(true);
    expect(plan!.evidenceClass).toBe('editorial_interpolation');
  });

  it('does not mark a transcribed coordinate as our own linework', () => {
    const limit = getAntarcticRecords().find(
      (record) => record.id === 'ant-ftr-cook-southern-limit',
    );
    expect(limit).toBeDefined();
    expect(isEditorialLinework(limit!)).toBe(false);
  });

  it('separates a reported sighting from a direct observation', () => {
    const reported = getRecordsByEvidenceClass('reported_not_observed').map((r) => r.id);
    expect(reported).toContain('ant-obs-1820-sighting');
    expect(getRecordsByEvidenceClass('direct_observation').map((r) => r.id)).not.toContain(
      'ant-obs-1820-sighting',
    );
  });

  it('keeps a ghost feature answerable on all four questions', () => {
    const ghosts = getGhostRecords();
    expect(ghosts.length).toBeGreaterThan(0);
    for (const ghost of ghosts) {
      expect(ghost.claimant).toBeTruthy();
      expect(ghost.whatWasReported).toBeTruthy();
      expect(ghost.whyPlausible).toBeTruthy();
      expect(ghost.laterEvidence).toBeTruthy();
    }
  });
});

describe('temporal relevance', () => {
  it('reveals the 1820 sighting only from its own year', () => {
    const sighting = getAntarcticRecords().find((r) => r.id === 'ant-obs-1820-sighting')!;
    expect(isRelevantInYear(sighting, 1819)).toBe(false);
    expect(isRelevantInYear(sighting, 1820)).toBe(true);
    expect(isRelevantInYear(sighting, 1821)).toBe(false);
  });

  it('treats an open-ended record as still relevant', () => {
    const ghost = getGhostRecords()[0];
    expect(ghost.validTo).toBe(9999);
    expect(isRelevantInYear(ghost, 2026)).toBe(true);
  });

  it('keeps an undated record visible rather than hiding it', () => {
    const undated: AntarcticRecord = {
      id: 'test',
      kind: 'feature',
      act: 'act_ii',
      title: 'An undated claim',
      evidenceClass: 'inherited_cartography',
      geometryProvenance: 'not_spatial',
      confidence: 'unresolved',
      reviewState: 'raw',
      sourceId: null,
      sourceLocator: 'pending',
      notes: '',
      geometry: null,
    };
    expect(isRelevantInYear(undated, 1500)).toBe(true);
    expect(isRelevantInYear(undated, 1900)).toBe(true);
  });
});

describe('expeditions', () => {
  it('carries the five expeditions the pilot records refer to', () => {
    const ids = getAntarcticExpeditions().map((expedition) => expedition.id);
    expect(ids).toContain('ant-exp-cook-second');
    expect(ids).toContain('ant-exp-ite');
    for (const expedition of getAntarcticExpeditions()) {
      expect(expedition.yearTo).toBeGreaterThanOrEqual(expedition.yearFrom);
      expect(expedition.vessels.length).toBeGreaterThan(0);
    }
  });

  it('reports the release the layer was compiled from', () => {
    expect(getAntarcticRelease()).toEqual({
      release: 'ant-pilot-0.1',
      layerIds: ATLAS_LAYERS,
      schemaVersion: 1,
    });
  });
});

describe('Endurance as phases rather than a route', () => {
  it('orders the phases and starts with the plan that never happened', () => {
    const phases = getPhases('ant-exp-ite');
    expect(phases.length).toBeGreaterThan(5);
    expect(phases[0].phaseKind).toBe('planned');
    expect(phases[0].underOwnPower).toBe('planned');
    expect(phases.map((p) => p.sequence)).toEqual(
      [...phases.map((p) => p.sequence)].sort((a, b) => a - b),
    );
  });

  it('excludes the drift from the phases the ship actually sailed', () => {
    const sailed = getSelfPropelledPhases('ant-exp-ite').map((p) => p.phaseKind);
    expect(sailed).toContain('approach');
    expect(sailed).not.toContain('drift');
    expect(sailed).not.toContain('planned');
    expect(sailed).not.toContain('ice_camp');
  });

  it('keeps abandonment and sinking as separate spans', () => {
    const phases = getPhases('ant-exp-ite');
    const abandon = phases.find((p) => p.phaseKind === 'abandonment')!;
    expect(abandon.dateFrom).toBe('1915-10-27');
    expect(abandon.dateTo).toBe('1915-11-21');
    expect(abandon.dateFrom).not.toBe(abandon.dateTo);
  });
});

describe('priority without a winner', () => {
  it('holds more than one claim in every contest', () => {
    const contests = getPriorityContests();
    expect(contests.length).toBeGreaterThan(0);
    for (const contest of contests) {
      expect(getPriorityContest(contest).length, contest).toBeGreaterThan(1);
    }
  });

  it('makes every claim answer a definition rather than a rank', () => {
    for (const claim of getPriorityContest('first_mainland_or_ice_1820')) {
      expect(claim.definitionSatisfied).toMatch(/^ant-trm-/);
      expect(Object.keys(claim)).not.toContain('isFirst');
      expect(Object.keys(claim)).not.toContain('winner');
    }
  });

  it('carries the claims of 1820 against three different definitions', () => {
    const claims = getPriorityContest('first_mainland_or_ice_1820');
    const definitions = new Set(claims.map((c) => c.definitionSatisfied));
    // Three parties are usually compared as if they answered one question.
    // They do not, and the data has to be able to say so.
    expect(definitions.size).toBeGreaterThan(1);
  });

  it('keeps the unrecorded sealers as a dateless row', () => {
    const silent = getPriorityContest('first_mainland_or_ice_1820').find(
      (c) => c.id === 'ant-pri-sealers-unrecorded',
    );
    expect(silent).toBeDefined();
    expect(silent!.claimDate).toBe('');
    expect(silent!.evidenceStrength).toBe('unresolved');
  });
});

describe('coastline chronology', () => {
  it('allows a claim with no observation behind it', () => {
    const unobserved = getUnobservedClaims().map((s) => s.id);
    expect(unobserved).toContain('ant-seg-wilkes-land');
  });

  it('never charts a segment before it was claimed', () => {
    for (const segment of getCoastlineChronology()) {
      if (segment.firstClaimedDate && segment.firstChartedDate) {
        expect(Number(segment.firstChartedDate.slice(0, 4)), segment.id).toBeGreaterThanOrEqual(
          Number(segment.firstClaimedDate.slice(0, 4)),
        );
      }
    }
  });

  it('answers what was on the charts by a given year', () => {
    const by1845 = chartedByYear(1845).map((s) => s.id);
    expect(by1845).toContain('ant-seg-wilkes-land');
    expect(chartedByYear(1830).map((s) => s.id)).not.toContain('ant-seg-adelie-coast');
  });

  it('does not call a drifting ice front confirmed coast', () => {
    const barrier = getCoastlineChronology().find((s) => s.id === 'ant-seg-ross-ice-front')!;
    expect(barrier.laterStatus).toBe('modified');
  });
});

describe('the cumulative chart was itself revised', () => {
  it('shows what the 1910 issue added to the 1874 compilation', () => {
    const { retained, added, dropped } = chartRevision();
    expect(added.length).toBeGreaterThan(0);
    expect(retained.length).toBeGreaterThan(added.length);
    expect(added.map((c) => c.voyageLabel).sort()).toEqual(['Scott 1901-4', 'Shackleton 1908-9']);
    expect(dropped.map((c) => c.voyageLabel)).toEqual(['Towson 1855-59']);
  });

  it('holds a compiled analysis apart from a voyage', () => {
    const towson = chartRevision().dropped[0];
    expect(towson.contributionKind).toBe('compiled_analysis');
    expect(towson.expeditionId).toBeNull();
  });
});

describe('the Atlas family partitions the mappable records', () => {
  it('assigns every mappable record to exactly one layer', () => {
    const counts = new Map<string, number>();
    for (const layer of ATLAS_LAYERS) {
      const payload = JSON.parse(readFileSync(`public/geo/${layer}.geojson`, 'utf8')) as {
        features: AtlasFeature[];
      };
      for (const feature of payload.features) {
        const id = feature.properties.id as string;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    for (const [id, count] of counts) expect(count, id).toBe(1);
    expect(counts.size).toBe(getMappableRecords().length);
  });

  it('leaves the ghost layer empty, because no disputed position has been located', () => {
    // Not a placeholder assertion. Every ghost record is non-spatial on purpose,
    // and a point appearing here would mean one had been invented.
    const ghosts = JSON.parse(
      readFileSync('public/geo/antarctica-ghost-geographies.geojson', 'utf8'),
    ) as { features: AtlasFeature[] };
    expect(ghosts.features).toEqual([]);
    expect(getGhostRecords().length).toBeGreaterThan(0);
    for (const ghost of getGhostRecords()) expect(ghost.geometry).toBeNull();
  });

  it('keeps the conjectured envelope out of the observation layer', () => {
    const observations = JSON.parse(
      readFileSync('public/geo/antarctica-observations.geojson', 'utf8'),
    ) as { features: AtlasFeature[] };
    const ids = observations.features.map((f) => f.properties.id as string);
    expect(ids).not.toContain('ant-ftr-terra-australis-conjectured');
    expect(observations.features.every((f) => f.geometry.type === 'Point')).toBe(true);
  });
});

describe('Atlas composition for a deep link (KAN-424 / KAN-429)', () => {
  const LAYERS = [
    'antarctica-conjectured-south',
    'antarctica-expedition-tracks',
    'antarctica-observations',
    'antarctica-ghost-geographies',
  ];

  it('reproduces the compiled GeoJSON split exactly', () => {
    // The rule lives twice - in build.py and in layerForRecord - because the
    // essay must resolve a layer without running Python. This is what stops the
    // two copies from drifting: a deep link that names a layer the record is no
    // longer on opens an Atlas with nothing on it, and looks like it worked.
    for (const layer of LAYERS) {
      const compiled = (
        JSON.parse(readFileSync(`public/geo/${layer}.geojson`, 'utf8')) as {
          features: AtlasFeature[];
        }
      ).features
        .map((feature) => feature.properties.id as string)
        .sort();
      const derived = getAntarcticRecords()
        .filter((record) => layerForRecord(record) === layer)
        .map((record) => record.id)
        .sort();
      expect(derived, layer).toEqual(compiled);
    }
  });

  it('gives a record with no geometry no layer at all', () => {
    for (const record of getAntarcticRecords()) {
      if (record.geometry === null) expect(layerForRecord(record), record.id).toBeNull();
    }
    // Every ghost is non-spatial, so asking for the ghosts yields no layer
    // rather than the empty ghost layer - there is nothing there to switch on.
    expect(atlasLayersFor(getGhostRecords().map((ghost) => ghost.id))).toEqual([]);
  });

  it('resolves the Cook transition to its two layers', () => {
    expect(
      atlasLayersFor(['ant-ftr-terra-australis-conjectured', 'ant-trk-cook-resolution']),
    ).toEqual(['antarctica-conjectured-south', 'antarctica-expedition-tracks']);
  });

  it('refuses an unknown record rather than returning an empty composition', () => {
    expect(() => atlasLayersFor(['ant-obs-does-not-exist'])).toThrow('Unknown Antarctic record');
  });
});
