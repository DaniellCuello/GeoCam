import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Confirmación de una acción destructiva.
 *
 * En iOS y Android la resuelve `Alert`, que se siente nativo. En web
 * `react-native-web` declara `Alert.alert` pero no hace nada, así que el botón
 * "Vaciar" se caería en silencio; por eso ahí se usa el `confirm` del navegador.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
