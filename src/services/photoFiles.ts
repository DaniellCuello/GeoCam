import { Directory, File, Paths } from 'expo-file-system';
import { signedUrl } from './cloudPhotos';

const photosDirectory = new Directory(Paths.document, 'photos');
let fileSequence = 0;

function ensureDir() {
  if (!photosDirectory.exists) {
    photosDirectory.create({ intermediates: true });
  }
}

export function isPersisted(uri: string): boolean {
  return uri.startsWith(photosDirectory.uri);
}

export async function persistPhoto(cacheUri: string): Promise<string> {
  ensureDir();
  if (isPersisted(cacheUri)) return cacheUri;

  const source = new File(cacheUri);
  const extension = source.extension || '.jpg';
  fileSequence += 1;
  const destination = new File(
    photosDirectory,
    `${Date.now()}-${fileSequence}${extension.startsWith('.') ? extension : `.${extension}`}`
  );

  await source.copy(destination);
  return destination.uri;
}

export function deletePhotoFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (e) {
    if (__DEV__) console.warn('[photoFiles] no se pudo borrar', uri, e);
  }
}

export function deleteAllPhotoFiles(): void {
  try {
    if (photosDirectory.exists) {
      photosDirectory.delete();
    }
  } catch (e) {
    if (__DEV__) console.warn('[photoFiles] no se pudo vaciar la carpeta', e);
  }
}

/** Semana 9: descarga a la carpeta permanente el archivo de una foto que vino de la nube */
export async function downloadPhotoFile(storagePath: string, clientId: string): Promise<string> {
  ensureDir();
  const destination = new File(photosDirectory, `${clientId}.jpg`);
  if (destination.exists) return destination.uri;
  const url = await signedUrl(storagePath);
  const file = await File.downloadFileAsync(url, destination);
  return file.uri;
}
