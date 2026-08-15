import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Fragment, useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createMobileSocket,
  fetchMyIncidents,
  requestMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalytics,
  subscribeToMobileCrimeAnalyticsErrors,
  type Incident,
  type LocalCrimePoint,
  type MobileCrimeAnalytics,
} from "@/api";
import { HomeHeader } from "@/components/home/home-header";
import { ThemedText } from "@/components/themed-text";
import type { HeatmapIncidentPoint } from "@/constants/heatmap-data";
import {
  GeofenceHotspot,
  startHotspotGeofencing,
  stopHotspotGeofencing,
} from "@/services/geofencing";
import { requestLocationPermission } from "@/services/location";
import { HeatmapMap } from "../../components/maps/heatmap-map";

const MOBILE_ANALYTICS_REFRESH_MS = 2 * 60 * 60 * 1000;

type ReportProgressState = "idle" | "sent" | "acknowledged";
type StepState = "complete" | "pending";

interface IncidentStep {
  key: string;
  label: string;
  subLabel: string;
  state: StepState;
}

// Rough distance in meters between two latitude/longitude points using the Haversine formula.
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getIncidentTimestamp(incident: Incident) {
  const timestamp =
    incident.createdAt ||
    incident.created_at ||
    incident.reportedAt ||
    incident.reported_at ||
    incident.updatedAt ||
    incident.updated_at ||
    incident.timestamp;

  if (typeof timestamp !== "string" && typeof timestamp !== "number") {
    return 0;
  }

  const parsedTimestamp = new Date(timestamp).getTime();
  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
}

function getLatestIncident(incidents: Incident[]) {
  return [...incidents].sort(
    (first, second) =>
      getIncidentTimestamp(second) - getIncidentTimestamp(first),
  )[0];
}

function getReportProgressState(
  incident: Incident | null,
): ReportProgressState {
  if (!incident) {
    return "idle";
  }

  const status = String(
    incident.status ?? incident.state ?? incident.incidentStatus ?? "",
  ).toLowerCase();

  if (status.includes("acknowledged")) {
    return "acknowledged";
  }

  return "sent";
}

function formatUploadedTime(incident: Incident | null): string | null {
  if (!incident) {
    return null;
  }

  const timestamp = getIncidentTimestamp(incident);
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestamp));
}

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

