import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, SafeAreaView, StyleSheet, View } from 'react-native';

import PulseGuardLogo from '@/assets/logos/pulse-guard-logo.svg';
import { ThemedText } from '@/components/themed-text';

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <PulseGuardLogo
            width={214}
            height={214}
            style={styles.logo}
            accessibilityLabel="Pulse Guard logo"
          />

          <View style={styles.messageGroup}>
            <ThemedText style={styles.title}>REPORT CRIME</ThemedText>
            <ThemedText style={styles.title}>ANONYMOUSLY</ThemedText>
          </View>

          <ThemedText style={styles.bodyCopy}>
            All videos are encrypted end-to-end and stored securely. Your identity is protected.
          </ThemedText>
        </View>

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
    paddingHorizontal: 38,
    paddingTop: 134,
    paddingBottom: 52,
    backgroundColor: '#FFFFFF',
  },
  hero: {
    alignItems: 'center',
  },
  logo: {
    marginBottom: 72,
  },
  messageGroup: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#111111',
    fontSize: 23,
    lineHeight: 25,
    textAlign: 'center',
    fontFamily: 'Geist_500Medium',
    letterSpacing: 0,
  },
  bodyCopy: {
    maxWidth: 304,
    color: '#77777B',
    fontSize: 16,
    lineHeight: 21,
    textAlign: 'center',
    fontFamily: 'Geist_400Regular',
  },
  footer: {
    alignItems: 'center',
    gap: 22,
  },
  continueButton: {
    width: '100%',
    maxWidth: 318,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#202020',
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
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Geist_400Regular',
  },
  disclaimer: {
    maxWidth: 312,
    textAlign: 'center',
    color: '#8D8D92',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Geist_400Regular',
  },
  inlineLink: {
    color: '#8D8D92',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Geist_400Regular',
    textDecorationLine: 'underline',
  },
});
