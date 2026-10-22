const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  transform: {
    ...expoPreset.transform,
    "^.+\\.mjs$": ["babel-jest", { presets: ["babel-preset-expo"] }]
  },
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper ?? {}),
    "^@expo/vector-icons$": "<rootDir>/src/__mocks__/ExpoIcon.js",
    "^@expo/vector-icons/(.*)$": "<rootDir>/src/__mocks__/ExpoIcon.js",
    "^react$": "<rootDir>/node_modules/react",
    "^react/(.*)$": "<rootDir>/node_modules/react/$1",
    "^react-test-renderer$": "<rootDir>/node_modules/react-test-renderer",
    "^react-test-renderer/(.*)$": "<rootDir>/node_modules/react-test-renderer/$1",
    "^react-native/Libraries/EventEmitter/NativeEventEmitter$": "<rootDir>/src/__mocks__/NativeEventEmitter.js",
    "^react-native$": "<rootDir>/node_modules/react-native",
    "^react-native/(.*)$": "<rootDir>/node_modules/react-native/$1"
  },
  setupFiles: ["<rootDir>/jest.bridge-setup.js", ...(expoPreset.setupFiles ?? [])],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"]
};
