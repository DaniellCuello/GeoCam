import { Image } from 'expo-image';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { SourceBadge } from '@/components/SourceBadge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import type { GeoPhoto } from '@/types/geo';
import { formatAccuracy, formatCoords, formatTimestamp } from '@/utils/geo-format';

type GeoPhotoCardProps = {
  photo: GeoPhoto;
  /** Si se indica, muestra un botón para eliminar la foto. */
  onRemove?: (id: string) => void;
  /** Permite ajustar el ancho, por ejemplo en la lista de la web. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Tarjeta reutilizable de foto. Muestra miniatura, origen, coordenadas y fecha
 * de captura, y opcionalmente un botón para eliminarla.
 */
export function GeoPhotoCard({ photo, onRemove, style }: GeoPhotoCardProps) {
  const theme = useTheme();
  const accuracy = formatAccuracy(photo.coords);

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.border }, style]}>
      <Image source={{ uri: photo.uri }} style={styles.thumbnail} contentFit="cover" />

      <View style={styles.body}>
        <SourceBadge source={photo.source} />

        <ThemedText type="code" numberOfLines={1}>
          {formatCoords(photo.coords)}
        </ThemedText>

        {accuracy ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Precisión {accuracy}
          </ThemedText>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {formatTimestamp(photo.createdAt)}
        </ThemedText>
      </View>

      {onRemove ? (
        <Pressable
          onPress={() => onRemove(photo.id)}
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
  removeText: {
    color: Brand.danger,
  },
  pressed: {
    opacity: 0.6,
  },
});
