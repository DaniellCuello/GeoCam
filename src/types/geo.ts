/**
 * Tipos compartidos del proyecto GeoCam (Semana 6).
 */

export type GeoSource = 'camera' | 'gallery';

export type Coords = {
  latitude: number;
  longitude: number;
  /** Precisión en metros reportada por el dispositivo, si está disponible. */
  accuracy: number | null;
};

/**
 * Estados de permiso que maneja la app.
 *
 * Expo solo devuelve tres valores en `PermissionResponse.status`
 * (`granted` | `undetermined` | `denied`). `denied` se desdobla en dos
 * estados de UI porque se comportan de forma distinta:
 *  - `denied`  → la persona rechazó el permiso y el sistema todavía permite
 *                volver a preguntarlo.
 *  - `blocked` → el sistema ya no permite preguntar (`canAskAgain === false`);
 *                la única salida es Ajustes.
 */
export type PermissionState =
  | 'checking'
  | 'undetermined'
  | 'denied'
  | 'blocked'
  | 'granted';
