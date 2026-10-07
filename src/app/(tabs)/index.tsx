import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GeoCamLogo } from '@/components/GeoCamLogo';
import { ThemedText } from '@/components/themed-text';
import { TopographicBackdrop } from '@/components/TopographicBackdrop';
import { Brand, Layout, Night, Radii, Spacing } from '@/constants/theme';
import { Icons, type AppIcon } from '@/constants/icons';
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
 * táctil completa, para que también funcione con lector de pantalla. El relleno
 * es cristal oscuro: deja ver el relieve del fondo sin estropear el texto.
 */
function ActionCard({ icon, tone, title, description, onPress, style }: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint={`Abre la sección ${title}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: Night.fill, borderColor: Night.border },
        style,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.cardIcon, { backgroundColor: `${tone}26` }]}>
        <SymbolView name={icon} size={22} tintColor={tone} style={styles.cardIconGlyph} />
      </View>

      <View style={styles.cardBody}>
        <ThemedText type="cardTitle" tone="onDark">
          {title}
        </ThemedText>
        <ThemedText type="small" tone="onDarkMuted">
          {description}
        </ThemedText>
      </View>

      <SymbolView name={Icons.chevron} size={18} tintColor={Brand.onDarkMuted} />
    </Pressable>
  );
}

/**
 * Pantalla de inicio de GeoCam.
 *
 * Solo presenta la marca y da acceso a las dos secciones. No monta `useCamera`,
 * `useGeoLocation` ni `useShake`, así que abrirla no dispara ningún diálogo de
 * permisos: el permiso se pide dentro de la sección correspondiente.
 *
 * El fondo es negro con curvas de nivel, igual en modo claro y oscuro: por eso
 * toda la pantalla usa `Night` y `tone="onDark"` en vez del tema del sistema.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { photos, photosWithLocation, queryError } = usePhotos();

  const isWide = width >= 880;
  const locatedCount = photosWithLocation.length;

  return (
    <View style={[styles.root, { backgroundColor: Night.backdrop }]}>
      <TopographicBackdrop />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (isWide ? Spacing.seven : Spacing.five),
            paddingBottom: insets.bottom + Spacing.six,
            paddingHorizontal: Layout.gutter,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.column}>
          <Animated.View entering={FadeIn.duration(320)} style={styles.hero}>
            <GeoCamLogo size={isWide ? 128 : 104} />
            <ThemedText type="hero" tone="onDark" accessibilityRole="header">
              GeoCam
            </ThemedText>
            <ThemedText type="default" tone="onDarkMuted" style={styles.tagline}>
              Fotos que llevan contigo el lugar donde ocurrieron.
            </ThemedText>
          </Animated.View>

          {queryError ? (
            <ThemedText type="small" tone="onDark">
              No se pudieron cargar las fotografías: {queryError.message}
            </ThemedText>
          ) : null}

          {photos.length > 0 ? (
            <View style={[styles.stats, { backgroundColor: Night.fill, borderColor: Night.border }]}>
              <View style={styles.stat}>
                <ThemedText type="cardTitle" tone="onDark">
                  {photos.length}
                </ThemedText>
                <ThemedText type="label" tone="onDarkMuted">
                  {photos.length === 1 ? 'Foto' : 'Fotos'}
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: Night.border }]} />
              <View style={styles.stat}>
                <ThemedText type="cardTitle" tone="onDark">
                  {locatedCount}
                </ThemedText>
                <ThemedText type="label" tone="onDarkMuted">
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
              tone={Brand.primaryLight}
              title="Biblioteca"
              description="Revisa, busca y organiza todas tus fotos guardadas."
              onPress={() => router.push('/biblioteca')}
              style={isWide ? styles.actionWide : undefined}
            />
            <ActionCard
              icon={Icons.map}
              tone={Brand.map}
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
