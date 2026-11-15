// services/posts.ts
// Única capa que conoce Supabase para las publicaciones (igual que los repositorios de la Semana 7).
import { supabase } from '@/lib/supabase';

export interface Post {
  id: number;
  user_id: string;
  author_email: string;
  content: string;
  image_path: string | null;
  created_at: string;
}

const BUCKET = 'muro';

export const imageUrl = (path: string) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

const PAGE_SIZE = 10;

export interface PostsPage {
  items: Post[];
  nextCursor: string | null;
}

/** Semana 9: una página del feed, con paginación por cursor y búsqueda. */
export async function listPostsPage(params: {
  cursor: string | null;
  search: string;
}): Promise<PostsPage> {
  let query = supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  // Paginación por cursor: "las 10 anteriores a la última que ya tengo"
  if (params.cursor) query = query.lt('created_at', params.cursor);

  const term = params.search.trim();
  if (term) query = query.ilike('content', `%${term}%`);

  const { data, error } = await query;
  if (error) throw error;

  const items = data as Post[];
  return {
    items,
    nextCursor: items.length === PAGE_SIZE ? items[items.length - 1].created_at : null,
  };
}

async function uploadImage(userId: string, uri: string): Promise<string> {
  // En React Native el archivo se sube como ArrayBuffer
  const arrayBuffer = await fetch(uri).then((res) => res.arrayBuffer());
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`; // carpeta = id del usuario (lo exige la política)
  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
  });
  if (error) throw error;
  return path;
}

export async function createPost(input: {
  userId: string;
  email: string;
  content: string;
  imageUri: string | null;
}) {
  const image_path = input.imageUri ? await uploadImage(input.userId, input.imageUri) : null;
  const { error } = await supabase
    .from('posts')
    .insert({ author_email: input.email, content: input.content.trim(), image_path });
  if (error) throw error;
}

export async function deletePost(post: Post) {
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) throw error;
  if (post.image_path) await supabase.storage.from(BUCKET).remove([post.image_path]);
}
