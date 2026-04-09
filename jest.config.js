module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|firebase|@firebase|@react-native-firebase|fiuu-mobile-xdk-reactnative)',
  ],
};
