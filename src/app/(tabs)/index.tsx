import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GeoCamLogo } from '@/components/GeoCamLogo';
import { ThemedText } from '@/components/themed-text';
import { TopographicBackdrop } from '@/components/TopographicBackdrop';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { Brand, Colors, Layout, Night, Radii, Spacing } from '@/constants/theme';
import { Icons, type AppIcon } from '@/constants/icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePhotos } from '@/hooks/usePhotos';

type ActionCardProps = {
  icon: AppIcon;
  tone: string;
  title: string;
  description: string;
  onPress: () => void;
  style?: object;
};

/**
 * Tarjeta de acceso a una sección. Es un `Pressable` con etiqueta, rol y área
 * táctil completa, adaptado reactivamente al modo claro y oscuro con acento Rojo.
 */
function ActionCard({ icon, tone, title, description, onPress, style }: ActionCardProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint={`Abre la sección ${title}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(24, 24, 27, 0.85)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E4E4E7',
        },
        style,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: isDark ? `${tone}26` : `${tone}18` }]}>
        <SymbolView name={icon} size={22} tintColor={tone} style={styles.cardIconGlyph} />
      </View>

      <View style={styles.cardBody}>
        <ThemedText type="cardTitle" tone={isDark ? 'onDark' : undefined}>
          {title}
        </ThemedText>
        <ThemedText
          type="small"
          tone={isDark ? 'onDarkMuted' : undefined}
          themeColor={isDark ? undefined : 'textSecondary'}
        >
          {description}
        </ThemedText>
      </View>

      <SymbolView
        name={Icons.chevron}
        size={18}
        tintColor={isDark ? Brand.onDarkMuted : '#71717A'}
      />
    </Pressable>
  );
}

/**
 * Pantalla de inicio de GeoCam.
 * Presenta el logo de punto de ubicación con cámara en color Rojo,
 * el fondo de camuflaje topográfico de alta definición y el botón
 * para alternar el modo oscuro en la esquina superior derecha.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { photos, photosWithLocation, queryError } = usePhotos();
  const isDark = useColorScheme() === 'dark';

  const isWide = width >= 880;
  const locatedCount = photosWithLocation.length;

  return (
    <View style={[styles.root, { backgroundColor: isDark ? Night.backdrop : Colors.light.background }]}>
      <TopographicBackdrop />

      {/* Botón de alternancia de modo oscuro en la esquina superior derecha */}
      <View style={[styles.topRightBar, { top: insets.top + Spacing.two }]}>
        <ThemeToggleButton />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (isWide ? Spacing.seven : Spacing.six),
            paddingBottom: insets.bottom + Spacing.six,
            paddingHorizontal: Layout.gutter,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <Animated.View entering={FadeIn.duration(320)} style={styles.hero}>
            <GeoCamLogo size={isWide ? 128 : 104} />
            <ThemedText
              type="hero"
              tone={isDark ? 'onDark' : undefined}
              accessibilityRole="header"
            >
              GeoCam
            </ThemedText>
            <ThemedText
              type="default"
              tone={isDark ? 'onDarkMuted' : undefined}
              themeColor={isDark ? undefined : 'textSecondary'}
              style={styles.tagline}
            >
              Fotos que llevan contigo el lugar donde ocurrieron.
            </ThemedText>
          </Animated.View>

          {queryError ? (
            <ThemedText type="small" style={{ color: Brand.danger }}>
              No se pudieron cargar las fotografías: {queryError.message}
            </ThemedText>
          ) : null}

          {photos.length > 0 ? (
            <View
              style={[
                styles.stats,
                {
                  backgroundColor: isDark ? 'rgba(24, 24, 27, 0.85)' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E4E4E7',
                },
              ]}
            >
              <View style={styles.stat}>
                <ThemedText type="cardTitle" tone={isDark ? 'onDark' : undefined}>
                  {photos.length}
                </ThemedText>
                <ThemedText
                  type="label"
                  tone={isDark ? 'onDarkMuted' : undefined}
                  themeColor={isDark ? undefined : 'textSecondary'}
                >
                  {photos.length === 1 ? 'Foto' : 'Fotos'}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.statDivider,
                  { backgroundColor: isDark ? Night.border : '#E4E4E7' },
                ]}
              />
              <View style={styles.stat}>
                <ThemedText type="cardTitle" tone={isDark ? 'onDark' : undefined}>
                  {locatedCount}
                </ThemedText>
                <ThemedText
                  type="label"
                  tone={isDark ? 'onDarkMuted' : undefined}
                  themeColor={isDark ? undefined : 'textSecondary'}
                >
                  Con ubicación
                </ThemedText>
              </View>
            </View>
          ) : null}

          <View style={[styles.actions, isWide && styles.actionsRow]}>
            <ActionCard
              icon={Icons.camera}
              tone={Brand.primary}
              title="Cámara"
              description="Toma fotografías y asócialas con tu ubicación."
              onPress={() => router.push('/geocam')}
              style={isWide ? styles.actionWide : undefined}
            />
            <ActionCard
              icon={Icons.library}
              tone={Brand.primary}
              title="Biblioteca"
              description="Revisa, busca y organiza todas tus fotos guardadas."
              onPress={() => router.push('/biblioteca')}
              style={isWide ? styles.actionWide : undefined}
            />
            <ActionCard
              icon={Icons.map}
              tone={Brand.primaryDeep}
              title="Mapa"
              description="Explora tus fotografías según el lugar donde fueron tomadas."
              onPress={() => router.push('/mapa')}
              style={isWide ? styles.actionWide : undefined}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topRightBar: {
    position: 'absolute',
    right: Layout.gutter,
    zIndex: 100,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  column: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    gap: Spacing.five,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 320,
  },
  stats: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.three,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  statDivider: {
    width: 1,
    marginVertical: Spacing.half,
  },
  actions: {
    gap: Spacing.three,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionWide: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 84,
    padding: Spacing.four,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  cardIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: Radii.md,
  },
  cardIconGlyph: {
    width: 24,
    height: 24,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.one,
  },
});
