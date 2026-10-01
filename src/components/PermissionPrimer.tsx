import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import type { PermissionState } from '@/types/geo';
import { describePermissionState } from '@/utils/permissions';

type PermissionPrimerProps = {
  /** Estado actual del permiso, ya normalizado. */
  state: PermissionState;
  /** Texto exacto que explica por qué la app necesita el permiso. */
  rationale: string;
  /** Etiqueta del botón de solicitud, por ejemplo "Permitir cámara". */
  requestLabel: string;
  onRequest: () => void;
  /** Mensaje de error opcional (por ejemplo, sensor no disponible). */
  error?: string | null;
  /** Etiqueta cuando el permiso fue rechazado y se puede volver a pedir. */
  deniedLabel?: string;
  /** Etiqueta del botón de ajustes cuando el permiso quedó bloqueado. */
  blockedLabel?: string;
};

/**
 * Bloque reutilizable de permiso: nunca solicita nada por su cuenta, solo
 * invoca `onRequest` cuando la persona pulsa el botón.
 *
 * Las tres evidencias que pide la entrega se distinguen aquí:
 * `undetermined` → "Permiso pendiente", `denied` → "Permiso rechazado" y
 * `blocked` → "Permiso bloqueado" con el botón *Abrir Ajustes*.
 */
export function PermissionPrimer({
  state,
  rationale,
  requestLabel,
  onRequest,
  error,
  deniedLabel = 'Volver a pedir',
  blockedLabel = 'Abrir Ajustes',
}: PermissionPrimerProps) {
  const theme = useTheme();
  const buttonLabel =
    state === 'blocked' ? blockedLabel : state === 'denied' ? deniedLabel : requestLabel;
  const isBlocked = state === 'blocked';

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.container, { borderColor: theme.border, boxShadow: theme.shadow }]}>
      <View style={[styles.iconWrap, { backgroundColor: Brand.primarySoft }]}>
        <SymbolView name={Icons.camera} size={24} tintColor={Brand.primary} style={styles.icon} />
      </View>

      <ThemedText type="cardTitle" style={styles.title} accessibilityRole="header">
        {describePermissionState(state)}
      </ThemedText>

      <ThemedText themeColor="textSecondary" style={styles.paragraph}>
        {rationale}
      </ThemedText>

      {isBlocked ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.paragraph}>
          Actívalo en Ajustes → permisos de la aplicación.
        </ThemedText>
      ) : null}

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={onRequest}
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={styles.buttonText}>
          {buttonLabel}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radii.xl,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
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
  paragraph: {
    textAlign: 'center',
  },
  error: {
    textAlign: 'center',
    color: Brand.danger,
  },
  button: {
    minHeight: Layout.minTouch,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    backgroundColor: Brand.primary,
  },
  buttonText: {
    color: Brand.onBrand,
  },
  pressed: {
    opacity: 0.75,
  },
});
