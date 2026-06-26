import '@testing-library/jest-native/extend-expect';
import { cleanup } from '@testing-library/react-native';

// Mock AsyncStorage using the built-in __mocks__ auto-mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
  useNetInfo: jest.fn(() => ({ isConnected: true, isInternetReachable: true })),
}));

// Mock expo-av
jest.mock('expo-av', () => {
  const mockSound = {
    playAsync: jest.fn(() => Promise.resolve()),
    pauseAsync: jest.fn(() => Promise.resolve()),
    stopAsync: jest.fn(() => Promise.resolve()),
    unloadAsync: jest.fn(() => Promise.resolve()),
    setOnPlaybackStatusUpdate: jest.fn(),
    getStatusAsync: jest.fn(() =>
      Promise.resolve({ isLoaded: true, isPlaying: false, positionMillis: 0 })
    ),
    setPositionAsync: jest.fn(() => Promise.resolve()),
    setVolumeAsync: jest.fn(() => Promise.resolve()),
    setRateAsync: jest.fn(() => Promise.resolve()),
  };

  return {
    Audio: {
      Sound: {
        createAsync: jest.fn(() =>
          Promise.resolve({ sound: mockSound, status: { isLoaded: true } })
        ),
      },
      Recording: jest.fn().mockImplementation(() => ({
        prepareToRecordAsync: jest.fn(() => Promise.resolve()),
        startAsync: jest.fn(() => Promise.resolve()),
        stopAndUnloadAsync: jest.fn(() => Promise.resolve()),
        getURI: jest.fn(() => 'mock://recording.m4a'),
        setOnRecordingStatusUpdate: jest.fn(),
        getStatusAsync: jest.fn(() =>
          Promise.resolve({ isRecording: false, durationMillis: 0 })
        ),
      })),
      requestPermissionsAsync: jest.fn(() =>
        Promise.resolve({ granted: true, status: 'granted' })
      ),
      setAudioModeAsync: jest.fn(() => Promise.resolve()),
      RecordingOptionsPresets: {
        HIGH_QUALITY: {},
        LOW_QUALITY: {},
      },
      AndroidOutputFormat: { MPEG_4: 'MPEG_4' },
      AndroidAudioEncoder: { AAC: 'AAC' },
      IOSOutputFormat: { MPEG4AAC: 'MPEG4AAC' },
      IOSAudioQuality: { HIGH: 'HIGH', LOW: 'LOW' },
    },
    Video: jest.fn(() => null),
    AVPlaybackStatus: {},
  };
});

// Mock @react-native-voice/voice
jest.mock('@react-native-voice/voice', () => ({
  __esModule: true,
  default: {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
    cancel: jest.fn(() => Promise.resolve()),
    destroy: jest.fn(() => Promise.resolve()),
    removeAllListeners: jest.fn(),
    isAvailable: jest.fn(() => Promise.resolve(true)),
    isRecognizing: jest.fn(() => Promise.resolve(false)),
    getSpeechRecognitionServices: jest.fn(() => Promise.resolve([])),
    onSpeechStart: null,
    onSpeechRecognized: null,
    onSpeechEnd: null,
    onSpeechError: null,
    onSpeechResults: null,
    onSpeechPartialResults: null,
    onSpeechVolumeChanged: null,
  },
}));

// Mock expo-speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, status: 'granted' })
    ),
    requestMicrophonePermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, status: 'granted' })
    ),
    getCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, status: 'granted' })
    ),
    getMicrophonePermissionsAsync: jest.fn(() =>
      Promise.resolve({ granted: true, status: 'granted' })
    ),
    Constants: {
      Type: { back: 'back', front: 'front' },
      FlashMode: { on: 'on', off: 'off', auto: 'auto', torch: 'torch' },
    },
  },
  CameraType: { back: 'back', front: 'front' },
  FlashMode: { on: 'on', off: 'off', auto: 'auto', torch: 'torch' },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted' })
  ),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true, status: 'granted' })
  ),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-notification-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-push-token' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

// Mock react-native-reanimated with its built-in mock
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Global fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
    clone: jest.fn(),
  })
) as jest.Mock;

// Suppress specific React Native warnings in test output
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';

  const suppressedPatterns = [
    'Warning: An update to',
    'Warning: Cannot update a component',
    'not wrapped in act',
    'NativeEventEmitter',
    'Warning: React.createElement: type is invalid',
    'Warning: Each child in a list should have a unique "key" prop',
    'Warning: validateDOMNesting',
    'Warning: componentWillMount has been renamed',
    'Warning: componentWillReceiveProps has been renamed',
    'Warning: componentWillUpdate has been renamed',
  ];

  if (suppressedPatterns.some((pattern) => message.includes(pattern))) {
    return;
  }

  originalConsoleError(...args);
};

// afterEach: clear timers and cleanup React Native Testing Library
afterEach(() => {
  jest.clearAllTimers();
  cleanup();
});
