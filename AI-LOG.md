# AI-LOG — Semana 6 GeoCam

Registro de prompts, código generado, correcciones y verificaciones de la Semana 6 de GeoCam
(secciones 1 a 5) y del rediseño de interfaz y navegación posterior (sección 6).
Versiones de referencia tras el bump de parches: **Expo ~57.0.26 · expo-router ~57.0.24 ·
React Native 0.86.3 · React 19.2.3 · TypeScript ~6.0.3**.

---

## 1. Prompts utilizados

> Los prompts se resumen por lo que se pidió en esta sesión. Se transcriben como resumen y no como
> cita literal, para no atribuir palabras que no se escribieron así.

**Prompt 1 — scaffolding.** Se pidió inicializar el proyecto Expo en la carpeta `GeoCam` ya
existente, siguiendo la opción recomendada y sin generar una segunda app.

La carpeta `GeoCam` estaba vacía. Se creó el proyecto con
`npx create-expo-app@latest . --template default --no-install` + `npx expo install`, respetando la
indicación de no abrir una segunda app.

**Prompt 2 — implementación de la Semana 6.** Se pidió implementar la funcionalidad de GeoCam:
cámara con `expo-camera`, ubicación con `expo-location`, galería con `expo-image-picker`, sacudidas
con `expo-sensors`, mapa con `react-native-maps`, estado global de fotos con contexto, permisos
solicitados solo en contexto, y documentación en `README.md` y `AI-LOG.md`. Sin SQLite ni
funcionalidades de semanas posteriores.

**Prompt 3 — auditoría final y correcciones.** Se pidió hacer la auditoría final y, si era
necesario, las correcciones finales de la Semana 6: comparar la implementación existente con los
requisitos del entregable semanal, detectar incumplimientos y corregirlos, sin reconstruir GeoCam
desde cero y sin inventar capturas, pruebas ni errores de IA.

---

## 2. Código generado vs. modificado

### Generado por la IA (archivos nuevos de la Semana 6)

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
| `README.md`, `AI-LOG.md` | Documentación. |

### Modificado sobre el template de Expo

| Archivo | Cambio | Motivo |
| --- | --- | --- |
| `src/app/_layout.tsx` | `AppTabs` → `<Slot />` | `NativeTabs` bajó al grupo `(tabs)`. |
| `src/components/app-tabs.tsx` | +2 triggers (`geocam`, `mapa`) con iconos `sf` + `md` | Las pestañas del entregable. |
| `src/components/app-tabs.web.tsx` | +2 `TabTrigger` | Paridad en web. |
| `src/app/index.tsx`, `explore.tsx` | **Movidos** a `src/app/(tabs)/` | El router usa `src/app` como raíz y los triggers se resuelven en el mismo directorio. |
| `src/hooks/use-color-scheme.web.ts` | `useState`+`useEffect` → `useSyncExternalStore` | Error preexistente del template (regla `react-hooks/set-state-in-effect`). |
| `src/types/styles.d.ts` | **Nuevo** | Error preexistente: `import '@/global.css'` y `*.module.css` rompían `tsc`. |
| `app.json` | +plugins `expo-camera`, `expo-location`, `expo-image-picker`, `react-native-maps` | Mensajes de permiso en el sistema operativo. |
| `eslint.config.js` | **Nuevo**, creado por `npx expo lint` | El template no traía ESLint instalado. |

### Sin tocar en la Semana 6

`package.json` (versiones las fijó `npx expo install`), `src/constants/theme.ts`,
`src/components/themed-text.tsx`, `themed-view.tsx`, `animated-icon.*`, `external-link.tsx`,
`web-badge.tsx`, `hint-row.tsx`, `ui/collapsible.tsx`, `use-theme.ts`.

> Estos archivos sí se reescribieron después, en el rediseño de la sección 6. La lista refleja el
> estado al cierre de la Semana 6.

---

## 3. Errores y APIs incorrectas detectados y corregidos

