// app/index.tsx
// Feed infinito con búsqueda en vivo y todos los estados de UI.
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { useIsOnline } from '@/lib/queryClient';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCreatePost, useDeletePost, usePostsFeed, usePostsRealtime } from '@/hooks/usePostsFeed';
import { imageUrl, type Post } from '@/services/posts';

export default function MuroScreen() {
  const { session, signOut } = useAuth();
  const user = session!.user; // esta pantalla solo existe con sesión (Stack.Protected)

  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const isOnline = useIsOnline();

  const feed = usePostsFeed(debouncedSearch);
  const createPostMutation = useCreatePost();
  const deletePostMutation = useDeletePost();
  usePostsRealtime();

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert('Se necesita permiso de cámara');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const publish = () => {
    if (!content.trim()) return;
    createPostMutation.mutate(
      { userId: user.id, email: user.email ?? 'anónimo', content, imageUri },
      {
        onSuccess: () => {
          setContent('');
          setImageUri(null);
        },
        onError: (e) => Alert.alert('No se pudo publicar', e.message),
      }
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable
      style={styles.post}
      onLongPress={() =>
        item.user_id === user.id &&
        Alert.alert('Eliminar publicación', undefined, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => deletePostMutation.mutate(item) },
        ])
      }
    >
      <Text style={styles.author}>{item.author_email}</Text>
      <Text>{item.content}</Text>
      {item.image_path && <Image source={{ uri: imageUrl(item.image_path) }} style={styles.image} />}
      <Text style={styles.date}>{new Date(item.created_at).toLocaleString('es-CO')}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Estado: sin conexión */}
      {!isOnline && <Text style={styles.offline}>Sin conexión. Se muestran los datos guardados.</Text>}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="¿Qué está pasando en clase?"
          value={content}
          onChangeText={setContent}
          maxLength={280}
          multiline
        />
        {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} />}
        <View style={styles.row}>
          <Pressable onPress={takePhoto}>
            <Text>{imageUri ? 'Cambiar foto' : 'Tomar foto'}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={publish} disabled={createPostMutation.isPending}>
            <Text style={styles.buttonText}>
              {createPostMutation.isPending ? 'Publicando…' : 'Publicar'}
            </Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Buscar en el muro"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Estado: primera carga */}
      {feed.status === 'pending' && feed.fetchStatus === 'fetching' && (
        <ActivityIndicator style={{ marginTop: 40 }} />
      )}

      {/* Estado: sin datos y sin red (nunca se pudo cargar) */}
      {feed.status === 'pending' && feed.fetchStatus === 'paused' && (
        <Text style={styles.empty}>Conéctate a internet para cargar el muro.</Text>
      )}

      {/* Estado: error, con opción de reintentar */}
      {feed.status === 'error' && (
        <View style={styles.center}>
          <Text style={styles.error}>{feed.error.message}</Text>
          <Pressable style={styles.button} onPress={() => feed.refetch()}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {feed.status === 'success' && (
        <FlatList
          style={{ flex: 1 }}
          data={feed.posts}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderPost}
          // Estado: vacío (distinto según haya búsqueda o no)
          ListEmptyComponent={
            <Text style={styles.empty}>
              {debouncedSearch ? 'Ninguna publicación coincide.' : 'Aún no hay publicaciones.'}
            </Text>
          }
          // Deslizar hacia abajo para refrescar
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => feed.refetch()}
          // Infinite scroll
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          ListFooterComponent={
            feed.isFetchingNextPage ? <ActivityIndicator style={{ margin: 16 }} /> : null
          }
        />
      )}

      {/* Empuja el pie al fondo cuando no hay lista */}
      {feed.status !== 'success' && <View style={{ flex: 1 }} />}

      <Pressable style={styles.signOut} onPress={signOut}>
        <Text>Cerrar sesión ({user.email})</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  offline: { backgroundColor: '#FEF3C7', color: '#92400E', padding: 8, textAlign: 'center' },
  composer: { padding: 16, gap: 8, borderBottomWidth: 1, borderColor: '#eee' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, minHeight: 60 },
  search: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10 },
  preview: { width: 80, height: 80, borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  button: { backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '600' },
  center: { alignItems: 'center', gap: 12, marginTop: 40, paddingHorizontal: 24 },
  error: { color: '#DC2626', textAlign: 'center' },
  empty: { textAlign: 'center', marginTop: 40, color: '#888', paddingHorizontal: 24 },
  post: { padding: 16, gap: 6, borderBottomWidth: 1, borderColor: '#f2f2f2' },
  author: { fontWeight: '700' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  date: { color: '#888', fontSize: 12 },
  signOut: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderColor: '#eee' },
});
