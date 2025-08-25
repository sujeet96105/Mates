/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register only the main app component
AppRegistry.registerComponent(appName, () => App);
