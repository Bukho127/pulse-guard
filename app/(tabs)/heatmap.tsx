import { SafeAreaView, StyleSheet } from 'react-native';

import { DUMMY_HEATMAP_INCIDENTS, getVisibleHeatmapIncidents } from '@/constants/heatmap-data';
import { HeatmapMap } from '../../components/maps/heatmap-map';

const visibleHeatmapIncidents = getVisibleHeatmapIncidents(DUMMY_HEATMAP_INCIDENTS);

export default function HeatmapScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <HeatmapMap incidents={visibleHeatmapIncidents} showRoute />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111111',
  },
});
