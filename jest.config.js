module.exports = {
  preset: 'react-native',
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-gesture-handler|react-native-safe-area-context|react-native-svg|react-native-vector-icons|react-native-google-mobile-ads|@react-native-async-storage|@notifee|firebase)/)',
  ],
};
