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
    text: '#0B1220',
    background: '#F4F7FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E3EFFC',
    textSecondary: '#5B6678',
  },
  dark: {
    text: '#F2F5FA',
    background: '#0A0D12',
    backgroundElement: '#181D25',
    backgroundSelected: '#22303F',
    textSecondary: '#A6B1C0',
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
    border: '#E1E7F1',
    shadow: '0px 8px 24px rgba(11, 18, 32, 0.08)',
    shadowStrong: '0px 16px 40px rgba(11, 18, 32, 0.16)',
  },
  dark: {
    border: '#2A323E',
    shadow: '0px 8px 24px rgba(0, 0, 0, 0.45)',
    shadowStrong: '0px 16px 40px rgba(0, 0, 0, 0.6)',
  },
} as const;

/** Colores de identidad: no dependen del tema, son de la marca. */
export const Brand = {
  /** Azul GeoCam. Es también el color de fondo del splash. */
  primary: '#208AEF',
  primaryLight: '#4AA8FF',
  primaryDeep: '#0B62B4',
  primarySoft: '#E3EFFC',
  /** Verde azulado de la sección de mapa. */
  map: '#0FA697',
  mapSoft: '#E0F4F1',
  danger: '#E5484D',
  dangerSoft: '#FDECED',
  /** Blanco de la marca, usado sobre el azul del logo y los chips oscuros. */
  onBrand: '#FFFFFF',
  /** Tonos de texto sobre el velo oscuro de cámara y mapa. */
  onDark: '#FFFFFF',
  onDarkMuted: '#C2CAD5',
  /** Velo translúcido para elementos que flotan sobre la cámara o el mapa. */
  scrim: 'rgba(9, 13, 20, 0.62)',
} as const;

/**
 * Superficies sobre el fondo oscuro de Inicio.
 *
 * A diferencia de `Colors` y `Surfaces`, estos valores **no dependen del tema**
 * del sistema: la pantalla de inicio es siempre oscura, con el mapa topográfico
 * detrás, así que sus tarjetas son cristal oscuro y no blanco o gris.
 */
export const Night = {
  /** Negro del fondo, apenas azulado para que no sea un plano muerto. */
  backdrop: '#05070B',
  /** Cristal de las tarjetas: deja ver el relieve por detrás sin perder texto. */
  fill: 'rgba(9, 13, 20, 0.72)',
  fillStrong: 'rgba(9, 13, 20, 0.88)',
  border: 'rgba(255, 255, 255, 0.14)',
  /** Curvas de nivel: dos intensidades para que el relieve tenga jerarquía. */
  contour: 'rgba(255, 255, 255, 0.11)',
  contourAccent: 'rgba(120, 190, 255, 0.16)',
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
