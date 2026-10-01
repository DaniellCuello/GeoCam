import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Brand, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextVariant =
  /** Titular de la pantalla de inicio. */
  | 'hero'
  /** Título de tarjeta o de sección. */
  | 'cardTitle'
  | 'title'
  | 'subtitle'
  | 'default'
  | 'small'
  | 'smallBold'
  /** Etiqueta corta en mayúsculas, para metadatos. */
  | 'label'
  /** Texto monoespaciado: coordenadas y datos técnicos. */
  | 'code';

export type ThemedTextProps = TextProps & {
  type?: ThemedTextVariant;
  themeColor?: ThemeColor;
  /**
   * Texto sobre superficies oscuras (fondo topográfico, cámara, mapa). Usa la
   * escala de la marca en vez de la del tema del sistema, porque ahí el texto
   * siempre es claro aunque el sistema esté en modo claro.
   */
  tone?: keyof Pick<typeof Brand, 'onDark' | 'onDarkMuted'>;
};

export function ThemedText({ style, type = 'default', themeColor, tone, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: tone ? Brand[tone] : theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'hero' && styles.hero,
        type === 'cardTitle' && styles.cardTitle,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'label' && styles.label,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  cardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
    lineHeight: 18,
  },
});
