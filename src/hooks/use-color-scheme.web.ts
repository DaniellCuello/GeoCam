import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * `useSyncExternalStore` permite distinguir el render del servidor del primer
 * render del cliente sin llamar a `setState` dentro de un efecto, que provoca
 * renders en cascada.
 */
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  const hasHydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
