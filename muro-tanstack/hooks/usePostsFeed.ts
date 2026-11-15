// hooks/usePostsFeed.ts
// Reemplaza al usePosts manual de la Semana 8: caché, paginación, reintentos y refresco los da TanStack Query.
import { useEffect, useMemo } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { createPost, deletePost, listPostsPage } from '@/services/posts';

export function usePostsFeed(search: string) {
  const query = useInfiniteQuery({
    queryKey: ['posts', { search }], // cada búsqueda tiene su propia caché
    queryFn: ({ pageParam }) => listPostsPage({ cursor: pageParam, search }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData, // al escribir, se conserva la lista anterior en vez de parpadear
  });

  // Las páginas se aplanan en una sola lista para FlatList
  const posts = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  return { ...query, posts };
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });
}

/** Tiempo real: ya no recarga a mano, solo le avisa a la caché que quedó desactualizada. */
export function usePostsRealtime() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('muro-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
