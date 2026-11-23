// src/services/vision.ts
// Requisito T2: Reducción de imagen a 1024px JPEG 0.7 e invocación de Edge Function con Supabase

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Reduce la fotografía a un ancho máximo de 1024 px con compresión JPEG 0.7
 * para garantizar que la petición pese menos de 300 KB y viaje eficientemente a Gemini.
 */
export async function reducePhoto(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    {
      compress: 0.7,
      format: SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!result.base64) {
    throw new Error('No se pudo generar la codificación base64 de la fotografía.');
  }

  return `data:image/jpeg;base64,${result.base64}`;
}

/**
 * Invoca la Edge Function `describir-foto` enviando la imagen optimizada
 * con el token de sesión de Supabase Auth automáticamente adjunto.
 */
export async function describePhotoWithAi(photoUri: string): Promise<string> {
  // 1. Reducir la imagen localmente antes de enviarla
  const base64DataUrl = await reducePhoto(photoUri);

  // 2. Llamar a la Supabase Edge Function mediante supabase.functions.invoke
  const { data, error } = await supabase.functions.invoke('describir-foto', {
    body: { imagen: base64DataUrl },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const errorJson = await error.context.json();
        if (errorJson?.error) {
          throw new Error(errorJson.error);
        }
      } catch (jsonErr: any) {
        if (jsonErr?.message && jsonErr !== error) {
          throw jsonErr;
        }
      }
    }
    throw new Error(error.message || 'Error al comunicarse con el servicio de IA.');
  }

  if (!data?.descripcion) {
    throw new Error('La respuesta de IA no contiene una descripción válida.');
  }

  return (data.descripcion as string).trim();
}