No son inventados: todos se encontraron durante la implementación y se comprobaron leyendo los
`.d.ts` y el código fuente instalados en `node_modules`.

| # | Error / API incorrecta | Detección | Corrección | Cómo se verificó |
| --- | --- | --- | --- | --- |
| 1 | **`CameraViewRef` + `ref.current.takePicture()`** es la API de Expo SDK ≤ 50. | La primera versión de `useCamera` asumía el patrón antiguo, que es el que devuelve la documentación de SDK anteriores. | En SDK 57 `CameraView` es una **clase** con `takePictureAsync`; `CameraViewRef` es el ref nativo moderno con `takePicture`. Se usó `useRef<CameraView \| null>(null)`. | `node_modules/expo-camera/build/CameraView.d.ts` declara `class CameraView` con `takePictureAsync`; `Camera.types.d.ts` define `CameraViewRef` por separado. |
| 2 | **`MediaTypeOptions.Images`** en `launchImageLibraryAsync`. | Marcado como obsoleto en los docs de ImagePicker de SDK 57. | `mediaTypes: ['images']`. | `node_modules/expo-image-picker/build/ImagePicker.types.d.ts` marca `MediaTypeOptions` con `@deprecated` y declara `mediaTypes?: MediaType[] \| MediaType`. |
| 3 | **`import type { PermissionResponse } from 'expo-modules-core'`.** | `expo-modules-core` no es dependencia directa del proyecto. | `import { PermissionStatus, type PermissionResponse } from 'expo'`. | `node_modules/expo/build/Expo.d.ts` reexporta ambos. |
| 4 | **Mapeo de permisos que fusionaba "rechazado" con "pendiente"** — el más grave. | `PermissionStatus` de SDK 57 solo tiene `granted \| undetermined \| denied`; el código traducía `!granted && canAskAgain` a `undetermined`, dejando el rechazo indistinguible de "nadie ha decidido todavía". | Se añadió el estado `blocked` a `PermissionState` y el mapeo pasa a usar `status` + `canAskAgain`: `DENIED && canAskAgain` → `denied`, `DENIED && !canAskAgain` → `blocked`. | `node_modules/expo-modules-core/build/PermissionsInterface.d.ts` documenta que `canAskAgain === false` obliga a dirigir al usuario a Ajustes. Sin este arreglo era **imposible** producir las tres evidencias que pide el README del profesor. |
| 5 | **`StyleSheet.absoluteFillObject`** no existe en los tipos de RN 0.86. | `tsc` → `TS2551`. | Propiedades `position/top/left/right/bottom` explícitas. | Error de compilación resuelto. |
| 6 | **Iconos de las pestañas nuevas como PNG.** | El template solo trae `home.png` y `explore.png`, y `@expo/vector-icons` no está instalado. | `NativeTabs.Trigger.Icon` acepta `sf` (iOS) y `md` (Material Symbols, Android) sin recursos extra. | `node_modules/expo-router/build/native-tabs/types.d.ts` → `SymbolOrImageSource`; el bundle de Android incluye `MaterialSymbols_400Regular.ttf`. |
| 7 | **`android.config.googleMaps.apiKey` no basta con `react-native-maps` instalado.** | El plugin del paquete tiene prioridad y elimina el `meta-data` si no recibe `androidGoogleMapsApiKey`. | Se declara explícitamente `["react-native-maps", { "androidGoogleMapsApiKey": "" }]`. | `@expo/config-plugins/build/plugins/withStaticPlugin.js` resuelve el plugin estático y **solo** usa el `fallback` si no lo encuentra; `createLegacyPlugin.js` muestra que el `fallback`-era `withGoogleMapsApiKey`. |
| 8 | **`import * as Linking from 'react-native'` pierde `openSettings`.** | `tsc` → `TS2551: Property 'openSettings' does not exist on type 'typeof import("react-native/types/index")'`. Apareció al mover `Linking.openSettings()` a `src/utils/permissions.ts`. | Import nombrado: `import { Linking } from 'react-native'`. | Confirma que el `Linking.openSettings()` original (import nombrado) sí era válido. |
| 9 | **`useShake` / `useGeoLocation` sin protección contra resolución tardía.** | `watchPositionAsync` y `isAvailableAsync` son promesas: el listener puede crearse **después** de desmontar el efecto y quedar filtrado. | `active` local por efecto + `mountedRef`; si la suscripción llega tarde se llama a `subscription.remove()` igualmente. | Lectura del flujo en `useGeoLocation.ts:132-139` y `useShake.ts:50-86`. |
| 10 | **`setState` síncrono dentro de un efecto** en `use-color-scheme.web.ts` (template). | `npx expo lint` → `react-hooks/set-state-in-effect`. | `useSyncExternalStore` con `getServerSnapshot`, que conserva la hidratación de la renderización estática sin renders en cascada. | `npx expo lint` limpio. |
| 11 | **Imports de CSS sin declaración** en el template. | `tsc` → `TS2307` en `animated-icon.web.tsx` y `TS2882` en `theme.ts`. | `src/types/styles.d.ts` con `declare module '*.css'`. | `npx tsc --noEmit` limpio. |
| 12 | **Dependencias desfasadas respecto a SDK 57.** | `expo-doctor` y `expo install --check` detectaron 5 paquetes con parches nuevos publicados. | `npx expo install --fix`. | `Dependencies are up to date` y doctor 20/21 tras el bump. |

