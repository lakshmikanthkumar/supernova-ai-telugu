module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
    '^.+/@supabase/.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*|isomorphic-fetch|node-fetch|whatwg-url|@testing-library/.*))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.js',
    '^expo-av$': '<rootDir>/src/__mocks__/expo-av.js',
    '^@react-native-voice/voice$': '<rootDir>/src/__mocks__/@react-native-voice/voice.js',
    '^expo-speech$': '<rootDir>/src/__mocks__/expo-speech.js',
    '^lottie-react-native$': '<rootDir>/src/__mocks__/lottie-react-native.js',
    '^expo-camera$': '<rootDir>/src/__mocks__/expo-camera.js',
    '^react-native-svg$': '<rootDir>/src/__mocks__/react-native-svg.js',
  },
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/jest.setup.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.{test,spec}.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/__tests__/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 15000,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
