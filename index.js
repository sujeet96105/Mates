/**
 * @format
 */

import { AppRegistry, Text, TextInput, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register only the main app component
AppRegistry.registerComponent(appName, () => App);

// Global text settings to reduce overflow across devices
if (Text.defaultProps == null) Text.defaultProps = {};
if (TextInput.defaultProps == null) TextInput.defaultProps = {};

// Disable dynamic type scaling to keep layouts stable
Text.defaultProps.allowFontScaling = false;
TextInput.defaultProps.allowFontScaling = false;

// Cap system-driven font magnification
Text.defaultProps.maxFontSizeMultiplier = 1;
TextInput.defaultProps.maxFontSizeMultiplier = 1;

// Use system fonts that are available on all devices
Text.defaultProps.style = [
  Text.defaultProps.style,
  { fontFamily: Platform.OS === 'ios' ? 'System' : 'normal' }
];
TextInput.defaultProps.style = [
  TextInput.defaultProps.style,
  { fontFamily: Platform.OS === 'ios' ? 'System' : 'normal' }
];