### Correcciones hechas en la auditoría final

| # | Incumplimiento detectado | Corrección |
| --- | --- | --- |
| A | `useCamera` no controlaba `isCapturing` ni impedía dobles capturas (exigido en el enunciado). | `isCapturing` + espejo `isCapturingRef` que cierra la ventana entre renders; el botón de disparo se deshabilita y muestra spinner. |
| B | `openSettings` vivía en la pantalla, no en los hooks (el enunciado lo exige en ambos). | `useCamera` y `useGeoLocation` exponen `openSettings`, implementado una vez en `src/utils/permissions.ts`. |
| C | `PermissionPrimer` trataba `denied` como bloqueado: mostraba "Permiso bloqueado" y "Abrir ajustes" ante un rechazo simple. | Botón según estado: *Permitir* / *Volver a pedir* / **Abrir Ajustes**, más la pista "Actívalo en Ajustes → permisos de la aplicación" solo cuando `blocked`. |
| D | El banner de ubicación decía "Permiso bloqueado" también en un rechazo. | Textos distintos para `denied` y `blocked`, y la acción correcta en cada caso. |
| E | `README.md` no tenía la sección identificable `Semana 6 – GeoCam` ni los marcadores de las tres evidencias. | Sección completa y `## Evidencias de permisos` con los tres marcadores, **sin imágenes falsas**, más la recipe para alcanzar cada estado. |
| F | `AI-LOG.md` no tenía las cuatro secciones obligatorias con esos nombres. | Este documento, reorganizado en prompts / generado vs. modificado / errores / verificación. |
| G | `README.md` trataba la API key de Google Maps como requisito general. | Matriz **Expo Go / development build / producción / web**, y nota de que `expo-sensors` no necesita entrada en `app.json`. |

---

## 4. Verificación

### Comandos

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | Sin errores (exit 0) |
| `npx expo lint` | Sin errores ni avisos (exit 0) |
| `npx expo install --check` | `Dependencies are up to date` (exit 0) |
| `npx expo-doctor` | **20/21 checks passed.** El único check que falla es *Check Expo config schema*, que aborta con `TypeError: fetch failed` al conectar con la API de Expo. Fallo de red de este entorno, **no del proyecto**: se reintentó dos veces con el mismo resultado. El contenido de `app.json` se validó aparte con `npx expo config --type public`, que resuelve la configuración completa sin errores (exit 0). |
| `npx expo config --type public` | Configuración resuelta correctamente, plugins y permisos legibles. |
| `npx expo export --platform android` | `android bundles (1)` → `entry-*.hbc` de 3.9 MB, exit 0. |
| `npx expo export --platform web` | `web bundles (4)` + `Static routes (10)`: `/`, `/explore`, `/geocam`, `/mapa` (+ variantes `/(tabs)/…`, `_sitemap`, `+not-found`). exit 0. Tras el rediseño son 8 rutas y `/explore` ya no existe. |

