# AI-LOG — GeoCam

Registro de Auditoría de IA (AI-LOG) para el desarrollo de GeoCam en la **Semana 6** y la **Semana 7**.

---

# Semana 6 — GeoCam

## 1. Prompts utilizados

**Prompt 1 — scaffolding:** Inicializar el proyecto Expo en la carpeta `GeoCam` ya existente sin generar una segunda app.

**Prompt 2 — implementación de la Semana 6:** Implementar la funcionalidad de GeoCam: cámara con `expo-camera`, ubicación con `expo-location`, galería con `expo-image-picker`, sacudidas con `expo-sensors`, mapa con `react-native-maps`, estado global de fotos con contexto, permisos solicitados solo en contexto y documentación.

**Prompt 3 — auditoría final y correcciones:** Comparar la implementación existente con los requisitos del entregable semanal, detectar incumplimientos y corregirlos sin reconstruir GeoCam desde cero.

---

## 2. Código generado vs. modificado

### Generado por la IA (Semana 6)

| Archivo | Contenido |
| --- | --- |
| `src/hooks/useCamera.ts` | `CameraView`, `useCameraPermissions`, `isCapturing`, `takePictureAsync`, `facing`, `openSettings`. |
| `src/hooks/useGeoLocation.ts` | Consulta de permiso, `requestForegroundPermissionsAsync`, `getCurrentPositionAsync`, `watchPositionAsync` con cleanup, `openSettings`. |
| `src/hooks/useShake.ts` | `Accelerometer.isAvailableAsync`, `setUpdateInterval`, umbral, cooldown, `Subscription.remove()`. |
| `src/context/GeoPhotosContext.tsx` | `photos`, `addPhoto`, `removePhoto`, `clearAll`. |
| `src/components/PermissionPrimer.tsx` | Bloque de permiso reutilizable. |
| `src/components/SourceBadge.tsx` | Diferenciación visual `camera` (verde) / `gallery` (violeta). |
| `src/components/GeoPhotoCard.tsx` | Tarjeta de foto con miniatura, origen, coordenadas y fecha. |
| `src/app/(tabs)/geocam.tsx` | Pantalla de cámara. |
| `src/app/(tabs)/mapa.tsx` | Pantalla de mapa. |
| `src/types/geo.ts`, `src/utils/*` | Tipos y utilidades. |

---

## 3. Errores y APIs incorrectas detectados y corregidos (Semana 6)

| # | Error / API incorrecta | Corrección | Cómo se verificó |
| --- | --- | --- | --- |
| 1 | **`CameraViewRef` + `ref.current.takePicture()`** (API antigua de Expo ≤ 50). | En SDK 57 `CameraView` es una clase con `takePictureAsync`. Se usó `useRef<CameraView \| null>(null)`. | Inspect `.d.ts` de `expo-camera`. |
| 2 | **`MediaTypeOptions.Images`** en `launchImageLibraryAsync`. | `mediaTypes: ['images']` (la enum antigua está obsoleta). | `node_modules/expo-image-picker/build/ImagePicker.types.d.ts`. |
| 3 | **`PermissionStatus` mapeado de forma incompleta.** | Se añadió el estado `blocked` a `PermissionState` y el mapeo usa `canAskAgain === false` → `blocked`. | Permite guiar al usuario a Ajustes. |
| 4 | **`androidGoogleMapsApiKey` vacía.** | Se configuró el plugin en `app.json` para evitar que el manifest elimine el bloque de mapas. | Introspección del manifest Android. |

---

## 4. Verificación de la Semana 6

* `npx tsc --noEmit`: 0 errores.
* `npx expo lint`: 0 errores.
* `npx expo-doctor`: 21/21 chequeos.

---

# Rediseño de Interfaz y Navegación

* `src/constants/theme.ts`: Sistema de diseño unificado con tokens `Colors`, `Surfaces`, `Brand`, `Night`, `Spacing`, `Radii` y `Layout`.
* `TopographicBackdrop.tsx`: Fondo topográfico hecho con `View`s concéntricas en la pantalla de Inicio.
* `confirmAction`: Adaptado para usar `Alert.alert` en nativo y `window.confirm` en web.

---

# Semana 7 — GeoCam persistente

**Proyecto:** GeoCam persistente – Taller Integrador 2

---

## 1. Prompts utilizados

**Prompt 1 — Persistencia con Drizzle y SQLite:** Sustituir el contexto en memoria por Expo SQLite y Drizzle ORM, crear esquema de tablas `photos` y `albums`, generar migraciones, implementar hooks `useLiveQuery` y repositorios.

**Prompt 2 — Módulo CRUD y Archivos Permanentes:** Crear la pantalla de detalle `src/app/foto/[id].tsx`, pestaña de **Biblioteca** (`src/app/(tabs)/biblioteca.tsx`), servicio de almacenamiento `src/services/photoFiles.ts` con la API moderna de Expo FileSystem (`File`, `Directory`, `Paths`), y rediseñar los filtros con **burbuja flotante de lupita y menú centrado en modal**.

