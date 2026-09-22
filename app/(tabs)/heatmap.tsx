import { useAuth } from "@/context/AuthContext";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import {
  createMobileSocket,
  requestMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalyticsErrors,
  type LocalCrimePoint,
  type MobileCrimeAnalytics,
  type MobileCrimeHotspot,
} from "@/api";
import { HeatmapMap } from "@/components/maps/heatmap-map";
import type { HeatmapIncidentPoint } from "@/constants/heatmap-data";
import { requestLocationPermission } from "@/services/location";

const MOBILE_ANALYTICS_REFRESH_MS = 2 * 60 * 60 * 1000;
const DEBUG_HEATMAP = __DEV__;

function getLocalCrimePointId(point: LocalCrimePoint, index: number): string {
  const firstIncidentId = point.incidentIds[0];

  return firstIncidentId
    ? `local-crime-${firstIncidentId}`
    : `local-crime-${point.latitude}-${point.longitude}-${index}`;
}

function getHeatmapPointId(hotspot: MobileCrimeHotspot, index: number): string {
  const incidentId = hotspot.incident_id;

  return incidentId
    ? `local-crime-${incidentId}`
    : `local-crime-${hotspot.latitude}-${hotspot.longitude}-${index}`;
}

function toHeatmapIncidents(
  analytics: MobileCrimeAnalytics | null,
): HeatmapIncidentPoint[] {
  if (!analytics) {
    return [];
  }

  if (analytics.localCrimePoints?.length) {
    return analytics.localCrimePoints
      .map((point, index) => ({
        id: getLocalCrimePointId(point, index),
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        reportedCases: Number(point.count),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.latitude) &&
          Number.isFinite(point.longitude) &&
          Number.isFinite(point.reportedCases),
      );
  }

  return (analytics.hotspots ?? [])
    .map((hotspot, index) => ({
      id: getHeatmapPointId(hotspot, index),
      latitude: Number(hotspot.latitude),
      longitude: Number(hotspot.longitude),
      reportedCases: 1,
    }))
    .filter(
      (hotspot) =>
        Number.isFinite(hotspot.latitude) &&
        Number.isFinite(hotspot.longitude),
    );
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

        const incidents = toHeatmapIncidents(analytics);

        if (DEBUG_HEATMAP) {
          console.log("Heatmap analytics received:", {
            convertedIncidents: incidents.length,
            firstConvertedIncident: incidents[0],
            firstLocalCrimePoint: analytics.localCrimePoints?.[0],
            firstHotspot: analytics.hotspots?.[0],
            hotspots: analytics.hotspots?.length ?? 0,
            localCrimePoints: analytics.localCrimePoints?.length ?? 0,
            riskRank: analytics.riskRank,
            totalIncidentCount: analytics.totalIncidentCount,
          });
        }

        setHeatmapIncidents(incidents);
      }

      async function requestAnalyticsForCurrentLocation() {
        try {
          const result = await requestLocationPermission();

          if (!isActive || result.status !== "granted") {
            if (DEBUG_HEATMAP) {
              console.log("Heatmap location blocked:", {
                isActive,
                message: "message" in result ? result.message : undefined,
                status: result.status,
              });
            }
            return;
          }

          if (DEBUG_HEATMAP) {
            console.log("Heatmap analytics request:", {
              latitude: result.location.coords.latitude,
              longitude: result.location.coords.longitude,
            });
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

      socket.on("connect_error", (error) => {
        if (DEBUG_HEATMAP) {
          console.error("Heatmap socket connect error:", error.message);
        }
      });
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
        socket.off("connect_error");
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