Los directorios de export temporales (`.audit-export-android`, `.audit-export-web`) se eliminaron
después de la verificación.

### Actualización de dependencias

Durante esta auditoría, `expo-doctor` y `expo install --check` detectaron que Expo había publicado
parches nuevos para SDK 57 y el proyecto se había quedado atrás. Se aplicó
`npx expo install --fix`, que actualizó `expo` a `~57.0.26`, `expo-camera` a `~57.0.6`,
`expo-router` a `~57.0.24`, `expo-constants` a `~57.0.20` y `@expo/ui` a `~57.0.21`. Tras el bump se
volvieron a ejecutar typecheck, lint, doctor y los dos export, todos en verde.

### Configuración nativa resuelta

Verificado con `npx expo config --type introspect` tras el bump de dependencias:

- iOS `NSCameraUsageDescription` = `GeoCam usa la cámara para tomar fotos geolocalizadas.`
- iOS `NSLocationWhenInUseUsageDescription` = `GeoCam usa tu ubicación para registrar dónde tomaste cada foto.`
- iOS `NSPhotoLibraryUsageDescription` = `GeoCam necesita acceso a tus fotos para poder añadirlas al mapa.`
- iOS `NSMotionUsageDescription` presente → `expo-sensors` se aplica sin entrada en `app.json`
  (está en `legacyExpoPlugins` de `@expo/prebuild-config`).
- Android `uses-permission`: `CAMERA`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`.
- Android `android.permission.RECORD_AUDIO` declarado con `tools:node: "remove"` →
  `recordAudioAndroid: false` aplicado y el permiso eliminado del manifiesto final.
- Android manifest **sin** `com.google.android.geo.API_KEY` → la clave está vacía a propósito.
- Expo Router reconocía `/`, `/explore`, `/geocam`, `/mapa` (todas en `/(tabs)`). `/explore` se
  eliminó en el rediseño; ahora son `/`, `/geocam` y `/mapa`.

### Auditoría manual

- `any` / `as any` / `any[]` en `src/**/*.ts(x)`: **0 resultados** (la única aparición es la palabra
  "any" dentro de un comentario en `src/utils/errors.ts`).
- `console.*` en `src`: **0 resultados**. Los tres hooks exponen `error` como estado.
- `expo-permissions`: no se usa en ninguna parte. Los permisos se consultan con las APIs propias de
  cada módulo (`useCameraPermissions`, `getForegroundPermissionsAsync`), que son las correctas en
  SDK 57.
- Suscripciones y su cleanup:
  - `useGeoLocation` → `LocationSubscription.remove()` en el cleanup del efecto, en el cleanup de
    desmontaje, y también en el `.then()` si la suscripción se resuelve tarde.
  - `useShake` → `Subscription.remove()` en el cleanup, con guarda `active`/`mountedRef`.
  - Sin `watchPositionAsync` ni `addListener` sin `remove()` en todo el proyecto.

### Pruebas NO realizadas (y por qué)

Este entorno es Windows sin emulador, sin dispositivo físico y sin cámara. **No se ha comprobado en
runtime**: el preview de la cámara, la captura real, la lectura del GPS, los diálogos de permisos
del sistema operativo, el acelerómetro, los marcadores del mapa ni el `Callout`. No se ha inventado
ninguna de esas pruebas ni ninguna captura.

---

## 5. Deuda técnica conocida

- `androidGoogleMapsApiKey` está vacía a propósito: no se inventaron credenciales. En iOS no hace
  falta (Apple Maps).
- `npm audit` reporta 14 vulnerabilidades moderadas en dependencias transitivas del template; no se
  ejecutó `npm audit fix` para no tocar versiones de Expo sin autorización.
- El banner de ubicación del mapa y el `bottomSheet` usan medidas absolutas ajustadas a mano.
- El estado de las fotos vive solo en memoria: se pierde al recargar. Es intencional, el alcance de
  la semana no incluye persistencia.

---

# 6. Rediseño de interfaz y navegación

Rediseño visual completo (Inicio, navegación, tokens, identidad y assets) **sin reconstruir el
proyecto y sin tocar la funcionalidad de la Semana 6**: los hooks, el contexto, el ciclo de permisos
y el mapa conservan su lógica.

## 6.1 Prompt

Se pidió rediseñar la interfaz de GeoCam —pantalla de Inicio, navegación, sistema visual y
comportamiento responsive en iOS, Android y web—, eliminar los restos del template de Expo
(Explore, Docs, textos de bienvenida, badges), actualizar `app.json`, `README.md` y `AI-LOG.md`, y
terminar con un informe detallado y una validación. Restricciones explícitas: no reconstruir desde
cero, no romper la funcionalidad existente, no pedir permisos al abrir la app y no inventar
verificaciones.

## 6.2 Sistema de diseño

`src/constants/theme.ts` pasó a ser la única fuente de color, espaciado, radio y medida:

| Bloque | Contenido |
| --- | --- |
| `Colors` | `text`, `background`, `backgroundElement`, `backgroundSelected`, `textSecondary` en claro y oscuro. |
| `Surfaces` | `border`, `shadow`, `shadowStrong`; `useTheme()` las fusiona con `Colors`. |
| `Brand` | `primary #208AEF` + `primaryLight` / `primaryDeep` / `primarySoft`, `map #0FA697` + `mapSoft`, `danger` + `dangerSoft`, `onBrand`, `onDark`, `onDarkMuted`, `scrim`. |
| `Spacing` | `half` 2, `one` 4, `two` 8, `three` 12, `four` 16, `five` 24, `six` 32, `seven` 48. |
| `Radii` · `Layout` | `sm` 8 … `pill` 999; `contentMaxWidth` 720, `gutter` 20, `minTouch` 44. |

