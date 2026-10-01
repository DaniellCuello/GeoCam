import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';

type GeoCamLogoProps = {
  /** Lado del cuadro. Todo el dibujo se escala con este valor. */
  size?: number;
  /**
   * Nombre para lectores de pantalla. Si se omite, el logo se marca como
   * decorativo, que es lo correcto cuando al lado ya está el texto "GeoCam".
   */
  accessibilityLabel?: string;
};

/**
 * Marca de GeoCam dibujada solo con `View`: un pin de mapa cuya cabeza es la
 * lente de la cámara (cámara + ubicación en un solo símbolo).
 *
 * No usa imágenes remotas ni `react-native-svg`, así que no añade dependencias
 * y se ve igual en iOS, Android y web. La punta del pin se calcula con la
 * fórmula de tangencia entre el triángulo y la circunferencia, por eso los
 * lados salen limpios en cualquier tamaño.
 */
export function GeoCamLogo({ size = 104, accessibilityLabel }: GeoCamLogoProps) {
  const head = size * 0.52; // diámetro de la cabeza del pin
  const radius = head / 2;
  const tail = size * 0.17; // cuánto sobresale la punta por debajo de la cabeza
  const join = (radius * radius) / (radius + tail); // punto de tangencia
  const halfBase = Math.sqrt(Math.max(radius * radius - join * join, 0));
  const tailHeight = radius + tail - join;
  const lens = radius * 0.92; // lente de la cámara

  const top = (size - head - tail) / 2;
  const left = (size - head) / 2;

  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[styles.tile, { width: size, height: size, borderRadius: size * 0.29 }]}>
      <View
        style={{
          position: 'absolute',
          left,
          top,
          width: head,
          height: head,
          borderRadius: radius,
          backgroundColor: Brand.onBrand,
        }}
      />

      {/* Triángulo de la punta: ancho cero y bordes de color, técnica de CSS
          que React Native y react-native-web renderizan igual. */}
      <View
        style={{
          position: 'absolute',
          left: size / 2 - halfBase,
          top: top + join,
          width: 0,
          height: 0,
          borderLeftWidth: halfBase,
          borderRightWidth: halfBase,
          borderTopWidth: tailHeight,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: Brand.onBrand,
        }}
      />

      <View
        style={{
          position: 'absolute',
          left: size / 2 - lens / 2,
          top: top + radius - lens / 2,
          width: lens,
          height: lens,
          borderRadius: lens / 2,
          backgroundColor: Brand.primary,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
    experimental_backgroundImage:
      'linear-gradient(160deg, #4AA8FF 0%, #208AEF 48%, #0B62B4 100%)',
  },
});
