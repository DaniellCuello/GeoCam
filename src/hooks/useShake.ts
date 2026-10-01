import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toErrorMessage } from '@/utils/errors';

/** Frecuencia de muestreo del acelerómetro en milisegundos. */
const UPDATE_INTERVAL_MS = 100;

/**
 * Detecta un sacudón comparando la magnitud de la aceleración contra un
 * umbral. La app debe pasar valores con `x`, `y` y `z` del acelerómetro.
 *
 * @param onShake  Callback invocado cuando se supera el umbral y el cooldown.
 * @param threshold Magnitud mínima (m/s²) para considerarlo un sacudón. Por
 *   defecto `13`, muy por encima de la gravedad (~9.8 m/s²) en reposo.
 * @param cooldownMs Tiempo mínimo entre sacudones detectados.
 * @param enabled Permite apagar la suscripción, por ejemplo cuando la pantalla
 *   no está enfocada (las pestañas nativas renderizan de forma anticipada).
 */
export function useShake(
  onShake: () => void,
  threshold = 13,
  cooldownMs = 1200,
  enabled = true
) {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const lastShakeRef = useRef(0);
  // Mantiene siempre el callback más reciente sin reiniciar la suscripción.
  const onShakeRef = useRef(onShake);

  useEffect(() => {
    onShakeRef.current = onShake;
  }, [onShake]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const subscribe = useCallback(() => {
    let subscription: ReturnType<typeof Accelerometer.addListener> | null = null;
    let active = true;

    void Accelerometer.isAvailableAsync()
      .then((available) => {
        if (!active || !mountedRef.current) {
          return;
        }

        setIsAvailable(available);

        if (!available) {
          setError('Este dispositivo no tiene acelerómetro disponible.');
          return;
        }

        Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          if (!active || !mountedRef.current) {
            return;
          }

          const magnitude = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          if (magnitude <= threshold || now - lastShakeRef.current < cooldownMs) {
            return;
          }

          lastShakeRef.current = now;
          onShakeRef.current();
        });
      })
      .catch((cause: unknown) => {
        if (active && mountedRef.current) {
          setIsAvailable(false);
          setError(toErrorMessage(cause, 'No se pudo activar el acelerómetro.'));
        }
      });

    return () => {
      active = false;
      subscription?.remove();
      subscription = null;
    };
  }, [threshold, cooldownMs]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribe();
  }, [enabled, subscribe]);

  return { isAvailable, error };
}
