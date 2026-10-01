import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PermissionPrimer } from '@/components/PermissionPrimer';
import { SourceBadge } from '@/components/SourceBadge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useGeoPhotos } from '@/context/GeoPhotosContext';
import { useCamera } from '@/hooks/useCamera';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useShake } from '@/hooks/useShake';
import { toErrorMessage } from '@/utils/errors';
import { formatAccuracy, formatCoords } from '@/utils/geo-format';
import { canRequestPermission } from '@/utils/permissions';

const CAMERA_RATIONALE = 'GeoCam usa la cámara para tomar fotos geolocalizadas.';
const LOCATION_RATIONALE = 'GeoCam usa tu ubicación para registrar dónde tomaste cada foto.';

/** Los controles no se superponen en pantallas de escritorio. */
const CONTROLS_MAX_WIDTH = 520;

export default function GeoCamScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Native Tabs monta todas las pantallas de forma anticipada: sin este foco
  // la cámara y los sensores seguirían activos al cambiar de pestaña.
  const isFocused = useIsFocused();

  const { photos, addPhoto } = useGeoPhotos();
  const {
    cameraRef,
    permission: cameraPermission,
    isReady,
    isCapturing,
    error: cameraError,
    facing,
    request: requestCamera,
    takePhoto,
    flip,
    openSettings: openCameraSettings,
    onCameraReady,
    onMountError,
  } = useCamera();
  const {
    permission: locationPermission,
    coords,
    error: locationError,
    requestPermission: requestLocation,
    refresh: refreshLocation,
    openSettings: openLocationSettings,
  } = useGeoLocation({ watch: isFocused });

  const [isSaving, setIsSaving] = useState(false);

  // La cámara es la única pantalla oscura: la barra de estado necesita texto
  // claro mientras está enfocada y oscuro en el resto de la app.
  useEffect(() => {
    setStatusBarStyle(isFocused ? 'light' : 'dark');
  }, [isFocused]);

  const handleShake = useCallback(() => {
    Alert.alert('¡Sacudida detectada!', 'GeoCam capturó el sacudón del dispositivo.');
  }, []);

  const { error: shakeError } = useShake(handleShake, 13, 1200, isFocused);

  const latestPhoto = photos[0];

  const handleCapture = useCallback(async () => {
    const uri = await takePhoto();

    if (!uri) {
      return;
    }

    setIsSaving(true);

    try {
      // `coords` viene del watch: se reutiliza en vez de pedir una posición
      // puntual, que en iOS falla cuando ya hay un watch activo.
      await addPhoto('camera', uri, coords);
    } catch (cause) {
      Alert.alert('No se pudo guardar', toErrorMessage(cause));
    } finally {
      setIsSaving(false);
    }
  }, [takePhoto, addPhoto, coords]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      // `mediaTypes: ['images']` es la API actual; `MediaTypeOptions` está obsoleta.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      const asset = result.canceled ? undefined : result.assets[0];

      if (!asset) {
        return;
      }

      await addPhoto('gallery', asset.uri, coords);
    } catch (cause) {
      Alert.alert('No se pudo abrir la galería', toErrorMessage(cause));
    }
  }, [addPhoto, coords]);

  const accuracy = formatAccuracy(coords);
  const isBlockedLocation = locationPermission === 'blocked';
  const isBusyCapturing = isCapturing || isSaving;

  /* ---------------------------------------------------------------------
   * FLUJO A/C/D — la cámara no está concedida: se explica y se actúa a mano.
   * ------------------------------------------------------------------- */
  if (cameraPermission !== 'granted') {
    return (
      <ThemedView
        style={[
          styles.fallback,
          {
            paddingTop: insets.top + Spacing.five,
            paddingBottom: insets.bottom + Spacing.five,
            paddingHorizontal: Layout.gutter,
          },
        ]}>
        {cameraPermission === 'checking' ? (
          <ActivityIndicator color={Brand.primary} />
        ) : (
          <PermissionPrimer
            state={cameraPermission}
            rationale={CAMERA_RATIONALE}
            requestLabel="Permitir cámara"
            onRequest={
              canRequestPermission(cameraPermission) ? () => void requestCamera() : openCameraSettings
            }
            error={cameraError}
          />
        )}
      </ThemedView>
    );
  }

  /* ---------------------------------------------------------------------
   * FLUJO B — cámara lista: preview a pantalla completa y controles encima.
   * ------------------------------------------------------------------- */

  // El botón de captura se mantiene cómodo para el pulgar en cualquier tamaño
  // de pantalla y el resto de controles se reparten a los lados.
  const shutterSize = Math.round(Math.min(88, Math.max(64, width * 0.2)));
  const sideSlot = Math.round(Math.min(72, Math.max(52, width * 0.16)));
  const thumbnailSize = Math.round(sideSlot * 0.86);

  return (
    <View style={styles.root}>
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onCameraReady={onCameraReady}
          onMountError={onMountError}
        />
      ) : null}

      {!isReady || !isFocused ? (
        <View style={styles.cameraLoading} pointerEvents="none">
          <ActivityIndicator color={Brand.onBrand} />
        </View>
      ) : null}

      <View
        style={[
          styles.topOverlay,
          { paddingTop: insets.top + Spacing.three, paddingHorizontal: Layout.gutter },
        ]}
        pointerEvents="box-none">
        <View style={styles.overlayColumn}>
          <View style={styles.topRow}>
            <View style={styles.coordsChip}>
              {locationPermission === 'granted' ? (
                <>
                  <SymbolView
                    name={Icons.location}
                    size={14}
                    tintColor={Brand.onBrand}
                    style={styles.chipIcon}
                  />
                  <ThemedText type="code" style={styles.coordsText} numberOfLines={1}>
                    {coords ? formatCoords(coords) : 'Obteniendo ubicación…'}
                  </ThemedText>
                  {accuracy ? (
                    <ThemedText type="code" style={styles.coordsAccuracy} numberOfLines={1}>
                      {accuracy}
                    </ThemedText>
                  ) : null}
                </>
              ) : (
                <ThemedText type="smallBold" style={styles.coordsText} numberOfLines={1}>
                  {locationPermission === 'checking'
                    ? 'Comprobando ubicación…'
                    : 'Sin permiso de ubicación'}
                </ThemedText>
              )}
            </View>

            <Pressable
              onPress={() => void handlePickFromGallery()}
              accessibilityRole="button"
              accessibilityLabel="Elegir de la galería"
              style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}>
              <SymbolView
                name={Icons.gallery}
                size={20}
                tintColor={Brand.onBrand}
                style={styles.chipIcon}
              />
            </Pressable>
          </View>

          {locationPermission !== 'granted' && locationPermission !== 'checking' ? (
            <Pressable
              onPress={() => {
                if (canRequestPermission(locationPermission)) {
                  void requestLocation();
                  return;
                }
                openLocationSettings();
              }}
              accessibilityRole="button"
              accessibilityLabel={
                isBlockedLocation
                  ? 'Permiso de ubicación bloqueado. Abrir Ajustes'
                  : 'Ubicación rechazada. Volver a pedir el permiso'
              }
              style={({ pressed }) => [styles.locationBanner, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.coordsText} numberOfLines={2}>
                {isBlockedLocation
                  ? 'Permiso bloqueado · toca para abrir Ajustes'
                  : 'Ubicación rechazada · toca para volver a pedirla'}
              </ThemedText>
              <ThemedText type="small" style={styles.bannerText}>
                {isBlockedLocation
                  ? 'Sin ubicación no se etiquetarán las fotos. Actívalo en Ajustes.'
                  : LOCATION_RATIONALE}
              </ThemedText>
            </Pressable>
          ) : null}

          {cameraError || locationError || shakeError ? (
            <View style={styles.errorBanner} pointerEvents="none">
              {cameraError ? (
                <ThemedText type="small" style={styles.errorText} numberOfLines={3}>
                  {cameraError}
                </ThemedText>
              ) : null}
              {locationError ? (
                <ThemedText type="small" style={styles.errorText} numberOfLines={3}>
                  {locationError}
                </ThemedText>
              ) : null}
              {shakeError ? (
                <ThemedText type="small" style={styles.errorText} numberOfLines={3}>
                  {shakeError}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.bottomOverlay,
          { paddingBottom: insets.bottom + Spacing.four, paddingHorizontal: Layout.gutter },
        ]}
        pointerEvents="box-none">
        <View style={styles.controlsRow}>
          <View style={[styles.sideSlot, { width: sideSlot }]}>
            {latestPhoto ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ver última foto y actualizar la ubicación"
                onPress={() => void refreshLocation()}
                style={({ pressed }) => [
                  styles.thumbnailWrap,
                  { width: thumbnailSize, height: thumbnailSize },
                  pressed && styles.pressed,
                ]}>
                <Image
                  source={{ uri: latestPhoto.uri }}
                  style={[
                    styles.thumbnail,
                    { width: thumbnailSize, height: thumbnailSize },
                  ]}
                  contentFit="cover"
                />
                <View style={styles.thumbnailBadge}>
                  <SourceBadge source={latestPhoto.source} />
                </View>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => void handleCapture()}
            disabled={!isReady || isBusyCapturing}
            accessibilityRole="button"
            accessibilityLabel="Tomar foto"
            accessibilityState={{ disabled: !isReady || isBusyCapturing, busy: isBusyCapturing }}
            style={({ pressed }) => [
              styles.shutter,
              { width: shutterSize, height: shutterSize, borderRadius: shutterSize / 2 },
              (!isReady || isBusyCapturing) && styles.shutterDisabled,
              pressed && styles.shutterPressed,
            ]}>
            {isBusyCapturing ? (
              <ActivityIndicator color={Brand.onBrand} />
            ) : (
              <View
                style={{
                  width: shutterSize * 0.74,
                  height: shutterSize * 0.74,
                  borderRadius: shutterSize,
                  backgroundColor: Brand.onBrand,
                }}
              />
            )}
          </Pressable>

          <View style={[styles.sideSlot, styles.sideSlotEnd, { width: sideSlot }]}>
            <Pressable
              onPress={flip}
              accessibilityRole="button"
              accessibilityLabel="Cambiar de cámara"
              style={({ pressed }) => [styles.topButton, pressed && styles.pressed]}>
              <SymbolView
                name={Icons.flipCamera}
                size={20}
                tintColor={Brand.onBrand}
                style={styles.chipIcon}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
  },
  cameraLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Lo que flota sobre la cámara se mantiene en una columna legible. */
  overlayColumn: {
    width: '100%',
    maxWidth: CONTROLS_MAX_WIDTH,
    alignSelf: 'center',
    gap: Spacing.two,
  },
  controlsRow: {
    width: '100%',
    maxWidth: CONTROLS_MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  coordsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Layout.minTouch,
    maxWidth: '100%',
    flexShrink: 1,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    backgroundColor: Brand.scrim,
  },
  chipIcon: {
    width: 22,
    height: 22,
  },
  coordsText: {
    color: Brand.onBrand,
    flexShrink: 1,
  },
  coordsAccuracy: {
    color: Brand.onDarkMuted,
  },
  bannerText: {
    color: Brand.onDarkMuted,
  },
  topButton: {
    width: Layout.minTouch,
    height: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.minTouch / 2,
    backgroundColor: Brand.scrim,
  },
  locationBanner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.md,
    backgroundColor: Brand.scrim,
  },
  errorBanner: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radii.md,
    backgroundColor: Brand.scrim,
  },
  errorText: {
    color: '#FFB4AB',
  },
  sideSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSlotEnd: {
    alignItems: 'flex-end',
  },
  thumbnailWrap: {
    alignItems: 'center',
  },
  thumbnail: {
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Brand.onBrand,
    backgroundColor: '#00000033',
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: -Spacing.three,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    borderWidth: 4,
    borderColor: Brand.onBrand,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000033',
  },
  shutterPressed: {
    opacity: 0.6,
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
});