// Builds the list of hotspots to geofence, sorted nearest-first, since
// iOS caps simultaneously monitored regions at 20. This function
// truncates to the nearest N internally. this will we help full when we have a large number of hotspots in the future.
function buildGeofenceHotspots(
  analytics: MobileCrimeAnalytics,
  userCoords: { latitude: number; longitude: number },
): GeofenceHotspot[] {
  return analytics.localCrimePoints
    .map((point, index) => ({
      id: getHeatmapPointId(point, index),
      latitude: point.latitude,
      longitude: point.longitude,
      reportedCases: point.count,
      distance: distanceMeters(
        userCoords.latitude,
        userCoords.longitude,
        point.latitude,
        point.longitude,
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ distance, ...rest }) => rest);
}

function IncidentStatusStepper({
  uploadedAt,
  isSent,
  isAcknowledged,
}: {
  uploadedAt: string | null;
  isSent: boolean;
  isAcknowledged: boolean;
}) {
  const steps: IncidentStep[] = [
    {
      key: "uploaded",
      label: "Uploaded",
      subLabel: uploadedAt ?? "Pending",
      state: uploadedAt ? "complete" : "pending",
    },
    {
      key: "sent",
      label: "Sent",
      subLabel: isSent ? "Sent" : "Pending",
      state: isSent ? "complete" : "pending",
    },
    {
      key: "acknowledged",
      label: "Acknow",
      subLabel: isAcknowledged ? "Acknowledged" : "Pending",
      state: isAcknowledged ? "complete" : "pending",
    },
  ];

  return (
    <View style={styles.stepper}>
      <View style={styles.stepperNodeRow}>
        {steps.map((step, index) => (
          <Fragment key={step.key}>
            <View
              style={[
                styles.stepNode,
                step.state === "complete" && styles.stepNodeActive,
              ]}
            >
              <Ionicons
                name="checkmark-sharp"
                size={17}
                color={step.state === "complete" ? "#57BE47" : "#B8B8B8"}
              />
            </View>

            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  steps[index].state === "complete" &&
                    styles.stepConnectorActive,
                ]}
              />
            )}
          </Fragment>
        ))}
      </View>

      <View style={styles.stepperLabelRow}>
        {steps.map((step) => (
          <View key={step.key} style={styles.stepLabelGroup}>
            <ThemedText style={styles.stepLabel}>{step.label}</ThemedText>
            <ThemedText style={styles.stepSubLabel}>{step.subLabel}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [latestIncident, setLatestIncident] = useState<Incident | null>(null);
  const [isLoadingReportStatus, setIsLoadingReportStatus] = useState(false);
  const [mobileAnalytics, setMobileAnalytics] =
    useState<MobileCrimeAnalytics | null>(null);
  const [heatmapIncidents, setHeatmapIncidents] = useState<
    HeatmapIncidentPoint[]
  >([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadReportStatus() {
        setIsLoadingReportStatus(true);

        if (!token) {
          if (isActive) {
            setLatestIncident(null);
            setIsLoadingReportStatus(false);
          }
          return;
        }

        try {
          const response = await fetchMyIncidents(token, 1, 10);

          if (isActive) {
            setLatestIncident(getLatestIncident(response.incidents) ?? null);
          }
        } catch {
          if (isActive) {
            setLatestIncident(null);
          }
        } finally {
          if (isActive) {
            setIsLoadingReportStatus(false);
          }
        }
      }

      void loadReportStatus();

      return () => {
        isActive = false;
      };
    }, [token]),
  );

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

      function applyAnalytics(
        analytics: MobileCrimeAnalytics,
        userCoords?: { latitude: number; longitude: number },
      ) {
        if (!isActive) {
          return;
        }

        setMobileAnalytics(analytics);
        setHeatmapIncidents(toHeatmapIncidents(analytics));
        setHeatmapError(null);
        setIsLoadingHeatmap(false);

        // Register geofences around the nearest hotspots so the OS can
        if (userCoords) {
          const geofenceHotspots = buildGeofenceHotspots(analytics, userCoords);
          void startHotspotGeofencing(geofenceHotspots);
        }
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

          applyAnalytics(analytics, {
            latitude: result.location.coords.latitude,
            longitude: result.location.coords.longitude,
          });
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
        (analytics) => applyAnalytics(analytics),
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
        void stopHotspotGeofencing();
      };
    }, [token]),
  );

  const { totalReportedIncidents, highestReportedCases, riskLabel } =
    useMemo(() => {
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

  const reportProgressState = getReportProgressState(latestIncident);
  const isReportSent =
    reportProgressState === "sent" || reportProgressState === "acknowledged";
  const isReportAcknowledged = reportProgressState === "acknowledged";
  const uploadedAt = formatUploadedTime(latestIncident);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <HomeHeader />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryPanel}>
            <View style={styles.summaryHeader}>
              <View>
                <ThemedText style={styles.sectionEyebrow}>
                  Community safety
                </ThemedText>
                <ThemedText style={styles.summaryTitle}>
                  Nearby report activity
                </ThemedText>
              </View>

              <View style={styles.riskBadge}>
                <ThemedText style={styles.riskText}>{riskLabel}</ThemedText>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricValue}>
                  {isLoadingHeatmap ? "-" : totalReportedIncidents}
                </ThemedText>
                <ThemedText style={styles.metricLabel}>reports</ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricValue}>
                  {isLoadingHeatmap ? "-" : heatmapIncidents.length}
                </ThemedText>
                <ThemedText style={styles.metricLabel}>hotspots</ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricValue}>
                  {isLoadingHeatmap ? "-" : highestReportedCases}
                </ThemedText>
                <ThemedText style={styles.metricLabel}>highest area</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.mapSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <ThemedText style={styles.sectionTitle}>
                  Live hotspot map
                </ThemedText>
                <ThemedText style={styles.sectionCopy}>
                  {heatmapError ??
                    "Local reports update automatically from your live location."}
                </ThemedText>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  router.push("/(tabs)/heatmap");
                }}
                style={({ pressed }) => [
                  styles.seeAllButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.seeAllText}>See all</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#202020" />
              </Pressable>
            </View>

            <View style={styles.mapPreview}>
              <HeatmapMap
                incidents={heatmapIncidents}
                interactive
                showLocationStatus={false}
                showUserLocation={false}
                zoomLevel={11.3}
              />
              <View style={styles.mapOverlay}>
                <ThemedText style={styles.mapOverlayText}>Cape Town</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.reportProgressSection}>
            <ThemedText style={styles.sectionTitle}>Incident status</ThemedText>
            <ThemedText style={styles.sectionCopy}>
              {isLoadingReportStatus
                ? "Checking your latest incident report."
                : isReportSent
                  ? "Your latest video report is being handled."
                  : "Record and send a video to start incident tracking."}
            </ThemedText>

            <View style={styles.stepperWrapper}>
              <IncidentStatusStepper
                uploadedAt={uploadedAt}
                isSent={isReportSent}
                isAcknowledged={isReportAcknowledged}
              />
            </View>
          </View>

          <View style={styles.tipPanel}>
            <View style={styles.tipIconShell}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#57BE47"
              />
            </View>
            <View style={styles.tipTextGroup}>
              <ThemedText style={styles.tipTitle}>Safety reminder</ThemedText>
              <ThemedText style={styles.tipCopy}>
                Keep your distance and record only when it is safe to do so.
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  content: {
    paddingTop: 26,
    paddingBottom: 96,
  },
  summaryPanel: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionEyebrow: {
    color: "#57BE47",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_500Medium",
  },
  summaryTitle: {
    marginTop: 3,
    color: "#202020",
    fontSize: 18,
    lineHeight: 23,
    fontFamily: "Geist_500Medium",
  },
  riskBadge: {
    minWidth: 82,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FFD166",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: "#FFF8E2",
  },
  riskText: {
    color: "#B97900",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_500Medium",
  },
  metricGrid: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
  },
  metricItem: {
    flex: 1,
    minHeight: 74,
    borderRadius: 7,
    padding: 10,
    justifyContent: "center",
    backgroundColor: "#F7F7F7",
  },
  metricValue: {
    color: "#111111",
    fontSize: 22,
    lineHeight: 27,
    fontFamily: "Geist_500Medium",
  },
  metricLabel: {
    marginTop: 3,
    color: "#77777B",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_400Regular",
  },
  mapSection: {
    marginTop: 24,
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: "#111111",
    fontSize: 17,
    lineHeight: 22,
    fontFamily: "Geist_500Medium",
  },
  sectionCopy: {
    marginTop: 3,
    color: "#77777B",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_400Regular",
  },
  seeAllButton: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  seeAllText: {
    color: "#202020",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_500Medium",
  },
  mapPreview: {
    height: 188,
    marginTop: 12,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  mapOverlay: {
    position: "absolute",
    left: 12,
    bottom: 12,
    minHeight: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 11,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  mapOverlayText: {
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "Geist_500Medium",
  },
  reportProgressSection: {
    marginTop: 24,
  },
  stepperWrapper: {
    marginTop: 18,
  },
  stepper: {
    width: "100%",
  },
  stepperNodeRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: "12%",
  },
  stepNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFEF",
    borderWidth: 1,
    borderColor: "#E1E1E1",
  },
  stepNodeActive: {
    backgroundColor: "#F4FBF2",
    borderColor: "#57BE47",
  },
  stepConnector: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#E1E1E1",
  },
  stepConnectorActive: {
    backgroundColor: "#57BE47",
  },
  stepperLabelRow: {
    flexDirection: "row",
    width: "100%",
  },
  stepLabelGroup: {
    flex: 1,
    alignItems: "center",
  },
  stepLabel: {
    marginTop: 8,
    color: "#202020",
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "Geist_500Medium",
    textAlign: "center",
  },
  stepSubLabel: {
    marginTop: 2,
    color: "#77777B",
    fontSize: 11,
    lineHeight: 15,
    fontFamily: "Geist_400Regular",
    textAlign: "center",
  },
  tipPanel: {
    marginTop: 24,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F7FAF6",
    borderWidth: 1,
    borderColor: "#E1F1DE",
  },
  tipIconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  tipTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  tipTitle: {
    color: "#202020",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "Geist_500Medium",
  },
  tipCopy: {
    marginTop: 3,
    color: "#666666",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "Geist_400Regular",
  },
  pressed: {
    opacity: 0.78,
  },
});
