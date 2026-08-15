import { useAuth } from "@/context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import {
  createMobileSocket,
  requestMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalyticsErrors,
  type MobileCrimeAnalytics,
} from "@/api";
import { HeatmapMap } from "@/components/maps/heatmap-map";
import type { HeatmapIncidentPoint } from "@/constants/heatmap-data";
import { requestLocationPermission } from "@/services/location";

const MOBILE_ANALYTICS_REFRESH_MS = 2 * 60 * 60 * 1000;

function toHeatmapIncidents(
  analytics: MobileCrimeAnalytics | null,
): HeatmapIncidentPoint[] {
  if (!analytics) {
    return [];
  }

  return analytics.localCrimePoints.map((point, index) => {
    const firstIncidentId = point.incidentIds[0];
    const id = firstIncidentId
      ? `local-crime-${firstIncidentId}`
      : `local-crime-${point.latitude}-${point.longitude}-${index}`;

    return {
      id,
      latitude: point.latitude,
      longitude: point.longitude,
      reportedCases: point.count,
    };
  });
}

export default function HeatmapScreen() {
  const { token } = useAuth();
  const [heatmapIncidents, setHeatmapIncidents] = useState<
    HeatmapIncidentPoint[]
  >([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let refreshInterval: ReturnType<typeof setInterval> | null = null;

      if (!token) {
        setHeatmapIncidents([]);
        return () => {
          isActive = false;
        };
      }

      const socket = createMobileSocket(token);

      function applyAnalytics(analytics: MobileCrimeAnalytics) {
        if (!isActive) {
          return;
        }
        setHeatmapIncidents(toHeatmapIncidents(analytics));
      }

      async function requestAnalyticsForCurrentLocation() {
        try {
          const result = await requestLocationPermission();

          if (!isActive || result.status !== "granted") {
            return;
          }

          const analytics = await requestMobileCrimeAnalytics(
            socket,
            result.location.coords.latitude,
            result.location.coords.longitude,
          );

          applyAnalytics(analytics);
        } catch (err) {
          if (!isActive) {
            return;
          }
          console.error("Failed to load heatmap analytics:", err);
        }
      }

      const unsubscribeAnalytics = subscribeToMobileCrimeAnalytics(
        socket,
        applyAnalytics,
      );
      const unsubscribeErrors = subscribeToMobileCrimeAnalyticsErrors(
        socket,
        (error) => {
          if (isActive) {
            console.error("Heatmap analytics error:", error);
          }
        },
      );

      socket.on("connect", requestAnalyticsForCurrentLocation);
      socket.connect();
      refreshInterval = setInterval(
        requestAnalyticsForCurrentLocation,
        MOBILE_ANALYTICS_REFRESH_MS,
      );

      return () => {
        isActive = false;
        if (refreshInterval) {
          clearInterval(refreshInterval);
        }
        socket.off("connect", requestAnalyticsForCurrentLocation);
        unsubscribeAnalytics();
        unsubscribeErrors();
        socket.disconnect();
      };
    }, [token]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeatmapMap
        incidents={heatmapIncidents}
        interactive={true}
        showLocationStatus={false}
        showUserLocation={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
