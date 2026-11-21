declare module 'react-native-safe-area-context' {
  import * as React from 'react';
  import { ViewProps, StyleProp, ViewStyle } from 'react-native';

  export interface EdgeInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }

  export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface Metrics {
    insets: EdgeInsets;
    frame: Rect;
  }

  export type Edge = 'top' | 'right' | 'bottom' | 'left';

  export interface SafeAreaViewProps extends ViewProps {
    mode?: 'padding' | 'margin';
    edges?: readonly Edge[];
    children?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
  }

  export const SafeAreaView: React.ForwardRefExoticComponent<SafeAreaViewProps & React.RefAttributes<any>>;
  export const SafeAreaProvider: React.FC<{ initialMetrics?: Metrics | null; children?: React.ReactNode; style?: StyleProp<ViewStyle> }>;
  export const SafeAreaInsetsContext: React.Context<EdgeInsets | null>;
  export const SafeAreaFrameContext: React.Context<Rect | null>;
  export function useSafeAreaInsets(): EdgeInsets;
  export function useSafeAreaFrame(): Rect;
  export function withSafeAreaInsets<P extends object>(Component: React.ComponentType<P>): React.ComponentType<P>;
  export const initialWindowMetrics: Metrics | null;
}
