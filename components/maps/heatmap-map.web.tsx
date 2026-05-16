import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type View as ViewType } from 'react-native';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { ThemedText } from '@/components/themed-text';
import type { HeatmapIncidentPoint } from '@/constants/heatmap-data';
import { requestLocationPermission } from '@/services/location';

const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? process.env.MAPBOX_ACCESS_TOKEN ?? '';
const DEFAULT_CENTER: [number, number] = [18.4241, -33.9249];

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

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
        mapRef.current?.flyTo({ center: nextCenter, zoom: zoomLevel, essential: true });
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
  }, [zoomLevel]);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current as unknown as HTMLElement,
      center: centerCoordinate,
      zoom: zoomLevel,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      attributionControl: false,
      interactive,
    });

    mapRef.current = map;

    if (interactive) {
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
    }

    if (showUserLocation) {
      map.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true,
        }),
        'top-right'
      );
    }

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
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 1.1, 13, 2.8],
          'heatmap-opacity': hasIncidents
            ? ['interpolate', ['linear'], ['zoom'], 11, 0.9, 15, 0.55]
            : 0,
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 26, 13, 54, 15, 72],
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 6, 0.25, 15, 1],
        },
      });

      map.addLayer({
        id: 'incident-hotspot-layer',
        type: 'circle',
        source: 'incident-heatmap-source',
        paint: {
          'circle-blur': 0.25,
          'circle-color': [
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
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 14, 0.72],
          'circle-radius': ['interpolate', ['linear'], ['get', 'weight'], 6, 5, 15, 13],
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 14, 0.8],
          'circle-stroke-width': 1,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [centerCoordinate, hasIncidents, incidentShape, interactive, showUserLocation, zoomLevel]);

  useEffect(() => {
    const source = mapRef.current?.getSource('incident-heatmap-source');

    if (source && 'setData' in source) {
      source.setData(incidentShape);
    }

    if (mapRef.current?.getLayer('incident-heatmap-layer')) {
      mapRef.current.setPaintProperty(
        'incident-heatmap-layer',
        'heatmap-opacity',
        hasIncidents ? ['interpolate', ['linear'], ['zoom'], 11, 0.9, 15, 0.55] : 0
      );
    }

    if (mapRef.current?.getLayer('incident-hotspot-layer')) {
      mapRef.current.setPaintProperty(
        'incident-hotspot-layer',
        'circle-opacity',
        hasIncidents ? ['interpolate', ['linear'], ['zoom'], 11, 0, 14, 0.72] : 0
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
