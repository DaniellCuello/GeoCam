# GeoCam

App móvil (Expo SDK 57 + Expo Router + TypeScript) para **capturar fotos geolocalizadas**,
etiquetarlas con las coordenadas del dispositivo, organizarlas en la biblioteca y verlas en un mapa.

---

## Semana 6 – GeoCam

### Objetivo

Construir una app de cámara que registre **dónde** se tomó cada foto, con tres estados de permiso
bien diferenciados, seguimiento de GPS en primer plano y detección de sacudidas con el
acelerómetro.

### Qué incluye

| Pantalla | Ruta | Qué hace |
| --- | --- | --- |
| Inicio | `src/app/(tabs)/index.tsx` | Presentación de la app, contador de fotos en tiempo real y accesos principales. No pide ningún permiso. |
| GeoCam | `src/app/(tabs)/geocam.tsx` | Vista de cámara a pantalla completa, coordenadas en vivo, botón de galería, cambio de cámara frontal/trasera y detección de sacudidas. |
| Mapa | `src/app/(tabs)/mapa.tsx` | `MapView` con un `Marker` por foto geolocalizada y `Callout` con miniatura. Lista aparte de las fotos **sin coordenadas**. |
| Mapa (web) | `src/app/(tabs)/mapa.web.tsx` | Sustituye a `mapa.tsx` en web, donde `react-native-maps` no existe. Muestra todas las fotos en dos grupos (*En el mapa* / *Sin ubicación*) con sus coordenadas. |

Las cuatro pestañas viven en el grupo `(tabs)`.

### Sistema de diseño

Todo el aspecto visual sale de `src/constants/theme.ts`; ninguna pantalla define colores,
espaciados ni radios sueltos.

| Bloque | Qué aporta |
| --- | --- |
| `Colors` | `text`, `background`, `backgroundElement`, `backgroundSelected` y `textSecondary`, en variante clara y oscura. |
| `Surfaces` | `border` y dos sombras (`shadow`, `shadowStrong`). `useTheme()` las fusiona con `Colors`, de modo que `theme.border` y `theme.shadow` están disponibles junto a `theme.text`. |
| `Brand` | Identidad, independiente del tema: azul `#208AEF` (`primary`, `primaryLight`, `primaryDeep`, `primarySoft`), verde azulado del mapa (`map`, `mapSoft`), `danger`, `onBrand` y los tonos para overlays oscuros. |
| `Spacing` · `Radii` · `Layout` | Escala de espaciado en múltiplos de 4, radios (`sm`…`pill`) y medidas de maquetación (`contentMaxWidth`, `gutter`, `minTouch`). |
| `Night` | Superficies de la pantalla de Inicio, que es **siempre oscura**: `backdrop`, `fill`, `fillStrong`, `border`, `contour` y `contourAccent`. No dependen del tema del sistema. |

Reglas que siguen las pantallas:

- **Todo control táctil es un `Pressable`** (no `TouchableOpacity`) y recibe
  `accessibilityRole="button"`, una etiqueta y una altura mínima de `Layout.minTouch` (44 pt).
- **Un solo criterio tipográfico**, `ThemedText`, con variantes `hero`, `cardTitle`, `title`,
  `subtitle`, `default`, `small`, `smallBold`, `label` y `code`. Las variantes de color son
  explícitas (`themeColor="textSecondary"`) y, sobre superficies oscuras, se usa
  `tone="onDark"` / `tone="onDarkMuted"`, que toma el color de la marca en vez del del tema.
- **Iconos con `expo-symbols`**, sin dependencias nuevas: SF Symbols en iOS y Material Symbols en
  Android y web. Los nombres válidos están centralizados en `src/constants/icons.ts`.
- **Anchos máximos** (`Layout.contentMaxWidth`) y `useWindowDimensions` para que tablet y
  escritorio no estiren la interfaz; el `padding` lateral es siempre `Layout.gutter`.
- **Safe areas** con `useSafeAreaInsets().top` / `.bottom` en lugar de constantes fijas.

### Pantalla de Inicio: fondo topográfico

