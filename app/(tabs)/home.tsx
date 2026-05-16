import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';

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

export default function HomeScreen() {
  const router = useRouter();

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

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push('/(tabs)/heatmap');
              }}
              style={({ pressed }) => [styles.mapPreview, pressed && styles.pressed]}>
              <HeatmapMap
                incidents={visibleHeatmapIncidents}
                interactive={false}
                showLocationStatus={false}
                showUserLocation={false}
                zoomLevel={10}
              />
              <View style={styles.mapOverlay}>
                <ThemedText style={styles.mapOverlayText}>Cape Town</ThemedText>
              </View>
            </Pressable>
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
  pressed: {
    opacity: 0.78,
  },
});
