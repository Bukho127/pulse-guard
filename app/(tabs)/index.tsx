import { Link, router, Tabs } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HeroShield } from '@/components/hero-shield';
import { ThemedText } from '@/components/themed-text';


export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Tabs.Screen options={{ title: 'Home', tabBarStyle: { display: 'none' } }} />

      <View style={styles.container}>
        <HeroShield />
        <ThemedText style={{ fontSize: 18, lineHeight: 24, textAlign: 'center', color: '#0d0d0d', fontFamily: 'Geist_500Medium' }}>
          Your safety companion, anytime, anywhere.
        </ThemedText>

        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/register')}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.continueButtonPressed,
            ]}>
              <LinearGradient
              colors={['rgba(141, 141, 141, 0.25)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.innerHighlight}
              pointerEvents="none"
            />
            <ThemedText style={styles.continueText}>Continue</ThemedText>
          </Pressable>

          <ThemedText style={styles.disclaimer}>
            By continuing you are agreeing with Pulse Guard&apos;s{' '}
            <Link href="/terms">
              <ThemedText style={styles.inlineLink}>Terms of Service</ThemedText>
            </Link>{' '}
            and{' '}
            <Link href="/privacy">
              <ThemedText style={styles.inlineLink}>Privacy Policy</ThemedText>
            </Link>
          </ThemedText>
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
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    gap: 20,
    paddingBottom: 8,
  },
  continueButton: {
    width: '100%',
    height: 45,
    borderRadius: 12,
    backgroundColor: '#1D1D1D',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#7f7f7f',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(66, 66, 66, 0.1)',
    borderBottomColor: 'rgba(0, 0, 0, 0.35)',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Geist_400Regular',
  },
  disclaimer: {
    maxWidth: 300,
    textAlign: 'center',
    color: '#3c3c3c',
    fontSize: 13,
    lineHeight: 19,
  },
  inlineLink: {
    color: '#2b2b2b',
    fontSize: 13,
    lineHeight: 19,
    textDecorationLine: 'underline',
  },
});
