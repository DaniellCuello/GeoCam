// src/lib/chatTransport.ts
// Transporte de chat con streaming vía expo/fetch y Supabase Auth (Semana 10 y Reto C2)

import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';

import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase';

export interface UserProfile {
  nombre?: string;
  tema?: string;
  nivel?: 'principiante' | 'intermedio' | 'avanzado';
}

export function crearTransporte(funcion = 'tutor', getPerfil?: () => UserProfile | undefined) {
  return new DefaultChatTransport({
    api: `${SUPABASE_URL}/functions/v1/${funcion}`,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error('No hay sesión activa: por favor vuelve a iniciar sesión.');
      }
      return {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      };
    },
    body: async () => {
      const perfil = getPerfil ? getPerfil() : undefined;
      return { perfil };
    },
  });
}
