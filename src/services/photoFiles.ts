import { Directory, File, Paths } from 'expo-file-system';

const photosDirectory = new Directory(Paths.document, 'photos');
let fileSequence = 0;

export async function persistPhoto(cacheUri: string): Promise<string> {
  if (!photosDirectory.exists) {
    photosDirectory.create({ intermediates: true });
  }

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
  const file = new File(uri);

  if (file.exists) {
    file.delete();
  }
}
