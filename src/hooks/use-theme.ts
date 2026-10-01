import { Colors, Surfaces } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Colores del tema activo (claro u oscuro) más los tokens de superficie
 * (`border`, `shadow` y `shadowStrong`), para no tener que consultar el esquema
 * de color en cada pantalla.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  if (theme === 'dark') {
    return { ...Colors.dark, ...Surfaces.dark };
  }

  return { ...Colors.light, ...Surfaces.light };
}
