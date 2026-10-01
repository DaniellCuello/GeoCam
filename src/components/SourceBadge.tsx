import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radii, Spacing } from '@/constants/theme';
import { Icons, type AppIcon } from '@/constants/icons';
import type { GeoSource } from '@/types/geo';

const SOURCE_META = {
  camera: {
    label: 'Cámara',
    color: Brand.primary,
    icon: Icons.camera,
  },
  gallery: {
    label: 'Galería',
    color: '#7E57C2',
    icon: Icons.gallery,
  },
} as const satisfies Record<GeoSource, { label: string; color: string; icon: AppIcon }>;

/**
 * Distingue visualmente el origen de cada foto con color, icono y etiqueta,
 * para separar las capturas de cámara de las elegidas en la galería.
 */
export function SourceBadge({ source }: { source: GeoSource }) {
  const meta = SOURCE_META[source];

  return (
    <View style={[styles.badge, { borderColor: meta.color, backgroundColor: `${meta.color}1A` }]}>
      <SymbolView name={meta.icon} size={12} tintColor={meta.color} style={styles.icon} />
      <ThemedText type="smallBold" style={{ color: meta.color }} numberOfLines={1}>
        {meta.label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  icon: {
    width: 14,
    height: 14,
  },
});
