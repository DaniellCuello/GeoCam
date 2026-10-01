import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { GeoPhotoCard } from '@/components/GeoPhotoCard';
import { SourceBadge } from '@/components/SourceBadge';
import { ThemedText } from '@/components/themed-text';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useGeoPhotos } from '@/context/GeoPhotosContext';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/utils/confirm';
import { formatCoords, formatTimestamp } from '@/utils/geo-format';
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
  const { photos, removePhoto, clearAll } = useGeoPhotos();
  // El mapa solo necesita la posición mientras la pestaña está enfocada.
  const { permission: locationPermission, coords: currentCoords } = useGeoLocation({
    watch: isFocused,
  });

  const { locatedPhotos, unlocatedPhotos } = useMemo(
    () => ({
      locatedPhotos: photos.filter((photo) => photo.coords !== null),
      unlocatedPhotos: photos.filter((photo) => photo.coords === null),
    }),
    [photos]
  );

  const region = useMemo(() => toRegion(currentCoords), [currentCoords]);

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmAction({
      title: 'Vaciar colección',
      message: `Se eliminarán las ${photos.length} fotos.`,
      confirmLabel: 'Vaciar',
      destructive: true,
    });

    if (confirmed) {
      clearAll();
    }
  }, [photos.length, clearAll]);

  // El `Callout` se dimensiona con la pantalla: en un iPhone pequeño no debe
  // comerse el mapa y en una tablet tampoco debe quedarse diminuto.
  const calloutWidth = Math.round(Math.min(220, Math.max(150, width * 0.58)));
  const calloutImageHeight = Math.round(calloutWidth * 0.62);

  const counterLabel =
    photos.length === 0
      ? 'Sin fotografías todavía'
      : `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'} · ${
          locatedPhotos.length
        } en el mapa`;

  return (
    <View style={styles.root}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={locationPermission === 'granted'}
        showsMyLocationButton={false}>
        {locatedPhotos.map((photo) =>
          photo.coords ? (
            <Marker
              key={photo.id}
              coordinate={photo.coords}
              title={`${formatCoords(photo.coords)} · ${formatTimestamp(photo.createdAt)}`}
              description={photo.source === 'camera' ? 'Tomada con la cámara' : 'Desde la galería'}>
              <Callout tooltip>
                <View style={[styles.callout, { width: calloutWidth }]}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={[styles.calloutImage, { height: calloutImageHeight }]}
                    contentFit="cover"
                  />
                  <SourceBadge source={photo.source} />
                  <ThemedText type="code" numberOfLines={1}>
                    {formatCoords(photo.coords)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {formatTimestamp(photo.createdAt)}
                  </ThemedText>
                </View>
              </Callout>
            </Marker>
          ) : null
        )}
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
              <GeoPhotoCard key={photo.id} photo={photo} onRemove={removePhoto} />
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
