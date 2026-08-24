/**
 * Endurance: plan, drift, navigation (ANT-10 / KAN-429)
 *
 * Act VIII and the Coda. The question the sequence has to put to a reader is
 * "how do you know where you are when the surface carrying you is itself
 * moving?", and the answer has to be legible in the data rather than only in the
 * captions.
 *
 * Three things are therefore never merged here:
 *
 *   - the crossing that was announced and never sailed;
 *   - the movement the ship made under its own power;
 *   - the movement the ice made with the ship in it.
 *
 * The third is the act. When Endurance was beset her position went on changing
 * for nine months while nobody steered anything, and an interface that drew that
 * as a voyage would have destroyed the argument before the reader reached it.
 * `underOwnPower` comes from the phase record and drives the styling, so the
 * distinction cannot be lost by a later edit to a stylesheet.
 *
 * The Coda is deliberately thin. The comparison between Worsley's reported
 * sinking position and the 2022 wreck location is not drawn, because this
 * project does not hold the second coordinate or either uncertainty from a
 * citable source. What it can say without them is the point of the whole essay:
 * a coordinate is a result, not a fact.
 */
import {
  getAntarcticRecords,
  getPhases,
  type AntarcticPhase,
  type AntarcticRecord,
} from './antarctica';

export const EXPEDITION_ID = 'ant-exp-ite';

/** The frame the Weddell Sea sequence is drawn in, in degrees. */
export const DRIFT_FRAME = { west: -70, east: 10, north: -50, south: -84 } as const;

export interface Point {
  x: number;
  y: number;
}

/**
 * Equirectangular with a cosine correction at the frame's mid-latitude.
 *
 * Not a polar projection: at these latitudes over this span, a plate carrée with
 * one correction keeps the drift's north-south extent readable, and the drift's
 * extent is what the reader is being asked to look at. The correction is applied
 * once for the whole frame rather than per row, which is a simplification, and
 * one this frame is small enough to carry.
 */
export function projectDrift(lon: number, lat: number, width = 1000): Point {
  const { west, east, north, south } = DRIFT_FRAME;
  const midLat = (north + south) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const projectedWidth = (east - west) * kx;
  const scale = width / projectedWidth;
  return {
    x: round((lon - west) * kx * scale),
    y: round((north - lat) * scale),
  };
}

