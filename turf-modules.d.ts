declare module '@turf/along' {
  import type { Feature, LineString, Point } from 'geojson';

  export default function along(
    line: Feature<LineString> | LineString,
    distance: number,
    options?: { units?: string }
  ): Feature<Point>;
}

declare module '@turf/helpers' {
  import type { Feature, LineString, Position } from 'geojson';

  export function lineString(
    coordinates: Position[],
    properties?: Record<string, unknown>
  ): Feature<LineString>;
}

declare module '@turf/length' {
  import type { Feature, LineString } from 'geojson';

  export default function length(
    geojson: Feature<LineString> | LineString,
    options?: { units?: string }
  ): number;
}