**Prompt 3 — Diagnóstico y corrección de errores:** Corregir el error de resolución de Metro (`Unable to resolve "expo"`) producido por overrides de versión en `package.json`, y solucionar el fallo de renderizado en la pantalla de detalle (`Cannot read property 'value' of null`).

---

## 2. Código generado vs. modificado (Semana 7)

### Archivos creados o modificados en la Semana 7

| Archivo | Responsabilidad |
| --- | --- |
| `db/schema.ts` | Tablas `photos` y `albums`, relación `album_id` (`ON DELETE SET NULL`), nota, favorito e índice `photos_created_at_idx`. |
| `db/client.ts` | Inicialización de Expo SQLite con `openDatabaseSync('geocam.db', { enableChangeListener: true })` y `PRAGMA foreign_keys = ON;`. |
| `db/repositories/photos.ts` | Consultas Drizzle: `listQuery` (con filtros `like`, álbum y favoritas), `withLocationQuery`, `create`, `update`, `remove`, `clearAll`. |
| `db/repositories/albums.ts` | Operaciones de álbumes: `listQuery`, `create`, `remove`. |
| `drizzle/` | Migraciones empaquetadas: `0000_photos-and-albums.sql`, `0001_photo-notes-and-favorites.sql`, `0002_chemical_cargill.sql` y `migrations.js`. |
| `src/hooks/usePhotos.ts` | Reactividad con `useLiveQuery`, mapeo de `coords` planos y sincronización de borrado de archivos. |
| `src/hooks/useAlbums.ts` | Reactividad de álbumes. |
| `src/services/photoFiles.ts` | Copia persistente desde caché a `Paths.document/photos/` y borrado físico de archivos con la API moderna `File`/`Directory`/`Paths`. |
| `src/app/foto/[id].tsx` | Pantalla de detalle CRUD: ver foto, editar nota, marcar como favorita, mover de álbum y eliminar con confirmación. |
| `src/app/(tabs)/biblioteca.tsx` | Nueva pestaña de navegación para la exploración completa de la colección. |
| `src/components/PhotoFilters.tsx` | Rediseño de interfaz: **burbuja flotante con lupita** que abre un **modal centrado** para la búsqueda por nota y filtros. |
| `src/utils/benchmark.ts` | Script del Reto Opcional para sembrar 1.000 fotos de prueba y medir con `console.time` la consulta optimizada por el índice. |

---

## 3. Alucinaciones y Errores Detectados y Corregidos (Semana 7)

| La IA genera / Error detectado | Problema | Corrección aplicada | Cómo se verificó |
| --- | --- | --- | --- |
| `SQLite.openDatabase('db')` | API antigua de `expo-sqlite`, retirada en SDK 57 | `openDatabaseSync('geocam.db', { enableChangeListener: true })` | `db/client.ts` |
| `import { drizzle } from 'drizzle-orm/better-sqlite3'` | Driver para Node.js, no funciona en dispositivos móviles | `drizzle-orm/expo-sqlite` | `db/client.ts` |
| `drizzle.config.ts` sin `driver: 'expo'` | No genera el archivo `migrations.js` empaquetado | `driver: 'expo'` en `drizzle.config.ts` | `drizzle.config.ts` |
| Abrir la base sin `enableChangeListener` | `useLiveQuery` no se actualiza automáticamente al insertar/modificar | `openDatabaseSync(nombre, { enableChangeListener: true })` | Inspección de `db/client.ts` |
| Llaves foráneas sin PRAGMA | SQLite ignora la regla `ON DELETE SET NULL` por defecto | Executado `sqlite.execSync('PRAGMA foreign_keys = ON;')` al conectar | `db/client.ts` |
| `FileSystem.copyAsync` mezclado con `new File()` | Mezcla de la API legacy con la nueva de Expo SDK 57 | Uso exclusivo de `File`, `Directory` y `Paths` de `expo-file-system` | `src/services/photoFiles.ts` |
| `Unable to resolve "expo"` en Metro | Bloque `"overrides"` en `package.json` forzaba Metro a 0.84.5 | Se eliminó `"overrides"` restaurando el paquete oficial `@expo/metro` (`~56.0.2`) | Bundling de Metro en verde |
| `Cannot read property 'value' of null` en `/foto/[id]` | `noteDraft?.photoId === photo?.id` evaluaba `undefined === undefined` (`true`) cuando `photo` era `null` | Corregido a `photo && noteDraft?.photoId === photo.id ? noteDraft.value : photo?.note ?? ''` | Inspección y prueba de renderizado |

---

## 4. Verificación de la Semana 7

* **TypeScript**: `npx tsc --noEmit` completado con `0 errores`.
* **ESLint**: `npx eslint .` completado con `0 errores`.
* **Migraciones**: 3 migraciones SQL generadas con `drizzle-kit generate` y registradas en `drizzle/migrations.js`.
* **Reto Opcional**: Índice `photos_created_at_idx` creado en migración `0002` y verificado con el script `src/utils/benchmark.ts`.

---

# Semana 8 — Backend as a Service con Supabase (GeoCam en la nube)

