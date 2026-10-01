import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { Night } from '@/constants/theme';

type Peak = {
  /** Centro de la colina, en fracción del ancho y del alto de la pantalla. */
  x: number;
  y: number;
  /** Diámetro de la curva exterior, en fracción del lado menor de la pantalla. */
  size: number;
  /** Cuántas curvas de nivel se dibujan. */
  rings: number;
  /** Proporción del alto respecto al ancho: menos de 1 aplasta la colina. */
  squash: number;
  /** Deriva del centro de cada curva, para que no sean elipses perfectas. */
  drift: number;
  /** Inclinación de cada curva, en grados. */
  tilt: number;
  /** Intensidad de la línea. */
  alpha: number;
  /** Las colinas azules son las más cercanas al logotipo. */
  accent?: boolean;
};

/**
 * Colinas del fondo. Los valores salen de la pantalla, así que el relieve se
 * adapta a tablets y horizontales sin cambiar el código.
 */
const PEAKS: readonly Peak[] = [
  { x: -0.08, y: 0.04, size: 1.55, rings: 9, squash: 0.88, drift: 1, tilt: 12, alpha: 0.11 },
  { x: 1.04, y: 0.3, size: 0.95, rings: 7, squash: 0.94, drift: -1, tilt: -9, alpha: 0.1 },
  { x: 0.16, y: 1.04, size: 1.3, rings: 8, squash: 0.52, drift: 1, tilt: 6, alpha: 0.09 },
  {
    x: 0.5,
    y: 0.19,
    size: 0.6,
    rings: 5,
    squash: 0.82,
    drift: -1,
    tilt: -15,
    alpha: 0.16,
    accent: true,
  },
  { x: 0.88, y: 0.74, size: 0.46, rings: 4, squash: 0.96, drift: 1, tilt: 19, alpha: 0.09 },
];

/** Fracción del ancho de la curva más interior; evita el punto central. */
const INNER_CUTOFF = 0.2;

/**
 * Fondo de curvas de nivel, dibujado íntegramente con `View`s: ninguna imagen,
 * ningún SVG y ninguna dependencia nueva. Cada colina es una serie de elipses
 * concéntricas con borde de 1 px, y el desplazamiento y la inclinación de cada
 * anillo hacen que el conjunto parezca un relieve y no un blanco y negro.
 */
export function TopographicBackdrop() {
  const { width, height } = useWindowDimensions();
  const shortSide = Math.min(width, height);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {PEAKS.flatMap((peak, peakIndex) => {
        const centerX = peak.x * width;
        const centerY = peak.y * height;
        const outer = peak.size * shortSide;
        const color = peak.accent ? Night.contourAccent : Night.contour;

        return Array.from({ length: peak.rings }, (_, ringIndex) => {
          const t = ringIndex / Math.max(peak.rings - 1, 1);
          const scale = 1 - t * 0.82;
          const ringWidth = outer * scale;
          const ringHeight = ringWidth * peak.squash;
          // La deriva mueve el centro de la curva al avanzar hacia el interior,
          // que es lo que hace que dos curvas nunca cierren como una elipse.
          const drift = peak.drift * outer * 0.05 * t;
          const wobble = Math.sin(t * 3.1) * peak.drift * outer * 0.012;

          return (
            <View
              key={`${peakIndex}-${ringIndex}`}
              style={[
                styles.contour,
                {
                  left: centerX - ringWidth / 2 + drift,
                  top: centerY - ringHeight / 2 + wobble,
                  width: ringWidth,
                  height: ringHeight,
                  borderColor: color,
                  // La curva más interior se omite: un punto central delata la
                  // construcción y ensucia el texto del logotipo.
                  opacity: t < INNER_CUTOFF ? 0 : peak.alpha,
                  transform: [{ rotate: `${peak.tilt * t}deg` }],
                },
              ]}
            />
          );
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contour: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
});
