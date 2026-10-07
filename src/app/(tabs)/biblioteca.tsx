import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { GeoPhotoCard } from '@/components/GeoPhotoCard';
import { PhotoFilters } from '@/components/PhotoFilters';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhotos } from '@/hooks/usePhotos';
import { confirmAction } from '@/utils/confirm';
import { toErrorMessage } from '@/utils/errors';
import type { Photo } from '../../../db/schema';

export default function BibliotecaScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [albumId, setAlbumId] = useState<number | null | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { photos, removePhoto, queryError } = usePhotos({
    search,
    albumId,
    onlyFavorites,
  });
  const { albums, error: albumsError, createAlbum, removeAlbum } = useAlbums();

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
            <ThemedText type="title" accessibilityRole="header">
              Biblioteca
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {totalCount === 0
                ? 'No hay fotografías en la colección'
                : `${totalCount} ${totalCount === 1 ? 'fotografía guardada' : 'fotografías guardadas'}`}
            </ThemedText>

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

