// src/app/(tabs)/asistente.tsx
// Semana 10: Asistente IA (Tutor IA) de GeoCam
// Implementa Retos C1–C6: Historial SQLite, Perfil Zod, Salida Estructurada,
// Manejo de Errores, Límite de Usuario y Multimodalidad.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TopographicBackdrop } from '@/components/TopographicBackdrop';
import { Brand, Layout, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { crearTransporte, type UserProfile } from '@/lib/chatTransport';
import { useIsOnline } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { reducePhoto } from '@/services/vision';
import { confirmAction } from '@/utils/confirm';
import { chatMessagesRepo } from '../../../db/repositories/chatMessages';

const PROFILE_STORAGE_KEY = '@geocam_ai_profile';

interface Flashcard {
  pregunta: string;
  respuesta: string;
}

export default function AsistenteScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isOnline = useIsOnline();
  const flatListRef = useRef<FlatList>(null);

  // Perfil del usuario (Reto C2)
  const [profile, setProfile] = useState<UserProfile>({
    nombre: '',
    tema: 'GeoCam y React Native',
    nivel: 'intermedio',
  });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Tarjetas de repaso estructuradas (Reto C3)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardTopic, setFlashcardTopic] = useState<string>('');
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Entrada de mensaje y foto multimodal
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; base64Data: string } | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Cargar perfil guardado
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setProfile(parsed);
        } catch {
          // Ignorar fallo de parseo
        }
      } else if (user?.email) {
        setProfile((prev) => ({ ...prev, nombre: user.email?.split('@')[0] ?? '' }));
      }
    });
  }, [user]);

  const saveProfile = async (newProfile: UserProfile) => {
    setProfile(newProfile);
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
    setIsProfileModalOpen(false);
  };

  // Transporte AI SDK v7 con perfil dinámico
  const transport = useMemo(
    () => crearTransporte('tutor', () => profile),
    [profile]
  );

  // AI SDK useChat
  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error: chatError,
    stop,
    regenerate,
  } = useChat({
    transport,
    onFinish: ({ messages: latestMessages }) => {
      // C1: Guardar conversación en SQLite al terminar cada turno
      void chatMessagesRepo.saveAll(latestMessages as any);
    },
  });

  // C1: Cargar historial persistente desde SQLite al montar
  useEffect(() => {
    let isMounted = true;
    chatMessagesRepo
      .getAll()
      .then((saved: any[]) => {
        if (!isMounted) return;
        if (saved && saved.length > 0) {
          const formatted: UIMessage[] = saved.map((row: any) => {
            let parsedParts = undefined;
            if (row.parts) {
              try {
                parsedParts = JSON.parse(row.parts);
              } catch {}
            }
            return {
              id: row.id,
              role: row.role as any,
              parts: parsedParts ?? [{ type: 'text', text: row.content }],
            };
          });
          setMessages(formatted);
        }
      })
      .finally(() => {
        if (isMounted) setIsInitialLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setMessages]);

  const isBusy = status === 'submitted' || status === 'streaming';

  // Manejador de selección de foto para multimodalidad
  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setIsProcessingPhoto(true);
        const base64Url = await reducePhoto(result.assets[0].uri);
        setSelectedPhoto({
          uri: result.assets[0].uri,
          base64Data: base64Url,
        });
      }
    } catch (err: any) {
      console.warn('Error al seleccionar imagen:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Envío de mensaje
  const handleSend = async () => {
    if ((!inputText.trim() && !selectedPhoto) || isBusy || !isOnline) return;

    const textToSend = inputText.trim();
    const photoToSend = selectedPhoto;

    setInputText('');
    setSelectedPhoto(null);

    const files = photoToSend
      ? [
          {
            type: 'file' as const,
            mediaType: 'image/jpeg',
            url: photoToSend.base64Data,
          },
        ]
      : undefined;

    await sendMessage({
      text: textToSend || '¿Qué puedes decirme sobre esta fotografía?',
      files,
    });
  };

  // C1: Nueva conversación (limpia SQLite y estado en memoria)
  const handleNewConversation = async () => {
    const confirmed = await confirmAction({
      title: 'Nueva conversación',
      message: '¿Deseas reiniciar la conversación? Se limpiará el historial de chat.',
      confirmLabel: 'Reiniciar',
      destructive: true,
    });

    if (confirmed) {
      await chatMessagesRepo.clear();
      setMessages([]);
    }
  };

  // C3: Generar tarjetas de repaso estructuradas a partir de la conversación
  const handleGenerateCards = async () => {
    if (messages.length === 0) return;
    if (!isOnline) return;

    setIsGeneratingCards(true);
    try {
      const conversacionTexto = messages
        .map((m) => {
          const sender = m.role === 'user' ? 'Estudiante' : 'Tutor';
          const textPart = m.parts
            ?.map((p: any) => (p.type === 'text' ? p.text : ''))
            .filter(Boolean)
            .join(' ');
          return `${sender}: ${textPart}`;
        })
        .join('\n');

      const { data, error } = await supabase.functions.invoke('tarjetas-repaso', {
        body: { conversacion: conversacionTexto },
      });

      if (error) throw error;

      if (data?.tarjetas && data.tarjetas.length > 0) {
        setFlashcards(data.tarjetas);
        setFlashcardTopic(data.temaPrincipal || 'Repaso de GeoCam');
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setIsCardsModalOpen(true);
      }
    } catch (err: any) {
      console.error('Error generando tarjetas:', err);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // Desplazamiento automático al recibir mensajes
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, status]);

  const renderMessageItem = useCallback(
    ({ item }: { item: UIMessage }) => {
      const isUser = item.role === 'user';

      return (
        <View
          style={[
            styles.messageContainer,
            isUser ? styles.userContainer : styles.assistantContainer,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: Brand.primary }]
                : [
                    styles.assistantBubble,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ],
            ]}
          >
            {item.parts?.map((part: any, idx: number) => {
              if (part.type === 'file' && part.url) {
                return (
                  <Image
                    key={idx}
                    source={{ uri: part.url }}
                    style={styles.attachedImage}
                    contentFit="cover"
                  />
                );
              }
              if (part.type === 'text') {
                return (
                  <ThemedText
                    key={idx}
                    style={isUser ? styles.userText : styles.assistantText}
                  >
                    {part.text}
                  </ThemedText>
                );
              }
              return null;
            })}
          </View>
        </View>
      );
    },
    [theme]
  );

  return (
    <ThemedView style={styles.root}>
      <TopographicBackdrop />

      {/* C4: Banner sin conexión */}
      {!isOnline ? (
        <View style={[styles.offlineBanner, { top: insets.top }]}>
          <ThemedText type="smallBold" style={styles.offlineBannerText}>
            ⚠️ Modo sin conexión: el Asistente IA no puede responder sin internet.
          </ThemedText>
        </View>
      ) : null}

      {/* Barra de cabecera con acciones */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View>
          <ThemedText type="cardTitle" style={styles.headerTitle}>
            ✨ Asistente IA
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {profile.nombre ? `${profile.nombre} · ` : ''}{profile.nivel}
          </ThemedText>
        </View>

        <View style={styles.headerActions}>
          {/* Botón C3: Fichas de repaso */}
          {messages.length >= 2 ? (
            <Pressable
              onPress={() => void handleGenerateCards()}
              disabled={isGeneratingCards || !isOnline}
              accessibilityRole="button"
              style={[styles.actionPill, (!isOnline || isGeneratingCards) && styles.disabledPill]}
            >
              {isGeneratingCards ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText type="small" style={styles.actionPillText}>
                  🗂️ Fichas
                </ThemedText>
              )}
            </Pressable>
          ) : null}

          {/* Botón C2: Configurar Perfil */}
          <Pressable
            onPress={() => setIsProfileModalOpen(true)}
            accessibilityRole="button"
            style={styles.actionPillSecondary}
          >
            <ThemedText type="small" style={styles.actionPillSecondaryText}>
              ⚙️ Perfil
            </ThemedText>
          </Pressable>

          {/* Botón C1: Nueva conversación */}
          <Pressable
            onPress={() => void handleNewConversation()}
            accessibilityRole="button"
            style={styles.actionPillSecondary}
          >
            <ThemedText type="small" style={styles.actionPillSecondaryText}>
              🔄 Reiniciar
            </ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Lista de mensajes del chat */}
      {isInitialLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Brand.primary} />
          <ThemedText themeColor="textSecondary">Cargando conversación…</ThemedText>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText type="title" style={styles.emptyIcon}>
            ✨
          </ThemedText>
          <ThemedText type="cardTitle">Bienvenido a tu Asistente IA</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
            Haz consultas sobre tus fotos, geolocalización, desarrollo en React Native o adjunta una fotografía para analizarla.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: insets.bottom + 80 },
          ]}
        />
      )}

      {/* C4: Manejo de errores con reintentar */}
      {chatError ? (
        <View style={styles.errorContainer}>
          <ThemedText type="small" style={styles.errorText}>
            {chatError.message.includes('429')
              ? 'Has alcanzado el límite diario de consultas o cuota de Gemini. Vuelve más tarde.'
              : chatError.message.includes('401')
              ? 'Tu sesión ha expirado. Vuelve a iniciar sesión.'
              : `Error: ${chatError.message}`}
          </ThemedText>
          {chatError.message.includes('401') ? (
            <Pressable
              onPress={() => router.replace('/login')}
              style={styles.retryButton}
            >
              <ThemedText type="small" style={styles.retryButtonText}>
                Ir al login
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void regenerate()}
              style={styles.retryButton}
            >
              <ThemedText type="small" style={styles.retryButtonText}>
                Reintentar
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : null}

      {/* Vista previa de foto seleccionada para enviar */}
      {selectedPhoto ? (
        <View style={[styles.photoPreviewBar, { backgroundColor: theme.backgroundElement }]}>
          <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreviewThumb} />
          <ThemedText type="small" numberOfLines={1} style={styles.photoPreviewText}>
            Foto adjunta lista para analizar
          </ThemedText>
          <Pressable onPress={() => setSelectedPhoto(null)} style={styles.photoRemoveBtn}>
            <ThemedText type="smallBold" style={styles.photoRemoveText}>
              ✕
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {/* Barra de entrada de texto e imagen */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}
        >
          {/* Botón para adjuntar foto */}
          <Pressable
            onPress={() => void handlePickPhoto()}
            disabled={isBusy || isProcessingPhoto || !isOnline}
            style={[styles.attachButton, (!isOnline || isBusy) && styles.disabledPill]}
          >
            {isProcessingPhoto ? (
              <ActivityIndicator size="small" color={Brand.primary} />
            ) : (
              <ThemedText style={styles.attachIcon}>📷</ThemedText>
            )}
          </Pressable>

          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              !isOnline
                ? 'Sin conexión...'
                : selectedPhoto
                ? 'Pregunta sobre la foto...'
                : 'Escribe un mensaje...'
            }
            placeholderTextColor={theme.textSecondary}
            editable={!isBusy && isOnline}
            multiline
            maxLength={1000}
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          />

          {/* Botón de envío o Detener (■) */}
          {isBusy ? (
            <Pressable onPress={() => stop()} style={styles.stopButton}>
              <ThemedText style={styles.stopButtonText}>■</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void handleSend()}
              disabled={(!inputText.trim() && !selectedPhoto) || !isOnline}
              style={[
                styles.sendButton,
                ((!inputText.trim() && !selectedPhoto) || !isOnline) && styles.disabledSend,
              ]}
            >
              <ThemedText style={styles.sendButtonText}>▲</ThemedText>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Perfil del Usuario (Reto C2) */}
      <Modal visible={isProfileModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <ThemedText type="cardTitle">Perfil del Estudiante (C2)</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tus datos personalizan las instrucciones (instructions) del Asistente en el servidor.
            </ThemedText>

            <View style={styles.modalField}>
              <ThemedText type="small">Nombre</ThemedText>
              <TextInput
                defaultValue={profile.nombre}
                onChangeText={(val) => setProfile((p) => ({ ...p, nombre: val }))}
                placeholder="Tu nombre"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.modalInput,
                  { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
                ]}
              />
            </View>

            <View style={styles.modalField}>
              <ThemedText type="small">Tema de Enfoque</ThemedText>
              <TextInput
                defaultValue={profile.tema}
                onChangeText={(val) => setProfile((p) => ({ ...p, tema: val }))}
                placeholder="Ej. GeoCam, SQLite, Sensores"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.modalInput,
                  { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
                ]}
              />
            </View>

            <View style={styles.modalField}>
              <ThemedText type="small">Nivel de Conocimiento</ThemedText>
              <View style={styles.levelRow}>
                {(['principiante', 'intermedio', 'avanzado'] as const).map((lvl) => (
                  <Pressable
                    key={lvl}
                    onPress={() => setProfile((p) => ({ ...p, nivel: lvl }))}
                    style={[
                      styles.levelPill,
                      profile.nivel === lvl && styles.levelPillSelected,
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={profile.nivel === lvl ? styles.levelTextSelected : undefined}
                    >
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setIsProfileModalOpen(false)}
                style={styles.modalBtnCancel}
              >
                <ThemedText type="smallBold">Cerrar</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => void saveProfile(profile)}
                style={styles.modalBtnSave}
              >
                <ThemedText type="smallBold" style={styles.modalBtnSaveText}>
                  Guardar Perfil
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* Modal de Tarjetas de Repaso Estructuradas (Reto C3) */}
      <Modal visible={isCardsModalOpen} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            <View style={styles.flashcardHeader}>
              <ThemedText type="cardTitle">🗂️ {flashcardTopic}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tarjeta {currentCardIndex + 1} de {flashcards.length}
              </ThemedText>
            </View>

            {flashcards.length > 0 && flashcards[currentCardIndex] ? (
              <Pressable
                onPress={() => setShowAnswer((prev) => !prev)}
                style={[styles.flashcardBody, { borderColor: theme.border }]}
              >
                <ThemedText type="small" style={styles.flashcardHint}>
                  {showAnswer ? 'RESPUESTA (Toca para ocultar)' : 'PREGUNTA (Toca para ver respuesta)'}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.flashcardText}>
                  {showAnswer
                    ? flashcards[currentCardIndex].respuesta
                    : flashcards[currentCardIndex].pregunta}
                </ThemedText>
              </Pressable>
            ) : null}

            <View style={styles.flashcardNav}>
              <Pressable
                onPress={() => {
                  if (currentCardIndex > 0) {
                    setCurrentCardIndex((c) => c - 1);
                    setShowAnswer(false);
                  }
                }}
                disabled={currentCardIndex === 0}
                style={[styles.navBtn, currentCardIndex === 0 && styles.disabledPill]}
              >
                <ThemedText type="smallBold">‹ Anterior</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (currentCardIndex < flashcards.length - 1) {
                    setCurrentCardIndex((c) => c + 1);
                    setShowAnswer(false);
                  }
                }}
                disabled={currentCardIndex >= flashcards.length - 1}
                style={[
                  styles.navBtn,
                  currentCardIndex >= flashcards.length - 1 && styles.disabledPill,
                ]}
              >
                <ThemedText type="smallBold">Siguiente ›</ThemedText>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setIsCardsModalOpen(false)}
              style={styles.closeCardsBtn}
            >
              <ThemedText type="smallBold" style={styles.closeCardsText}>
                Cerrar Fichas
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: '#DC2626',
    paddingVertical: 6,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    zIndex: 10,
  },
  offlineBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  headerTitle: {
    fontSize: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  actionPill: {
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionPillSecondary: {
    backgroundColor: '#00000015',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  actionPillSecondaryText: {
    fontWeight: '600',
  },
  disabledPill: {
    opacity: 0.4,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.gutter * 2,
    gap: Spacing.two,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyDesc: {
    textAlign: 'center',
  },
  messagesList: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  messageContainer: {
    width: '100%',
    marginVertical: 4,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.three,
    borderRadius: Radii.lg,
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  assistantText: {
    fontSize: 15,
  },
  attachedImage: {
    width: 200,
    height: 150,
    borderRadius: Radii.md,
    marginBottom: Spacing.two,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    padding: Spacing.two,
    marginHorizontal: Layout.gutter,
    borderRadius: Radii.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  errorText: {
    color: '#B91C1C',
    flex: 1,
    marginRight: Spacing.two,
  },
  retryButton: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  photoPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    marginHorizontal: Layout.gutter,
    borderRadius: Radii.md,
    marginBottom: Spacing.one,
    gap: Spacing.two,
  },
  photoPreviewThumb: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
  },
  photoPreviewText: {
    flex: 1,
  },
  photoRemoveBtn: {
    padding: Spacing.one,
  },
  photoRemoveText: {
    color: Brand.danger,
    fontSize: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
    backgroundColor: '#00000010',
  },
  attachIcon: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.three,
    paddingTop: Platform.OS === 'ios' ? 10 : 6,
    paddingBottom: Platform.OS === 'ios' ? 10 : 6,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: Brand.primary,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stopButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1E293B',
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  disabledSend: {
    opacity: 0.4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Layout.gutter,
  },
  modalCard: {
    padding: Spacing.four,
    borderRadius: Radii.lg,
    gap: Spacing.three,
  },
  modalField: {
    gap: Spacing.one,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  levelRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  levelPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: '#00000020',
    borderRadius: Radii.pill,
  },
  levelPillSelected: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  levelTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  modalBtnCancel: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  modalBtnSave: {
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radii.pill,
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
  },
  flashcardHeader: {
    gap: Spacing.one,
  },
  flashcardBody: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000008',
    gap: Spacing.two,
  },
  flashcardHint: {
    color: Brand.primary,
    fontWeight: '700',
  },
  flashcardText: {
    textAlign: 'center',
  },
  flashcardNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  closeCardsBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radii.pill,
  },
  closeCardsText: {
    color: '#FFFFFF',
  },
});