**Proyecto:** GeoCam en la nube – Taller Integrador 2 (Semana 8)

---

## 1. Prompts utilizados

**Prompt 1 — Arquitectura BaaS y Selección de Plataforma:** Analizar las alternativas para Backend as a Service (BaaS). Al encontrar que Firebase Cloud Storage exige tarjeta de crédito y plan de facturación de pago (Blaze) para crear buckets en proyectos nuevos, migrar a Supabase (PostgreSQL remoto + Supabase Auth + Supabase Storage privado + WebSockets Realtime), alineado 100% con la guía de la Semana 8 y totalmente gratuito sin tarjeta.

**Prompt 2 — Dependencias y Persistencia Segura:** Instalar `@supabase/supabase-js`, `expo-secure-store` y `expo-crypto`, configurar `.env`, `.env.example` y construir un adaptador seguro de almacenamiento por fragmentos (`src/lib/secureStorage.ts`) que fragmenta tokens JWT en trozos de 1000 caracteres para sortear el límite histórico del Keychain en iOS (~2048 bytes).

**Prompt 3 — Migración 0003 en SQLite y Repositorios:** Diseñar la migración 0003 en SQLite para añadir `client_id`, `updated_at`, `remote_path`, `synced_at` y `owner_id`. Implementar `ensureSyncFields()` y preparar `usePhotos` y `photosRepo` para aislamiento local multi-usuario (Tarea C5).

**Prompt 4 — Subida Binaria, Rollback y Sincronización:** Implementar `src/services/cloudPhotos.ts` con subida binaria (`ArrayBuffer`) a bucket privado `geocam`, prevención de huérfanos con rollback inmediato, borrado coherente (cascada Storage -> PostgreSQL -> SQLite), sincronización por lotes con indicador de progreso dinámico ("3 de 7") en la Biblioteca y la nueva pestaña `src/app/(tabs)/nube.tsx` con URLs firmadas y suscripción en tiempo real (`supabase_realtime`).

---

## 2. Código generado vs. modificado (Semana 8)

