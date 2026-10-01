import * as Location from 'expo-location';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Coords, GeoPhoto, GeoSource } from '@/types/geo';

type GeoPhotosContextValue = {
  /** Todas las fotos capturadas, en orden cronológico inverso. */
  photos: GeoPhoto[];
  /**
   * Registra una foto con la ubicación del momento de la captura.
   *
   * Si la pantalla ya tiene coordenadas vivas del `watchPositionAsync`, se pasan
   * en `knownCoords` y se ahorra la llamada puntual, que en iOS falla con
   * `getCurrentPositionAsync` cuando ya hay un watch en marcha. Sin ellas se
   * consulta el módulo una sola vez y, si falla, la foto se registra igual.
   *
   * Las fotos de la galería conservan las coordenadas actuales del dispositivo,
   * ya que la biblioteca no expone EXIF.
   */
  addPhoto: (source: GeoSource, uri: string, knownCoords?: Coords | null) => Promise<GeoPhoto | null>;
  /** Elimina una foto por id. */
  removePhoto: (id: string) => void;
  /** Vacía la colección. */
  clearAll: () => void;
};

const GeoPhotosContext = createContext<GeoPhotosContextValue | null>(null);

const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
};

export function GeoPhotosProvider({ children }: { children: ReactNode }) {
  const [photos, setPhotos] = useState<GeoPhoto[]>([]);
  const idRef = useRef(0);

  const addPhoto = useCallback(
    async (source: GeoSource, uri: string, knownCoords?: Coords | null) => {
      let coords: Coords | null = knownCoords ?? null;

      if (!coords) {
        try {
          const position = await Location.getCurrentPositionAsync(LOCATION_OPTIONS);
          coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
          };
        } catch {
          // Sin ubicación la foto se registra igual y se muestra en "Sin ubicación".
          coords = null;
        }
      }

      idRef.current += 1;
      const photo: GeoPhoto = {
        id: `photo-${Date.now()}-${idRef.current}`,
        uri,
        createdAt: Date.now(),
        source,
        coords,
      };

      setPhotos((current) => [photo, ...current]);

      return photo;
    },
    []
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setPhotos([]);
  }, []);

  const value = useMemo<GeoPhotosContextValue>(
    () => ({ photos, addPhoto, removePhoto, clearAll }),
    [photos, addPhoto, removePhoto, clearAll]
  );

  return <GeoPhotosContext.Provider value={value}>{children}</GeoPhotosContext.Provider>;
}

export function useGeoPhotos(): GeoPhotosContextValue {
  const context = useContext(GeoPhotosContext);

  if (!context) {
    throw new Error('useGeoPhotos debe usarse dentro de <GeoPhotosProvider>.');
  }

  return context;
}
