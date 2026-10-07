export async function persistPhoto(uri: string): Promise<string> {
  if (uri.startsWith('data:')) {
    return uri;
  }

  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error(`No se pudo leer la fotografía seleccionada (HTTP ${response.status}).`);
  }

  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('El navegador no pudo convertir la fotografía a un formato persistente.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la fotografía.'));
    reader.readAsDataURL(blob);
  });
}

export function deletePhotoFile(_uri: string): void {
  // Web photos are stored as data URIs in SQLite, not as independent files.
}
