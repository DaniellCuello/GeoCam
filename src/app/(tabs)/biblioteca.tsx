import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { GeoPhotoCard } from '@/components/GeoPhotoCard';
import { PhotoFilters } from '@/components/PhotoFilters';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useAuth } from '@/context/AuthContext';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhotos } from '@/hooks/usePhotos';
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

  // Estado de sincronización en progreso (C1)
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const isSyncing = syncProgress !== null;

  const { photos, removePhoto, syncPending, queryError } = usePhotos({
    search,
    albumId,
    onlyFavorites,
  });
  const { albums, error: albumsError, createAlbum, removeAlbum } = useAlbums();

  const handleSync = async () => {
    if (isSyncing) return;
    try {
      setActionError(null);
      setSyncProgress({ current: 0, total: 0 });

      const result = await syncPending((current, total) => {
        setSyncProgress({ current, total });
      });

      if (result.synced === 0 && result.failed === 0) {
        Alert.alert('Sincronización', 'Todas las fotos ya están sincronizadas con la nube.');
      } else {
        Alert.alert(
          'Sincronización finalizada',
          `Fotos subidas: ${result.synced}${
            result.failed > 0 ? `\nFotos pendientes o con error: ${result.failed}` : ''
          }`
        );
      }
    } catch (err) {
      setActionError(toErrorMessage(err, 'Error durante la sincronización.'));
    } finally {
      setSyncProgress(null);
    }
  };

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
        message: '¿Estás seguro de que deseas eliminar esta fotografía de la biblioteca?',
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
              <View>
                <ThemedText type="title" accessibilityRole="header">
                  Biblioteca
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {totalCount === 0
                    ? 'No hay fotografías en la colección'
                    : `${totalCount} ${totalCount === 1 ? 'fotografía guardada' : 'fotografías guardadas'}`}
                </ThemedText>
              </View>

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

            {user?.email && (
              <ThemedText type="code" style={styles.userEmail}>
                👤 {user.email}
              </ThemedText>
            )}

            {/* C1: Botón de Sincronización con barra de progreso */}
            <Pressable
              onPress={handleSync}
              disabled={isSyncing}
              accessibilityRole="button"
              style={[
                styles.syncBtn,
                { opacity: isSyncing ? 0.7 : 1 },
              ]}
            >
              {isSyncing ? (
                <View style={styles.syncRow}>
                  <ActivityIndicator size="small" color={Brand.onBrand} />
                  <ThemedText style={styles.syncBtnText}>
                    {syncProgress.total > 0
                      ? `Sincronizando ${syncProgress.current} de ${syncProgress.total}…`
                      : 'Verificando pendientes…'}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.syncBtnText}>
                  ☁️ Sincronizar pendientes con Supabase
                </ThemedText>
              )}
            </Pressable>

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
                  ? 'Intenta cambiar o limpiar los filtros de búsqueda.'
                  : 'Toma fotos con la cámara o súbelas desde la galería para verlas aquí.'
              }
              actionLabel={
                search || albumId !== 'all' || onlyFavorites ? 'Limpiar filtros' : 'Abrir Cámara'
              }
              onAction={() => {
                if (search || albumId !== 'all' || onlyFavorites) {
                  setSearch('');
                  setAlbumId('all');
                  setOnlyFavorites(false);
                } else {
                  router.push('/geocam');
                }
              }}
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
    marginBottom: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pill,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  signOutText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 12,
    color: Brand.primary,
  },
  syncBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radii.md,
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.one,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  syncBtnText: {
    color: Brand.onBrand,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyWrap: {
    paddingVertical: Spacing.seven,
    alignItems: 'center',
  },
  errorCard: {
    padding: Spacing.three,
    borderRadius: Radii.md,
    backgroundColor: Brand.dangerSoft,
    marginTop: Spacing.two,
  },
  errorText: {
    color: Brand.danger,
  },
});
