import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GeoCamLogo } from '@/components/GeoCamLogo';
import { Brand } from '@/constants/theme';

const DURATION = 320;

/**
 * Portada de arranque de GeoCam.
 *
 * El splash nativo sigue oculto hasta que el primer layout está montado; en ese
 * momento se revela la portada con la marca y se desvanece. El fondo usa el
 * mismo azul que el logo para que la transición no se note.
 */
export function SplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  const mark = (
    <View style={styles.mark}>
      <GeoCamLogo size={112} />
    </View>
  );

  if (!animate) {
    return (
      <View
        onLayout={() => {
          void SplashScreen.hideAsync().finally(() => setAnimate(true));
        }}
        style={styles.overlay}>
        {mark}
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeOut.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.overlay}>
      {mark}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
