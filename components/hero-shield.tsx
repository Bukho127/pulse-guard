import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { RippleCircles } from '@/components/ripple-effect';

const OUTER_SIZE = 128;

export function HeroShield() {
  return (
    <View style={styles.heroSection}>
      <View style={styles.circleWrapper}>
        {/* Ripples and shield share the exact same wrapper */}
        <RippleCircles />
        <View style={styles.outerCircle}>
          <View style={styles.innerCircle}>
            <Ionicons name="shield-outline" size={42} color="#FFFFFF" />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWrapper: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',   // ← key fix: sits on top of ripples, centered
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    backgroundColor: '#BDEDB5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#57BE47',
    alignItems: 'center',
    justifyContent: 'center',
  },
});