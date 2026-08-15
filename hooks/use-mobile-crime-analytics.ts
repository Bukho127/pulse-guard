import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";

import {
  createMobileSocket,
  requestMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalyticsErrors,
  type LocalCrimePoint,
  type MobileCrimeAnalytics,
} from "@/api";
import type { HeatmapIncidentPoint } from "@/constants/heatmap-data";
import { useAuth } from "@/context/AuthContext";
import { requestLocationPermission } from "@/services/location";

const MOBILE_ANALYTICS_REFRESH_MS = 2 * 60 * 60 * 1000;

function getHeatmapPointId(point: LocalCrimePoint, index: number): string {
  const firstIncidentId = point.incidentIds[0];

  return firstIncidentId
    ? `local-crime-${firstIncidentId}`
    : `local-crime-${point.latitude}-${point.longitude}-${index}`;
}

function toHeatmapIncidents(
  analytics: MobileCrimeAnalytics | null,
): HeatmapIncidentPoint[] {
  if (!analytics) {
    return [];
  }

  return analytics.localCrimePoints.map((point, index) => ({
    id: getHeatmapPointId(point, index),
    latitude: point.latitude,
    longitude: point.longitude,
    reportedCases: point.count,
  }));
}

export function useMobileCrimeAnalytics() {
  const { token } = useAuth();
  const [mobileAnalytics, setMobileAnalytics] =
    useState<MobileCrimeAnalytics | null>(null);
  const [heatmapIncidents, setHeatmapIncidents] = useState<
    HeatmapIncidentPoint[]
  >([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let refreshInterval: ReturnType<typeof setInterval> | null = null;

      if (!token) {
        setMobileAnalytics(null);
        setHeatmapIncidents([]);
        setHeatmapError(null);
        setIsLoadingHeatmap(false);

        return () => {
          isActive = false;
        };
      }

      const socket = createMobileSocket(token);

      function applyAnalytics(analytics: MobileCrimeAnalytics) {
        if (!isActive) {
          return;
        }

        setMobileAnalytics(analytics);
        setHeatmapIncidents(toHeatmapIncidents(analytics));
        setHeatmapError(null);
        setIsLoadingHeatmap(false);
      }

      async function requestAnalyticsForCurrentLocation() {
        setIsLoadingHeatmap(true);

        try {
          const result = await requestLocationPermission();

          if (!isActive) {
            return;
          }

          if (result.status !== "granted") {
            setHeatmapError(
              result.status === "services_disabled"
                ? "Turn on location services to load local crime data."
                : "Allow location access to load local crime data.",
            );
            setIsLoadingHeatmap(false);
            return;
          }

          const analytics = await requestMobileCrimeAnalytics(
            socket,
            result.location.coords.latitude,
            result.location.coords.longitude,
          );

          applyAnalytics(analytics);
        } catch (error) {
          if (!isActive) {
            return;
          }

          setHeatmapError(
            error instanceof Error
              ? error.message
              : "Couldn't load local crime data.",
          );
          setIsLoadingHeatmap(false);
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
            setHeatmapError(error.message);
            setIsLoadingHeatmap(false);
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
    }, [refreshKey, token]),
  );

  const summary = useMemo(() => {
    if (!mobileAnalytics) {
      return {
        totalReportedIncidents: 0,
        highestReportedCases: 0,
        riskLabel: "Low Risk",
      };
    }

    const counts = heatmapIncidents.map((incident) => incident.reportedCases);

    return {
      totalReportedIncidents: mobileAnalytics.totalIncidentCount,
      highestReportedCases: counts.length > 0 ? Math.max(...counts) : 0,
      riskLabel: mobileAnalytics.riskRank,
    };
  }, [heatmapIncidents, mobileAnalytics]);

  const refreshHeatmap = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  return {
    heatmapError,
    heatmapIncidents,
    isLoadingHeatmap,
    mobileAnalytics,
    refreshHeatmap,
    ...summary,
  };
}
