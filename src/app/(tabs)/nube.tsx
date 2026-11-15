// src/app/(tabs)/nube.tsx
// Semana 9: Pestaña Nube con TanStack Query (C2)
// Características:
// - Paginación por cursor e infinite scroll en FlatList (useInfiniteQuery).
// - Búsqueda en vivo por nota con retraso controlado (useDebouncedValue).
// - Los cuatro estados de UI: Carga inicial, Error con reintento, Vacío y Sin conexión.
// - Persistencia offline de caché (C3) y actualización en tiempo real mediante WebSockets.

import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { EmptyState } from '@/components/EmptyState';
import { SourceBadge } from '@/components/SourceBadge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Night, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useIsOnline } from '@/lib/queryClient';
import {
  deleteCloudPhoto,
  listCloudPhotosPage,
  subscribeToUserCloudPhotos,
  type CloudPhoto,
} from '@/services/cloudPhotos';
import { confirmAction } from '@/utils/confirm';
import { toErrorMessage } from '@/utils/errors';
import { formatCoords, formatTimestamp } from '@/utils/geo-format';

export default function NubeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);

  // Consulta infinita paginada por cursor en Supabase
  const {
    data,
    status,
    fetchStatus,
    error,
    refetch,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['cloudPhotos', { userId: user?.id, search: debouncedSearch }],
    queryFn: ({ pageParam }) =>
      listCloudPhotosPage({
        userId: user!.id,
        cursor: pageParam,
        search: debouncedSearch,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user?.id,
    placeholderData: keepPreviousData, // Evita parpadeo al teclear
  });

  // Aplanar páginas en una sola lista para el FlatList
  const photos = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  // Suscripción reactiva en tiempo real: invalida la caché de TanStack Query
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserCloudPhotos(() => {
      queryClient.invalidateQueries({ queryKey: ['cloudPhotos'] });
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, queryClient]);

  // Mutación para borrar foto remota
  const deleteMutation = useMutation({
    mutationFn: async (photo: CloudPhoto) => {
      await deleteCloudPhoto(
        {
          id: 0,
          uri: '',
          clientId: photo.client_id,
          remotePath: photo.storage_path,
          latitude: photo.latitude,
          longitude: photo.longitude,
          accuracy: null,
          source: photo.source,
          createdAt: new Date(photo.created_at),
          updatedAt: new Date(photo.updated_at),
          albumId: null,
          note: photo.note,
          favorite: photo.favorite,
          syncedAt: new Date(),
          ownerId: photo.user_id,
          deletedAt: null,
        },
        user!.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudPhotos'] });
    },
  });

  const handleDeleteRemote = async (photo: CloudPhoto) => {
    const confirmed = await confirmAction({
      title: 'Eliminar de la nube',
      message: 'Se eliminará la foto de Supabase Storage y su fila en PostgreSQL.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!confirmed || !user?.id) return;
    deleteMutation.mutate(photo);
  };

  const renderItem = ({ item }: { item: CloudPhoto }) => {
    const coordsText =
      item.latitude !== null && item.longitude !== null
        ? formatCoords({ latitude: item.latitude, longitude: item.longitude, accuracy: null })
        : 'Sin ubicación GPS';

    return (
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.imageWrap}>
          {item.signedUrl ? (
            <Image
              source={{ uri: item.signedUrl }}
              style={styles.image}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.imageFallback}>
              <ActivityIndicator color={Brand.primary} />
            </View>
          )}

          <View style={styles.badgeTopLeft}>
            <SourceBadge source={item.source} />
          </View>
          {item.favorite ? (
            <View style={styles.favoriteBadge}>
              <ThemedText style={styles.favoriteText}>★</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <ThemedText type="code" style={styles.coords} numberOfLines={1}>
            📍 {coordsText}
          </ThemedText>

          {item.note ? (
            <ThemedText type="default" numberOfLines={3} style={styles.note}>
              {item.note}
            </ThemedText>
          ) : null}

          <View style={styles.footer}>
            <ThemedText type="small" themeColor="textSecondary">
              {formatTimestamp(new Date(item.taken_at))}
            </ThemedText>

            <Pressable
              onPress={() => void handleDeleteRemote(item)}
              accessibilityRole="button"
              accessibilityLabel="Eliminar foto de la nube"
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
            >
              <SymbolView name={Icons.trash} size={16} tintColor={Brand.danger} />
              <ThemedText type="smallBold" style={styles.deleteText}>
                Eliminar
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.root}>
      <FlatList
        data={photos}
        keyExtractor={(item) => String(item.id || item.client_id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + Spacing.five,
          },
        ]}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={() => void refetch()}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View>
                <ThemedText type="title" accessibilityRole="header">
                  Fotos en la Nube
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Feed paginado en tiempo real con TanStack Query
                </ThemedText>
              </View>

              <View style={styles.cloudBadge}>
                <ThemedText type="smallBold" style={styles.cloudBadgeText}>
                  ☁️ Supabase
                </ThemedText>
              </View>
            </View>

            {/* Banner de estado sin conexión */}
            {!isOnline ? (
              <View style={styles.offlineBanner}>
                <ThemedText type="smallBold" style={styles.offlineText}>
                  🟠 Sin conexión. Mostrando datos guardados en caché.
                </ThemedText>
              </View>
            ) : null}

            {/* Buscador reactivo por nota */}
            <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <SymbolView name={Icons.search} size={16} tintColor={theme.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nota en la nube…"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
                returnKeyType="search"
                autoCapitalize="none"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} accessibilityLabel="Limpiar búsqueda">
                  <SymbolView name={Icons.close} size={14} tintColor={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.centerBlock}>
            {/* Estado 1: Carga inicial */}
            {status === 'pending' && fetchStatus === 'fetching' ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={Brand.primary} />
                <ThemedText themeColor="textSecondary" style={{ marginTop: 12 }}>
                  Cargando galería de la nube…
                </ThemedText>
              </View>
            ) : null}

            {/* Estado 2: Sin datos y sin red */}
            {status === 'pending' && fetchStatus === 'paused' ? (
              <EmptyState
                icon={Icons.cloud}
                title="Sin conexión a internet"
                description="Conéctate a una red Wi-Fi o datos móviles para consultar las fotos de la nube."
              />
            ) : null}

            {/* Estado 3: Error con opción de reintentar */}
            {status === 'error' ? (
              <View style={styles.errorBox}>
                <ThemedText type="smallBold" style={{ color: Brand.danger }}>
                  {toErrorMessage(error, 'No se pudieron consultar las fotos remotas.')}
                </ThemedText>
                <Pressable
                  onPress={() => void refetch()}
                  style={styles.retryBtn}
                  accessibilityRole="button"
                >
                  <ThemedText type="smallBold" style={styles.retryText}>
                    Reintentar
                  </ThemedText>
                </Pressable>
              </View>
            ) : null}

            {/* Estado 4: Vacío tras consulta exitosa */}
            {status === 'success' ? (
              <EmptyState
                icon={Icons.cloud}
                title={debouncedSearch ? 'Sin resultados en la búsqueda' : 'No hay fotos en la nube'}
                description={
                  debouncedSearch
                    ? `No se encontraron fotos que coincidan con "${debouncedSearch}".`
                    : 'Toma fotos o sube desde la Biblioteca para respaldarlas en tu cuenta.'
                }
              />
            ) : null}
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Brand.primary} />
              <ThemedText type="small" themeColor="textSecondary" style={{ marginLeft: 8 }}>
                Cargando más fotos…
              </ThemedText>
            </View>
          ) : null
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
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cloudBadge: {
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(32, 138, 239, 0.3)',
  },
  cloudBadgeText: {
    color: Brand.primary,
    fontSize: 12,
  },
  offlineBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  offlineText: {
    color: '#D97706',
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.two,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageWrap: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Night.fill,
  },
  badgeTopLeft: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
  },
  favoriteBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteText: {
    color: '#F59E0B',
    fontSize: 16,
    lineHeight: 18,
  },
  cardBody: {
    padding: Spacing.two,
    gap: Spacing.one,
  },
  coords: {
    fontSize: 12,
  },
  note: {
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
  },
  deleteBtnPressed: {
    opacity: 0.6,
  },
  deleteText: {
    color: Brand.danger,
    fontSize: 12,
  },
  centerBlock: {
    paddingTop: Spacing.four,
    alignItems: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  errorBox: {
    padding: Spacing.three,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Brand.danger,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  retryBtn: {
    backgroundColor: Brand.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: Radii.pill,
  },
  retryText: {
    color: Brand.onBrand,
    fontSize: 12,
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
  },
});