### Archivos creados o modificados en la Semana 8

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/secureStorage.ts` | Adaptador sobre `expo-secure-store` con fragmentación en chunks de 1000 caracteres para guardar tokens de sesión de Supabase sin desbordar el Keychain de iOS. |
| `src/lib/supabase.ts` | Cliente Supabase singleton configurado con `secureStorage`, refresco automático y sincronización de estado de aplicación (foreground/background). |
| `src/context/AuthContext.tsx` | Proveedor y hook `useAuth()` para manejo de sesión con Supabase Auth: `signIn`, `signUp`, `signOut` y mapeo de errores a español. |
| `src/app/login.tsx` | Pantalla de inicio de sesión y registro con diseño visual adaptado a los tokens de GeoCam. |
| `src/app/_layout.tsx` | Integración de `AuthProvider`, rutas privadas protegidas con `<Stack.Protected guard={!!user}>` y llamada a `ensureSyncFields()`. |
| `db/schema.ts` | Esquema SQLite actualizado con columnas `clientId`, `updatedAt`, `remotePath`, `syncedAt` y `ownerId`, utilizando generador UUID independiente sin acoplamiento a React Native. |
| `drizzle/0003_curly_beyonder.sql` | Cuarta migración de SQLite generada y registrada en `drizzle/migrations.js`. |
| `db/repositories/photos.ts` | Repositorio extendido con `markSynced`, `ensureSyncFields`, `listUnsynced` y filtrado multi-usuario por `ownerId`. |
| `src/services/cloudPhotos.ts` | Subida a bucket privado `geocam` como `ArrayBuffer`, rollback de archivos huérfanos, inserción/upsert idempotente en PostgreSQL, borrado coherente y escucha reactiva en tiempo real. |
| `src/hooks/usePhotos.ts` | Integración de `ownerId` de la sesión activa, borrado sincronizado en cascada y función `syncPending`. |
| `src/app/(tabs)/biblioteca.tsx` | Botón interactivo de sincronización por lotes con contador dinámico de avance ("3 de 7") y botón de cierre de sesión. |
| `src/app/(tabs)/nube.tsx` | Nueva pestaña de fotos en la nube en tiempo real mediante URLs firmadas (`createSignedUrl`) y `postgres_changes`. |
| `src/app/foto/[id].tsx` | Indicador de estado de sincronización (☁️ Nube / Local) y botón manual *"Subir a la nube"*. |
| `src/components/GeoPhotoCard.tsx` | Chip distintivo de nube en fotos sincronizadas. |
| `src/components/app-tabs.tsx` & `app-tabs.web.tsx` | Pestaña "Nube" añadida con icono de nube para navegación principal. |
| `supabase.sql` | Script SQL completo con creación de tabla `photos`, políticas RLS estrictas (`auth.uid() = user_id`), bucket privado `geocam`, políticas de Storage y publicación en tiempo real. |
| `.env.example` & `.gitignore` | Protección estricta de credenciales en el repositorio. |
| `assets/capturas/14-20.png` | 7 evidencias visuales de la Semana 8: Registro, Login, Pestaña Nube, Sincronización en Biblioteca, Progreso de subida, Aislamiento multi-usuario y Consola remota de Supabase con tabla PostgreSQL y Storage. |

---

## 3. Alucinaciones y Errores Detectados y Corregidos (Semana 8)

| La IA genera / Error detectado | Problema | Corrección aplicada | Cómo se verificó |
| --- | --- | --- | --- |
| Paywall en Firebase Storage | Google Firebase requiere tarjeta de crédito para crear buckets de Storage en cuentas nuevas. | Se migró a Supabase (PostgreSQL + Auth + Storage privado + Realtime), 100% gratuito sin tarjeta de crédito. | Guía oficial Semana 8 cumplida y script `supabase.sql` listo. |
| `import * as Crypto from 'expo-crypto'` en `db/schema.ts` | `drizzle-kit generate` falló con error de esbuild: `Unexpected "typeof" in react-native/index.js` al correr en entorno Node. | Se implementó una función `generateUUID()` pura basada en `globalThis.crypto?.randomUUID()`. | `npx drizzle-kit generate` ejecutó limpiamente la migración `0003`. |
| `react-hooks/set-state-in-effect` en `nube.tsx` | React Compiler / ESLint advirtió sobre llamadas síncronas a `setIsLoading` / `loadPhotos` dentro de `useEffect`. | Se inicializó el estado con función evaluada y se desacopló la recarga con actualización optimista y promesas con guard `isMounted`. | `npx expo lint` pasó con 0 advertencias y 0 errores. |
| Inconsistencia de dependencias en `useCallback` | ESLint `react-hooks/preserve-manual-memoization` falló al usar `[user?.id]` cuando la inferencia del compilador esperaba `[user]`. | Se unificaron las dependencias a `[user]` en todas las acciones de `usePhotos.ts`. | `npx expo lint` completó en verde. |
| Subida con `FormData` o `Blob` nativo en React Native | Provoca archivos subidos corruptos o de 0 bytes en buckets de Storage. | Se convirtió la imagen a `ArrayBuffer` a través de `fetch(uri).then(r => r.arrayBuffer())`. | Subida binaria íntegra garantizada. |
| Archivos huérfanos al fallar base remota | Si la imagen sube a Storage pero el `upsert` falla en PostgreSQL, el archivo queda ocupando espacio. | Bloque `try/catch` en `uploadPhoto`: si la inserción en base falla, se ejecuta `remove([storagePath])` inmediatamente. | `src/services/cloudPhotos.ts`. |
| Desbordamiento de Keychain en iOS (>2048 bytes) | Los tokens de sesión y JWT de Supabase pueden exceder el límite seguro de almacenamiento del Keychain en iOS. | Adaptador `src/lib/secureStorage.ts` que fragmenta cadenas largas en chunks numerados de 1000 caracteres. | `src/lib/secureStorage.ts`. |

---

## 4. Verificación de la Semana 8

* **TypeScript**: `npx tsc --noEmit` verificado con `0 errores`.
* **ESLint**: `npx expo lint` verificado con `0 errores` y `0 advertencias`.
* **Migraciones Drizzle**: Migración `0003_curly_beyonder.sql` generada y registrada en `migrations.js`.
* **Auditoría de Credenciales**: Ejecutado `git log --all --full-history -- .env` con resultado vacío (0 commits), confirmando que las credenciales jamás se han expuesto en el historial.

---

# Semana 9 — TanStack Query y Sincronización Offline-First (GeoCam Sincronizada)

**Proyecto:** GeoCam sincronizada – Taller Integrador 2 (Semana 9)

---

## 1. Prompts utilizados

**Prompt 1 — Arquitectura de Sincronización Bidireccional:** Diseñar un sistema offline-first en dos sentidos entre SQLite local (fuente de verdad) y Supabase (PostgreSQL + Storage) orquestado por TanStack Query v5. Definir el ciclo de sincronización (bajar primero, comparar conflictos con "gana el último cambio" y subir pendientes).

**Prompt 2 — Migración 0004 y Persistencia de Cursor:** Crear la tabla local `sync_meta` para persistir el cursor de bajada (`lastPulledAt:${userId}`), añadir la columna `deletedAt` en la tabla `photos` para borrado lógico (C1), generar la migración con Drizzle Kit y actualizar `photosRepo` y `syncMetaRepo`.

**Prompt 3 — Detección de Red y Foco:** Conectar `onlineManager` con `expo-network` y `focusManager` con `AppState` en `src/lib/queryClient.ts` para pausar consultas sin conexión y reactivarlas automáticamente al volver la red o pasar a primer plano. Configurar persistencia offline con `@tanstack/react-query-persist-client`.

**Prompt 4 — Motor de Sincronización y Reto Opcional:** Implementar `src/services/sync.ts` con `pull` (descarga binaria y propagación de borrados), `push` (subida idempotente con tolerancia a fallos individuales C5), y la regla de conflicto `mergeNotesOnConflict` para fusionar notas editadas sin conexión preservando ambas versiones.

**Prompt 5 — UI Reactiva y Feed Paginado:** Diseñar el componente `SyncBadge` adaptado a los tokens de diseño de GeoCam, incorporarlo en la Cámara y en la Biblioteca (con panel de estado detallado C4), y reescribir la pestaña Nube (`nube.tsx`) con `useInfiniteQuery`, cursor, infinite scroll, búsqueda con debounce (`useDebouncedValue`) y los 4 estados de UI.

---

## 2. Código generado vs. modificado (Semana 9)

### Archivos creados o modificados en la Semana 9

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/queryClient.ts` | Inicialización de TanStack Query `QueryClient`, escuchadores de red (`expo-network`) y foco (`AppState`), hook `useIsOnline` y persister para caché offline con AsyncStorage (C3). |
| `src/services/sync.ts` | Motor de sincronización bidireccional: `pull` por cursor, `push` idempotente, tolerancia de fallos por foto (C5), regla `remoteWins` y fusión de notas (Reto opcional). |
| `src/hooks/useSync.ts` | Hook de sincronización basado en `useQuery`, con reactividad local mediante `useLiveQuery` e invalidación automática con `requestSync()`. |
| `src/hooks/useDebouncedValue.ts` | Hook de debounce para búsqueda en vivo en la nube sin saturar la red con peticiones por tecla. |
| `src/components/SyncBadge.tsx` | Indicador visual interactivo del estado de sincronización (Al día, Sincronizando, Pendientes, Sin conexión, Error). |
| `src/app/(tabs)/nube.tsx` | Feed remoto paginado con `useInfiniteQuery`, cursor, infinite scroll, banner offline y los 4 estados de interfaz (C2). |
| `src/app/(tabs)/biblioteca.tsx` | Panel de estado de sincronización (C4) con balance de subidas/bajadas y botón *"Sincronizar ahora"*. |
| `src/app/(tabs)/geocam.tsx` | Integración del indicador `SyncBadge` visible sobre la cámara sin obstruir controles de captura. |
| `src/hooks/usePhotos.ts` | Disparo automático de `requestSync()` tras crear, editar o eliminar fotos. Borrado lógico con `softDelete`. |
| `src/services/photoFiles.ts` | Nueva función `downloadPhotoFile` para descargar imágenes de Supabase Storage mediante URL firmada a la carpeta de documentos. |
| `src/services/cloudPhotos.ts` | Nueva función `listCloudPhotosPage` con paginación por cursor y filtrado de fotos con borrado lógico. |
| `db/schema.ts` | Esquema actualizado con tabla `sync_meta` y columna `deletedAt` en tabla `photos`. |
| `drizzle/0004_clumsy_the_professor.sql` | Quinta migración de SQLite generada y registrada en `drizzle/migrations.js`. |
| `db/repositories/syncMeta.ts` | Repositorio para almacenar y recuperar el cursor de bajada por usuario. |
| `db/repositories/photos.ts` | Repositorio extendido con `pendingQuery`, `listPending`, `findByClientId`, `insertFromRemote`, `applyRemote`, `markSynced` y `softDelete`. |
| `src/app/_layout.tsx` | Integración de `PersistQueryClientProvider` y `useAppFocusManager`. |
| `supabase_semana9.sql` | Script SQL para Supabase con `server_updated_at`, trigger, índice, política de `update` y columna `deleted_at`. |
| `tsconfig.json` | Exclusión de las carpetas de ejemplo del profesor (`geocam-sync` y `muro-tanstack`) para aislar la compilación del proyecto principal. |

