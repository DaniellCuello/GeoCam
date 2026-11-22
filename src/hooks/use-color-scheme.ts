import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { useThemeContext } from '@/context/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  try {
    const context = useThemeContext();
    if (context && context.colorScheme) {
      return context.colorScheme;
    }
  } catch (e) {}

  const device = useDeviceColorScheme();
  return device === 'light' ? 'light' : 'dark';
}
