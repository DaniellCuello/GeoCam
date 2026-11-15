import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

import { ThemedText } from '@/components/themed-text';
import { SplashOverlay } from '@/components/splash-overlay';
import { Brand, Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { asyncStoragePersister, queryClient, useAppFocusManager } from '@/lib/queryClient';
import { db } from '../../db/client';
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
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAppFocusManager();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SplashOverlay />
        <MigrationGate />
      </ThemeProvider>
    </PersistQueryClientProvider>
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
