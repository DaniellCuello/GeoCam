import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import type { AppIcon } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';

type EmptyStateProps = {
  icon: AppIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `overlay` para flotar sobre el mapa; `surface` para una tarjeta normal. */
  tone?: 'surface' | 'overlay';
};

/**
 * Estado vacío: nunca se muestra un hueco sin explicación. Si la pantalla
 * tiene una acción útil (ir a la cámara) se ofrece como botón.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  tone = 'surface',
}: EmptyStateProps) {
  const theme = useTheme();
  const isOverlay = tone === 'overlay';

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.card,
        { borderColor: theme.border, boxShadow: theme.shadowStrong },
        isOverlay && styles.overlayCard,
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: Brand.primarySoft }]}>
        <SymbolView name={icon} size={24} tintColor={Brand.primary} style={styles.icon} />
      </View>

      <ThemedText type="cardTitle" style={styles.title} accessibilityRole="header">
        {title}
      </ThemedText>

      <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
        {description}
      </ThemedText>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <ThemedText type="smallBold" style={styles.actionText}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radii.xl,
    borderWidth: 1,
    maxWidth: Layout.contentMaxWidth,
    width: '100%',
  },
  overlayCard: {
    paddingVertical: Spacing.four,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
  },
  icon: {
    width: 26,
    height: 26,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    maxWidth: 320,
  },
  action: {
    minHeight: Layout.minTouch,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    backgroundColor: Brand.primary,
  },
  actionPressed: {
    opacity: 0.75,
  },
  actionText: {
    color: Brand.onBrand,
  },
});
