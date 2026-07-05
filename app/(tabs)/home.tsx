import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchIncidents, type Incident } from '@/api';
import { HomeHeader } from '@/components/home/home-header';
import { ThemedText } from '@/components/themed-text';
import { DUMMY_HEATMAP_INCIDENTS, getVisibleHeatmapIncidents } from '@/constants/heatmap-data';
import { HeatmapMap } from '../../components/maps/heatmap-map';

const visibleHeatmapIncidents = getVisibleHeatmapIncidents(DUMMY_HEATMAP_INCIDENTS);
const totalReportedIncidents = DUMMY_HEATMAP_INCIDENTS.reduce(
  (total, incident) => total + incident.reportedCases,
  0
);
const highestReportedCases = Math.max(
  ...DUMMY_HEATMAP_INCIDENTS.map((incident) => incident.reportedCases)
);
const riskLabel = highestReportedCases >= 12 ? 'Medium risk' : 'Low risk';

type ReportProgressState = 'idle' | 'sent' | 'acknowledged';

function getIncidentTimestamp(incident: Incident) {
  const timestamp =
    incident.createdAt ||
    incident.created_at ||
    incident.reportedAt ||
    incident.reported_at ||
    incident.updatedAt ||
    incident.updated_at ||
    incident.timestamp;

  if (typeof timestamp !== 'string' && typeof timestamp !== 'number') {
    return 0;
  }

  const parsedTimestamp = new Date(timestamp).getTime();
  return Number.isNaN(parsedTimestamp) ? 0 : parsedTimestamp;
}

function getLatestIncident(incidents: Incident[]) {
  return [...incidents].sort((first, second) => getIncidentTimestamp(second) - getIncidentTimestamp(first))[0];
}

function getReportProgressState(incident: Incident | null): ReportProgressState {
  if (!incident) {
    return 'idle';
  }

  const status = String(incident.status ?? incident.state ?? incident.incidentStatus ?? '').toLowerCase();

  if (status.includes('acknowledged')) {
    return 'acknowledged';
  }

  return 'sent';
}

