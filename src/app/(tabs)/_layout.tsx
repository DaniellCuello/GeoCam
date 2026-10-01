import AppTabs from '@/components/app-tabs';
import { GeoPhotosProvider } from '@/context/GeoPhotosContext';

/**
 * Las pestañas viven en el grupo `(tabs)`. El provider se monta aquí y no en
 * `src/app/_layout.tsx` para que el estado de las fotos quede acotado a las
 * pantallas de GeoCam y no sobreviva fuera del grupo.
 */
export default function TabsLayout() {
  return (
    <GeoPhotosProvider>
      <AppTabs />
    </GeoPhotosProvider>
  );
}
