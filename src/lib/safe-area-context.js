import * as React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  View,
  requireNativeComponent,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context/lib/module/SafeAreaView.web';

export const SafeAreaInsetsContext = React.createContext(null);
SafeAreaInsetsContext.displayName = 'SafeAreaInsetsContext';

export const SafeAreaFrameContext = React.createContext(null);
SafeAreaFrameContext.displayName = 'SafeAreaFrameContext';

export const SafeAreaCornerAdaptedInsetsContext = React.createContext(null);
SafeAreaCornerAdaptedInsetsContext.displayName = 'SafeAreaCornerAdaptedInsetsContext';

// Native component handling
let NativeProviderComponent = View;
if (Platform.OS !== 'web') {
  try {
    if (UIManager.getViewManagerConfig && UIManager.getViewManagerConfig('RNCSafeAreaProvider')) {
      NativeProviderComponent = requireNativeComponent('RNCSafeAreaProvider');
    }
  } catch (e) {
    NativeProviderComponent = View;
  }
}

const getWindow = () => {
  const dim = Dimensions.get('window');
  return {
    width: dim.width || 390,
    height: dim.height || 844,
  };
};

const getDefaultInsets = () => {
  if (Platform.OS === 'ios') {
    return { top: 47, bottom: 34, left: 0, right: 0 };
  }
  if (Platform.OS === 'android') {
    return { top: 24, bottom: 0, left: 0, right: 0 };
  }
  return { top: 0, bottom: 0, left: 0, right: 0 };
};

const getDefaultFrame = () => {
  const w = getWindow();
  return { x: 0, y: 0, width: w.width, height: w.height };
};

export const initialWindowMetrics = {
  insets: getDefaultInsets(),
  frame: getDefaultFrame(),
};

export const initialWindowSafeAreaInsets = initialWindowMetrics.insets;

export function SafeAreaProvider({
  children,
  initialMetrics,
  initialSafeAreaInsets: initialInsetsProp,
  style,
  ...others
}) {
  const initialInsets =
    initialMetrics?.insets ??
    initialInsetsProp ??
    getDefaultInsets();

  const initialFrame =
    initialMetrics?.frame ??
    getDefaultFrame();

  const [insets, setInsets] = React.useState(initialInsets);
  const [frame, setFrame] = React.useState(initialFrame);

  const onInsetsChange = React.useCallback((event) => {
    if (event && event.nativeEvent) {
      if (event.nativeEvent.insets) {
        setInsets((prev) => {
          const next = event.nativeEvent.insets;
          if (
            prev &&
            prev.top === next.top &&
            prev.bottom === next.bottom &&
            prev.left === next.left &&
            prev.right === next.right
          ) {
            return prev;
          }
          return next;
        });
      }
      if (event.nativeEvent.frame) {
        setFrame(event.nativeEvent.frame);
      }
    }
  }, []);

  const cornerInsetsValue = React.useMemo(
    () => ({
      vertical: insets,
      horizontal: insets,
    }),
    [insets]
  );

  return (
    <NativeProviderComponent
      style={[{ flex: 1 }, style]}
      onInsetsChange={onInsetsChange}
      {...others}
    >
      <SafeAreaFrameContext.Provider value={frame}>
        <SafeAreaInsetsContext.Provider value={insets}>
          <SafeAreaCornerAdaptedInsetsContext.Provider value={cornerInsetsValue}>
            {children}
          </SafeAreaCornerAdaptedInsetsContext.Provider>
        </SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </NativeProviderComponent>
  );
}

export function useSafeAreaInsets() {
  const insets = React.useContext(SafeAreaInsetsContext);
  return insets || getDefaultInsets();
}

export function useSafeAreaFrame() {
  const frame = React.useContext(SafeAreaFrameContext);
  return frame || getDefaultFrame();
}

export function withSafeAreaInsets(WrappedComponent) {
  return React.forwardRef((props, ref) => {
    const insets = useSafeAreaInsets();
    return <WrappedComponent {...props} insets={insets} ref={ref} />;
  });
}

export function useSafeArea() {
  return useSafeAreaInsets();
}

export const SafeAreaConsumer = SafeAreaInsetsContext.Consumer;
export const SafeAreaContext = SafeAreaInsetsContext;

export { SafeAreaView };

export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  withSafeAreaInsets,
  useSafeArea,
  SafeAreaConsumer,
  SafeAreaContext,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  SafeAreaCornerAdaptedInsetsContext,
  initialWindowMetrics,
  initialWindowSafeAreaInsets,
};
