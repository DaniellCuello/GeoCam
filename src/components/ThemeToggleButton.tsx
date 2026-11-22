import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useThemeContext } from '@/context/ThemeContext';
import { Icons } from '@/constants/icons';
import { Brand, Radii, Spacing } from '@/constants/theme';

type ThemeToggleButtonProps = {
  style?: object;
};

export function ThemeToggleButton({ style }: ThemeToggleButtonProps) {
  const { isDark, toggleTheme } = useThemeContext();

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      accessibilityHint="Alterna entre el tema claro y oscuro de la aplicación"
      style={({ pressed }) => [
        styles.button,
        isDark ? styles.buttonDark : styles.buttonLight,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.iconContainer}>
        <SymbolView
          name={isDark ? Icons.sun : Icons.moon}
          size={20}
          tintColor={isDark ? '#F59E0B' : '#6366F1'}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDark: {
    backgroundColor: 'rgba(24, 24, 27, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  buttonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E4E7',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
});
