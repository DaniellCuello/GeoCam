/**
 * Tokens de diseño de GeoCam.
 *
 * Inicio, Cámara y Mapa toman radios, espaciados, colores y sombras de aquí, de
 * forma que las tres pantallas se ven como parte de la misma aplicación. Cambiar
 * un valor en este archivo cambia la app entera a la vez.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Colores semánticos que cambian con el tema claro/oscuro del sistema. */
export const Colors = {
  light: {
    text: '#09090B',
    background: '#FFFFFF',
    backgroundElement: '#F4F4F5',
    backgroundSelected: '#FEE2E2',
    textSecondary: '#71717A',
  },
  dark: {
    text: '#FFFFFF',
    background: '#09090B',
    backgroundElement: '#18181B',
    backgroundSelected: '#27272A',
    textSecondary: '#A1A1AA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Bordes y sombras del tema activo. `useTheme()` los fusiona con `Colors`, de
 * forma que las tarjetas se separan del fondo con un borde sutil y una sombra
 * coherente en las tres pantallas.
 */
export const Surfaces = {
  light: {
    border: '#E4E4E7',
    shadow: '0px 4px 16px rgba(0, 0, 0, 0.06)',
    shadowStrong: '0px 10px 30px rgba(0, 0, 0, 0.10)',
  },
  dark: {
    border: '#27272A',
    shadow: '0px 4px 16px rgba(0, 0, 0, 0.5)',
    shadowStrong: '0px 10px 30px rgba(0, 0, 0, 0.8)',
  },
} as const;

/** Colores de identidad: Negro principal, Secundario Rojo GeoCam. */
export const Brand = {
  /** Rojo GeoCam. Color principal de acento y marca. */
  primary: '#EF4444',
  primaryLight: '#F87171',
  primaryDeep: '#DC2626',
  primarySoft: 'rgba(239, 68, 68, 0.15)',
  /** Sección de mapa. */
  map: '#EF4444',
  mapSoft: 'rgba(239, 68, 68, 0.15)',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  /** Blanco de la marca. */
  onBrand: '#FFFFFF',
  /** Tonos de texto sobre el velo oscuro de cámara y mapa. */
  onDark: '#FFFFFF',
  onDarkMuted: '#A1A1AA',
  /** Velo translúcido para elementos que flotan sobre la cámara o el mapa. */
  scrim: 'rgba(0, 0, 0, 0.75)',
} as const;

/**
 * Superficies sobre el fondo oscuro de Inicio.
 */
export const Night = {
  backdrop: '#09090B',
  fill: 'rgba(24, 24, 27, 0.80)',
  fillStrong: 'rgba(24, 24, 27, 0.95)',
  border: 'rgba(255, 255, 255, 0.12)',
  contour: 'rgba(255, 255, 255, 0.20)',
  contourAccent: 'rgba(239, 68, 68, 0.35)',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Escala de espaciado. Los valores son múltiplos de 4. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

/** Radios de las tarjetas, chips y botones. */
export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/** Medidas de maquetación que dependen del tamaño de la pantalla. */
export const Layout = {
  /** Ancho máximo del contenido en tablet y escritorio: evita líneas demasiado largas. */
  contentMaxWidth: 720,
  /** Padding lateral de las pantallas. */
  gutter: 20,
  /** Área táctil mínima recomendada en iOS, Android y web. */
  minTouch: 44,
} as const;
