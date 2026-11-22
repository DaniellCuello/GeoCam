import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ColorScheme = 'light' | 'dark';

type ThemeContextType = {
  colorScheme: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
};

const THEME_STORAGE_KEY = 'GEOCAM_THEME_PREFERENCE';

const ThemeContext = createContext<ThemeContextType>({
  colorScheme: 'dark',
  isDark: true,
  toggleTheme: () => {},
  setColorScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [colorScheme, setSchemeState] = useState<ColorScheme>(deviceScheme === 'light' ? 'light' : 'dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark') {
          setSchemeState(stored);
        } else if (deviceScheme) {
          setSchemeState(deviceScheme === 'light' ? 'light' : 'dark');
        }
      })
      .catch(() => {});
  }, [deviceScheme]);

  const setColorScheme = (scheme: ColorScheme) => {
    setSchemeState(scheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, scheme).catch(() => {});
  };

  const toggleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        isDark: colorScheme === 'dark',
        toggleTheme,
        setColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
