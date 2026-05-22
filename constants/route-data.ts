export type RouteCoordinate = [number, number];

export const DEMO_ROUTE_COORDINATES: RouteCoordinate[] = [
  [18.41492, -33.91882],
  [18.4171, -33.92028],
  [18.42052, -33.92215],
  [18.42418, -33.92492],
  [18.42824, -33.92628],
  [18.43318, -33.92726],
  [18.4397, -33.9286],
  [18.44586, -33.92998],
  [18.45212, -33.93222],
  [18.45868, -33.93496],
  [18.46444, -33.93702],
];

export function createRouteFeature(coordinates: RouteCoordinate[]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
}

export function createRoutePointFeature(
  coordinate: RouteCoordinate,
  kind: 'origin' | 'destination'
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    properties: { kind },
    geometry: {
      type: 'Point',
      coordinates: coordinate,
    },
  };
}
