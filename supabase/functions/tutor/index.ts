// supabase/functions/tutor/index.ts
// Streaming Chat con Google Gemini, Vercel AI SDK v7, Perfil con Zod (C2) y Límite diario (C5)

import { withSupabase } from 'npm:@supabase/server@1';
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@4';
import {
  APICallError,
  RetryError,
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'npm:ai@7';
import { z } from 'npm:zod@3';

const google = createGoogleGenerativeAI({
  apiKey: Deno.env.get('GEMINI_API_KEY'),
});

const MODELO = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';
const LIMITE_DIARIO = parseInt(Deno.env.get('LIMITE_DIARIO') ?? '10', 10);

// C2: Esquema Zod para validar el perfil del usuario recibido en el cuerpo
const perfilSchema = z
  .object({
    nombre: z.string().min(1).max(100).optional(),
    tema: z.string().min(1).max(100).optional(),
    nivel: z.enum(['principiante', 'intermedio', 'avanzado']).optional(),
  })
  .catch({});

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    try {
      const body = await req.json();
      const messages: UIMessage[] = body.messages ?? [];
      const perfilRaw = body.perfil ?? {};

      // C2: Validación con Zod (.catch() asigna objeto vacío en caso de valores inválidos)
      const perfil = perfilSchema.parse(perfilRaw);

      // C5: Control de límite de 24 horas usando el cliente autenticado del usuario
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await ctx.supabase
        .from('uso_ia')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hace24Horas);

      if (countError) {
        console.error('Error al verificar uso_ia en tutor:', countError);
      } else if (count !== null && count >= LIMITE_DIARIO) {
        return new Response(
          JSON.stringify({
            error: `Has alcanzado el límite diario de ${LIMITE_DIARIO} consultas de IA. Vuelve mañana.`,
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // C5: Registrar uso
      await ctx.supabase.from('uso_ia').insert({
        tipo: 'chat-tutor',
      });

      const nombreEstudiante = perfil.nombre || ctx.userClaims?.email || 'Estudiante';
      const nivelEstudiante = perfil.nivel || 'intermedio';
      const temaEstudiante = perfil.tema || 'Programación Móvil Avanzada y GeoCam';

      // Llamada con streaming usando streamText de AI SDK v7
      const result = streamText({
        model: google(MODELO),
        instructions: `Eres "Tutor IA", tutor experto en Programación Móvil Avanzada y asistente de GeoCam.
Respondes en español, de forma clara, didáctica y breve.
Estudiante: ${nombreEstudiante}.
Nivel: ${nivelEstudiante}.
Tema de enfoque: ${temaEstudiante}.
Ayuda con dudas sobre React Native, Expo, SQLite, Drizzle, sincronización offline y análisis de fotografías.`,
        messages: await convertToModelMessages(messages.slice(-20)),
        temperature: 0.4,
        maxRetries: 1,
        maxOutputTokens: 1024,
      });

      return createUIMessageStreamResponse({
        stream: toUIMessageStream({
          stream: result.stream,
          onError: (error) => {
            const real = RetryError.isInstance(error) ? error.lastError : error;
            if (APICallError.isInstance(real) && real.statusCode === 429) {
              return 'Se agotó la cuota gratuita de Gemini. Espera un minuto antes de continuar.';
            }
            return 'El tutor no pudo responder en este momento. Intenta de nuevo.';
          },
        }),
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'none',
        },
      });
    } catch (err: any) {
      console.error('Error en Edge Function tutor:', err);
      return new Response(JSON.stringify({ error: err?.message || 'Error en el tutor IA.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }),
};
