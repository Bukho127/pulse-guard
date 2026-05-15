import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet } from 'react-native';

import { VideoRecorder } from '@/components/record/video-recorder';

export default function RecordScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <VideoRecorder
        onClose={() => {
          router.replace('/(tabs)/home');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
