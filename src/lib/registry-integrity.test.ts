import { describe, expect, it } from 'vitest';
import {
  auditRegistryGraph,
  parseCsv,
  parseTypescriptArray,
  validateSharedContract,
} from '../../scripts/lib/registry-integrity.mjs';
import contract from '../../data/contracts/terra-chartarum.json';

const registry = (name: string, idField = 'id', reportOrphans = false) => ({
  name,
  authority: 'test',
  family: name,
  idField,
  reportOrphans,
  source: { path: `${name}.csv` },
});

describe('registry integrity', () => {
  it('parses quoted commas, escaped quotes and multiline CSV fields', () => {
    const rows = parseCsv('id,note\na,"one, two"\nb,"line 1\nline ""2"""\n', 'fixture.csv');
    expect(rows).toMatchObject([
      { id: 'a', note: 'one, two', __line: 2 },
      { id: 'b', note: 'line 1\nline "2"', __line: 3 },
    ]);
  });

  it('extracts records from an existing TypeScript array without importing Astro', () => {
    const rows = parseTypescriptArray(
      "const RAW: unknown[] = [{ id: 'a', refs: ['b'], year: -10 }];",
      'RAW',
      'fixture.ts',
    );
    expect(rows).toMatchObject([{ id: 'a', refs: ['b'], year: -10 }]);
  });

  it('fails duplicate IDs and unresolved required foreign keys', () => {
    const manifest = {
      registries: [registry('parents'), registry('children')],
      relations: [{ from: 'children', field: 'parent', to: ['parents'], required: true }],
    };
    const records = new Map([
      ['parents', [{ id: 'p1' }, { id: 'p1' }]],
      [
        'children',
        [
          { id: 'c1', parent: 'missing' },
          { id: 'c2', parent: '' },
        ],
      ],
    ]);
    const audit = auditRegistryGraph(manifest, records);
    expect(audit.errors.map((error) => error.kind)).toEqual(
      expect.arrayContaining([
        'duplicate-id',
        'unresolved-reference',
        'missing-required-reference',
      ]),
    );
  });

  it('coalesces phase rows that intentionally share one referent ID', () => {
    const parents = { ...registry('parents'), coalesceIds: true };
    const audit = auditRegistryGraph(
      { registries: [parents], relations: [] },
      new Map([
        [
          'parents',
          [
            { id: 'place', phase: 1 },
            { id: 'place', phase: 2 },
          ],
        ],
      ]),
    );
    expect(audit.errors).toEqual([]);
  });

  it('rejects assignment of a reserved canonical reference', () => {
    const audit = auditRegistryGraph(
      {
        registries: [registry('parents')],
        relations: [],
        reservedCanonicalReferences: ['tc:test:parents:reserved'],
      },
      new Map([['parents', [{ id: 'reserved' }]]]),
    );
    expect(audit.errors).toMatchObject([{ kind: 'reserved-id' }]);
  });

  it('allows an absent optional relation but rejects a broken declared value', () => {
    const manifest = {
      registries: [registry('parents'), registry('children')],
      relations: [{ from: 'children', field: 'parent', to: ['parents'] }],
    };
    const records = new Map([
      ['parents', [{ id: 'p1' }]],
      ['children', [{ id: 'c1' }, { id: 'c2', parent: 'missing' }]],
    ]);
    const audit = auditRegistryGraph(manifest, records);
    expect(audit.errors).toHaveLength(1);
    expect(audit.errors[0].kind).toBe('unresolved-reference');
  });

  it('reports opted-in orphans as warnings', () => {
    const manifest = {
      registries: [registry('parents', 'id', true), registry('children')],
      relations: [{ from: 'children', field: 'parent', to: ['parents'] }],
    };
    const audit = auditRegistryGraph(
      manifest,
      new Map([
        ['parents', [{ id: 'used' }, { id: 'orphan' }]],
        ['children', [{ id: 'child', parent: 'used' }]],
      ]),
    );
    expect(audit.errors).toHaveLength(0);
    expect(audit.warnings).toMatchObject([{ kind: 'orphan' }]);
    expect(audit.warnings[0].message).toContain("'orphan'");
  });

  it('keeps the shared contract structurally complete', () => {
    expect(validateSharedContract(contract)).toEqual([]);
  });
});
