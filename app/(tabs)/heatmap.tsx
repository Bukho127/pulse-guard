import { SafeAreaView, StyleSheet } from 'react-native';

import { HeatmapMap } from '@/components/maps/heatmap-map';

export default function HeatmapScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <HeatmapMap />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111111',
  },
});
