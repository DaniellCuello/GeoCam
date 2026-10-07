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
