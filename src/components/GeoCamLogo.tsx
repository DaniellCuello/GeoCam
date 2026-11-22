import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';

type GeoCamLogoProps = {
  /** Lado del cuadro contenedor. Todo el dibujo escala proporcionalmente. */
  size?: number;
  /** Nombre para lectores de pantalla. */
  accessibilityLabel?: string;
};

/**
 * Logotipo moderno de GeoCam:
 * Pin de localización estilizado en Rojo de la marca con una cámara
 * fotográfica minimalista integrada en el centro.
 */
export function GeoCamLogo({ size = 104, accessibilityLabel }: GeoCamLogoProps) {
  // Proporciones dinámicas basadas en el tamaño
  const pinWidth = size * 0.64;
  const radius = pinWidth / 2;
  const squareSide = pinWidth / Math.SQRT2;

  // Centro de la cabeza del pin
  const headTop = size * 0.06;
  const headLeft = (size - pinWidth) / 2;
  const centerY = headTop + radius;
  const centerX = size / 2;

  // Centro del cuadrado rotado para formar la punta del pin
  const squareCenterY = centerY + radius * 0.52;

  // Dimensiones de la cámara
  const camWidth = pinWidth * 0.54;
  const camHeight = camWidth * 0.68;
  const lensSize = camWidth * 0.48;
  const innerLensSize = lensSize * 0.44;
  const shutterWidth = camWidth * 0.28;
  const shutterHeight = camHeight * 0.18;

  // Sombra del pin
  const shadowWidth = pinWidth * 0.55;
  const shadowHeight = size * 0.08;
  const shadowTop = size * 0.88;

  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityRole={accessibilityLabel !== undefined ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, { width: size, height: size }]}
    >
      {/* Sombra inferior de apoyo */}
      <View
        style={[
          styles.shadow,
          {
            width: shadowWidth,
            height: shadowHeight,
            borderRadius: shadowHeight / 2,
            top: shadowTop,
            left: (size - shadowWidth) / 2,
          },
        ]}
      />

      {/* Punta del pin: cuadrado rotado 45 grados */}
      <View
        style={[
          styles.pinBase,
          {
            width: squareSide,
            height: squareSide,
            left: centerX - squareSide / 2,
            top: squareCenterY - squareSide / 2,
            borderRadius: squareSide * 0.12,
          },
        ]}
      />

      {/* Cabeza circular del pin */}
      <View
        style={[
          styles.pinHead,
          {
            width: pinWidth,
            height: pinWidth,
            borderRadius: radius,
            left: headLeft,
            top: headTop,
          },
        ]}
      >
        {/* Shutter superior de la cámara */}
        <View
          style={[
            styles.camShutter,
            {
              width: shutterWidth,
              height: shutterHeight,
              borderRadius: shutterHeight * 0.35,
              top: (pinWidth - camHeight) / 2 - shutterHeight * 0.7,
              left: (pinWidth - camWidth) / 2 + camWidth * 0.15,
            },
          ]}
        />

        {/* Pequeño flash derecho */}
        <View
          style={[
            styles.camFlash,
            {
              width: shutterHeight * 0.8,
              height: shutterHeight * 0.8,
              borderRadius: shutterHeight * 0.4,
              top: (pinWidth - camHeight) / 2 - shutterHeight * 0.4,
              right: (pinWidth - camWidth) / 2 + camWidth * 0.15,
            },
          ]}
        />

        {/* Cuerpo de la cámara */}
        <View
          style={[
            styles.camBody,
            {
              width: camWidth,
              height: camHeight,
              borderRadius: camHeight * 0.22,
              top: (pinWidth - camHeight) / 2,
              left: (pinWidth - camWidth) / 2,
            },
          ]}
        >
          {/* Lente exterior */}
          <View
            style={[
              styles.camLens,
              {
                width: lensSize,
                height: lensSize,
                borderRadius: lensSize / 2,
              },
            ]}
          >
            {/* Centro de la lente / sensor */}
            <View
              style={[
                styles.camLensInner,
                {
                  width: innerLensSize,
                  height: innerLensSize,
                  borderRadius: innerLensSize / 2,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  pinBase: {
    position: 'absolute',
    backgroundColor: Brand.primary,
    transform: [{ rotate: '45deg' }],
  },
  pinHead: {
    position: 'absolute',
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  camShutter: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  camFlash: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  camBody: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  camLens: {
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camLensInner: {
    backgroundColor: '#FFFFFF',
  },
});
