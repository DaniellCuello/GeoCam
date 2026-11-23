// supabase/functions/tarjetas-repaso/index.ts
// Reto C3: Salida estructurada con generateText y Output.object en Vercel AI SDK v7

import { withSupabase } from 'npm:@supabase/server@1';
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@4';
import { generateText, Output } from 'npm:ai@7';
import { z } from 'npm:zod@3';

const google = createGoogleGenerativeAI({
  apiKey: Deno.env.get('GEMINI_API_KEY'),
});

const MODELO = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';
const LIMITE_DIARIO = parseInt(Deno.env.get('LIMITE_DIARIO') ?? '10', 10);

// Esquema Zod de salida estructurada
const tarjetasSchema = z.object({
  temaPrincipal: z.string(),
  tarjetas: z
    .array(
      z.object({
        pregunta: z.string().describe('Pregunta clave para repasar'),
        respuesta: z.string().describe('Respuesta concisa y explicativa'),
      })
    )
    .min(3)
    .max(5)
    .describe('Entre 3 y 5 tarjetas de repaso para estudio activo'),
});

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    try {
      const { conversacion } = (await req.json()) as { conversacion?: string };

      if (!conversacion) {
        return new Response(JSON.stringify({ error: 'Debes enviar texto o conversación para generar tarjetas.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // C5: Control de límite
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await ctx.supabase
        .from('uso_ia')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hace24Horas);

      if (count !== null && count >= LIMITE_DIARIO) {
        return new Response(
          JSON.stringify({
            error: `Has alcanzado el límite diario de ${LIMITE_DIARIO} consultas. Vuelve mañana.`,
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // C3: Generación estructurada validada con Zod
      const result = await generateText({
        model: google(MODELO),
        instructions:
          'Eres un generador de fichas educativas de repaso para estudiantes de Programación Móvil. A partir del texto proporcionado, genera entre 3 y 5 preguntas y respuestas clave en formato JSON estructurado.',
        prompt: `Genera tarjetas de repaso a partir del siguiente contenido:\n\n${conversacion}`,
        output: Output.object({
          schema: tarjetasSchema,
        }),
      });

      // Registrar uso en uso_ia
      await ctx.supabase.from('uso_ia').insert({
        tipo: 'tarjetas-repaso',
      });

      return new Response(JSON.stringify(result.output), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Error en Edge Function tarjetas-repaso:', err);
      return new Response(JSON.stringify({ error: err?.message || 'Error al generar tarjetas estructuradas.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }),
};
