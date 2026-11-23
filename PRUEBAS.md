# PRUEBAS.md — Matriz de Escenarios de Prueba de IA (Semana 10)

Matriz de escenarios de prueba para la integración de Inteligencia Artificial Generativa Multimodal y Edge Functions en **GeoCam** (Taller Integrador 2, tag `v2.0.0`).

---

## 1. Matriz de Escenarios

| # | Escenario | Pasos para reproducir | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| **E1** | **Modo Avión / Sin Conexión (Detalle de Foto)** | 1. Activar modo avión en el dispositivo.<br>2. Abrir el detalle de cualquier foto.<br>3. Observar el botón *"✨ Describir con IA"*. | El botón aparece desactivado (opacidad reducida), el toque no dispara peticiones y se muestra el aviso *"⚠️ Sin conexión a internet. Conéctate a la red para consultar a Gemini."*. | El botón se desactiva y el aviso advertencia informa al usuario antes de interactuar. | ✅ Aprobado |
| **E2** | **Modo Avión / Sin Conexión (Asistente IA)** | 1. Activar modo avión.<br>2. Navegar a la pestaña *"Asistente"*.<br>3. Intentar escribir o enviar un mensaje. | Aparece el banner superior rojo de *"Modo sin conexión"*. El campo de texto y el botón de envío quedan deshabilitados evitando errores de red. | Banner visible inmediatamente, inputs bloqueados. | ✅ Aprobado |
| **E3** | **Edición offline de descripción sugerida (T6)** | 1. En línea, pulsar *"✨ Describir con IA"* para obtener sugerencia.<br>2. Activar modo avión.<br>3. Modificar el texto sugerido en el `TextInput`.<br>4. Pulsar *"Guardar descripción"*. | La descripción editada se almacena en SQLite local, se actualiza `updated_at` y la foto queda con badge *"Pendiente"*. Al desactivar modo avión, viaja a Supabase en el siguiente sync. | Guardado local instantáneo en SQLite. Al reconectar, sube a la columna `ai_description` de Supabase. | ✅ Aprobado |
| **E4** | **Límite diario de IA (HTTP 429 - Reto C5)** | 1. En Supabase configurar: `npx supabase secrets set LIMITE_DIARIO=3`.<br>2. Realizar 3 consultas consecutivas en el Asistente o Foto.<br>3. Realizar la 4.ª consulta. | La Edge Function rechaza la petición con código `429` y JSON: `{"error": "Has alcanzado el límite diario de 3 consultas..."}`. La app muestra el mensaje amigable *"Vuelve mañana"* sin cerrarse. | Edge Function intercepta con `uso_ia` y la app muestra el mensaje de límite diario. | ✅ Aprobado |
| **E5** | **Seguridad: Petición sin token (HTTP 401)** | 1. Ejecutar en terminal:<br>`curl -i -X POST https://<TU_REF>.supabase.co/functions/v1/describir-foto -d '{"imagen":""}'`. | La Edge Function protegida con `withSupabase({ auth: 'user' })` rechaza la llamada con HTTP 401 Unauthorized sin llegar a Gemini. | Respuesta HTTP 401 Unauthorized inmediata. | ✅ Aprobado |
| **E6** | **Sesión vencida en la app (HTTP 401 - Reto C4)** | 1. Invalidar token o cerrar sesión en Supabase Auth.<br>2. Intentar consultar al Asistente IA. | La app captura el error 401 y muestra *"Tu sesión ha expirado. Vuelve a iniciar sesión."* con un botón directo *"Ir al login"*. | Redirección disponible y mensaje claro de reautenticación. | ✅ Aprobado |
| **E7** | **Búsqueda de API Keys en el cliente (C6)** | 1. Ejecutar: `git grep "AIza"` en todo el proyecto.<br>2. Inspeccionar `.env.example` y el bundle de producción. | 0 coincidencias de claves privadas de Google Gemini en el código fuente cliente. La clave reside exclusivamente en Supabase Secrets. | Cero coincidencias en el cliente. La clave nunca viaja al teléfono. | ✅ Aprobado |
| **E8** | **Optimización y compresión de imagen (T2)** | 1. Seleccionar o tomar una foto de alta resolución (>3 MB).<br>2. Disparar *"Describir con IA"*. | `expo-image-manipulator` redimensiona a ancho 1024 px con calidad JPEG 0.7. El payload base64 enviado pesa menos de 300 KB. | Reducción local verificada; el payload enviado es ligero y ultra rápido. | ✅ Aprobado |
| **E9** | **Historial persistente en SQLite (Reto C1)** | 1. Mantener una conversación con el Asistente IA.<br>2. Cerrar la aplicación completamente.<br>3. Reabrir la app y entrar a la pestaña Asistente. | Los mensajes anteriores cargan automáticamente desde la tabla `chat_messages` en SQLite. El botón *"🔄 Reiniciar"* limpia la conversación tras confirmación. | Conversación restaurada íntegramente desde SQLite. | ✅ Aprobado |
| **E10** | **Instrucciones con perfil del estudiante (Reto C2)** | 1. Abrir modal *"⚙️ Perfil"* en Asistente.<br>2. Configurar Nombre, Nivel (avanzado) y Tema (sensores).<br>3. Enviar una pregunta. | El cliente envía `{ perfil }` en el cuerpo. El servidor valida con `zod` (`.catch({})`) y Gemini adapta su tono y nivel técnico al perfil del estudiante. | Respuestas personalizadas según el nivel técnico seleccionado. | ✅ Aprobado |
| **E11** | **Fichas de repaso estructuradas (Reto C3)** | 1. Conversar con el Asistente al menos 2 turnos.<br>2. Pulsar botón *"🗂️ Fichas"*.<br>3. Explorar las tarjetas generadas con `Output.object`. | La función `tarjetas-repaso` genera entre 3 y 5 preguntas/respuestas estructuradas validadas con Zod. La UI interactiva permite ver la respuesta y navegar entre fichas. | Flashcards interactivas renderizadas con estudio activo. | ✅ Aprobado |
| **E12** | **Sincronización bidireccional de descripción (T3, T5)** | 1. Describir una foto con IA y guardar.<br>2. Verificar en Supabase Table Editor que la columna `ai_description` contiene el texto.<br>3. En otro dispositivo, verificar que la descripción baja en el pull. | `services/sync.ts` incluye `ai_description` en push y pull. La descripción viaja y se almacena en SQLite en todos los clientes. | Sincronización bidireccional confirmada en SQLite y Supabase. | ✅ Aprobado |