`ThemedText` quedó como criterio tipográfico único con las variantes `hero`, `cardTitle`, `title`,
`subtitle`, `default`, `small`, `smallBold`, `label` y `code`. Los iconos se resuelven con
`expo-symbols` y sus nombres válidos están centralizados en `src/constants/icons.ts`.

## 6.3 Archivos nuevos

| Archivo | Contenido |
| --- | --- |
| `src/constants/icons.ts` | Tipo `AppIcon` y catálogo `Icons` (`home`, `camera`, `map`, `flipCamera`, `gallery`, `photo`, `location`, `trash`, `chevron`) con la variante de cada plataforma. |
| `src/components/GeoCamLogo.tsx` | Logotipo hecho solo con `View`s: pin de mapa cuya cabeza es la lente. Sin SVG ni imágenes remotas. |
| `src/components/EmptyState.tsx` | Estado vacío con icono, título, descripción y acción opcional. |
| `src/components/splash-overlay.tsx` / `.web.tsx` | Portada de arranque en nativo (`onLayout` → `SplashScreen.hideAsync` → fundido) y no-op en web. |
| `src/utils/confirm.ts` | `confirmAction`: `Alert.alert` en nativo, `window.confirm` en web. |
| `src/app/(tabs)/mapa.web.tsx` | Pantalla de mapa para web, sin `react-native-maps`. |
| `assets/images/*.png` | `icon` (1024), `favicon` (64), `splash-icon` (512) y `android-icon-{background,foreground,monochrome}` (432). |

## 6.4 Archivos modificados

