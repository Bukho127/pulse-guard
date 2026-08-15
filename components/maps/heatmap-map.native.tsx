import Mapbox, {
  Camera,
  CircleLayer,
  HeatmapLayer,
  MapView,
  ShapeSource,
  UserLocation,
} from '@rnmapbox/maps';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { HeatmapIncidentPoint } from '@/constants/heatmap-data';
import { requestLocationPermission } from '@/services/location';

const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN ?? '';
const DEFAULT_CENTER: [number, number] = [18.4241, -33.9249];

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

type HeatmapMapProps = {
  incidents?: HeatmapIncidentPoint[];
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
  interactive = true,
  showLocationStatus = true,
  showUserLocation = true,
  zoomLevel = 12,
}: HeatmapMapProps) {
  const [centerCoordinate, setCenterCoordinate] = useState<[number, number]>(DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const incidentShape = useMemo(() => toFeatureCollection(incidents), [incidents]);
  const hasIncidents = incidents.length > 0;

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