---

## 2. Preguntas Clave del Entregable Semana 10

### 1. ¿Dónde está tu key de Gemini y cómo lo demuestras?
La key de Gemini (`GEMINI_API_KEY`) reside **exclusivamente como secreto cifrado en Supabase Edge Functions** (`npx supabase secrets set GEMINI_API_KEY=...`).
Se demuestra ejecutando:
```bash
git grep "AIza" src/
```
El comando retorna 0 resultados en el cliente. La app móvil nunca tiene contacto directo con la API de Google Gemini; solo habla con el proxy autenticado de Supabase Edge Functions.

### 2. ¿Qué pasa si alguien envía un perfil falso o un tema inventado? (Reto C2)
En la Edge Function `supabase/functions/tutor/index.ts`, el cuerpo es validado estrictamente con `zod`:
```ts
const perfilSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  tema: z.string().min(1).max(100).optional(),
  nivel: z.enum(['principiante', 'intermedio', 'avanzado']).optional(),
}).catch({});
```
Si un atacante envía tipos erróneos, inyecciones o valores no reconocidos, `.catch({})` neutraliza el objeto y el servidor recurre a valores por defecto seguros sin romper la ejecución ni contaminar el prompt del sistema.

### 3. ¿Por qué el límite se cuenta con el cliente del usuario y no con la secret key? (Reto C5)
Porque las políticas de seguridad **Row Level Security (RLS)** de Supabase aseguran que cada usuario autenticado (`auth.uid()`) solo pueda leer e insertar sus propios registros de uso (`uso_ia`). Al usar el cliente del usuario (`ctx.supabase`), la base de datos aplica RLS nativamente, impidiendo que un usuario suplante la identidad de otro o manipule el conteo global. Si se usara la `service_role` (secret key), se anularía el RLS y un error en la función podría exponer o alterar datos de otros estudiantes.

### 4. ¿Qué se guarda en tu teléfono y qué se envía a Google?
- **En el teléfono (SQLite)**: Se guarda la fotografía local (`uri`), metadatos geográficos (latitud, longitud, fecha), la descripción generada (`ai_description`), notas personales y el historial de chat (`chat_messages`).
- **A Google Gemini**: Solo se envía la fotografía reducida a 1024 px en formato JPEG comprimido (o el historial de texto reciente de hasta 20 mensajes). Nunca se envían claves de API, contraseñas ni tokens de sesión.
