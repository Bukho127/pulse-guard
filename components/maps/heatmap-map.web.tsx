import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type View as ViewType } from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { ThemedText } from '@/components/themed-text';
import { requestLocationPermission } from '@/services/location';

const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN ?? '';
const DEFAULT_CENTER: [number, number] = [18.4241, -33.9249];

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

export type HeatmapIncidentPoint = {
  id: string;
  latitude: number;
  longitude: number;
  weight?: number;
};

type HeatmapMapProps = {
  incidents?: HeatmapIncidentPoint[];
};

function toFeatureCollection(incidents: HeatmapIncidentPoint[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: incidents.map((incident) => ({
      type: 'Feature',
      id: incident.id,
      properties: {
        weight: incident.weight ?? 1,
      },
      geometry: {
        type: 'Point',
        coordinates: [incident.longitude, incident.latitude],
      },
    })),
  };
}

export function HeatmapMap({ incidents = [] }: HeatmapMapProps) {
  const mapContainerRef = useRef<ViewType | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [centerCoordinate, setCenterCoordinate] = useState<[number, number]>(DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(true);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const incidentShape = useMemo(() => toFeatureCollection(incidents), [incidents]);
  const hasIncidents = incidents.length > 0;

  useEffect(() => {
    const loadLocation = async () => {
      const result = await requestLocationPermission();

      if (result.status === 'granted') {
        const nextCenter: [number, number] = [
          result.location.coords.longitude,
          result.location.coords.latitude,
        ];

        setCenterCoordinate(nextCenter);
        mapRef.current?.flyTo({ center: nextCenter, zoom: 12, essential: true });
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
    if (!MAPBOX_ACCESS_TOKEN || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current as unknown as HTMLElement,
      center: centerCoordinate,
      zoom: 12,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    map.on('load', () => {
      map.addSource('incident-heatmap-source', {
        type: 'geojson',
        data: incidentShape,
      });

      map.addLayer({
        id: 'incident-heatmap-layer',
        type: 'heatmap',
        source: 'incident-heatmap-source',
        paint: {
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(87, 190, 71, 0)',
            0.35,
            '#C7F000',
            0.65,
            '#F8C034',
            1,
            '#C22C2A',
          ],
          'heatmap-intensity': 1.4,
          'heatmap-opacity': hasIncidents ? 0.82 : 0,
          'heatmap-radius': 28,
          'heatmap-weight': ['get', 'weight'],
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [centerCoordinate, hasIncidents, incidentShape]);

  useEffect(() => {
    const source = mapRef.current?.getSource('incident-heatmap-source');

    if (source && 'setData' in source) {
      source.setData(incidentShape);
    }

    if (mapRef.current?.getLayer('incident-heatmap-layer')) {
      mapRef.current.setPaintProperty(
        'incident-heatmap-layer',
        'heatmap-opacity',
        hasIncidents ? 0.82 : 0
      );
    }
  }, [hasIncidents, incidentShape]);

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
      <View ref={mapContainerRef} style={styles.webMap} />

      {isLocating || locationStatus ? (
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
  webMap: {
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
