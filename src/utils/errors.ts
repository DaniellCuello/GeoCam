/**
 * Convierte cualquier valor lanzado (incluido `unknown`) en un mensaje legible.
 * Evita duplicar `try/catch` con `any` en cada hook.
 */
export function toErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown };

    if (typeof candidate.message === 'string' && candidate.message) {
      return candidate.message;
    }
  }

  return fallback;
}
