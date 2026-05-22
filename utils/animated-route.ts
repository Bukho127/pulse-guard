import along from '@turf/along';
import { lineString } from '@turf/helpers';
import length from '@turf/length';

import type { RouteCoordinate } from '@/constants/route-data';

export function buildAnimatedRouteCoordinates(
  coordinates: RouteCoordinate[],
  progress: number
): RouteCoordinate[] {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const routeLine = lineString(coordinates);
  const routeLength = length(routeLine, { units: 'kilometers' });
  const visibleDistance = routeLength * Math.max(0, Math.min(progress, 1));
  const steps = Math.max(2, Math.ceil(coordinates.length * 5));
  const animatedCoordinates: RouteCoordinate[] = [coordinates[0]];

  for (let step = 1; step <= steps; step += 1) {
    const stepDistance = Math.min(visibleDistance, (visibleDistance / steps) * step);
    const point = along(routeLine, stepDistance, { units: 'kilometers' });

    animatedCoordinates.push(point.geometry.coordinates as RouteCoordinate);
  }

  return animatedCoordinates;
}
