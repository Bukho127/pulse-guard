import Mapbox, {
  Camera,
  CircleLayer,
  HeatmapLayer,
  LineLayer,
  MapView,
  ShapeSource,
  UserLocation,
} from '@rnmapbox/maps';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { HeatmapIncidentPoint } from '@/constants/heatmap-data';
import {
  createRouteFeature,
  createRoutePointFeature,
  DEMO_ROUTE_COORDINATES,
  type RouteCoordinate,
} from '@/constants/route-data';
import { requestLocationPermission } from '@/services/location';
import { buildAnimatedRouteCoordinates } from '@/utils/animated-route';

const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN ?? '';
const DEFAULT_CENTER: [number, number] = [18.4241, -33.9249];

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

type HeatmapMapProps = {
  incidents?: HeatmapIncidentPoint[];
  routeCoordinates?: RouteCoordinate[];
  routeAnimationDuration?: number;
  showRoute?: boolean;
  interactive?: boolean;
  showLocationStatus?: boolean;
  showUserLocation?: boolean;
  zoomLevel?: number;
};

function toFeatureCollection(incidents: HeatmapIncidentPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: incidents.map((incident) => ({
      type: 'Feature',
      id: incident.id,
      properties: {
        weight: incident.reportedCases,
      },
      geometry: {
        type: 'Point',
        coordinates: [incident.longitude, incident.latitude],
      },
    })),
  };
}

