import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SplashOverlay } from '@/components/splash-overlay';
import { Brand, Spacing } from '@/constants/theme';
import { db } from '../../db/client';
import migrations from '../../drizzle/migrations';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

void SplashScreen.preventAutoHideAsync();

function MigrationGate() {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.state}>
        <ThemedText type="cardTitle">No se pudo preparar la base de datos</ThemedText>
        <ThemedText themeColor="textSecondary">{error.message}</ThemedText>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={Brand.primary} />
        <ThemedText themeColor="textSecondary">Preparando GeoCam…</ThemedText>
      </View>
    );
  }

  return (
    <Slot />
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SplashOverlay />
      <MigrationGate />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
});
