import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback } from 'react';

import * as albumRepository from '../../db/repositories/albums';

export function useAlbums() {
  const query = useLiveQuery(albumRepository.listQuery());

  const createAlbum = useCallback((name: string) => albumRepository.create(name), []);
  const removeAlbum = useCallback((id: number) => albumRepository.remove(id), []);

  return {
    albums: query.data ?? [],
    error: query.error,
    createAlbum,
    removeAlbum,
  };
}
