import * as React from 'react';
import * as SafeAreaContext from 'react-native-safe-area-context/lib/module/SafeAreaContext';
import * as InitialWindow from 'react-native-safe-area-context/lib/module/InitialWindow';
import * as SafeAreaTypes from 'react-native-safe-area-context/lib/module/SafeArea.types';
import { SafeAreaView } from 'react-native-safe-area-context/lib/module/SafeAreaView.web';

export * from 'react-native-safe-area-context/lib/module/SafeAreaContext';
export * from 'react-native-safe-area-context/lib/module/InitialWindow';
export * from 'react-native-safe-area-context/lib/module/SafeArea.types';
export { SafeAreaView };

export default {
  ...SafeAreaContext,
  ...InitialWindow,
  ...SafeAreaTypes,
  SafeAreaView,
};
