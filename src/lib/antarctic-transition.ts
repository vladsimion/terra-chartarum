/**
 * Terra Australis to Cook's blank: the projection and step model (KAN-424)
 *
 * Acts I to IV as a data-backed argument. The claim the interaction has to make
 * is uncomfortable and easy to overstate, so the step model is written here in
 * plain functions where it can be tested, rather than inside a component where
 * it would only be inspectable by looking at it.
 *
 * The argument: a southern continent was drawn for two centuries; Cook's tracks
 * did not find it; the map afterwards showed *less* land and *more* knowledge.
 *
 * The overclaim it must not make: that Cook proved no Antarctic land existed. He
 * did not, and a continent was sighted within fifty years. What his tracks
 * removed was the temperate, habitable Terra Australis that the maps had drawn,
 * and what they produced was a bounded space in which anything remaining had to
 * be smaller, further south and colder. Step four says so in the data rather
 * than only in a caption.
 *
 * Everything here is projection and sequencing. No geometry is authored: the
 * envelope, the track and the farthest south all come from the compiled pilot.
 */
import { getAntarcticRecords, type AntarcticRecord } from './antarctica';

/** South-polar azimuthal frame. Latitudes north of this are outside the plate. */
export const FRAME_NORTH_LIMIT = -40;

export interface Point {
  x: number;
  y: number;
}

/**
 * South-polar azimuthal equidistant projection onto a unit square.
 *
 * The pole is the centre and latitude is linear in radius, which is the right
 * choice here for one reason: the argument is about how far south a track
 * reached, and a projection that distorted that distance would be arguing
 * against the essay.
 */
export function projectPolar(lon: number, lat: number, size = 1000): Point {
  const centre = size / 2;
  const span = 90 + FRAME_NORTH_LIMIT; // degrees of latitude from pole to frame edge
  const clamped = Math.min(lat, FRAME_NORTH_LIMIT);
  const radius = ((90 + clamped) / span) * centre;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: round(centre + radius * Math.sin(theta)),
    y: round(centre + radius * Math.cos(theta)),
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * A GeoJSON ring, line or point to an SVG path. Densifies long spans in
 * longitude, because a straight line between two points in a polar projection
 * is not the arc the source describes, and a chord across the pole would be a
 * geometry we invented.
 */
export function toPath(coordinates: number[][], size = 1000, close = false): string {
  const densified = densify(coordinates);
  const commands = densified.map(([lon, lat], index) => {
    const { x, y } = projectPolar(lon, lat, size);
    return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
  });
  return commands.join(' ') + (close ? ' Z' : '');
}

/** Insert intermediate vertices so no segment spans more than 5 degrees of longitude. */
export function densify(coordinates: number[][], maxStep = 5): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < coordinates.length; i += 1) {
    const [lon, lat] = coordinates[i];
    out.push([lon, lat]);
    const next = coordinates[i + 1];
    if (!next) continue;
    const [nextLon, nextLat] = next;
    const steps = Math.ceil(Math.abs(nextLon - lon) / maxStep);
    for (let s = 1; s < steps; s += 1) {
      const t = s / steps;
      out.push([lon + (nextLon - lon) * t, lat + (nextLat - lat) * t]);
    }
  }
  return out;
}

export type TransitionStepId = 'inherited' | 'tracks' | 'withdrawal' | 'bounded';

export interface TransitionStep {
  id: TransitionStepId;
  ordinal: number;
  title: string;
  /** The argument of this step, as a reader would say it aloud. */
  caption: string;
  /** Record ids visible at this step. */
  shows: string[];
  /** Record ids drawn as withdrawn: still present, visibly no longer asserted. */
  withdraws: string[];
}

/**
 * The four steps, and what each one is allowed to say.
 *
 * The wording is part of the contract. Step four is the one that has to resist
 * a compression into "Cook disproved Terra Australis", and it is tested for
 * exactly that.
 */
