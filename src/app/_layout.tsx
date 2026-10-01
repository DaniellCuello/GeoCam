import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { SplashOverlay } from '@/components/splash-overlay';

void SplashScreen.preventAutoHideAsync();

/**
 * Layout raíz: solo el tema, la portada de arranque y el `Slot`.
 *
 * El estado de las fotos y las pestañas viven en `src/app/(tabs)/_layout.tsx`,
 * para que queden acotados a las pantallas de GeoCam.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SplashOverlay />
      <Slot />
    </ThemeProvider>
  );
}
