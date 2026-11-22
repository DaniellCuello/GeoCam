import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Fondo de Camuflaje Topográfico de GeoCam.
 *
 * Utiliza el diseño topográfico de curvas de nivel (Top-Camo) de alta definición,
 * ajustando el velo translúcido según el tema claro u oscuro para garantizar
 * máxima visibilidad de las curvas sin comprometer la legibilidad del texto.
 */
export function TopographicBackdrop() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={require('@/assets/images/topo-camo.jpg')}
        style={styles.image}
        resizeMode="cover"
      />
      {/* Velo de contraste adaptativo */}
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? 'rgba(9, 9, 11, 0.45)' // Fondo negro con relieve topográfico blanco/plateado muy visible
              : 'rgba(255, 255, 255, 0.80)', // Fondo blanco con relieve visible y limpio
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
});
