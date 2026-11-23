import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAlbums } from '@/hooks/useAlbums';
import { usePhoto, usePhotoActions } from '@/hooks/usePhotos';
import { useTheme } from '@/hooks/use-theme';
import { useIsOnline } from '@/lib/queryClient';
import { uploadPhoto } from '@/services/cloudPhotos';
import { describePhotoWithAi } from '@/services/vision';
import { confirmAction } from '@/utils/confirm';
import { toErrorMessage } from '@/utils/errors';
import { formatCoords, formatTimestamp, photoCoords } from '@/utils/geo-format';

export default function PhotoDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const photoId = Number(params.id);
  const safePhotoId = Number.isInteger(photoId) && photoId > 0 ? photoId : -1;
  const { photo, error: queryError } = usePhoto(safePhotoId);
  const { updatePhoto, setAiDescription, removePhoto } = usePhotoActions();
  const { albums, error: albumsError } = useAlbums();
  const { user } = useAuth();
  const isOnline = useIsOnline();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [noteDraft, setNoteDraft] = useState<{ photoId: number; value: string } | null>(null);
  const [aiDraft, setAiDraft] = useState<{ photoId: number; value: string } | null>(null);
  const [isDescribing, setIsDescribing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const note = photo && noteDraft?.photoId === photo.id ? noteDraft.value : photo?.note ?? '';
  const aiDescription = photo && aiDraft?.photoId === photo.id ? aiDraft.value : photo?.aiDescription ?? '';

  const handleDescribeWithAi = async () => {
    if (!photo) return;
    if (!isOnline) {
      setError('Sin conexión a internet: no es posible contactar a Gemini para describir la foto.');
      return;
    }

    setIsDescribing(true);
    setError(null);
    setAiSuccessMessage(null);

    try {
      const descripcion = await describePhotoWithAi(photo.uri);
      setAiDraft({ photoId: photo.id, value: descripcion });
      setAiSuccessMessage('✨ Descripción generada con éxito. Es una sugerencia editable antes de guardarla.');
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo generar la descripción con IA.'));
    } finally {
      setIsDescribing(false);
    }
  };

  const handleSaveAiDescription = async () => {
    if (!photo) return;

    try {
      await setAiDescription(photo.id, aiDescription.trim() || null);
      setAiDraft({ photoId: photo.id, value: aiDescription.trim() });
      setAiSuccessMessage('Descripción guardada en SQLite y lista para sincronizar con la nube.');
      setError(null);
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo guardar la descripción con IA.'));
    }
  };

  const handleUploadCloud = async () => {
    if (!photo) return;
    if (!user?.id) {
      setError('Debes iniciar sesión para subir fotos a Supabase.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      await uploadPhoto(photo, user.id);
    } catch (cause) {
      setError(toErrorMessage(cause, 'Error al subir la fotografía a Supabase.'));
    } finally {
      setIsUploading(false);
    }
  };

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
            {(!photo.syncedAt || (photo.updatedAt && photo.syncedAt && photo.updatedAt > photo.syncedAt)) ? (
              <View style={styles.headerPendingBadge}>
                <ThemedText type="small" style={styles.headerPendingText}>
                  Pendiente
                </ThemedText>
              </View>
            ) : null}
          </View>

          <Image source={{ uri: photo.uri }} style={styles.image} contentFit="contain" />
          <ThemedText type="code">{formatCoords(coords)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {formatTimestamp(photo.createdAt)} · {photo.source === 'camera' ? 'Cámara' : 'Galería'}
          </ThemedText>

          {/* Sección de Descripción con IA (Requisitos T1–T6) */}
          <View style={[styles.aiCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.aiHeaderRow}>
              <ThemedText type="cardTitle">Descripción con IA</ThemedText>
              {photo.aiDescription ? (
                <View style={styles.aiBadgeActive}>
                  <ThemedText type="small" style={styles.aiBadgeActiveText}>
                    ✨ IA Lista
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* Requisito T4: Botón Describir con IA con spinner; apagado cuando no hay red */}
            <Pressable
              onPress={() => void handleDescribeWithAi()}
              disabled={isDescribing || !isOnline}
              accessibilityRole="button"
              style={[
                styles.aiButton,
                (!isOnline || isDescribing) && styles.buttonDisabled,
              ]}
            >
              {isDescribing ? (
                <View style={styles.buttonRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <ThemedText type="smallBold" style={styles.aiButtonText}>
                    Describiendo con Gemini…
                  </ThemedText>
                </View>
              ) : (
                <ThemedText type="smallBold" style={styles.aiButtonText}>
                  ✨ Describir con IA
                </ThemedText>
              )}
            </Pressable>

            {/* Aviso cuando no hay red */}
            {!isOnline ? (
              <ThemedText type="small" style={styles.offlineWarning}>
                ⚠️ Sin conexión a internet. Conéctate a la red para consultar a Gemini.
              </ThemedText>
            ) : null}

            {/* Requisito T6: Aviso de privacidad */}
            <ThemedText type="small" themeColor="textSecondary" style={styles.privacyNotice}>
              🔒 La foto se envía a Google Gemini para generar la descripción.
            </ThemedText>

            {/* Requisito T6: Campo editable con la sugerencia */}
            <TextInput
              value={aiDescription}
              onChangeText={(value) => setAiDraft({ photoId: photo.id, value })}
              placeholder="Presiona '✨ Describir con IA' o escribe una descripción..."
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Descripción generada por IA"
              multiline
              maxLength={600}
              style={[
                styles.note,
                { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
              ]}
            />

            {/* Requisito T3 / T5: Guardar cambios en SQLite y marcar pendiente */}
            <Pressable
              onPress={() => void handleSaveAiDescription()}
              accessibilityRole="button"
              style={styles.saveAiButton}
            >
              <ThemedText type="smallBold" style={styles.saveAiButtonText}>
                Guardar descripción
              </ThemedText>
            </Pressable>

            {aiSuccessMessage ? (
              <ThemedText type="small" style={styles.successMessage}>
                {aiSuccessMessage}
              </ThemedText>
            ) : null}
          </View>

          <ThemedText type="cardTitle">Nota personal</ThemedText>
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

          <View style={styles.syncContainer}>
            <View
              style={[
                styles.syncBadge,
                photo.syncedAt ? styles.syncBadgeSynced : styles.syncBadgePending,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={photo.syncedAt ? styles.syncTextSynced : styles.syncTextPending}
              >
                {photo.syncedAt ? '☁️ Sincronizada en la nube' : '☁️ Local (No subida)'}
              </ThemedText>
            </View>

            <Pressable
              disabled={isUploading}
              onPress={() => void handleUploadCloud()}
              accessibilityRole="button"
              style={[
                styles.cloudButton,
                { opacity: isUploading ? 0.7 : 1 },
              ]}
            >
              <ThemedText type="smallBold" style={styles.cloudButtonText}>
                {isUploading
                  ? 'Subiendo a Firebase…'
                  : photo.syncedAt
                  ? 'Volver a subir a la nube'
                  : 'Subir a la nube'}
              </ThemedText>
            </Pressable>
          </View>

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
  syncContainer: {
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  syncBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radii.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  syncBadgeSynced: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  syncBadgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  syncTextSynced: {
    color: '#065F46',
  },
  syncTextPending: {
    color: '#92400E',
  },
  cloudButton: {
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primaryDeep ?? '#1E3A8A',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.four,
  },
  cloudButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  headerPendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  headerPendingText: {
    color: '#92400E',
    fontWeight: '700',
  },
  aiCard: {
    padding: Spacing.three,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBadgeActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  aiBadgeActiveText: {
    color: '#166534',
    fontWeight: '600',
  },
  aiButton: {
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.four,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveAiButton: {
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272A',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.four,
  },
  saveAiButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  privacyNotice: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  offlineWarning: {
    color: '#D97706',
    fontWeight: '600',
  },
  successMessage: {
    color: '#16A34A',
    fontWeight: '600',
  },
});
