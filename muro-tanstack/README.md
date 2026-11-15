# Muro de Clase con TanStack Query 🧱⚡

Ejemplo de clase de la **Semana 9: TanStack Query y Sincronización Offline-First**.
Programación Móvil Avanzada · Universidad de La Guajira.

Es el Muro de Clase de la Semana 8 con el estado de servidor manejado por TanStack Query: feed infinito, búsqueda en vivo, todos los estados de UI y aviso de falta de conexión.

**Versiones:** Expo SDK 57 · Expo Router · supabase-js 2 · TanStack Query 5 · expo-network.

## Cómo ejecutarlo

Usa el mismo proyecto de Supabase de la Semana 8 (`supabase/schema.sql` ya ejecutado) y el mismo `.env`.

```bash
npm install
npx expo install --fix
npx expo start -c
```

## Qué cambió frente a la Semana 8

| Archivo | Cambio |
| --- | --- |
| `lib/queryClient.ts` | Nuevo: cliente de consultas, estado de la red (`onlineManager`) y foco de la app (`focusManager`) |
| `app/_layout.tsx` | Se envuelve la app con `QueryClientProvider` |
| `services/posts.ts` | `listPosts` se reemplaza por `listPostsPage`, con paginación por cursor y búsqueda |
| `hooks/usePostsFeed.ts` | Nuevo: `useInfiniteQuery`, mutaciones y tiempo real que invalida la caché |
| `hooks/useDebouncedValue.ts` | Nuevo: espera a que el usuario deje de escribir |
| `hooks/usePosts.ts` | Eliminado: su estado manual (`isLoading`, `error`, `reload`) ya no hace falta |
| `app/index.tsx` | Buscador, infinite scroll y los estados de carga, error, vacío y sin conexión |

## Dónde está cada tema del programa

| Tema | Dónde verlo |
| --- | --- |
| Estado de servidor con TanStack Query | `hooks/usePostsFeed.ts` |
| Caché | Borra la búsqueda: el feed completo vuelve al instante |
| Reintentos automáticos | `retry: 2` en `lib/queryClient.ts` |
| Paginación e infinite scroll | `listPostsPage` + `onEndReached` en `app/index.tsx` |
| Estados de UI | Bloques comentados en `app/index.tsx` |
| Manejo sin conexión | `useIsOnline` y el estado `paused` |

## Pruebas

- [ ] Con más de 10 publicaciones, baja en la lista: se cargan páginas de a 10.
- [ ] Escribe en el buscador: solo sale una petición al dejar de escribir, y la lista anterior no parpadea.
- [ ] Borra la búsqueda: el feed completo vuelve al instante, desde la caché.
- [ ] Activa modo avión: aparece el aviso y el feed sigue visible. Desactívalo: se refresca solo.
- [ ] Sal de la app y vuelve: el feed se actualiza sin tocar nada.
- [ ] Publica desde otro teléfono: aparece sola en este.

## Documentación

- [TanStack Query en React Native](https://tanstack.com/query/latest/docs/framework/react/react-native)
- [Consultas infinitas](https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries)
- [Modos de red](https://tanstack.com/query/latest/docs/framework/react/guides/network-mode)
- [Expo Network](https://docs.expo.dev/versions/latest/sdk/network/)
