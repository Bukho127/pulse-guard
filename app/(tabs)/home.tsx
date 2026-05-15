import { SafeAreaView, StyleSheet, View } from 'react-native';

import { HomeHeader } from '@/components/home/home-header';
import { ThemedText } from '@/components/themed-text';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <HomeHeader />

        <View style={styles.placeholder}>
          <ThemedText style={styles.title}>Home</ThemedText>
        </View>
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
  placeholder: {
    marginTop: 88,
  },
  title: {
    color: '#111111',
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Geist_500Medium',
  },
});