---

## 3. Alucinaciones y Errores Detectados y Corregidos (Semana 9)

| La IA genera / Error detectado | Problema | Corrección aplicada | Cómo se verificó |
| --- | --- | --- | --- |
| `useQuery(['sync'], syncAll)` | Sintaxis de TanStack Query v3/v4; la v5 requiere obligatoriamente la firma con objeto `{ queryKey, queryFn }`. | Se usó `useQuery({ queryKey: ['sync', userId], queryFn })`. | Compilación estricta de TypeScript. |
| `window.addEventListener('online')` | En React Native no existe el objeto global `window` ni eventos web de red. | Se configuró `onlineManager.setEventListener` con `Network.addNetworkStateListener` de `expo-network`. | `src/lib/queryClient.ts`. |
| Inclusión de carpetas de ejemplo en `tsconfig.json` | `tsconfig.json` compilaba las carpetas `geocam-sync` y `muro-tanstack` causando conflictos de alias `@/`. | Se añadió `"exclude": ["node_modules", "geocam-sync", "muro-tanstack"]` en `tsconfig.json`. | `npx tsc --noEmit` completó con 0 errores. |
| Subir primero y bajar después | Si se sube primero, un cambio local obsoleto puede sobreescribir una versión remota más reciente antes de compararlas. | Se invirtió el orden estricto: primero `pull(userId)` con cursor, y luego `push(userId)`. | `src/services/sync.ts`. |
| Borrado destructivo directo (`DELETE`) | Un `DELETE` físico inmediato en local no deja rastro para avisar a los demás dispositivos que la foto fue eliminada. | Se implementó borrado lógico con `deletedAt` en SQLite y `deleted_at` en Supabase (C1). | Flujo de borrado sincronizado probado. |
| Falla en lote por foto huérfana | Si una foto fallaba al subir (archivo ausente), el ciclo completo se interrumpía dejando las demás pendientes. | Se envolvió cada foto en un `try/catch` individual dentro de `push(userId)` (C5). | `src/services/sync.ts`. |
| `StyleSheet.absoluteFillObject` | Propiedad inexistente en el tipo estricto de StyleSheet en React Native. | Se corrigió por `StyleSheet.absoluteFill`. | TypeScript `0 errores`. |
| `"expo" no se reconoce como un comando interno o externo` | Faltaban los ejecutables binarios `.bin/expo.cmd` tras una instalación interrumpida y desalineación con Expo Go 58. | Se instaló `expo@~58.0.26`, se regeneraron los binarios en `node_modules/.bin` y se alinearon las 34 dependencias a Expo SDK 58. | `npx expo --version` devolvió `58.1.21`. |
| Incompatibilidad de tipos en React 19.3 / RN 0.88 (`react-native-safe-area-context`) | El paquete `react-native-safe-area-context` en SDK 58 no exportaba declaraciones completas en su índice DTS. | Se creó `src/types/react-native-safe-area-context.d.ts` y se actualizaron los tipos en `useTheme`, `app-tabs` y `nube.tsx`. | `npx tsc --noEmit` completó con 0 errores. |
| `Unable to resolve module ./wa-sqlite/wa-sqlite.wasm` (Web) | Metro Bundler no incluye `.wasm` por defecto en `assetExts`, impidiendo resolver el motor WebAssembly de SQLite en Web. | Se añadió `'wasm'` a `config.resolver.assetExts`, `unstable_enablePackageExports = true` y headers COOP/COEP en `metro.config.js`. | Metro empaqueta `.wasm` sin errores. |
| Pantalla en negro/blanco en iOS tras cargar bundle | `SafeAreaProvider` retornaba `null` porque `insets` se inicializaba en `null` en native, y `SplashOverlay` tenía animación `entering={FadeOut}` inválida con `scheduleOnRN`. | Se implementó `src/lib/safe-area-context.js` con insets inmediatos no nulos y se rediseñó `SplashOverlay` con temporizador de salida garantizado y `exiting={FadeOut}`. | La app renderiza inmediatamente en iOS, Android y Web. |
| `ReferenceError: localStorage is not defined` (SSR Web) | Durante el renderizado estático/SSR de Expo Router en Node.js, `Platform.OS === 'web'` es verdadero pero `localStorage` no existe en el entorno Node. | Se aisló el acceso a `localStorage` verificando `typeof window !== 'undefined'` y proveyendo un almacén en memoria `Map` como fallback en `src/lib/secureStorage.ts`. | `router-server/node/render.js` ejecuta sin excepciones. |
| `Server Error: No safe area value available` (SSR Web) | Durante el empaquetado SSR en Node.js, `useSafeAreaInsets` lanzaba excepción cuando `insets` era nulo. | Se neutralizó la excepción en `scripts/patch-safe-area.js` devolviendo insets de escape `{ top: 0, bottom: 0, left: 0, right: 0 }`. | SSR de Web compila sin errores. |
| Rediseño de Logo, Camuflaje Topográfico y Paleta de Colores | Solicitud de mejora visual: Logo moderno de pin con cámara en Rojo, camuflaje topográfico de alta definición más visible y paleta Negro principal/Blanco y Rojo secundario con botón para alternar modo oscuro en esquina superior derecha. | Se rediseñó `GeoCamLogo.tsx` con pin + cámara interna en Rojo (`#EF4444`), se integró la imagen de camuflaje topográfico en `TopographicBackdrop.tsx`, se crearon `ThemeContext.tsx` y `ThemeToggleButton.tsx`, y se actualizó `theme.ts`. | Verificado en iOS y Web con 0 errores de TypeScript. |
| `[runtime not ready]: Error: Cannot find native module 'ExpoAsset'` (iOS Expo Go) | Al importar la imagen del camuflaje con `require()`, `expo-asset` llamaba a nivel superior `requireNativeModule('ExpoAsset')` de forma estricta. Al no estar vinculado en Expo Go, bloqueaba la inicialización del runtime y no se registraba el componente `main`. | Se parchó `ExpoAsset.js` en `scripts/patch-safe-area.js` usando `requireOptionalNativeModule` y devolviendo la URL local como fallback seguro. | La app arranca y registra `main` sin interrupciones. |
| `The SQLite web worker has not finished loading` (Web) | En web, `expo-sqlite` inicializa el Web Worker de `wa-sqlite` de manera asíncrona en el siguiente ciclo de eventos. La llamada síncrona `openDatabaseSync` a nivel de módulo en `db/client.ts` arrojaba error porque el worker aún no estaba listo al evaluar los módulos. | Se creó `db/client.web.ts` con inicialización asíncrona `initWebDatabase()` mediante `openDatabaseAsync('geocam.db')` y un Proxy seguro para Drizzle `db`. En `_layout.tsx`, `MigrationGate` espera a que el worker esté listo antes de correr `useMigrations`. En plataformas nativas (`db/client.ts`), la base continúa abriéndose sincrónicamente sin demoras ni cambios. | `npx tsc --noEmit` completó con 0 errores y la app corre tanto en iOS como en Web. |

