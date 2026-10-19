import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GeoCamLogo } from '@/components/GeoCamLogo';
import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Layout, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { signIn, signUp } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || password.length < 6) {
      setErrorMsg('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }

    setErrorMsg(null);
    setIsBusy(true);

    try {
      const error = isRegistering
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setErrorMsg(error);
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Spacing.six),
            paddingBottom: Math.max(insets.bottom, Spacing.six),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <GeoCamLogo size={70} />
            <ThemedText type="hero" style={styles.title}>
              GeoCam
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              {isRegistering
                ? 'Crea tu cuenta para respaldar tus fotos en la nube'
                : 'Inicia sesión para sincronizar tus fotos con Supabase'}
            </ThemedText>
          </View>

          {errorMsg && (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Correo electrónico
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMsg(null);
                }}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="label" themeColor="textSecondary">
                Contraseña
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMsg(null);
                }}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.submitBtn,
                { opacity: pressed || isBusy ? 0.8 : 1 },
              ]}
              onPress={handleSubmit}
            >
              {isBusy ? (
                <ActivityIndicator color={Brand.onBrand} />
              ) : (
                <ThemedText style={styles.submitText}>
                  {isRegistering ? 'Registrarse' : 'Ingresar'}
                </ThemedText>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alternar entre inicio de sesión y registro"
              style={styles.switchBtn}
              onPress={() => {
                setIsRegistering(!isRegistering);
                setErrorMsg(null);
              }}
            >
              <ThemedText themeColor="textSecondary" style={styles.switchText}>
                {isRegistering
                  ? '¿Ya tienes una cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate gratis'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.five,
  },
  logoRow: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    marginTop: Spacing.two,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: Radii.md,
    padding: Spacing.three,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: 16,
    minHeight: Layout.minTouch,
  },
  submitBtn: {
    backgroundColor: Brand.primary,
    borderRadius: Radii.md,
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  submitText: {
    color: Brand.onBrand,
    fontWeight: '700',
    fontSize: 16,
  },
  switchBtn: {
    alignItems: 'center',
    padding: Spacing.two,
    minHeight: Layout.minTouch,
    justifyContent: 'center',
  },
  switchText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
