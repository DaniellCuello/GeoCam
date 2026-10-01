import { PermissionStatus, type PermissionResponse } from 'expo';
import { Linking } from 'react-native';

import type { PermissionState } from '@/types/geo';

/**
 * Traduce la respuesta de permisos de Expo a un estado de UI de cinco valores.
 * Nunca solicita el permiso: solo lo describe.
 *
 * `PermissionStatus` solo tiene `GRANTED | UNDETERMINED | DENIED`, así que el
 * estado `blocked` se deduce de `canAskAgain === false`.
 */
export function toPermissionState(response: PermissionResponse | null): PermissionState {
  if (!response) {
    return 'checking';
  }

  if (response.status === PermissionStatus.GRANTED) {
    return 'granted';
  }

  if (response.status === PermissionStatus.UNDETERMINED) {
    return 'undetermined';
  }

  // DENIED: si el sistema ya no permite preguntar, el permiso está bloqueado.
  return response.canAskAgain ? 'denied' : 'blocked';
}

/** Descripción corta del estado, para encabezados de la UI. */
export function describePermissionState(state: PermissionState): string {
  switch (state) {
    case 'checking':
      return 'Comprobando permisos…';
    case 'undetermined':
      return 'Permiso pendiente';
    case 'denied':
      return 'Permiso rechazado';
    case 'blocked':
      return 'Permiso bloqueado';
    case 'granted':
      return 'Permiso concedido';
  }
}

/** `true` si todavía tiene sentido pedir el permiso con el diálogo del sistema. */
export function canRequestPermission(state: PermissionState): boolean {
  return state === 'undetermined' || state === 'denied';
}

/**
 * Abre los ajustes del sistema, que es la única salida cuando el permiso está
 * bloqueado. La comparten `useCamera` y `useGeoLocation`.
 */
export function openSettings(): void {
  void Linking.openSettings();
}