---

## 4. Verificación de la Semana 9 y Actualización a Expo 58

* **Expo SDK**: Actualizado a **Expo SDK 58** (`58.0.26`) y `@expo/cli` (`58.1.21`), plenamente compatible con **Expo Go 58**.
* **TypeScript**: `npx tsc --noEmit` verificado con `0 errores`.
* **ESLint**: `npx eslint src db` verificado con `0 errores` y `0 advertencias`.
* **Migraciones Drizzle**: Migración `0004_clumsy_the_professor.sql` generada y registrada en `migrations.js`.
* **Persistencia Offline**: `@tanstack/react-query-persist-client` con AsyncStorage configurado en el layout raíz.

---

# Semana 10 — IA Generativa Multimodal y Edge AI (GeoCam ve + Asistente IA)

## 1. Prompts y Objetivos

**Prompt 1 — GeoCam ve (Requisitos T1–T6):**
Implementar la capacidad de que GeoCam describa fotografías tomadas con la cámara o seleccionadas de la galería utilizando Google Gemini detrás de una Supabase Edge Function (`describir-foto`). La función responde un JSON validado sin streaming y es llamada mediante `supabase.functions.invoke`. La descripción sugerida se presenta editable en el detalle de la fotografía (`src/app/foto/[id].tsx`), se guarda en SQLite en la columna `ai_description`, actualiza `updated_at` y viaja a Supabase en la sincronización bidireccional existente.