export function HeatmapMap({
  incidents = [],
  routeCoordinates = DEMO_ROUTE_COORDINATES,
  routeAnimationDuration = 1900,
  showRoute = false,
  interactive = true,
  showLocationStatus = true,
  showUserLocation = true,
  zoomLevel = 12,
}: HeatmapMapProps) {
  const frameRef = useRef<number | null>(null);
  const [centerCoordinate, setCenterCoordinate] = useState<[number, number]>(DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [routeProgress, setRouteProgress] = useState(showRoute ? 0 : 1);

  const incidentShape = useMemo(() => toFeatureCollection(incidents), [incidents]);
  const hasIncidents = incidents.length > 0;
  const hasRoute = showRoute && routeCoordinates.length > 1;
  const animatedRouteCoordinates = useMemo(
    () => buildAnimatedRouteCoordinates(routeCoordinates, routeProgress),
    [routeCoordinates, routeProgress]
  );
  const routeShape = useMemo(
    () => createRouteFeature(animatedRouteCoordinates),
    [animatedRouteCoordinates]
  );
  const routeOriginShape = useMemo(
    () => createRoutePointFeature(routeCoordinates[0] ?? DEFAULT_CENTER, 'origin'),
    [routeCoordinates]
  );
  const routeDestinationShape = useMemo(
    () =>
      createRoutePointFeature(
        routeCoordinates[routeCoordinates.length - 1] ?? DEFAULT_CENTER,
        'destination'
      ),
    [routeCoordinates]
  );

  useEffect(() => {
    const loadLocation = async () => {
      const result = await requestLocationPermission();

      if (result.status === 'granted') {
        setCenterCoordinate([result.location.coords.longitude, result.location.coords.latitude]);
        setLocationStatus(null);
      } else if (result.status === 'services_disabled') {
        setLocationStatus('Turn on location services to center the map.');
      } else if (result.status === 'denied') {
        setLocationStatus('Allow location access to center the map.');
      } else {
        setLocationStatus(result.message);
      }

      setIsLocating(false);
    };

    void loadLocation();
  }, []);

  useEffect(() => {
    if (!hasRoute) {
      return;
    }

    const startedAt = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(elapsed / routeAnimationDuration, 1);

      setRouteProgress(nextProgress);

      if (nextProgress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    setRouteProgress(0);
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [hasRoute, routeAnimationDuration, routeCoordinates]);

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={styles.emptyState}>
        <ThemedText style={styles.emptyTitle}>Mapbox token missing</ThemedText>
        <ThemedText style={styles.emptyText}>
          Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your environment to render the map.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        attributionEnabled={interactive}
        compassEnabled={interactive}
        logoEnabled={false}
        pitchEnabled
        rotateEnabled={interactive}
        scaleBarEnabled={false}
        scrollEnabled={interactive}
        style={styles.map}
        styleURL={Mapbox.StyleURL.Outdoors}
        zoomEnabled={interactive}>
        <Camera
          animationDuration={900}
          animationMode="flyTo"
          centerCoordinate={centerCoordinate}
          zoomLevel={zoomLevel}
        />
        {showUserLocation ? <UserLocation visible /> : null}

        {hasRoute ? (
          <>
            <ShapeSource id="animated-route-source" shape={routeShape}>
              <LineLayer
                id="animated-route-glow"
                style={{
                  lineCap: 'round',
                  lineColor: 'rgba(87, 190, 71, 0.24)',
                  lineJoin: 'round',
                  lineWidth: 12,
                }}
              />
              <LineLayer
                id="animated-route-line"
                style={{
                  lineCap: 'round',
                  lineColor: '#57BE47',
                  lineJoin: 'round',
                  lineWidth: 5,
                }}
              />
            </ShapeSource>

            <ShapeSource id="route-origin-source" shape={routeOriginShape}>
              <CircleLayer
                id="route-origin-dot"
                style={{
                  circleColor: '#FFFFFF',
                  circleRadius: 6,
                  circleStrokeColor: '#202020',
                  circleStrokeWidth: 3,
                }}
              />
            </ShapeSource>

            <ShapeSource id="route-destination-source" shape={routeDestinationShape}>
              <CircleLayer
                id="route-destination-dot"
                style={{
                  circleColor: '#57BE47',
                  circleRadius: 7,
                  circleStrokeColor: '#FFFFFF',
                  circleStrokeWidth: 3,
                }}
              />
            </ShapeSource>
          </>
        ) : null}

        {hasIncidents ? (
          <ShapeSource id="incident-heatmap-source" shape={incidentShape}>
            <HeatmapLayer
              id="incident-heatmap-layer"
              sourceID="incident-heatmap-source"
              style={{
                heatmapColor: [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0,
                  'rgba(87, 190, 71, 0)',
                  0.18,
                  'rgba(87, 190, 71, 0.55)',
                  0.38,
                  '#D9F45A',
                  0.58,
                  '#FFD166',
                  0.78,
                  '#F77F00',
                  1,
                  '#C22C2A',
                ],
                heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 9, 1.1, 13, 2.8],
                heatmapOpacity: ['interpolate', ['linear'], ['zoom'], 11, 0.9, 15, 0.55],
                heatmapRadius: ['interpolate', ['linear'], ['zoom'], 9, 26, 13, 54, 15, 72],
                heatmapWeight: [
                  'interpolate',
                  ['linear'],
                  ['get', 'weight'],
                  6,
                  0.25,
                  15,
                  1,
                ],
              }}
            />
            <CircleLayer
              id="incident-hotspot-layer"
              sourceID="incident-heatmap-source"
              style={{
                circleBlur: 0.25,
                circleColor: [
                  'interpolate',
                  ['linear'],
                  ['get', 'weight'],
                  6,
                  '#57BE47',
                  10,
                  '#FFD166',
                  15,
                  '#C22C2A',
                ],
                circleOpacity: ['interpolate', ['linear'], ['zoom'], 11, 0, 14, 0.72],
                circleRadius: ['interpolate', ['linear'], ['get', 'weight'], 6, 5, 15, 13],
                circleStrokeColor: '#FFFFFF',
                circleStrokeOpacity: ['interpolate', ['linear'], ['zoom'], 11, 0, 14, 0.8],
                circleStrokeWidth: 1,
              }}
            />
          </ShapeSource>
        ) : null}
      </MapView>

      {showLocationStatus && (isLocating || locationStatus) ? (
        <View style={styles.statusPill}>
          {isLocating ? <ActivityIndicator color="#57BE47" size="small" /> : null}
          <ThemedText style={styles.statusText}>
            {isLocating ? 'Finding your location...' : locationStatus}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  map: {
    flex: 1,
  },
  statusPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  statusText: {
    flex: 1,
    color: '#202020',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Geist_400Regular',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: 'Geist_500Medium',
  },
  emptyText: {
    marginTop: 8,
    color: '#77777B',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Geist_400Regular',
  },
});
