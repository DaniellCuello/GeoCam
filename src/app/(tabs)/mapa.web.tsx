import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { GeoPhotoCard } from '@/components/GeoPhotoCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useGeoPhotos } from '@/context/GeoPhotosContext';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/utils/confirm';
import { formatCoords } from '@/utils/geo-format';

/**
 * Versión web de la pantalla de mapa.
 *
 * Existe como archivo aparte a propósito: `react-native-maps` no tiene
 * implementación para web y su `src/index.ts` llega hasta
 * `codegenNativeComponent`, que `react-native-web` no exporta. Un simple
 * `Platform.OS === 'web'` dentro de `mapa.tsx` no evita el fallo, porque los
 * `import` son estáticos: Metro carga el módulo y revienta durante el render
 * en servidor antes de evaluar ninguna rama. Separar por plataforma es lo que
 * saca el módulo del grafo de web por completo.
 *
 * Como no hay lienzo de mapa, la versión web aprovecha para listar todas las
 * fotografías con sus coordenadas: es la misma ruta `/mapa`, no una pantalla
 * duplicada.
 */
export default function MapaWebScreen() {
  const isFocused = useIsFocused();
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const { photos, removePhoto, clearAll } = useGeoPhotos();
  // La posición se sigue pidiendo en web para mantener el mismo ciclo de vida.
  const { coords: currentCoords } = useGeoLocation({ watch: isFocused });

  const { locatedPhotos, unlocatedPhotos } = useMemo(
    () => ({
      locatedPhotos: photos.filter((photo) => photo.coords !== null),
      unlocatedPhotos: photos.filter((photo) => photo.coords === null),
    }),
    [photos]
  );

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

  const isWide = width >= 880;

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: Layout.gutter, paddingVertical: Spacing.five },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <ThemedView
            type="backgroundElement"
            style={[styles.notice, { borderColor: theme.border, boxShadow: theme.shadow }]}>
            <View style={[styles.noticeIcon, { backgroundColor: Brand.mapSoft }]}>
              <SymbolView name={Icons.map} size={22} tintColor={Brand.map} style={styles.noticeGlyph} />
            </View>
            <View style={styles.noticeBody}>
              <ThemedText type="cardTitle" accessibilityRole="header">
                El mapa se dibuja en el móvil
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                react-native-maps solo funciona en iOS y Android. En esta lista tienes todas tus
                fotografías con su ubicación.
              </ThemedText>
              {currentCoords ? (
                <ThemedText type="code" themeColor="textSecondary" numberOfLines={1}>
                  Tu posición: {formatCoords(currentCoords)}
                </ThemedText>
              ) : null}
            </View>
          </ThemedView>

          <View style={styles.toolbar}>
            <ThemedText type="title">
              {photos.length === 0
                ? 'Tus fotografías'
                : `${photos.length} ${photos.length === 1 ? 'fotografía' : 'fotografías'}`}
            </ThemedText>

            {photos.length > 0 ? (
              <Pressable
                onPress={() => void handleClearAll()}
                accessibilityRole="button"
                accessibilityLabel="Vaciar la colección de fotografías"
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <SymbolView name={Icons.trash} size={16} tintColor={Brand.danger} />
                <ThemedText type="smallBold" style={styles.clearText}>
                  Vaciar
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {photos.length === 0 ? (
            <EmptyState
              icon={Icons.photo}
              title="Todavía no hay fotografías"
              description="Tus fotografías aparecerán aquí en cuanto tomes la primera."
              actionLabel="Abrir la cámara"
              onAction={() => router.push('/geocam')}
            />
          ) : (
            <>
              {locatedPhotos.length > 0 ? (
                <View style={styles.group}>
                  <ThemedText type="label" themeColor="textSecondary">
                    En el mapa · {locatedPhotos.length}
                  </ThemedText>
                  <View style={[styles.list, isWide && styles.listWide]}>
                    {locatedPhotos.map((photo) => (
                      <GeoPhotoCard
                        key={photo.id}
                        photo={photo}
                        onRemove={removePhoto}
                        style={isWide ? styles.cardWide : undefined}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {unlocatedPhotos.length > 0 ? (
                <View style={styles.group}>
                  <ThemedText type="label" themeColor="textSecondary">
                    Sin ubicación · {unlocatedPhotos.length}
                  </ThemedText>
                  <View style={[styles.list, isWide && styles.listWide]}>
                    {unlocatedPhotos.map((photo) => (
                      <GeoPhotoCard
                        key={photo.id}
                        photo={photo}
                        onRemove={removePhoto}
                        style={isWide ? styles.cardWide : undefined}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    gap: Spacing.five,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  noticeIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: Radii.md,
  },
  noticeGlyph: {
    width: 24,
    height: 24,
  },
  noticeBody: {
    flex: 1,
    gap: Spacing.one,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.pill,
    backgroundColor: Brand.dangerSoft,
  },
  clearText: {
    color: Brand.danger,
  },
  pressed: {
    opacity: 0.7,
  },
  group: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.three,
  },
  listWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardWide: {
    flexGrow: 1,
    flexBasis: 300,
  },
});
