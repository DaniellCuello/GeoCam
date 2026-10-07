import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { GeoPhotoCard } from '@/components/GeoPhotoCard';
import { PhotoFilters } from '@/components/PhotoFilters';
import { SourceBadge } from '@/components/SourceBadge';
import { ThemedText } from '@/components/themed-text';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useAlbums } from '@/hooks/useAlbums';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { usePhotos } from '@/hooks/usePhotos';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/utils/confirm';
import { toErrorMessage } from '@/utils/errors';
import { formatCoords, formatTimestamp, photoCoords } from '@/utils/geo-format';
import type { Coords } from '@/types/geo';

/**
 * Pantalla de mapa para iOS y Android.
 *
 * La versión web vive en `mapa.web.tsx`: `react-native-maps` importa
 * `codegenNativeComponent` desde `react-native`, que `react-native-web` no
 * exporta, así que el módulo debe quedar fuera del grafo de web en lugar de
 * esquivarse con un `Platform.OS === 'web'`.
 */

/** Región mundial por defecto: el centro del mapa antes de tener fotos. */
const DEFAULT_REGION: Region = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 90,
  longitudeDelta: 180,
};

const REGION_SIZE = 0.08;

function toRegion(coords: Coords | null): Region {
  if (!coords) {
    return DEFAULT_REGION;
  }

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: REGION_SIZE,
    longitudeDelta: REGION_SIZE,
  };
}