El fondo de Inicio es negro con curvas de nivel y **no depende del tema del sistema**: se ve igual en
modo claro y en modo oscuro. `src/components/TopographicBackdrop.tsx` lo dibuja entero con `View`s
—cada colina es una serie de elipses concéntricas con borde de 1 px, desplazadas e inclinadas para
que el conjunto parezca un relieve y no un blanco y negro— sin imágenes, sin SVG y sin ninguna
dependencia nueva. Las medidas salen de `useWindowDimensions`, así que el mapa se adapta a tablet y
horizontal sin tocar el código.

### Rotación

`app.json` declara `"orientation": "default"`, de modo que la app **sí gira** con el dispositivo.
Todas las pantallas lo soportan: usan `useWindowDimensions` y safe areas, no medidas fijas.

### Identidad

El logotipo está construido con `View`s en `src/components/GeoCamLogo.tsx` (un pin de mapa cuya
cabeza es la lente de la cámara) y se reutiliza en Inicio, en la cabecera de web y como icono
adaptativo. Los PNG de `assets/images/` (`icon`, `favicon`, `splash-icon`,
`android-icon-*`) se generan a partir del mismo diseño.

### Hooks entregados

| Hook | Responsabilidad |
| --- | --- |
| `src/hooks/useCamera.ts` | `CameraView` + `useCameraPermissions`, referencia tipada, `isReady`, `isCapturing` (bloquea dobles capturas), `takePictureAsync`, cambio de cámara y `openSettings()`. |
| `src/hooks/useGeoLocation.ts` | Consulta el permiso sin pedirlo, `requestForegroundPermissionsAsync` bajo demanda, `getCurrentPositionAsync`, `watchPositionAsync` con cleanup, error como estado y `openSettings()`. `refresh()` **reutiliza el fix del watch si es reciente** y, si la petición puntual falla, devuelve el último fix conocido en vez de mostrar un error. |
| `src/hooks/useShake.ts` | `Accelerometer.isAvailableAsync`, `setUpdateInterval(100)`, magnitud del vector, umbral 13 m/s², cooldown de 1200 ms, `Subscription.remove()` y flag `enabled` para apagar la escucha al perder el foco. |

### Ciclo de permisos (5 estados)

Expo solo devuelve tres valores en `PermissionResponse.status`
(`granted` | `undetermined` | `denied`). `src/utils/permissions.ts` añade el desdoblamiento que
necesita la UI:

| Estado de UI | Cuándo ocurre | Qué hace el usuario | Botón |
| --- | --- | --- | --- |
| `checking` | La consulta del permiso aún no ha respondido | Espera | — |
| `undetermined` | Nadie ha decidido todavía (`status === 'undetermined'`) | Decide en el diálogo del sistema | *Permitir cámara* / *Volver a pedir* |
| `denied` | Rechazó el permiso y el sistema permite preguntar otra vez (`status === 'denied'`, `canAskAgain === true`) | Decide en el diálogo del sistema | *Volver a pedir* |
| `blocked` | El sistema ya no permite preguntar (`canAskAgain === false`) | Debe cambiarlo en Ajustes | **Abrir Ajustes** |
| `granted` | Concedido | Usa la app | — |

Reglas que se cumplen:

- **Ningún permiso se pide al abrir la app.** Al montar solo se *consulta* el estado
  (`getForegroundPermissionsAsync` / `useCameraPermissions`); la solicitud ocurre únicamente al
  pulsar un botón.
- **Negar la ubicación no bloquea la cámara.** Si `getCurrentPositionAsync` falla, la foto se
  registra igual con `coords: null`, la pantalla de cámara sigue operativa y el mapa la muestra
  en la sección *Sin ubicación*. Además, un banner en la cámara comunica que la ubicación está
  desactivada.
- **"Abrir Ajustes"** llama a `Linking.openSettings()` y existe en ambos hooks, tanto para cámara
  como para ubicación, cuando el permiso queda bloqueado.

### Capturas de pantalla de la Semana 6

Todas las imágenes están en `assets/capturas/` y se tomaron en un iPhone con un development build.

#### Galería Semana 6