`src/app/_layout.tsx` (splash + `<Slot />`, sin `StatusBar` global), `src/app/(tabs)/index.tsx`
(nueva pantalla de Inicio), `geocam.tsx` (overlays con safe areas y controles responsive),
`mapa.tsx` (chips, estado vacío, hoja inferior y `Callout` dimensionado), `app-tabs.tsx` y
`app-tabs.web.tsx` (tres pestañas: Inicio, Cámara, Mapa), `themed-text.tsx`, `theme.ts`,
`use-theme.ts`, `PermissionPrimer.tsx`, `GeoPhotoCard.tsx`, `SourceBadge.tsx`, `app.json`,
`README.md` y `types/styles.d.ts` (solo un comentario que nombraba un archivo borrado).

`PermissionPrimer` mantiene los cinco estados y los textos exigidos para las evidencias: *Permiso
pendiente*, *Permiso rechazado* → *Volver a pedir*, y *Permiso bloqueado* → **Abrir Ajustes** con la
pista *"Actívalo en Ajustes → permisos de la aplicación"*.

## 6.5 Archivos eliminados (restos del template)

`src/app/(tabs)/explore.tsx`, `src/components/{hint-row,web-badge,external-link,animated-icon}.tsx`
y `animated-icon.web.tsx`, `animated-icon.module.css`, `src/components/ui/collapsible.tsx`,
`assets/expo.icon/`, `assets/images/tabIcons/`, `assets/images/{expo-logo,expo-badge,
expo-badge-white,react-logo,react-logo@2x,react-logo@3x,tutorial-web,logo-glow}.png`.

## 6.6 Errores reales encontrados y corregidos

| # | Error | Detección | Corrección | Verificación |
| --- | --- | --- | --- | --- |
| 13 | **`Alert.alert` no hace nada en web.** "Vaciar" no borraba nada en el navegador. | `react-native-web` implementa `Alert.alert` como no-op. | `src/utils/confirm.ts` con `Alert` en nativo y `window.confirm` en web. | Lectura de `node_modules/react-native-web/dist/exports/Alert/index.js`. |
| 14 | **`react-native-maps` no admite un `if` de `Platform.OS`.** | Su `src/index.ts` llega hasta `codegenNativeComponent`, que `react-native-web` no exporta; los `import` son estáticos, así que Metro rompe al renderizar en servidor antes de evaluar la rama. | Versión de web en archivo aparte (`mapa.web.tsx`) para sacar el módulo del grafo de web. | `npx expo export --platform web` con renderizado estático, exit 0. |
| 15 | **`BottomTabInset` era una constante inventada.** En iOS con `NativeTabs`, `insets.bottom` ya incluye la altura de la tab bar (~83). | Insets fijos medidos a mano, que en Android y en iOS no coinciden. | Constante eliminada; todas las pantallas usan `useSafeAreaInsets().bottom`. | `node_modules/expo-router/build/native-tabs/TabView.js` deja que iOS aplique el inset de la tab bar. |
| 16 | **Cabecera de web solapada con el contenido.** | `TabList` estaba después de `TabSlot`. | `TabList` antes de `TabSlot` para que la cabecera quede en el flujo. | Además, el `Slot` de Radix no pasa `children` al hijo, así que la marca se define como `ReactNode`, no como `children`. |
| 17 | **`StatusBar` global en contra del modo claro/oscuro de la cámara.** | La cámara es una superficie oscura a pantalla completa. | `StatusBar` imperativo por pantalla: `setStatusBarStyle(isFocused ? 'light' : 'dark')`. | Eliminado el `StatusBar` declarativo del layout raíz. |
| 18 | **`satisfies Record<GeoSource, { icon: typeof Icons.camera }>`** estrechaba el tipo al literal de un solo icono. | `tsc` → `TS2322` al añadir el icono de galería. | El campo se tipa como `AppIcon`. | `npx tsc --noEmit` limpio. |
| 19 | **`Callout` con ancho fijo de 180** mientras el ancho calculado no se usaba. | Lectura del JSX. | `width: calloutWidth` en el estilo del `Callout`. | `npx tsc --noEmit` y lint limpios. |
| 20 | **`imageWidth: 76` en el splash** dejaba el pin del logotipo a menos de 40 px. | Configuración heredada del template. | `imageWidth: 160`. | `npx expo config --type public` resuelve sin errores. |

