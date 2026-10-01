import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';

import type { PermissionState } from '@/types/geo';
import { toErrorMessage } from '@/utils/errors';
import { openSettings, toPermissionState } from '@/utils/permissions';

export type CameraFacing = 'back' | 'front';

export function useCamera() {
  const [permissionResponse, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>('back');

  /**
   * En SDK 57 `CameraView` es una clase: la referencia debe conservar el
   * método `takePictureAsync`. El `ref` nativo (`CameraViewRef`) expone
   * `takePicture`, que ya no aplica a este componente.
   */
  const cameraRef = useRef<CameraView | null>(null);

  /**
   * Espejo de `isCapturing`. `takePictureAsync` tarda cientos de ms, así que
   * dos toques seguidos llegarían antes del siguiente render y pasarían el
   * `disabled` del botón. El ref cierra esa ventana.
   */
  const isCapturingRef = useRef(false);

  const permission: PermissionState = toPermissionState(permissionResponse);

  const request = useCallback(async (): Promise<boolean> => {
    try {
      const response = await requestPermission();
      const next = toPermissionState(response);

      if (next === 'granted') {
        setError(null);
      }

      return next === 'granted';
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo solicitar el permiso de cámara.'));
      return false;
    }
  }, [requestPermission]);

  const handleCameraReady = useCallback(() => {
    setIsReady(true);
    setError(null);
  }, []);

  const handleMountError = useCallback((cause: unknown) => {
    setIsReady(false);
    setError(toErrorMessage(cause, 'No se pudo iniciar la cámara.'));
  }, []);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    // Guarda contra dobles capturas, antes de leer la referencia.
    if (isCapturingRef.current) {
      return null;
    }

    const camera = cameraRef.current;

    if (!isReady || !camera) {
      setError('La cámara todavía no está lista para capturar.');
      return null;
    }

    isCapturingRef.current = true;
    setIsCapturing(true);

    try {
      const photo = await camera.takePictureAsync({ quality: 0.8, skipProcessing: true });
      return photo?.uri ?? null;
    } catch (cause) {
      setError(toErrorMessage(cause, 'No se pudo tomar la foto.'));
      return null;
    } finally {
      isCapturingRef.current = false;
      setIsCapturing(false);
    }
  }, [isReady]);

  const flip = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  return {
    cameraRef,
    permission,
    isReady,
    isCapturing,
    error,
    facing,
    request,
    takePhoto,
    flip,
    /** Única salida cuando el permiso queda bloqueado (`canAskAgain === false`). */
    openSettings,
    onCameraReady: handleCameraReady,
    onMountError: handleMountError,
  };
}
