import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { EmptyState } from '@/components/EmptyState';
import { SourceBadge } from '@/components/SourceBadge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteCloudPhoto,
  listCloudPhotos,
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

  const [photos, setPhotos] = useState<CloudPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(() => !!user?.id);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let isMounted = true;

    listCloudPhotos(user.id)
      .then((data) => {
        if (isMounted) {
          setPhotos(data);
          setIsLoading(false);
          setErrorMsg(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(toErrorMessage(err, 'No se pudieron cargar las fotos de Supabase.'));
          setIsLoading(false);
        }
      });

    // C4: Escucha reactiva en tiempo real con postgres_changes
    const unsubscribe = subscribeToUserCloudPhotos(() => {
      listCloudPhotos(user.id)
        .then((data) => {
          if (isMounted) {
            setPhotos(data);
          }
        })
        .catch((err) => {
          console.warn('Error en actualización realtime:', err);
        });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.id]);

  const handleDeleteRemote = async (photo: CloudPhoto) => {
    const confirmed = await confirmAction({
      title: 'Eliminar de la nube',
      message: 'Se eliminará la foto de Supabase Storage y su fila en PostgreSQL.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!confirmed || !user?.id) return;

    try {
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
        },
        user.id
      );
      setPhotos((prev) => prev.filter((p) => p.client_id !== photo.client_id));
    } catch (err) {
      setErrorMsg(toErrorMessage(err, 'No se pudo eliminar de la nube.'));
    }
  };

  return (
    <ThemedView style={styles.root}>
      <FlatList
        data={photos}
        keyExtractor={(item) => String(item.id || item.client_id)}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + Spacing.five,
          },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ThemedText type="title" accessibilityRole="header">
                Fotos en la Nube
              </ThemedText>
              <View style={styles.badge}>
                <ThemedText type="smallBold" style={styles.badgeText}>
                  ☁️ Supabase
                </ThemedText>
              </View>
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              {isLoading
                ? 'Cargando fotos remotas…'
                : photos.length === 0
                ? 'No hay fotos sincronizadas en la nube'
                : `${photos.length} ${
                    photos.length === 1 ? 'foto sincronizada' : 'fotos sincronizadas'
                  } en tiempo real`}
            </ThemedText>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <ThemedText type="small" style={styles.errorText}>
                  {errorMsg}
                </ThemedText>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}
          >
            {item.signedUrl ? (
              <Image
                source={{ uri: item.signedUrl }}
                style={styles.thumbnail}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.thumbnail, styles.noThumb]}>
                <ThemedText type="small" themeColor="textSecondary">
                  📷
                </ThemedText>
              </View>
            )}

            <View style={styles.cardBody}>
              <View style={styles.metaRow}>
                <SourceBadge source={item.source} />
                {item.favorite ? (
                  <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                    ★
                  </ThemedText>
                ) : null}
              </View>

              <ThemedText type="code" numberOfLines={1}>
                {formatCoords(
                  item.latitude !== null && item.longitude !== null
                    ? {
                        latitude: item.latitude,
                        longitude: item.longitude,
                        accuracy: null,
                      }
                    : null
                )}
              </ThemedText>

              <ThemedText type="small" themeColor="textSecondary">
                {formatTimestamp(new Date(item.taken_at || item.created_at))}
              </ThemedText>

              {item.note ? (
                <ThemedText type="small" numberOfLines={2}>
                  {item.note}
                </ThemedText>
              ) : null}
            </View>

            <Pressable
              onPress={() => void handleDeleteRemote(item)}
              accessibilityRole="button"
              accessibilityLabel="Eliminar de la nube"
              style={styles.deleteBtn}
            >
              <SymbolView name={Icons.trash} size={16} tintColor={Brand.danger} />
            </Pressable>
          </ThemedView>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Brand.primary} />
              <ThemedText themeColor="textSecondary">Conectando a Supabase…</ThemedText>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={Icons.cloud}
                title="Sin fotos en la nube"
                description="Las fotos que subas desde el detalle o mediante 'Sincronizar pendientes' aparecerán aquí en tiempo real y estarán disponibles en cualquier dispositivo al iniciar sesión."
                actionLabel="Ir a la Biblioteca"
                onAction={() => router.push('/biblioteca')}
              />
            </View>
          )
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
    marginBottom: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeText: {
    color: '#1D4ED8',
    fontSize: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.three,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: '#0000001A',
  },
  noThumb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  deleteBtn: {
    minHeight: Layout.minTouch,
    minWidth: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    paddingVertical: Spacing.seven,
    alignItems: 'center',
    gap: Spacing.three,
  },
  emptyWrap: {
    paddingVertical: Spacing.seven,
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: Brand.dangerSoft,
    padding: Spacing.three,
    borderRadius: Radii.md,
    marginTop: Spacing.two,
  },
  errorText: {
    color: Brand.danger,
  },
});
