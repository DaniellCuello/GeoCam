import type { Coords } from '@/types/geo';

/** Cadena corta de latitud/longitud usada en cámara, mapa y tarjetas. */
export function formatCoords(coords: Coords | null): string {
  if (!coords) {
    return 'Sin ubicación';
  }

  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
}

/** Precisión formateada, o `null` si el dispositivo no la reportó. */
export function formatAccuracy(coords: Coords | null): string | null {
  if (!coords || coords.accuracy === null) {
    return null;
  }

  return `±${Math.round(coords.accuracy)} m`;
}

/** Fecha/hora legible de una foto. */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
