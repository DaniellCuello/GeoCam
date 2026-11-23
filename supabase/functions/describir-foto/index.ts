// supabase/functions/describir-foto/index.ts
// Requisitos T1–T6 y Reto C5 (Límite diario por usuario)

import { withSupabase } from 'npm:@supabase/server@1';
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@4';
import { generateText } from 'npm:ai@7';

const google = createGoogleGenerativeAI({
  apiKey: Deno.env.get('GEMINI_API_KEY'),
});

const MODELO = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';
const LIMITE_DIARIO = parseInt(Deno.env.get('LIMITE_DIARIO') ?? '10', 10);

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    try {
      const { imagen } = (await req.json()) as { imagen?: string };

      if (!imagen) {
        return new Response(JSON.stringify({ error: 'Debes enviar una imagen para describir.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // C5: Control de límite diario usando el cliente autenticado del usuario (RLS)
      const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await ctx.supabase
        .from('uso_ia')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', hace24Horas);

      if (countError) {
        console.error('Error al verificar uso_ia:', countError);
      } else if (count !== null && count >= LIMITE_DIARIO) {
        return new Response(
          JSON.stringify({
            error: `Has alcanzado el límite diario de ${LIMITE_DIARIO} peticiones de IA. Vuelve mañana.`,
          }),
          {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Limpiar prefijo data:image/...;base64, si viene incluido
      const base64Data = imagen.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

      // Llamada multimodal sin streaming a Google Gemini usando Vercel AI SDK v7
      const result = await generateText({
        model: google(MODELO),
        instructions:
          'Eres un asistente de registro fotográfico en GeoCam. Describe esta imagen en 1 o 2 frases breves, concisas y naturales en español. Menciona lo esencial: objetos, entorno, iluminación o personas destacadas.',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe esta fotografía para guardarla como sugerencia de descripción en GeoCam.',
              },
              {
                type: 'file',
                mediaType: 'image/jpeg',
                data: base64Data,
              },
            ],
          },
        ],
        temperature: 0.3,
        maxRetries: 1,
        maxOutputTokens: 256,
      });

      // C5: Registrar el uso exitoso en la tabla uso_ia con RLS
      await ctx.supabase.from('uso_ia').insert({
        tipo: 'describir-foto',
      });

      return new Response(JSON.stringify({ descripcion: result.text.trim() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      console.error('Error en Edge Function describir-foto:', err);
      const statusCode = err?.statusCode === 429 ? 429 : 500;
      const mensaje =
        statusCode === 429
          ? 'Se agotó temporalmente la cuota de Gemini. Espera un minuto antes de reintentar.'
          : err?.message || 'Error interno al describir la foto con IA.';

      return new Response(JSON.stringify({ error: mensaje }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }),
};