## 6.7 APIs verificadas en lugar de asumidas

| # | Cuestión | Verificación |
| --- | --- | --- |
| A | ¿`boxShadow` como cadena es válido en RN 0.86? | Sí: `ViewStyle.boxShadow` acepta el tipo nuevo de cadena. Por eso `Surfaces.shadow` es una cadena y no `shadowOffset` / `shadowRadius`. |
| B | ¿`experimental_backgroundImage` acepta `linear-gradient(...)`? | Sí, con el prefijo experimental y una cadena CSS. Es lo que usa el tile degradado de `GeoCamLogo`. |
| C | ¿Los nombres de `expo-symbols` son válidos en las tres plataformas? | Cada nombre se comprobó contra `node_modules/expo-symbols/build/android/symbols.json` y contra los SF Symbols de iOS. De ahí `Icons.gallery` = `photo.on.rectangle` en iOS y `photo_library` en Android/web. |
| D | ¿Hace falta una librería de iconos nueva? | No. `NativeTabs.Trigger.Icon` acepta `sf` y `md`, y `expo-symbols` cubre los tres módulos sin recursos extra. |
| E | ¿El icono de iOS puede tener canal alfa? | No: la App Store lo rechaza. `icon.png` se generó en 24 bpp sin alfa; solo las capas transparentes (splash, adaptive icon, favicon) usan 32 bpp ARGB. |
| F | ¿Los PNG de marca se pueden revisar aquí? | No: este entorno no puede decodificar imágenes. Se verificaron por muestreo de píxeles (esquina = azul claro, esquina opuesta = azul profundo, centro = lente, alfa 0 en la lente del splash). Queda pendiente mirarlos a simple vista. |

## 6.8 Verificación del rediseño

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | Sin errores (exit 0) |
| `npx expo lint` | Sin errores ni avisos (exit 0) |
| `npx expo-doctor` | **21/21 checks passed. No issues detected** (exit 0) |
| `npx expo install --check` | `Dependencies are up to date` (exit 0) |
| `npx expo export --platform web` | `web bundles (3)` + `Static routes (8)`: `/`, `/geocam`, `/mapa` (+ variantes `/(tabs)/…`, `_sitemap`, `+not-found`). exit 0. |
| `npx expo export --platform android` | `android bundles (1)` → `entry-*.hbc` de 3.8 MB. exit 0. |
| `any` / `as any` / `console.*` en `src` | 0 resultados |

Los directorios de export temporales (`.verify-web`, `.verify-android`) se eliminaron tras la
comprobación.

## 6.9 Verificación manual en dispositivo

A diferencia de la Semana 6, el rediseño **sí se comprobó a mano sobre un teléfono físico** con un
development build: cámara, captura, GPS, diálogos de permisos, acelerómetro, marcadores, `Callout`,
estado vacío, hoja de fotos sin ubicación, comportamiento en pantalla ancha y la versión web. Se
detectó y corrigió durante esas pruebas el fallo del botón *Vaciar* en web descrito en el punto 13
(`Alert.alert` es un no-op en `react-native-web`), que la verificación estática no habría detectado.

Sigue sin poder comprobarse desde este entorno: el aspecto visual de los PNG de marca —se validaron
por muestreo de píxeles, no a simple vista— y el detalle de `insets.bottom` con `NativeTabs` en un
iPhone con muesca.

## 6.10 Ajustes pedidos sobre el rediseño

Después de probar la app en un teléfono real llegaron tres peticiones concretas. Se registran aparte
porque son cambios de comportamiento, no de estilo.

### Fondo topográfico en Inicio

`src/components/TopographicBackdrop.tsx` dibuja el relieve **solo con `View`s**: cada colina es una
serie de elipses concéntricas con `borderWidth: 1`, y el desplazamiento y la inclinación de cada
anillo (`drift`, `tilt`) evitan que se lean como círculos perfectos. La curva más interior de cada
colina se omite a propósito: un punto central delata la construcción y ensucia el texto del
logotipo. No se añadió ninguna dependencia: ni `react-native-svg` ni una imagen de fondo.