**Prompt 2 — Asistente IA y Retos C1–C6:**
Construir la pieza "Asistente IA" para el Taller Integrador 2 (tag `v2.0.0`) integrando:
1. **C1 (Historial persistente):** Conversación guardada en SQLite con Drizzle (`chat_messages`); la app reanuda donde iba y cuenta con botón *"🔄 Reiniciar"*.
2. **C2 (Instrucciones con tus datos):** Modal de perfil del estudiante (nombre, tema, nivel) enviado en el transporte y validado en el servidor con Zod (`.catch({})`).
3. **C3 (Salida estructurada):** Generación de 3 a 5 tarjetas de repaso (pregunta y respuesta) con `Output.object` en Edge Function `tarjetas-repaso`.
4. **C4 (Manejo de errores):** Banner sin conexión, controles deshabilitados sin red, mensajes claros para 401, 429 y botón *"Reintentar"*.
5. **C5 (Límite por usuario):** Máximo N peticiones cada 24 horas contadas en Supabase (`uso_ia` con RLS).
6. **C6 (Bitácora y pruebas):** Matriz de escenarios en `PRUEBAS.md` y actualización de `AI-LOG.md`.

---

## 2. Código generado vs. modificado (Semana 10)

| Archivo | Rol en la arquitectura |
| --- | --- |
| `supabase/functions/describir-foto/index.ts` | Edge Function protegida con `withSupabase({ auth: 'user' })`, control de límite `uso_ia` (C5), llamada a Gemini con `generateText` de AI SDK v7 y respuesta JSON `{ descripcion }`. |
| `supabase/functions/tutor/index.ts` | Edge Function de chat con streaming vía `streamText`, validación de perfil con Zod (C2), límite diario (C5) y streaming adaptado a Expo. |
| `supabase/functions/tarjetas-repaso/index.ts` | Edge Function para salida estructurada con `Output.object` y esquema Zod de tarjetas de estudio activo (C3). |
| `src/services/vision.ts` | Servicio de visión: reduce fotos a 1024 px JPEG calidad 0.7 con `expo-image-manipulator` e invoca `describir-foto` mediante `supabase.functions.invoke`. |
| `src/lib/chatTransport.ts` | Transporte personalizado con `DefaultChatTransport`, `expo/fetch` y token de sesión de Supabase Auth para streaming. |
| `src/polyfills.ts` | Polyfills de `structuredClone`, `TextEncoderStream` y `TextDecoderStream` para el motor Hermes en React Native. |
| `src/types/ungap-structured-clone.d.ts` | Declaración de tipos TypeScript para el polyfill de `structuredClone`. |
| `db/schema.ts` | Esquema SQLite extendido con columna `aiDescription` en tabla `photos` y nueva tabla `chat_messages` (C1). |
| `drizzle/0005_light_lily_hollister.sql` | Sexta migración de Drizzle con `ALTER TABLE photos ADD ai_description text;` y `CREATE TABLE chat_messages;`. |
| `drizzle/migrations.js` | Registro automático de la migración `m0005` para el migrador de Expo SQLite. |
| `db/repositories/photos.ts` | Métodos `update` y `applyRemote` adaptados para `aiDescription`; nuevo método `setDescription` que actualiza `updatedAt`. |
| `db/repositories/chatMessages.ts` | Repositorio SQLite con Drizzle para persistir, listar y limpiar el historial de mensajes del chat (C1). |
| `src/services/sync.ts` | Sincronización bidireccional extendida con `ai_description` en ambos mapeos (push y pull). |
| `src/hooks/usePhotos.ts` | Nuevo hook `setAiDescription` con invalidación de sincronización automática `requestSync()`. |
| `src/app/foto/[id].tsx` | Interfaz del detalle de foto: botón *"✨ Describir con IA"* con spinner, aviso de modo sin conexión, aviso de privacidad a Gemini, input editable y botón para guardar en SQLite. |
| `src/components/GeoPhotoCard.tsx` | Tarjeta de foto con vista previa en vivo de las primeras palabras de la descripción IA (`✨ ...`). |
| `src/app/(tabs)/asistente.tsx` | Pantalla completa del Asistente IA con chat en streaming, fotos multimodales, modal de perfil (C2), visor interactivo de fichas de estudio (C3) y manejo de errores (C4). |
| `src/components/app-tabs.tsx` | Pestaña nativa *"Asistente"* con icono `sparkles`. |
| `supabase_semana10.sql` | Script SQL para Supabase con columna `ai_description` en `photos`, tabla `uso_ia` con RLS e índices. |
| `PRUEBAS.md` | Matriz detallada de 12 escenarios de prueba reales (modo avión, límite 429, sesión 401, búsqueda AIza, etc.). |

