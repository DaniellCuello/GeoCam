import '../polyfills';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { ThemedText } from '@/components/themed-text';
import { SplashOverlay } from '@/components/splash-overlay';
import { Brand, Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '@/context/ThemeContext';
import { asyncStoragePersister, queryClient, useAppFocusManager } from '@/lib/queryClient';
import { db, initWebDatabase } from '../../db/client';
import { photosRepo } from '../../db/repositories/photos';
import migrations from '../../drizzle/migrations';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user?.id) {
      photosRepo.ensureSyncFields(user.id).catch((err) => {
        console.error('Error asegurando campos de sincronización:', err);
      });
    }
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={Brand.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="foto/[id]"
          options={{
            headerShown: false,
          }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

function MigrationGateContent() {
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
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

function MigrationGate() {
  const [isDbReady, setIsDbReady] = useState(Platform.OS !== 'web');
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      let isMounted = true;
      initWebDatabase()
        .then(() => {
          if (isMounted) setIsDbReady(true);
        })
        .catch((err) => {
          console.error('Error inicializando SQLite en Web:', err);
          if (isMounted) setInitError(err instanceof Error ? err : new Error(String(err)));
        });
      return () => {
        isMounted = false;
      };
    }
  }, []);

  if (initError) {
    return (
      <View style={styles.state}>
        <ThemedText type="cardTitle">No se pudo iniciar la base de datos en Web</ThemedText>
        <ThemedText themeColor="textSecondary">{initError.message}</ThemedText>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={Brand.primary} />
        <ThemedText themeColor="textSecondary">Iniciando base de datos web…</ThemedText>
      </View>
    );
  }

  return <MigrationGateContent />;
}

function RootContent() {
  const { colorScheme } = useThemeContext();
  useAppFocusManager();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SplashOverlay />
      <MigrationGate />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <RootContent />
      </PersistQueryClientProvider>
    </AppThemeProvider>
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