Como el fondo es negro, Inicio deja de depender del tema del sistema. Se añadió el bloque `Night` a
`theme.ts` (`backdrop`, `fill`, `fillStrong`, `border`, `contour`, `contourAccent`) y el prop
`tone="onDark" | "onDarkMuted"` en `ThemedText`, para que el texto siga saliendo del criterio
tipográfico único en vez de llenarse de `style={{ color: … }}`. Las tarjetas pasaron de color sólido
a cristal oscuro (`rgba(9, 13, 20, 0.72)`) para que el relieve se vea detrás sin estropear la
lectura. La barra superior de web también se puso oscura: con Inicio en negro, una barra clara
habría roto la continuidad al cambiar de pestaña.

### `getCurrentPositionAsync` fallaba al pulsar la miniatura y la galería

**Síntoma:** `FunctionCallException: Calling the 'getCurrentPositionAsync' function has failed (at
ExpoModulesCore/ConcurrentFunctionDefinition.swift: 88)`, en pantalla de cámara, con una foto ya
guardada.

**Causa:** el botón de la miniatura llama a `refresh()`, que hacía una posición puntual mientras el
`watchPositionAsync` de la pantalla estaba activo. En iOS esa combinación es la que revienta, y el
error se pintaba entero en el banner rojo. Además `addPhoto` pedía **otra** posición puntual para
etiquetar cada foto, aunque la cámara ya tenía las coordenadas del watch en la mano.

**Corrección:**

| # | Cambio |
| --- | --- |
| 21 | `useGeoLocation` guarda el último fix con su marca de tiempo. `refresh()` devuelve ese fix si tiene menos de 10 s, sin tocar el módulo nativo. |
| 22 | Si la petición puntual falla pero había un fix anterior, se devuelve ese y **no** se pinta error: unos segundos de diferencia no son un fallo de usuario. |
| 23 | Guarda `refreshingRef` para impedir dos `getCurrentPositionAsync` simultáneos, que también fallan en iOS. |
| 24 | `addPhoto(source, uri, knownCoords)` acepta la ubicación que la pantalla ya tiene. La cámara y la galería se la pasan, así que guardar una foto ya no hace ninguna llamada al módulo de ubicación. |

El parámetro es opcional, de modo que el resto de llamadores no cambian y el comportamiento del
contexto se mantiene.

### La app no rotaba

`app.json` traía `"orientation": "portrait"`, que bloquea la rotación a nivel nativo: por mucho que
el sistema estuviera en horizontal, la ventana se quedaba en vertical. Se cambió a
`"orientation": "default"` (todas las orientaciones en iOS salvo bocabajo, y sensor en Android). No
hizo falta tocar ninguna pantalla: las tres usan `useWindowDimensions` y safe areas, que ya
respondían al cambio de tamaño.

## 6.11 Verificación de los ajustes

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | Sin errores (exit 0) |
| `npx expo lint` | Sin errores ni avisos (exit 0) |
| `npx expo-doctor` | **21/21 checks passed. No issues detected** (exit 0) |
| `npx expo install --check` | `Dependencies are up to date` (exit 0) |
| `npx expo export --platform web` | 8 rutas estáticas, exit 0. El HTML generado contiene `rgba(5,7,11)` (fondo), `rgba(9,13,20)` (cristal) y las curvas con `border-…-color:rgba(255,255,255,0.11)` y `transform:rotate(6deg)`, lo que confirma que el relieve se serializa. |
| `npx expo export --platform android` | `android bundles (1)` → `entry-*.hbc` de 3.8 MB. exit 0. |

`npx expo config --type public` resuelve `orientation: 'default'` y el resto de la configuración sin
errores. Los directorios de export temporales se eliminaron.

Lo que sigue necesitando un dispositivo: ver el relieve en pantalla, confirmar que la rotación ya
no está bloqueada y que la miniatura y la galería ya no muestran error.