export function driftFrameHeight(width = 1000): number {
  const { north, south } = DRIFT_FRAME;
  const { east, west } = DRIFT_FRAME;
  const midLat = (north + south) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  return Math.round(((north - south) / ((east - west) * kx)) * width);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export type DriftStepId =
  'plan' | 'approach' | 'beset' | 'drift' | 'loss' | 'ice-camps' | 'caird' | 'coordinate';

export interface DriftStep {
  id: DriftStepId;
  ordinal: number;
  title: string;
  /** The date or span the step is about, as a reader would say it. */
  when: string;
  caption: string;
  /** Phase ids emphasised at this step. */
  phaseIds: string[];
  /** Record ids drawn at full weight. */
  shows: string[];
  /** Record ids kept visible but subordinated - the plan, once the ice takes over. */
  subordinates: string[];
}

const PLAN = 'ant-trk-endurance-plan';
const APPROACH = 'ant-trk-endurance-approach';
const DRIFT = 'ant-trk-endurance-drift';
const CAIRD = 'ant-trk-james-caird';
const BESET = 'ant-obs-endurance-beset';
const SUNK = 'ant-obs-endurance-fix';
const ELEPHANT = 'ant-obs-elephant-island';
const HAAKON = 'ant-obs-king-haakon-bay';

export function driftSteps(): DriftStep[] {
  return [
    {
      id: 'plan',
      ordinal: 1,
      title: 'The crossing that was announced',
      when: 'August 1914',
      caption:
        'Into the Weddell Sea, ashore, across the continent through the pole, and out by the Ross Sea. This line is a drawing of an intention. Nothing ever travelled along it.',
      phaseIds: ['ant-phs-ite-plan'],
      shows: [PLAN],
      subordinates: [],
    },
    {
      id: 'approach',
      ordinal: 2,
      title: 'South from South Georgia',
      when: 'December 1914 to January 1915',
      caption:
        'Six weeks working south into the pack. This is the only part of the expedition where the ship goes where she is steered.',
      phaseIds: ['ant-phs-ite-approach'],
      shows: [APPROACH],
      subordinates: [PLAN],
    },
    {
      id: 'beset',
      ordinal: 3,
      title: 'Beset',
      when: '19 January 1915',
      caption:
        'The ice closes. From here the plan is no longer a route the expedition is on; it is a record of what it meant to do. Note the date carries a disagreement: some accounts give 18 January.',
      phaseIds: ['ant-phs-ite-beset'],
      shows: [APPROACH, BESET],
      subordinates: [PLAN],
    },
    {
      id: 'drift',
      ordinal: 4,
      title: 'Carried',
      when: 'January to October 1915',
      caption:
        'Nine months in which the position changes continuously and nobody steers. The ship and the people stay more or less fixed to a floe; the floe moves. This is not a voyage, and it is drawn so it cannot be read as one.',
      phaseIds: ['ant-phs-ite-drift'],
      shows: [DRIFT, BESET],
      subordinates: [PLAN, APPROACH],
    },
    {
      id: 'loss',
      ordinal: 5,
      title: 'Abandoned, then lost',
      when: '27 October to 21 November 1915',
      caption:
        'Two events twenty-five days apart. The position recorded for the sinking is a calculated result: an observation, an instrument, an assumption and an arithmetic, each with its own error.',
      phaseIds: ['ant-phs-ite-abandon'],
      shows: [DRIFT, SUNK],
      subordinates: [PLAN, APPROACH],
    },
    {
      id: 'ice-camps',
      ordinal: 6,
      title: 'The people keep moving',
      when: 'November 1915 to April 1916',
      caption:
        'The ship is gone and the geography does not stop. Camps on the floe drift on for another five months, and the expedition is still changing its position without travelling.',
      phaseIds: ['ant-phs-ite-ice-camps', 'ant-phs-ite-elephant'],
      shows: [DRIFT, SUNK, ELEPHANT],
      subordinates: [PLAN],
    },
    {
      id: 'caird',
      ordinal: 7,
      title: 'A second navigation problem',
      when: '24 April to 10 May 1916',
      caption:
        'Eight hundred miles in a boat, with few chances to take a sight and no margin for an error in longitude. Worsley is the reason this is an act about navigation and not about endurance.',
      phaseIds: ['ant-phs-ite-caird', 'ant-phs-ite-crossing'],
      shows: [CAIRD, ELEPHANT, HAAKON],
      subordinates: [],
    },
    {
      id: 'coordinate',
      ordinal: 8,
      title: 'What a coordinate is',
      when: '1915, and 2022',
      caption:
        'The wreck was found in 2022. This project does not yet hold that position, or the uncertainty around either it or the 1915 one, from a source it has read, so no comparison is drawn here. What the record already shows is the lesson: a coordinate is produced by instruments, observations, assumptions and calculation, and it carries all of their errors.',
      phaseIds: [],
      shows: [SUNK],
      subordinates: [],
    },
  ];
}

export interface DriftGeometry {
  record: AntarcticRecord;
  path: string;
  isPoint: boolean;
  /** True when Terra Chartarum drew the line rather than a source giving it. */
  isOurs: boolean;
}

const OUR_OWN = ['editorial_interpolation', 'editorial_generalisation'];

export function driftGeometries(width = 1000): Map<string, DriftGeometry> {
  const wanted = new Set(driftSteps().flatMap((step) => [...step.shows, ...step.subordinates]));
  const byId = new Map(getAntarcticRecords().map((record) => [record.id, record]));
  const out = new Map<string, DriftGeometry>();

  for (const id of wanted) {
    const record = byId.get(id);
    if (!record) throw new Error(`Endurance sequence needs record "${id}", which is not compiled`);
    const geometry = record.geometry as { type: string; coordinates: unknown } | null;
    if (!geometry) throw new Error(`Endurance record "${id}" has no geometry`);
    const isOurs = OUR_OWN.includes(record.geometryProvenance);

    if (geometry.type === 'Point') {
      const [lon, lat] = geometry.coordinates as number[];
      const { x, y } = projectDrift(lon, lat, width);
      out.set(id, { record, path: `M${x} ${y}`, isPoint: true, isOurs });
    } else if (geometry.type === 'LineString') {
      const points = (geometry.coordinates as number[][]).map(([lon, lat], index) => {
        const { x, y } = projectDrift(lon, lat, width);
        return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
      });
      out.set(id, { record, path: points.join(' '), isPoint: false, isOurs });
    } else {
      throw new Error(`Endurance sequence cannot draw geometry type "${geometry.type}"`);
    }
  }
  return out;
}

/**
 * The phase table a reader gets instead of the animation, and the thing a screen
 * reader reads. Ordered by the expedition's own sequence, with the plan first
 * because the contrast only works if the intention comes before the experience.
 */
export function driftTranscript(): {
  phase: AntarcticPhase;
  span: string;
  power: string;
}[] {
  return getPhases(EXPEDITION_ID).map((phase) => ({
    phase,
    span:
      phase.dateTo && phase.dateTo !== phase.dateFrom
        ? `${phase.dateFrom} to ${phase.dateTo}`
        : phase.dateFrom,
    power:
      phase.underOwnPower === 'yes'
        ? 'Under her own power'
        : phase.underOwnPower === 'no'
          ? 'Carried'
          : 'Never sailed',
  }));
}

/**
 * Positions the sequence marks, with how each one was arrived at. Used for the
 * accessible summary; a reader should be able to learn that a position was
 * reckoned rather than observed without hovering over anything.
 */
export function driftPositions(): {
  id: string;
  title: string;
  date: string;
  method: string;
  confidence: string;
}[] {
  const methods: Record<string, string> = {
    instrumental_fix: 'Observed with an instrument',
    dead_reckoning: 'Reckoned from course, speed and time',
    editorial_interpolation: 'Drawn by Terra Chartarum, not recorded',
  };
  return getAntarcticRecords()
    .filter((record) => record.kind === 'observation' && record.act === 'act_viii')
    .map((record) => ({
      id: record.id,
      title: record.title,
      date: String((record as unknown as { observedDate?: string }).observedDate ?? ''),
      method: methods[record.evidenceClass] ?? record.evidenceClass,
      confidence: record.confidence,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
