import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { GeoCamLogo } from '@/components/GeoCamLogo';
import { Brand } from '@/constants/theme';

const DURATION = 320;

/**
 * Portada de arranque de GeoCam.
 *
 * El splash nativo se oculta y la portada se desvanece suavemente
 * revelando la navegación de la aplicación.
 */
export function SplashOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
      setVisible(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      exiting={FadeOut.duration(DURATION)}
      style={styles.overlay}
    >
      <View style={styles.mark}>
        <GeoCamLogo size={112} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#09090B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