<table>
  <tr>
    <td align="center" width="300">
      <img src="assets/capturas/01-inicio.png" width="260" alt="Inicio de GeoCam" /><br>
      <sub><b>01</b> · Inicio con fondo topográfico</sub>
    </td>
    <td align="center" width="300">
      <img src="assets/capturas/02-camara-coordenadas.png" width="260" alt="Cámara con coordenadas" /><br>
      <sub><b>02</b> · Cámara con latitud/longitud en vivo</sub>
    </td>
    <td align="center" width="300">
      <img src="assets/capturas/03-mapa-marcadores.png" width="260" alt="Mapa con marcadores" /><br>
      <sub><b>03</b> · Mapa con marcadores y Callout</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="300">
      <img src="assets/capturas/04-mapa-sin-ubicacion.png" width="260" alt="Fotos sin ubicación" /><br>
      <sub><b>04</b> · Fotos sin ubicación</sub>
    </td>
    <td align="center" width="300">
      <img src="assets/capturas/05-mapa-vacio.png" width="260" alt="Mapa vacío" /><br>
      <sub><b>05</b> · Estado vacío del mapa</sub>
    </td>
    <td align="center" width="300">
      <img src="assets/capturas/06-ancho.png" width="260" alt="Versión horizontal" /><br>
      <sub><b>06</b> · Vista horizontal</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="300">
      <img src="assets/capturas/07-web.png" width="260" alt="Versión web" /><br>
      <sub><b>07</b> · Versión web</sub>
    </td>
    <td align="center" width="300">
      <img src="assets/capturas/08-icono.png" width="260" alt="Icono del app" /><br>
      <sub><b>08</b> · Icono de la app</sub>
    </td>
    <td align="center" width="300">
      <img src="assets/capturas/p1-permiso-concedido.png" width="260" alt="Permiso concedido" /><br>
      <sub><b>09</b> · Permiso concedido</sub>
    </td>
  </tr>
</table>

### Evidencias de permisos (Semana 6)

#### 1. Permiso concedido

**Qué debe verse:** La vista de cámara funcionando a pantalla completa con el chip de coordenadas en tiempo real (`latitud`/`longitud`) en la parte superior.

<div align="center">
  <img src="assets/capturas/p1-permiso-concedido.png" width="280" alt="Permiso concedido: cámara activa con coordenadas" />
</div>


---

## Semana 7 — GeoCam persistente

### Objetivo

Reemplazar el contexto en memoria de la Semana 6 por **SQLite con Drizzle ORM**, de modo que las fotografías, sus coordenadas, álbumes y notas sobrevivan al cierre de la app y funcionen sin conexión (modo avión).

### Modelo de datos

```text
albums
  id PK · name UNIQUE · created_at
       1
       │ album_id (nullable, ON DELETE SET NULL)
       *
photos
  id PK · uri · latitude? · longitude? · accuracy? · source · created_at
  note? · favorite (boolean, default false)
  (índice: photos_created_at_idx en created_at)
```

### Novedades y Funcionalidades de la Semana 7

1. **Base de Datos Persistente con Expo SQLite y Drizzle ORM**:
   - `db/client.ts`: Configurado con `openDatabaseSync('geocam.db', { enableChangeListener: true })` y `PRAGMA foreign_keys = ON;`.
   - Layout raíz (`src/app/_layout.tsx`) protegido con `useMigrations`.

2. **Tres Migraciones SQL Versionadas (`drizzle/`)**:
   - `0000_photos-and-albums.sql`: Tablas `photos`, `albums` y relación `album_id` con `ON DELETE SET NULL`.
   - `0001_photo-notes-and-favorites.sql`: Columnas `note` (texto opcional) y `favorite` (booleano default false).
   - `0002_chemical_cargill.sql`: Índice `photos_created_at_idx` sobre `created_at` (Reto opcional).

3. **Pestaña Biblioteca (`src/app/(tabs)/biblioteca.tsx`)**:
   - Nueva pestaña en la navegación para explorar toda la colección con contador y renderizado optimizado.

4. **Buscador Centrado y Burbuja Flotante (`src/components/PhotoFilters.tsx`)**:
   - Burbuja flotante compacta con icono de lupita sobre el mapa.
   - Al presionar la burbuja se abre un **Modal centrado** con la búsqueda por nota, filtro por álbumes, favoritas y creación de álbumes.