export function transitionSteps(): TransitionStep[] {
  const envelope = 'ant-ftr-terra-australis-conjectured';
  const track = 'ant-trk-cook-resolution';
  const limit = 'ant-ftr-cook-southern-limit';
  return [
    {
      id: 'inherited',
      ordinal: 1,
      title: 'What the maps showed',
      caption:
        'For two centuries European maps carried a southern continent. It was drawn from reasoning and from other maps, not from anyone who had seen it.',
      shows: [envelope],
      withdraws: [],
    },
    {
      id: 'tracks',
      ordinal: 2,
      title: 'Where the ships went',
      caption:
        'Between 1772 and 1775 the Resolution crossed the Antarctic Circle and worked round the high southern latitudes, keeping a record of where it had been.',
      shows: [envelope, track],
      withdraws: [],
    },
    {
      id: 'withdrawal',
      ordinal: 3,
      title: 'What the track took away',
      caption:
        'Wherever the ships sailed, the drawn continent could not be. The land is not erased here: it is shown withdrawn, because a coastline that no longer has anything behind it is still a thing somebody once published.',
      shows: [track],
      withdraws: [envelope],
    },
    {
      id: 'bounded',
      ordinal: 4,
      title: 'What was left',
      caption:
        'A blank, and a boundary around it. This is not a proof that no southern land existed: land was sighted within fifty years. It is the removal of the temperate, reachable continent the maps had drawn, and the replacement of a guess with a limit. The blank is the knowledge.',
      shows: [track, limit],
      withdraws: [envelope],
    },
  ];
}

export interface TransitionRecord {
  record: AntarcticRecord;
  path: string;
  isPoint: boolean;
}

/**
 * The records the interaction draws, projected once at build time.
 *
 * Throws rather than skipping if one is missing. A step that silently renders
 * nothing would leave the argument looking complete with a piece of it absent,
 * which is worse than a build failure.
 */
export function transitionRecords(size = 1000): Map<string, TransitionRecord> {
  const wanted = new Set(transitionSteps().flatMap((step) => [...step.shows, ...step.withdraws]));
  const byId = new Map(getAntarcticRecords().map((record) => [record.id, record]));
  const out = new Map<string, TransitionRecord>();

  for (const id of wanted) {
    const record = byId.get(id);
    if (!record)
      throw new Error(`Antarctic transition needs record "${id}", which is not compiled`);
    const geometry = record.geometry as { type: string; coordinates: unknown } | null;
    if (!geometry) throw new Error(`Antarctic transition record "${id}" has no geometry`);

    if (geometry.type === 'Point') {
      const [lon, lat] = geometry.coordinates as number[];
      const { x, y } = projectPolar(lon, lat, size);
      out.set(id, { record, path: `M${x} ${y}`, isPoint: true });
    } else if (geometry.type === 'LineString') {
      out.set(id, {
        record,
        path: toPath(geometry.coordinates as number[][], size),
        isPoint: false,
      });
    } else if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates as number[][][];
      out.set(id, {
        record,
        path: rings.map((ring) => toPath(ring, size, true)).join(' '),
        isPoint: false,
      });
    } else {
      throw new Error(`Antarctic transition cannot draw geometry type "${geometry.type}"`);
    }
  }
  return out;
}

/**
 * The static transcript. Every interactive owes one, and this is also what a
 * reader gets with no JavaScript, on a printed page, or through a screen reader
 * that would rather read a list than operate a stepper.
 */
export function transitionTranscript(): { step: string; caption: string; showing: string[] }[] {
  const byId = new Map(getAntarcticRecords().map((record) => [record.id, record]));
  const title = (id: string) => byId.get(id)?.title ?? id;
  return transitionSteps().map((step) => ({
    step: `${step.ordinal}. ${step.title}`,
    caption: step.caption,
    showing: [...step.shows.map(title), ...step.withdraws.map((id) => `${title(id)} (withdrawn)`)],
  }));
}
