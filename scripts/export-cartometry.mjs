import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = resolve(ROOT, 'data/editorial/maps-that-age/states.json');
const OUT_DIR = resolve(ROOT, 'public/data/cartometry');
const JSON_OUT = resolve(OUT_DIR, 'maps-that-age.json');
const CSV_OUT = resolve(OUT_DIR, 'maps-that-age.csv');

const SOURCE_URLS = {
  'vandenbroecke-ort1': 'https://orteliusmaps.com/book/ort1.html',
  'vandenbroecke-ort2': 'https://orteliusmaps.com/book/ort2.html',
  'vandenbroecke-ort3': 'https://orteliusmaps.com/book/ort3.html',
};

const states = JSON.parse(readFileSync(SOURCE, 'utf8'));
const required = [
  'id',
  'mapId',
  'year',
  'plate',
  'state',
  'sourceId',
  'intervention',
  'evidence',
  'confidence',
];

for (const state of states) {
  for (const field of required) {
    if (state[field] === undefined || state[field] === '') {
      throw new Error(`${state.id ?? 'unknown state'}: missing ${field}`);
    }
  }
  if (!SOURCE_URLS[state.sourceId]) {
    throw new Error(`${state.id}: unresolved source ${state.sourceId}`);
  }
}

const firstYearByPlate = new Map();
const records = states
  .sort((a, b) => a.year - b.year || a.plate - b.plate)
  .map((state, index) => {
    if (!firstYearByPlate.has(state.plate)) firstYearByPlate.set(state.plate, state.year);
    return {
      stateId: state.id,
      mapId: state.mapId,
      year: state.year,
      plate: state.plate,
      state: state.state,
      plateAgeYears: state.year - firstYearByPlate.get(state.plate),
      cumulativeDocumentedInterventions: index + 1,
      intervention: state.intervention,
      evidence: state.evidence,
      confidence: state.confidence,
      sourceId: state.sourceId,
      sourceUrl: SOURCE_URLS[state.sourceId],
    };
  });

const payload = {
  schemaVersion: 1,
  title: 'Maps That Age — Cartometry evidence export',
  methodology:
    'Counts documented plate interventions; it does not calculate pixel or geographic error across differently cropped scans.',
  records,
};

const columns = [
  'stateId',
  'mapId',
  'year',
  'plate',
  'state',
  'plateAgeYears',
  'cumulativeDocumentedInterventions',
  'intervention',
  'evidence',
  'confidence',
  'sourceId',
  'sourceUrl',
];
const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;
const csv = [
  columns.join(','),
  ...records.map((record) => columns.map((column) => csvCell(record[column])).join(',')),
].join('\n');

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(JSON_OUT, `${JSON.stringify(payload, null, 2)}\n`);
writeFileSync(CSV_OUT, `${csv}\n`);
console.log(`Cartometry export: ${records.length} records → public/data/cartometry/`);