5. **CRUD Completo de Fotografías (`src/app/foto/[id].tsx`)**:
   - Pantalla de detalle para visualizar la foto, editar su nota, marcarla como favorita, moverla de álbum y eliminarla con confirmación.

6. **Archivos Permanentes (`src/services/photoFiles.ts`)**:
   - Copia imágenes desde la caché a `Paths.document/photos/` usando las clases modernas `File`, `Directory` y `Paths` de `expo-file-system`.
   - Borra el archivo físico del disco cuando se elimina el registro en SQLite.

7. **Reto Opcional (Rendimiento)**:
   - Script de benchmark en `src/utils/benchmark.ts` para sembrar e insertar 1.000 fotos de prueba y medir con `console.time` el listado optimizado por el índice `photos_created_at_idx`.

---

### Capturas de pantalla de la Semana 7

Guarda las capturas de la Semana 7 en `assets/capturas/`:

| Archivo | Pantalla a capturar | Qué debe verse |
| --- | --- | --- |
| `09-biblioteca.png` | **Pestaña Biblioteca** (`/biblioteca`) | Listado completo de fotografías guardadas, contador en la cabecera y barra de filtros. |
| `10-detalle-foto.png` | **Detalle de Foto** (`/foto/[id]`) | Fotografía a pantalla completa, nota editada, botón de favorita activado (`★ Favorita`) y selector de álbum. |
| `11-menu-busqueda-centrado.png` | **Menú de búsqueda centrado** | Diálogo modal centrado abierto al presionar la burbuja flotante con la lupita en el Mapa o Biblioteca. |
| `12-filtro-favoritas-albumes.png` | **Filtros activos** | Vista filtrada mostrando solo fotos favoritas o pertenecientes a un álbum específico, con la burbuja indicando el estado activo. |
| `13-crear-album.png` | **Creación de álbum** | Formulario para crear un nuevo álbum desde el menú de filtros y actualización en tiempo real de los chips. |

---

### Video demostrativo del flujo (.mp4)

Guarda la grabación de pantalla como **`assets/capturas/demostracion-flujo.mp4`** (o `.gif`).

**Qué debe mostrar el video:**
1. Toma de 3 fotografías geolocalizadas con la cámara.
2. Edición de notas, marcado como favorita y asignación a un álbum en la pantalla de detalle.
3. Apertura del menú centrado desde la burbuja flotante de la lupita y filtrado por nota.
4. Cierre completo de Expo Go / App y reapertura comprobando que las fotos y sus coordenadas persisten.
5. Verificación en modo avión.

```html
<video src="assets/capturas/demostracion-flujo.mp4" controls width="100%"></video>
```

---

## Ejecutar el proyecto

```bash
npm install
npx expo start
npx drizzle-kit generate
npx expo start -c
```

| Escenario | ¿Funciona? | Comando |
| --- | --- | --- |
| **Expo Go** | **No.** `expo-camera`, `expo-location`, `expo-sensors`, `expo-sqlite` y `react-native-maps` requieren un development build. | — |
| **Development build** | Sí. Para probar cámara, GPS, shake, mapa y SQLite. | `npx expo run:android` · `npx expo run:ios` · o `eas build --profile development` |
| **Producción** | Sí, declarando `androidGoogleMapsApiKey` si publicas en Android. | `eas build --profile production` |
| **Web** | Parcial: navegan Inicio, Biblioteca, Mapa y Detalle, almacenando imágenes como data URI en SQLite del navegador. | `npx expo start --web` |

---

## Límites conocidos

- El mapa no se renderiza en **web**: `react-native-maps` llega hasta `codegenNativeComponent`, que `react-native-web` no exporta. Por eso la versión web es un archivo aparte (`mapa.web.tsx`).
- Las fotos de la galería se etiquetan con la ubicación **actual**, porque `expo-image-picker` no expone los EXIF de la imagen.
- La base de datos y las fotos son locales al dispositivo; desinstalar la app o cambiar de teléfono no sincroniza fotos a la nube.
