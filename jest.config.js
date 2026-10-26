module.exports = {
  preset: '@react-native/jest-preset',
  // AsyncStorage ships ES modules; let Babel transform it.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-native-async-storage)/)',
  ],
};
