import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

/**
 * Iconografía de GeoCam.
 *
 * Un solo sitio para los nombres de los símbolos: SF Symbols en iOS y Material
 * Symbols en Android y web. Así los tres destinos usan la misma familia visual
 * y ninguna pantalla necesita recursos PNG.
 */
export type AppIcon = {
  ios: SFSymbol;
  android: AndroidSymbol;
  web: AndroidSymbol;
};

export const Icons = {
  /** Pestañas y tarjetas de la pantalla de inicio. */
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  map: { ios: 'map.fill', android: 'map', web: 'map' },
  library: { ios: 'photo.stack.fill', android: 'collections', web: 'collections' },

  /** Cámara. */
  flipCamera: {
    ios: 'arrow.triangle.2.circlepath.camera',
    android: 'flip_camera_android',
    web: 'flip_camera_android',
  },
  gallery: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  photo: { ios: 'photo', android: 'image', web: 'image' },
  location: { ios: 'location.fill', android: 'my_location', web: 'my_location' },

  /** Mapa y Filtros. */
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
} as const satisfies Record<string, AppIcon>;
