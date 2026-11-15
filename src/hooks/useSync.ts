// src/hooks/useSync.ts
// La sincronización tratada como una consulta de TanStack Query:
// Se dispara al iniciar sesión, al recuperar la red y al volver a primer plano, y se reintenta si falla.
import { useQuery } from '@tanstack/react-query';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useAuth } from '@/context/AuthContext';
import { queryClient, useIsOnline } from '@/lib/queryClient';
import { syncAll, type SyncResult } from '@/services/sync';
import { photosRepo } from '../../db/repositories/photos';

export { isPending } from '@/services/sync';

/**
 * Pide un ciclo de sincronización inmediato.
 * Si no hay conexión de red, la consulta queda en pausa y TanStack Query la reanuda sola al reconectar.
 */
export function requestSync() {
  queryClient.invalidateQueries({ queryKey: ['sync'] });
}

export function useSync() {
  const { user } = useAuth();
  const userId = user?.id;
  const isOnline = useIsOnline();
  const { data: pending } = useLiveQuery(photosRepo.pendingQuery(userId));

  const sync = useQuery<SyncResult, Error>({
    queryKey: ['sync', userId],
    queryFn: () => syncAll(userId!),
    enabled: !!userId,
    staleTime: 0,
    retry: 2,
    refetchOnReconnect: 'always', // Disparo automático al volver la red
    refetchOnWindowFocus: 'always', // Disparo automático al volver a primer plano
  });

  return {
    isOnline,
    pendingCount: pending?.length ?? 0,
    isSyncing: sync.fetchStatus === 'fetching',
    lastResult: sync.data ?? null,
    error: sync.error,
    syncNow: () => sync.refetch(),
  };
}