export default function HomeScreen() {
  const router = useRouter();
  const [latestIncident, setLatestIncident] = useState<Incident | null>(null);
  const [isLoadingReportStatus, setIsLoadingReportStatus] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadReportStatus() {
        setIsLoadingReportStatus(true);

        try {
          const response = await fetchIncidents('', 1, 10);

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
    }, []),
  );

  const reportProgressState = getReportProgressState(latestIncident);
  const isReportSent =
    reportProgressState === 'sent' || reportProgressState === 'acknowledged';
  const isReportAcknowledged = reportProgressState === 'acknowledged';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <HomeHeader />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryPanel}>
            <View style={styles.summaryHeader}>
              <View>
                <ThemedText style={styles.sectionEyebrow}>Community safety</ThemedText>
                <ThemedText style={styles.summaryTitle}>Nearby report activity</ThemedText>
              </View>

              <View style={styles.riskBadge}>
                <ThemedText style={styles.riskText}>{riskLabel}</ThemedText>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricValue}>{totalReportedIncidents}</ThemedText>
                <ThemedText style={styles.metricLabel}>reports</ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricValue}>{visibleHeatmapIncidents.length}</ThemedText>
                <ThemedText style={styles.metricLabel}>hotspots</ThemedText>
              </View>
              <View style={styles.metricItem}>
                <ThemedText style={styles.metricValue}>{highestReportedCases}</ThemedText>
                <ThemedText style={styles.metricLabel}>highest area</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.mapSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <ThemedText style={styles.sectionTitle}>Live hotspot map</ThemedText>
                <ThemedText style={styles.sectionCopy}>
                  Reports with more than 5 cases appear here.
                </ThemedText>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  router.push('/(tabs)/heatmap');
                }}
                style={({ pressed }) => [styles.seeAllButton, pressed && styles.pressed]}>
                <ThemedText style={styles.seeAllText}>See all</ThemedText>
                <Ionicons name="chevron-forward" size={14} color="#202020" />
              </Pressable>
            </View>

            <View style={styles.mapPreview}>
              <HeatmapMap
                incidents={visibleHeatmapIncidents}
                interactive
                showRoute
                showLocationStatus={false}
                showUserLocation={false}
                zoomLevel={11.3}
              />
              <View style={styles.mapOverlay}>
                <ThemedText style={styles.mapOverlayText}>Cape Town</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.tipPanel}>
            <View style={styles.tipIconShell}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#57BE47" />
            </View>
            <View style={styles.tipTextGroup}>
              <ThemedText style={styles.tipTitle}>Safety reminder</ThemedText>
              <ThemedText style={styles.tipCopy}>
                Keep your distance and record only when it is safe to do so.
              </ThemedText>
            </View>
          </View>

          <View style={[styles.reportProgressPanel, !isReportSent && styles.reportProgressPanelIdle]}>
            <View style={styles.reportProgressHeader}>
              <View style={styles.sectionHeaderText}>
                <ThemedText style={styles.sectionTitle}>Report status</ThemedText>
                <ThemedText style={styles.sectionCopy}>
                  {isLoadingReportStatus
                    ? 'Checking your latest incident report.'
                    : isReportSent
                    ? 'Your latest video report is being handled.'
                    : 'Record and send a video to start incident tracking.'}
                </ThemedText>
              </View>

              <View style={[styles.reportStatusBadge, isReportSent && styles.reportStatusBadgeActive]}>
                <ThemedText
                  style={[styles.reportStatusText, isReportSent && styles.reportStatusTextActive]}>
                  {isLoadingReportStatus
                    ? 'Checking'
                    : isReportAcknowledged
                    ? 'Acknowledged'
                    : isReportSent
                    ? 'Sent'
                    : 'Inactive'}
                </ThemedText>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressStep}>
                <View style={[styles.progressNode, isReportSent && styles.progressNodeActive]}>
                  <Ionicons
                    name={isReportSent ? 'checkmark' : 'arrow-up-outline'}
                    size={16}
                    color={isReportSent ? '#FFFFFF' : '#9A9A9A'}
                  />
                </View>
                <View style={styles.progressStepText}>
                  <ThemedText style={[styles.progressStepTitle, isReportSent && styles.progressStepTitleActive]}>
                    Video sent
                  </ThemedText>
                  <ThemedText style={styles.progressStepCopy}>
                    {isReportSent ? 'Evidence has been submitted.' : 'Waiting for upload.'}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.progressConnector, isReportAcknowledged && styles.progressConnectorActive]} />

              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressNode,
                    isReportAcknowledged && styles.progressNodeActive,
                  ]}>
                  <Ionicons
                    name={isReportAcknowledged ? 'checkmark' : 'shield-checkmark-outline'}
                    size={16}
                    color={isReportAcknowledged ? '#FFFFFF' : '#9A9A9A'}
                  />
                </View>
                <View style={styles.progressStepText}>
                  <ThemedText
                    style={[
                      styles.progressStepTitle,
                      isReportAcknowledged && styles.progressStepTitleActive,
                    ]}>
                    Acknowledged
                  </ThemedText>
                  <ThemedText style={styles.progressStepCopy}>
                    {isReportAcknowledged ? 'Authorities have acknowledged it.' : 'Pending response.'}
                  </ThemedText>
                </View>
              </View>
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
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  content: {
    paddingTop: 26,
    paddingBottom: 24,
  },
  summaryPanel: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionEyebrow: {
    color: '#57BE47',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_500Medium',
  },
  summaryTitle: {
    marginTop: 3,
    color: '#202020',
    fontSize: 18,
    lineHeight: 23,
    fontFamily: 'Geist_500Medium',
  },
  riskBadge: {
    minWidth: 82,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFD166',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#FFF8E2',
  },
  riskText: {
    color: '#B97900',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_500Medium',
  },
  metricGrid: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  metricItem: {
    flex: 1,
    minHeight: 74,
    borderRadius: 7,
    padding: 10,
    justifyContent: 'center',
    backgroundColor: '#F7F7F7',
  },
  metricValue: {
    color: '#111111',
    fontSize: 22,
    lineHeight: 27,
    fontFamily: 'Geist_500Medium',
  },
  metricLabel: {
    marginTop: 3,
    color: '#77777B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_400Regular',
  },
  mapSection: {
    marginTop: 24,
  },
  sectionHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: '#111111',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Geist_500Medium',
  },
  sectionCopy: {
    marginTop: 3,
    color: '#77777B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_400Regular',
  },
  seeAllButton: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  seeAllText: {
    color: '#202020',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_500Medium',
  },
  mapPreview: {
    height: 188,
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  mapOverlay: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    minHeight: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  mapOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_500Medium',
  },
  tipPanel: {
    marginTop: 24,
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F7FAF6',
    borderWidth: 1,
    borderColor: '#E1F1DE',
  },
  tipIconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  tipTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  tipTitle: {
    color: '#202020',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Geist_500Medium',
  },
  tipCopy: {
    marginTop: 3,
    color: '#666666',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Geist_400Regular',
  },
  reportProgressPanel: {
    marginTop: 24,
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1F1DE',
  },
  reportProgressPanelIdle: {
    borderColor: '#EEEEEE',
    backgroundColor: '#FAFAFA',
  },
  reportProgressHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportStatusBadge: {
    minWidth: 76,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  reportStatusBadgeActive: {
    backgroundColor: '#F7FAF6',
    borderColor: '#E1F1DE',
  },
  reportStatusText: {
    color: '#77777B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_500Medium',
  },
  reportStatusTextActive: {
    color: '#2D7F24',
  },
  progressTrack: {
    marginTop: 18,
    gap: 12,
  },
  progressStep: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEFEF',
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  progressNodeActive: {
    backgroundColor: '#57BE47',
    borderColor: '#57BE47',
  },
  progressConnector: {
    width: 2,
    height: 18,
    marginLeft: 15,
    backgroundColor: '#E1E1E1',
  },
  progressConnectorActive: {
    backgroundColor: '#57BE47',
  },
  progressStepText: {
    flex: 1,
    minWidth: 0,
  },
  progressStepTitle: {
    color: '#77777B',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Geist_500Medium',
  },
  progressStepTitleActive: {
    color: '#202020',
  },
  progressStepCopy: {
    marginTop: 2,
    color: '#77777B',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Geist_400Regular',
  },
  pressed: {
    opacity: 0.78,
  },
});
