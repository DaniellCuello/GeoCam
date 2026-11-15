// src/lib/queryClient.ts
// Configuración de TanStack Query, detección de conectividad de red, foco de la app
// y persistencia offline con AsyncStorage (C3).
import { useEffect, useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // Durante 30 s no se repite una consulta que ya esté en caché
      gcTime: 1000 * 60 * 60 * 24, // 24 horas en caché para soporte offline-first
      retry: 2,
    },
  },
});

// 1. TanStack Query se entera del estado de la red mediante expo-network
onlineManager.setEventListener((setOnline) => {
  let initialised = false;
  const subscription = Network.addNetworkStateListener((state) => {
    initialised = true;
    setOnline(!!state.isConnected);
  });

  Network.getNetworkStateAsync()
    .then((state) => {
      if (!initialised) setOnline(!!state.isConnected);
    })
    .catch(() => {});

  return () => subscription.remove();
});

// 2. TanStack Query se entera de cuándo la app vuelve a primer plano
export function useAppFocusManager() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });
    return () => subscription.remove();
  }, []);
}

// 3. Hook para que la UI muestre si hay conexión en tiempo real
export function useIsOnline() {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline()
  );
}

// 4. Persistencia offline de caché (C3): sobrevive al cierre de la app
const CACHE_KEY = 'GEOCAM_REACT_QUERY_OFFLINE_CACHE';

export const asyncStoragePersister = {
  persistClient: async (client: unknown) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(client));
    } catch (e) {
      if (__DEV__) console.warn('[queryClient] error al guardar cache offline:', e);
    }
  },
  restoreClient: async () => {
    try {
      const cache = await AsyncStorage.getItem(CACHE_KEY);
      return cache ? JSON.parse(cache) : undefined;
    } catch (e) {
      if (__DEV__) console.warn('[queryClient] error al restaurar cache offline:', e);
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (e) {
      if (__DEV__) console.warn('[queryClient] error al eliminar cache offline:', e);
    }
  },
};
