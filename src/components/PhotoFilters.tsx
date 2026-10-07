import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { Icons } from '@/constants/icons';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/utils/confirm';
import { toErrorMessage } from '@/utils/errors';
import type { AlbumFilter } from '../../db/repositories/photos';
import type { Album } from '../../db/schema';

type PhotoFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  albumId: AlbumFilter;
  onAlbumChange: (value: AlbumFilter) => void;
  onlyFavorites: boolean;
  onFavoritesChange: (value: boolean) => void;
  albums: Album[];
  createAlbum: (name: string) => Promise<Album>;
  removeAlbum: (id: number) => Promise<void>;
};

export function PhotoFilters({
  search,
  onSearchChange,
  albumId,
  onAlbumChange,
  onlyFavorites,
  onFavoritesChange,
  albums,
  createAlbum,
  removeAlbum,
}: PhotoFiltersProps) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasActiveFilters = Boolean(search.trim() || albumId !== 'all' || onlyFavorites);

  const handleCreateAlbum = async () => {
    try {
      await createAlbum(newAlbumName);
      setNewAlbumName('');
      setError(null);
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo crear el álbum.'));
    }
  };

  const handleRemoveAlbum = async (album: Album) => {
    const confirmed = await confirmAction({
      title: 'Eliminar álbum',
      message: `Las fotografías de «${album.name}» conservarán sus datos y quedarán sin álbum.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await removeAlbum(album.id);
      if (albumId === album.id) {
        onAlbumChange('all');
      }
      setError(null);
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo eliminar el álbum.'));
    }
  };

  return (
    <>
      {/* Burbuja flotante centrada con icono de lupita */}
      <View style={styles.bubbleWrapper}>
        <Pressable
          onPress={() => setIsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Abrir menú de búsqueda por nota y filtros"
          style={({ pressed }) => [
            styles.bubbleButton,
            hasActiveFilters && styles.bubbleButtonActive,
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={Icons.search}
            size={18}
            tintColor={hasActiveFilters ? Brand.primary : Brand.onBrand}
            style={styles.bubbleIcon}
          />
          <ThemedText
            type="smallBold"
            style={[styles.bubbleText, hasActiveFilters && styles.bubbleTextActive]}
            numberOfLines={1}>
            {search.trim() ? `Buscar: "${search}"` : 'Buscar por nota'}
          </ThemedText>
          {hasActiveFilters ? <View style={styles.activeDot} /> : null}
        </Pressable>
      </View>

      {/* Modal centrado de búsqueda y filtros */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsOpen(false)} />

          <ThemedView
            type="backgroundElement"
            style={[styles.modalCard, { borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <SymbolView
                  name={Icons.search}
                  size={20}
                  tintColor={Brand.primary}
                  style={styles.bubbleIcon}
                />
                <ThemedText type="cardTitle">Buscar y filtrar</ThemedText>
              </View>
              <Pressable
                onPress={() => setIsOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar búsqueda"
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <SymbolView
                  name={Icons.close}
                  size={18}
                  tintColor={theme.textSecondary}
                  style={styles.bubbleIcon}
                />
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <SymbolView
                name={Icons.search}
                size={16}
                tintColor={theme.textSecondary}
                style={styles.searchInnerIcon}
              />
              <TextInput
                value={search}
                onChangeText={onSearchChange}
                placeholder="Buscar por nota…"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Buscar fotografías por nota"
                style={[
                  styles.search,
                  { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
                ]}
                returnKeyType="search"
                autoFocus
              />
            </View>

            <ThemedText type="small" themeColor="textSecondary">
              Filtros rápidos:
            </ThemedText>

            <View style={styles.row}>
              <Pressable
                onPress={() => onFavoritesChange(!onlyFavorites)}
                accessibilityRole="button"
                accessibilityLabel="Filtrar fotografías favoritas"
                accessibilityState={{ selected: onlyFavorites }}
                style={[
                  styles.chip,
                  { backgroundColor: onlyFavorites ? Brand.primarySoft : theme.background },
                ]}>
                <ThemedText type="smallBold" style={onlyFavorites ? styles.selected : undefined}>
                  {onlyFavorites ? '★ Favoritas' : '☆ Favoritas'}
                </ThemedText>
              </Pressable>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.row}>
                <FilterChip
                  label="Todos los álbumes"
                  selected={albumId === 'all'}
                  onPress={() => onAlbumChange('all')}
                />
                <FilterChip
                  label="Sin álbum"
                  selected={albumId === null}
                  onPress={() => onAlbumChange(null)}
                />
                {albums.map((album) => (
                  <View key={album.id} style={styles.albumChip}>
                    <FilterChip
                      label={album.name}
                      selected={albumId === album.id}
                      onPress={() => onAlbumChange(album.id)}
                    />
                    <Pressable
                      onPress={() => void handleRemoveAlbum(album)}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar álbum ${album.name}`}
                      style={styles.deleteAlbum}>
                      <ThemedText type="smallBold" style={styles.deleteText}>
                        ×
                      </ThemedText>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={styles.createRow}>
              <TextInput
                value={newAlbumName}
                onChangeText={setNewAlbumName}
                placeholder="Nuevo álbum…"
                placeholderTextColor={theme.textSecondary}
                accessibilityLabel="Nombre del nuevo álbum"
                style={[
                  styles.search,
                  styles.albumInput,
                  { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
                ]}
                returnKeyType="done"
                onSubmitEditing={() => void handleCreateAlbum()}
              />
              <Pressable
                onPress={() => void handleCreateAlbum()}
                accessibilityRole="button"
                accessibilityLabel="Crear álbum"
                style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.createText}>
                  Crear
                </ThemedText>
              </Pressable>
            </View>

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={() => setIsOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Aplicar filtros y cerrar"
              style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" style={styles.applyText}>
                Ver resultados
              </ThemedText>
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? Brand.primarySoft : theme.background,
          borderColor: selected ? Brand.primary : theme.border,
        },
      ]}>
      <ThemedText type="smallBold" style={selected ? styles.selected : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bubbleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: Layout.minTouch,
    paddingHorizontal: Spacing.four,
    borderRadius: Radii.pill,
    backgroundColor: Brand.scrim,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  bubbleButtonActive: {
    backgroundColor: Brand.scrim,
    borderColor: Brand.primary,
  },
  bubbleIcon: {
    width: 20,
    height: 20,
  },
  bubbleText: {
    color: Brand.onBrand,
  },
  bubbleTextActive: {
    color: Brand.primaryLight,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.primary,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: Layout.gutter,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Radii.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
  searchWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  searchInnerIcon: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 1,
    width: 18,
    height: 18,
  },
  search: {
    minHeight: Layout.minTouch,
    paddingLeft: Spacing.six + Spacing.one,
    paddingRight: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.md,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    minHeight: Layout.minTouch,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radii.pill,
  },
  selected: {
    color: Brand.primaryDeep,
  },
  albumChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteAlbum: {
    width: Layout.minTouch,
    height: Layout.minTouch,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: Brand.danger,
    fontSize: 19,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  albumInput: {
    flex: 1,
    paddingLeft: Spacing.three,
  },
  createButton: {
    minHeight: Layout.minTouch,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    backgroundColor: Brand.primary,
  },
  createText: {
    color: Brand.onBrand,
  },
  applyButton: {
    minHeight: Layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    backgroundColor: Brand.primary,
    marginTop: Spacing.one,
  },
  applyText: {
    color: Brand.onBrand,
  },
  error: {
    color: Brand.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});
