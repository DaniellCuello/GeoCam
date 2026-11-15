import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { GeoPhotoCard } from '@/components/GeoPhotoCard';
import { PhotoFilters } from '@/components/PhotoFilters';
import { SyncBadge } from '@/components/SyncBadge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useAuth } from '@/context/AuthContext';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhotos } from '@/hooks/usePhotos';
import { useSync } from '@/hooks/useSync';
import { confirmAction } from '@/utils/confirm';
import { toErrorMessage } from '@/utils/errors';
import type { Photo } from '../../../db/schema';

export default function BibliotecaScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [albumId, setAlbumId] = useState<number | null | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // C4: Estado de sincronización en tiempo real con TanStack Query
  const { isOnline, pendingCount, isSyncing, lastResult, error: syncError, syncNow } = useSync();

  const { photos, removePhoto, queryError } = usePhotos({
    search,
    albumId,
    onlyFavorites,
  });
  const { albums, error: albumsError, createAlbum, removeAlbum } = useAlbums();

  const handleSignOut = async () => {
    const confirmed = await confirmAction({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que deseas cerrar sesión en GeoCam?',
      confirmLabel: 'Cerrar sesión',
      destructive: true,
    });
    if (confirmed) {
      await signOut();
    }
  };

  const handleRemovePhoto = useCallback(
    async (id: number) => {
      const confirmed = await confirmAction({
        title: 'Eliminar fotografía',
        message: '¿Deseas eliminar esta fotografía? El cambio se sincronizará automáticamente con la nube.',
        confirmLabel: 'Eliminar',
        destructive: true,
      });

      if (!confirmed) {
        return;
      }

      try {
        await removePhoto(id);
        setActionError(null);
      } catch (cause) {
        setActionError(toErrorMessage(cause, 'No se pudo eliminar la fotografía.'));
      }
    },
    [removePhoto]
  );

  const renderPhotoItem = useCallback(
    ({ item }: { item: Photo }) => (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/foto/[id]',
            params: { id: String(item.id) },
          })
        }>
        <GeoPhotoCard photo={item} onRemove={handleRemovePhoto} />
      </Pressable>
    ),
    [handleRemovePhoto]
  );

  const keyExtractor = useCallback((item: Photo) => String(item.id), []);

  const totalCount = photos.length;
  const errorMsg = queryError?.message ?? albumsError?.message ?? actionError;

  return (
    <ThemedView style={styles.root}>
      <FlatList
        data={photos}
        renderItem={renderPhotoItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + Spacing.five,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.headerColumn}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="title" accessibilityRole="header">
                  Biblioteca
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {totalCount === 0
                    ? 'No hay fotografías en la colección'
                    : `${totalCount} ${totalCount === 1 ? 'fotografía guardada' : 'fotografías guardadas'}`}
                </ThemedText>
              </View>

              <View style={styles.headerRight}>
                <SyncBadge />
                {user ? (
                  <Pressable
                    onPress={handleSignOut}
                    accessibilityRole="button"
                    style={styles.signOutBtn}
                  >
                    <ThemedText type="small" style={styles.signOutText}>
                      Salir
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {user?.email && (
              <ThemedText type="code" style={styles.userEmail}>
                👤 {user.email}
              </ThemedText>
            )}

            {/* C4: Tarjeta de estado de sincronización TanStack Query */}
            <View style={styles.syncCard}>
              <View style={styles.syncCardHeader}>
                <View style={styles.syncHeaderLeft}>
                  <ThemedText type="smallBold">
                    {isOnline
                      ? pendingCount > 0
                        ? `☁️ ${pendingCount} pendiente(s) de sincronizar`
                        : '🟢 Todo sincronizado con Supabase'
                      : `🟠 Sin conexión (${pendingCount} pendiente${pendingCount === 1 ? '' : 's'})`}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.syncMetaText}>
                    {lastResult
                      ? `Última sinc: ${new Date(lastResult.finishedAt).toLocaleTimeString()} (${lastResult.pushed} subidas, ${lastResult.pulled} bajadas)`
                      : 'Sincronización automática activa con TanStack Query'}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={() => void syncNow()}
                  disabled={!isOnline || isSyncing}
                  accessibilityRole="button"
                  accessibilityLabel="Sincronizar ahora"
                  style={[
                    styles.syncNowBtn,
                    { opacity: !isOnline || isSyncing ? 0.6 : 1 },
                  ]}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={Brand.onBrand} />
                  ) : (
                    <ThemedText type="smallBold" style={styles.syncNowText}>
                      Sincronizar
                    </ThemedText>
                  )}
                </Pressable>
              </View>

              {syncError ? (
                <ThemedText type="small" style={styles.syncErrorText}>
                  ⚠️ {toErrorMessage(syncError, 'Error al sincronizar con la nube.')}
                </ThemedText>
              ) : null}
            </View>

            <PhotoFilters
              search={search}
              onSearchChange={setSearch}
              albumId={albumId}
              onAlbumChange={setAlbumId}
              onlyFavorites={onlyFavorites}
              onFavoritesChange={setOnlyFavorites}
              albums={albums}
              createAlbum={createAlbum}
              removeAlbum={removeAlbum}
            />

            {errorMsg ? (
              <View style={styles.errorCard}>
                <ThemedText type="smallBold" style={styles.errorText}>
                  {errorMsg}
                </ThemedText>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              icon={Icons.photo}
              title="No se encontraron fotografías"
              description={
                search || albumId !== 'all' || onlyFavorites
                  ? 'Prueba a cambiar o limpiar los filtros de búsqueda.'
                  : 'Toma fotos desde la cámara o importa desde tu galería para empezar.'
              }
            />
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.gutter,
    maxWidth: Layout.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.three,
  },
  headerColumn: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  userEmail: {
    fontSize: 12,
    opacity: 0.8,
  },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  signOutText: {
    color: Brand.danger,
    fontWeight: '600',
  },
  syncCard: {
    backgroundColor: 'rgba(32, 138, 239, 0.08)',
    borderColor: 'rgba(32, 138, 239, 0.25)',
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  syncCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  syncHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  syncMetaText: {
    fontSize: 11,
  },
  syncNowBtn: {
    backgroundColor: Brand.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  syncNowText: {
    color: Brand.onBrand,
    fontSize: 12,
  },
  syncErrorText: {
    color: Brand.danger,
    fontSize: 11,
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Brand.danger,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.two,
  },
  errorText: {
    color: Brand.danger,
  },
  emptyWrap: {
    paddingTop: Spacing.four,
  },
});