---

## 3. Errores y Alucinaciones Detectados y Corregidos (Semana 10)

| # | Error / Alucinación detectada | Problema | Corrección aplicada | Cómo se verificó |
|---|---|---|---|---|
| 1 | **Inclusión de `supabase/functions` en la compilación de Expo (`tsconfig.json`)** | Los archivos de Edge Functions en `supabase/functions/` son scripts de Deno (`npm:...`, `Deno.env`). El compilador `tsc` de Expo intentaba procesarlos y lanzaba errores `Cannot find name 'Deno'`. | Se agregó `"supabase"` al array `"exclude"` de `tsconfig.json`, aislando Deno del compilador de React Native. | `npx tsc --noEmit` completó con 0 errores. |
| 2 | **Falta de tipado en módulo `@ungap/structured-clone`** | `src/polyfills.ts` arrojaba error TS7016 al importar el polyfill porque el paquete no incluía archivos `.d.ts`. | Se creó el archivo de declaración `src/types/ungap-structured-clone.d.ts` tipando la función global. | TypeScript resolvió el módulo sin advertencias. |
| 3 | **Uso de variantes de texto y tokens inexistentes (`type="caption"`, `Brand.secondary`)** | La IA asumió que existía la variante `"caption"` en `ThemedText` y el color `Brand.secondary`, provocando errores TS2322 y TS2339. | Se sustituyó por `type="small"` y el color de superficie `#27272A` alineado con la paleta Negro/Blanco y Rojo de GeoCam. | Inspección de tipos en `ThemedText` y `theme.ts`. |
| 4 | **Incompatibilidad de tipos en `nube.tsx` y `cloudPhotos.ts` tras migración** | Al agregar `aiDescription` a la entidad `Photo`, la mutación de borrado en `nube.tsx` fallaba por propiedad faltante. | Se extendió la interfaz `CloudPhoto` con `ai_description?: string \| null` y se incluyó en `deleteCloudPhoto` y `uploadPhoto`. | Tipado verificado en `nube.tsx`. |
| 5 | **Ruta relativa errónea al importar repositorio en `asistente.tsx`** | Al encontrarse en `src/app/(tabs)/asistente.tsx` (profundidad 3), el import `../../db/repositories/chatMessages` no alcanzaba el directorio raíz. | Se corrigió la ruta a `../../../db/repositories/chatMessages`. | Resolución de módulos limpia en compilación. |
| 6 | **Intento obsoleto de usar `generateObject` en AI SDK v7** | En versiones anteriores de Vercel AI SDK se usaba `generateObject`; en SDK v7 esta API fue reemplazada por `generateText` con `output: Output.object({ schema })`. | Se implementó la sintaxis oficial v7 en `tarjetas-repaso/index.ts` con `Output.object({ schema: tarjetasSchema })`. | Cumplimiento estricto de la guía Semana 10. |

---

## 4. Verificación de la Semana 10 (Tag v2.0.0)

* **TypeScript**: `npx tsc --noEmit` completado con **0 errores**.
* **Migraciones Drizzle**: Migración `0005_light_lily_hollister.sql` generada sin tocar migraciones previas.
* **Seguridad de Claves**: `git grep "AIza" src/` arrojó **0 resultados**. `GEMINI_API_KEY` reside exclusivamente en Supabase Secrets.
* **RLS en Supabase**: Tabla `uso_ia` con políticas select/insert restringidas a `auth.uid() = user_id`.
* **Pruebas**: Matriz de 12 escenarios documentada y validada en `PRUEBAS.md`.



