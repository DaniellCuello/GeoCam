import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { SourceBadge } from '@/components/SourceBadge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { confirmAction } from '@/utils/confirm';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import type { Photo } from '../../db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatAccuracy, formatCoords, formatTimestamp, photoCoords } from '@/utils/geo-format';

type GeoPhotoCardProps = {
  photo: Photo;
  /** Si se indica, muestra un botón para eliminar la foto. */
  onRemove?: (id: number) => void | Promise<void>;
  /** Permite ajustar el ancho, por ejemplo en la lista de la web. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Tarjeta reutilizable de foto. Muestra miniatura, origen, coordenadas y fecha
 * de captura, y opcionalmente un botón para eliminarla.
 */
export function GeoPhotoCard({ photo, onRemove, style }: GeoPhotoCardProps) {
  const theme = useTheme();
  const coords = photoCoords(photo);
  const accuracy = formatAccuracy(coords);

  const handleRemove = async () => {
    if (!onRemove) {
      return;
    }

    const confirmed = await confirmAction({
      title: 'Eliminar fotografía',
      message: 'Se eliminarán la fotografía y su archivo guardado.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (confirmed) {
      await onRemove(photo.id);
    }
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }, style]}>
      <Image source={{ uri: photo.uri }} style={styles.thumbnail} contentFit="cover" />

      <View style={styles.body}>
        <SourceBadge source={photo.source} />

        <ThemedText type="code" numberOfLines={1}>
          {formatCoords(coords)}
        </ThemedText>

        {accuracy ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Precisión {accuracy}
          </ThemedText>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {formatTimestamp(photo.createdAt)}
        </ThemedText>
        {photo.note ? (
          <ThemedText type="small" numberOfLines={2}>
            {photo.note}
          </ThemedText>
        ) : null}
        {photo.favorite ? (
          <ThemedText type="smallBold" style={styles.favorite}>
            ★ Favorita
          </ThemedText>
        ) : null}
      </View>

      <Pressable
        onPress={() =>
          router.push({
            pathname: '/foto/[id]',
            params: { id: String(photo.id) },
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Ver y editar fotografía"
        style={({ pressed }) => [styles.detail, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.detailText}>
          Ver
        </ThemedText>
      </Pressable>

      {onRemove ? (
        <Pressable
          onPress={() => void handleRemove()}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar la fotografía de las ${formatTimestamp(photo.createdAt)}`}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
          <SymbolView name={Icons.trash} size={16} tintColor={Brand.danger} />
          <ThemedText type="smallBold" style={styles.removeText} numberOfLines={1}>
            Eliminar
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: '#0000001A',
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: Layout.minTouch,
    paddingLeft: Spacing.two,
    alignSelf: 'center',
  },
  detail: {
    minHeight: Layout.minTouch,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  detailText: {
    color: Brand.primary,
  },
  removeText: {
    color: Brand.danger,
  },
  favorite: {
    color: Brand.primary,
  },
  pressed: {
    opacity: 0.6,
  },
});
