import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhoto, usePhotoActions } from '@/hooks/usePhotos';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/utils/confirm';
import { toErrorMessage } from '@/utils/errors';
import { formatCoords, formatTimestamp, photoCoords } from '@/utils/geo-format';

export default function PhotoDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const photoId = Number(params.id);
  const safePhotoId = Number.isInteger(photoId) && photoId > 0 ? photoId : -1;
  const { photo, error: queryError } = usePhoto(safePhotoId);
  const { updatePhoto, removePhoto } = usePhotoActions();
  const { albums, error: albumsError } = useAlbums();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [noteDraft, setNoteDraft] = useState<{ photoId: number; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const note = photo && noteDraft?.photoId === photo.id ? noteDraft.value : photo?.note ?? '';

  const handleSaveNote = async () => {
    if (!photo) {
      return;
    }

    try {
      await updatePhoto(photo.id, { note: note.trim() || null });
      setNoteDraft({ photoId: photo.id, value: note.trim() });
      setError(null);
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo guardar la nota.'));
    }
  };

  const handleDelete = async () => {
    if (!photo) {
      return;
    }

    const confirmed = await confirmAction({
      title: 'Eliminar fotografía',
      message: 'Se eliminarán la fotografía y su archivo guardado.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await removePhoto(photo.id);
      router.back();
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo eliminar la fotografía.'));
    }
  };

  if (queryError) {
    return (
      <ThemedView style={[styles.state, { paddingTop: insets.top + Spacing.five }]}>
        <ThemedText type="cardTitle">No se pudo cargar la fotografía</ThemedText>
        <ThemedText themeColor="textSecondary">{queryError.message}</ThemedText>
      </ThemedView>
    );
  }

  if (!photo) {
    return (
      <ThemedView style={[styles.state, { paddingTop: insets.top + Spacing.five }]}>
        <ThemedText type="cardTitle">Fotografía no encontrada</ThemedText>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.button}>
          <ThemedText type="smallBold" style={styles.buttonText}>
            Volver
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const coords = photoCoords(photo);

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.back}>
              <ThemedText type="smallBold">‹ Volver</ThemedText>
            </Pressable>
            <ThemedText type="title" accessibilityRole="header">
              Fotografía
            </ThemedText>
          </View>

          <Image source={{ uri: photo.uri }} style={styles.image} contentFit="contain" />
          <ThemedText type="code">{formatCoords(coords)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatTimestamp(photo.createdAt)} · {photo.source === 'camera' ? 'Cámara' : 'Galería'}
          </ThemedText>

          <ThemedText type="cardTitle">Nota</ThemedText>
          <TextInput
            value={note}
            onChangeText={(value) => setNoteDraft({ photoId: photo.id, value })}
            placeholder="Escribe una nota para esta fotografía"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel="Nota de la fotografía"
            multiline
            maxLength={500}
            style={[
              styles.note,
              { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}
          />
          <Pressable onPress={() => void handleSaveNote()} accessibilityRole="button" style={styles.button}>
            <ThemedText type="smallBold" style={styles.buttonText}>
              Guardar nota
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() =>
              void updatePhoto(photo.id, { favorite: !photo.favorite }).catch((cause: unknown) =>
                setError(toErrorMessage(cause, 'No se pudo actualizar el favorito.'))
              )
            }
            accessibilityRole="button"
            accessibilityState={{ selected: photo.favorite }}
            style={[styles.favorite, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={photo.favorite ? styles.favoriteActive : undefined}>
              {photo.favorite ? '★ Favorita' : '☆ Marcar como favorita'}
            </ThemedText>
          </Pressable>

          <ThemedText type="cardTitle">Álbum</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albums}>
            <AlbumButton
              label="Sin álbum"
              selected={photo.albumId === null}
              onPress={() =>
                void updatePhoto(photo.id, { albumId: null }).catch((cause: unknown) =>
                  setError(toErrorMessage(cause, 'No se pudo mover la fotografía.'))
                )
              }
            />
            {albums.map((album) => (
              <AlbumButton
                key={album.id}
                label={album.name}
                selected={photo.albumId === album.id}
                onPress={() =>
                  void updatePhoto(photo.id, { albumId: album.id }).catch((cause: unknown) =>
                    setError(toErrorMessage(cause, 'No se pudo mover la fotografía.'))
                  )
                }
              />
            ))}
          </ScrollView>

          {error || albumsError ? (
            <ThemedText type="small" style={styles.error}>
              {error ?? albumsError?.message}
            </ThemedText>
          ) : null}

          <Pressable onPress={() => void handleDelete()} accessibilityRole="button" style={styles.delete}>
            <ThemedText type="smallBold" style={styles.deleteText}>
              Eliminar fotografía
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

function AlbumButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.albumButton, selected && styles.albumSelected]}>
      <ThemedText type="smallBold" style={selected ? styles.buttonText : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
  },
  column: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  back: {
    minHeight: Layout.minTouch,
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: 360,
    borderRadius: Radii.lg,
    backgroundColor: '#00000012',
  },
  note: {
    minHeight: 100,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.md,
    textAlignVertical: 'top',
  },
  button: {
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.pill,
    backgroundColor: Brand.primary,
  },
  buttonText: {
    color: Brand.onBrand,
  },
  favorite: {
    minHeight: Layout.minTouch,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.pill,
  },
  favoriteActive: {
    color: Brand.primary,
  },
  albums: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  albumButton: {
    minHeight: Layout.minTouch,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: Brand.primary,
    borderRadius: Radii.pill,
  },
  albumSelected: {
    backgroundColor: Brand.primary,
  },
  delete: {
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.dangerSoft,
    borderRadius: Radii.pill,
  },
  deleteText: {
    color: Brand.danger,
  },
  error: {
    color: Brand.danger,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
});
