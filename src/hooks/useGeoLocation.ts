import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coords, PermissionState } from '@/types/geo';
import { toErrorMessage } from '@/utils/errors';
import { openSettings, toPermissionState } from '@/utils/permissions';

const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
};

/**
 * Una posición del watch más nueva que esto ya es "la ubicación actual", así que
 * no hace falta pedir una puntual.
 *
 * En iOS, llamar a `getCurrentPositionAsync` mientras hay un
 * `watchPositionAsync` activo es justo lo que falla con
 * `FunctionCallException: Calling the 'getCurrentPositionAsync' function has
 * failed`. Reutilizar el fix del watch elimina esa llamada en el caso normal.
 */
const FRESH_WINDOW_MS = 10_000;

function toCoords(position: Location.LocationObject): Coords {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
  };
}

export type UseGeoLocationOptions = {
  /**
   * Cuando es `false` no se registra ningún `watchPositionAsync`.
   * Las pestañas nativas renderizan de forma anticipada, por lo que la
   * suscripción se activa solo mientras la pantalla está enfocada.
   */
  watch?: boolean;
};

export function useGeoLocation({ watch = false }: UseGeoLocationOptions = {}) {
  const [permission, setPermission] = useState<PermissionState>('checking');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const mountedRef = useRef(true);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  /** Último fix recibido, con su marca de tiempo, para no volver a pedirlo. */
  const lastFixRef = useRef<{ coords: Coords; at: number } | null>(null);
  /** Evita dos `getCurrentPositionAsync` simultáneos, que en iOS también fallan. */
  const refreshingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    // Solo consulta el estado del permiso: la pantalla lo solicita explícitamente.
    void Location.getForegroundPermissionsAsync()
      .then((response) => {
        if (mountedRef.current) {
          setPermission(toPermissionState(response));
        }
      })
      .catch((cause: unknown) => {
        if (mountedRef.current) {
          setPermission('denied');
          setError(toErrorMessage(cause, 'No se pudo leer el permiso de ubicación.'));
        }
      });

    return () => {
      mountedRef.current = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, []);

  /** Solicita el permiso en primer plano. La UI debe llamarlo desde un botón. */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const response = await Location.requestForegroundPermissionsAsync();
      const next = toPermissionState(response);

      if (mountedRef.current) {
        setPermission(next);
        setError(null);
      }

      return next === 'granted';
    } catch (cause) {
      if (mountedRef.current) {
        setPermission('denied');
        setError(toErrorMessage(cause, 'No se pudo solicitar el permiso de ubicación.'));
      }

      return false;
    }
  }, []);

  /**
   * Ubicación puntual bajo demanda. No inicia el watch, por lo que es seguro
   * llamarla desde un botón.
   *
   * Si el watch acaba de entregar una posición, se devuelve esa sin tocar el
   * módulo nativo. Si la petición puntual falla pero había un fix anterior, se
   * devuelve ese: una ubicación de hace unos segundos es mejor que un error en
   * pantalla, y la foto se puede etiquetar igual.
   */
  const refresh = useCallback(async (): Promise<Coords | null> => {
    const last = lastFixRef.current;

    if (last && Date.now() - last.at < FRESH_WINDOW_MS) {
      return last.coords;
    }

    if (refreshingRef.current) {
      return last?.coords ?? null;
    }

    refreshingRef.current = true;
    setIsLocating(true);

    try {
      const position = await Location.getCurrentPositionAsync(LOCATION_OPTIONS);
      const next = toCoords(position);
      lastFixRef.current = { coords: next, at: Date.now() };

      if (mountedRef.current) {
        setCoords(next);
        setError(null);
      }

      return next;
    } catch (cause) {
      if (mountedRef.current) {
        if (last) {
          setCoords(last.coords);
          setError(null);
        } else {
          setError(toErrorMessage(cause, 'No se pudo obtener la ubicación actual.'));
        }
      }

      return last?.coords ?? null;
    } finally {
      refreshingRef.current = false;

      if (mountedRef.current) {
        setIsLocating(false);
      }
    }
  }, []);

  /**
   * Mantiene las coordenadas actualizadas mientras la app está en primer plano.
   * `nohistory` no se usa: el modo por defecto de Expo es watch en primer plano.
   */
  useEffect(() => {
    if (!watch || permission !== 'granted') {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    let active = true;

    void Location.watchPositionAsync(LOCATION_OPTIONS, (position) => {
      // El callback puede llegar después del desmontaje del efecto.
      if (!active || !mountedRef.current) {
        return;
      }

      const next = toCoords(position);
      lastFixRef.current = { coords: next, at: Date.now() };
      setCoords(next);
    })
      .then((subscription) => {
        if (!active || !mountedRef.current) {
          subscription.remove();
          return;
        }

        subscriptionRef.current = subscription;
      })
      .catch((cause: unknown) => {
        if (active && mountedRef.current) {
          setError(toErrorMessage(cause, 'No se pudo iniciar el seguimiento de ubicación.'));
        }
      });

    return () => {
      active = false;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [watch, permission]);

  return {
    permission,
    coords,
    error,
    isLocating,
    requestPermission,
    refresh,
    /** Única salida cuando el permiso queda bloqueado (`canAskAgain === false`). */
    openSettings,
  };
}