export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [albumId, setAlbumId] = useState<number | null | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const { photos, photosWithLocation, removePhoto, clearAll, queryError } = usePhotos({
    search,
    albumId,
    onlyFavorites,
  });
  const { albums, error: albumsError, createAlbum, removeAlbum } = useAlbums();
  // El mapa solo necesita la posición mientras la pestaña está enfocada.
  const { permission: locationPermission, coords: currentCoords } = useGeoLocation({
    watch: isFocused,
  });

  const { unlocatedPhotos } = useMemo(
    () => ({
      unlocatedPhotos: photos.filter((photo) => photo.latitude === null),
    }),
    [photos]
  );

  const photoCount = photos.length;
  const region = useMemo(() => toRegion(currentCoords), [currentCoords]);

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmAction({
      title: 'Vaciar colección',
      message: `Se eliminarán las ${photoCount} fotos.`,
      confirmLabel: 'Vaciar',
      destructive: true,
    });

    if (confirmed) {
      try {
        await clearAll();
        setClearError(null);
      } catch (cause) {
        setClearError(toErrorMessage(cause, 'No se pudieron borrar las fotografías.'));
      }
    }
  }, [photoCount, clearAll]);

  const handleRemovePhoto = useCallback(
    async (id: number) => {
      try {
        await removePhoto(id);
      } catch (cause) {
        setClearError(toErrorMessage(cause, 'No se pudo eliminar la fotografía.'));
      }
    },
    [removePhoto]
  );

  // El `Callout` se dimensiona con la pantalla: en un iPhone pequeño no debe
  // comerse el mapa y en una tablet tampoco debe quedarse diminuto.
  const calloutWidth = Math.round(Math.min(220, Math.max(150, width * 0.58)));
  const calloutImageHeight = Math.round(calloutWidth * 0.62);

  const counterLabel =
    photos.length === 0
      ? 'Sin fotografías todavía'
      : `${photoCount} ${photoCount === 1 ? 'foto' : 'fotos'} · ${
          photosWithLocation.length
        } en el mapa`;

  return (
    <View style={styles.root}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={locationPermission === 'granted'}
        showsMyLocationButton={false}>
        {photosWithLocation.map((photo) => {
          const coords = photoCoords(photo);
          return coords ? (
            <Marker
              key={photo.id}
              coordinate={coords}
              title={`${formatCoords(coords)} · ${formatTimestamp(photo.createdAt)}`}
              description={photo.source === 'camera' ? 'Tomada con la cámara' : 'Desde la galería'}>
              <Callout
                tooltip
                onPress={() =>
                  router.push({
                    pathname: '/foto/[id]',
                    params: { id: String(photo.id) },
                  })
                }>
                <View style={[styles.callout, { width: calloutWidth }]}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={[styles.calloutImage, { height: calloutImageHeight }]}
                    contentFit="cover"
                  />
                  <SourceBadge source={photo.source} />
                  <ThemedText type="code" numberOfLines={1}>
                    {formatCoords(coords)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {formatTimestamp(photo.createdAt)}
                  </ThemedText>
                </View>
              </Callout>
            </Marker>
          ) : null;
        })}
      </MapView>

      {/* Encabezado: arranca debajo del notch, la Dynamic Island o la barra de
          estado, porque el padding viene de los insets reales de la pantalla. */}
      <View
        style={[styles.header, { paddingTop: insets.top + Spacing.three }]}
        pointerEvents="box-none">
        <View style={styles.headerRow}>
          <View style={styles.headerChip}>
            <SymbolView
              name={Icons.location}
              size={14}
              tintColor={Brand.onBrand}
              style={styles.headerIcon}
            />
            <ThemedText type="smallBold" style={styles.headerText} numberOfLines={1}>
              {counterLabel}
            </ThemedText>
          </View>

          {photos.length > 0 ? (
            <Pressable
              onPress={() => void handleClearAll()}
              accessibilityRole="button"
              accessibilityLabel="Vaciar la colección de fotografías"
              style={({ pressed }) => [
                styles.headerChip,
                styles.dangerChip,
                pressed && styles.pressed,
              ]}>
              <SymbolView
                name={Icons.trash}
                size={14}
                tintColor="#FFB4AB"
                style={styles.headerIcon}
              />
              <ThemedText type="smallBold" style={styles.dangerText} numberOfLines={1}>
                Vaciar
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.filters,
          {
            top: insets.top + 56,
          },
        ]}>
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
      </View>

      {queryError || albumsError || clearError ? (
        <View style={[styles.errorNotice, { top: insets.top + 112 }]}>
          <ThemedText type="smallBold" style={styles.errorText}>
            {queryError?.message ?? albumsError?.message ?? clearError}
          </ThemedText>
        </View>
      ) : null}

      {photos.length === 0 ? (
        <View style={styles.emptyWrap} pointerEvents="box-none">
          <EmptyState
            icon={Icons.photo}
            title="Todavía no hay fotografías"
            description="Tus fotografías aparecerán aquí en cuanto tomes la primera."
            actionLabel="Abrir la cámara"
            onAction={() => router.push('/geocam')}
            tone="overlay"
          />
        </View>
      ) : null}

      {unlocatedPhotos.length > 0 ? (
        <View
          style={[
            styles.sheet,
            {
              // Por debajo de la barra de pestañas y del indicador de inicio.
              paddingBottom: insets.bottom + Spacing.three,
              maxHeight: height < 700 ? '40%' : '50%',
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

          <ThemedText type="smallBold" style={styles.sheetTitle}>
            Sin ubicación ({unlocatedPhotos.length})
          </ThemedText>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}>
            {unlocatedPhotos.map((photo) => (
              <GeoPhotoCard key={photo.id} photo={photo} onRemove={handleRemovePhoto} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E0E1E6',
  },
  callout: {
    maxWidth: 240,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  calloutImage: {
    width: '100%',
    borderRadius: Radii.md,
    backgroundColor: '#00000022',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Layout.gutter,
  },
  filters: {
    position: 'absolute',
    alignSelf: 'center',
    width: '100%',
  },
  errorNotice: {
    position: 'absolute',
    left: Layout.gutter,
    right: Layout.gutter,
    padding: Spacing.two,
    borderRadius: Radii.md,
    backgroundColor: Brand.dangerSoft,
  },
  errorText: {
    color: Brand.danger,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Layout.minTouch - 4,
    maxWidth: '100%',
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    backgroundColor: Brand.scrim,
  },
  headerIcon: {
    width: 18,
    height: 18,
  },
  headerText: {
    color: Brand.onBrand,
    flexShrink: 1,
  },
  dangerChip: {
    flexShrink: 0,
  },
  dangerText: {
    color: '#FFB4AB',
  },
  pressed: {
    opacity: 0.6,
  },
  emptyWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.gutter,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.two,
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.three,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderTopWidth: 1,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: Radii.pill,
  },
  sheetTitle: {
    paddingHorizontal: Spacing.one,
  },
  /** `flexShrink` deja que la lista se encoja y pueda desplazarse. */
  sheetScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  sheetContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
});
