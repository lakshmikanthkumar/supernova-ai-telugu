import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// Device Info
// ---------------------------------------------------------------------------

export const MOCK_DEVICE_INFO = {
  platform: 'ios' as 'ios' | 'android',
  version: '17.0',
  model: 'iPhone 14',
  screenWidth: 390,
  screenHeight: 844,
};

// ---------------------------------------------------------------------------
// Network Info
// ---------------------------------------------------------------------------

export interface NetworkInfo {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export const MOCK_NETWORK_INFO: NetworkInfo = {
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
};

export function mockNetworkOffline(): void {
  MOCK_NETWORK_INFO.isConnected = false;
  MOCK_NETWORK_INFO.isInternetReachable = false;
  MOCK_NETWORK_INFO.type = 'none';
}

export function mockNetworkOnline(): void {
  MOCK_NETWORK_INFO.isConnected = true;
  MOCK_NETWORK_INFO.isInternetReachable = true;
  MOCK_NETWORK_INFO.type = 'wifi';
}

export function mockSlowNetwork(): void {
  MOCK_NETWORK_INFO.isConnected = true;
  MOCK_NETWORK_INFO.isInternetReachable = true;
  MOCK_NETWORK_INFO.type = 'cellular';
  // Expose on the object so consumers can branch on slowNetwork flag
  (MOCK_NETWORK_INFO as NetworkInfo & { slowNetwork?: boolean }).slowNetwork = true;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable';

export interface MockPermissions {
  camera: PermissionStatus;
  microphone: PermissionStatus;
  notifications: PermissionStatus;
  [key: string]: PermissionStatus;
}

export const MOCK_PERMISSIONS: MockPermissions = {
  camera: 'granted',
  microphone: 'granted',
  notifications: 'granted',
};

export function mockPermissionDenied(permission: string): void {
  MOCK_PERMISSIONS[permission] = 'denied';
}

export function mockPermissionGranted(permission: string): void {
  MOCK_PERMISSIONS[permission] = 'granted';
}

// ---------------------------------------------------------------------------
// AsyncStorage — in-memory implementation
// ---------------------------------------------------------------------------

const _asyncStorageStore: Map<string, string> = new Map();

export const mockAsyncStorage = {
  getItem: jest.fn(async (key: string): Promise<string | null> => {
    return _asyncStorageStore.get(key) ?? null;
  }),

  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    _asyncStorageStore.set(key, value);
  }),

  removeItem: jest.fn(async (key: string): Promise<void> => {
    _asyncStorageStore.delete(key);
  }),

  clear: jest.fn(async (): Promise<void> => {
    _asyncStorageStore.clear();
  }),

  getAllKeys: jest.fn(async (): Promise<string[]> => {
    return Array.from(_asyncStorageStore.keys());
  }),

  multiGet: jest.fn(async (keys: string[]): Promise<[string, string | null][]> => {
    return keys.map((key) => [key, _asyncStorageStore.get(key) ?? null]);
  }),

  multiSet: jest.fn(async (keyValuePairs: [string, string][]): Promise<void> => {
    keyValuePairs.forEach(([key, value]) => _asyncStorageStore.set(key, value));
  }),

  multiRemove: jest.fn(async (keys: string[]): Promise<void> => {
    keys.forEach((key) => _asyncStorageStore.delete(key));
  }),
};

// ---------------------------------------------------------------------------
// Audio Recording — expo-av mock
// ---------------------------------------------------------------------------

export const MOCK_AUDIO_RECORDING = {
  prepareToRecordAsync: jest.fn(async () => ({ uri: null })),
  startAsync: jest.fn(async () => {}),
  stopAndUnloadAsync: jest.fn(async () => {}),
  getStatusAsync: jest.fn(async () => ({
    canRecord: true,
    isRecording: false,
    isDoneRecording: false,
    durationMillis: 0,
    metering: -160,
  })),
  setOnRecordingStatusUpdate: jest.fn((_callback: (status: object) => void) => {}),
  setProgressUpdateInterval: jest.fn((_millis: number) => {}),
  pauseAsync: jest.fn(async () => {}),
  createNewLoadedSoundAsync: jest.fn(async () => ({
    sound: {
      playAsync: jest.fn(async () => {}),
      stopAsync: jest.fn(async () => {}),
      unloadAsync: jest.fn(async () => {}),
      setOnPlaybackStatusUpdate: jest.fn(),
    },
    status: { isLoaded: true },
  })),
  _uri: 'file:///mock/recording.m4a',
  getURI: jest.fn(() => 'file:///mock/recording.m4a'),
};

// ---------------------------------------------------------------------------
// Speech Recognition — @react-native-voice/voice mock
// ---------------------------------------------------------------------------

type SpeechResultsCallback = (event: { value: string[] }) => void;
type SpeechErrorCallback = (event: { error: { message: string; code: string } }) => void;

export const mockSpeechRecognition = {
  _onSpeechResultsCallback: null as SpeechResultsCallback | null,
  _onSpeechErrorCallback: null as SpeechErrorCallback | null,
  _onSpeechStartCallback: null as (() => void) | null,
  _onSpeechEndCallback: null as (() => void) | null,

  isAvailable: jest.fn(async (): Promise<0 | 1> => 1),

  start: jest.fn(async (_locale?: string): Promise<void> => {}),

  stop: jest.fn(async (): Promise<void> => {
    mockSpeechRecognition._onSpeechEndCallback?.();
  }),

  cancel: jest.fn(async (): Promise<void> => {}),

  destroy: jest.fn(async (): Promise<void> => {}),

  removeAllListeners: jest.fn((): void => {}),

  getSpeechRecognitionServices: jest.fn(async (): Promise<string[]> => [
    'com.google.android.googlequicksearchbox',
  ]),

  // Setters used by consumers
  set onSpeechResults(cb: SpeechResultsCallback | null) {
    mockSpeechRecognition._onSpeechResultsCallback = cb;
  },
  set onSpeechError(cb: SpeechErrorCallback | null) {
    mockSpeechRecognition._onSpeechErrorCallback = cb;
  },
  set onSpeechStart(cb: (() => void) | null) {
    mockSpeechRecognition._onSpeechStartCallback = cb;
  },
  set onSpeechEnd(cb: (() => void) | null) {
    mockSpeechRecognition._onSpeechEndCallback = cb;
  },

  // Test helpers to simulate callbacks
  _simulateSpeechResults(results: string[]): void {
    mockSpeechRecognition._onSpeechResultsCallback?.({ value: results });
  },

  _simulateSpeechError(message: string, code = 'ERROR_SPEECH_TIMEOUT'): void {
    mockSpeechRecognition._onSpeechErrorCallback?.({ error: { message, code } });
  },

  _simulateSpeechStart(): void {
    mockSpeechRecognition._onSpeechStartCallback?.();
  },

  _simulateSpeechEnd(): void {
    mockSpeechRecognition._onSpeechEndCallback?.();
  },
};

// ---------------------------------------------------------------------------
// setupDeviceMocks — call in beforeEach
// ---------------------------------------------------------------------------

export function setupDeviceMocks(): void {
  // Reset network to online defaults
  MOCK_NETWORK_INFO.isConnected = true;
  MOCK_NETWORK_INFO.isInternetReachable = true;
  MOCK_NETWORK_INFO.type = 'wifi';
  delete (MOCK_NETWORK_INFO as NetworkInfo & { slowNetwork?: boolean }).slowNetwork;

  // Reset permissions
  MOCK_PERMISSIONS.camera = 'granted';
  MOCK_PERMISSIONS.microphone = 'granted';
  MOCK_PERMISSIONS.notifications = 'granted';

  // Reset in-memory AsyncStorage store and clear mock histories
  _asyncStorageStore.clear();
  mockAsyncStorage.getItem.mockClear();
  mockAsyncStorage.setItem.mockClear();
  mockAsyncStorage.removeItem.mockClear();
  mockAsyncStorage.clear.mockClear();
  mockAsyncStorage.getAllKeys.mockClear();
  mockAsyncStorage.multiGet.mockClear();
  mockAsyncStorage.multiSet.mockClear();
  mockAsyncStorage.multiRemove.mockClear();

  // Reset audio recording mocks
  MOCK_AUDIO_RECORDING.prepareToRecordAsync.mockClear();
  MOCK_AUDIO_RECORDING.startAsync.mockClear();
  MOCK_AUDIO_RECORDING.stopAndUnloadAsync.mockClear();
  MOCK_AUDIO_RECORDING.getStatusAsync.mockClear();
  MOCK_AUDIO_RECORDING.setOnRecordingStatusUpdate.mockClear();
  MOCK_AUDIO_RECORDING.setProgressUpdateInterval.mockClear();
  MOCK_AUDIO_RECORDING.pauseAsync.mockClear();
  MOCK_AUDIO_RECORDING.createNewLoadedSoundAsync.mockClear();
  MOCK_AUDIO_RECORDING.getURI.mockClear();

  // Reset speech recognition callbacks and mock histories
  mockSpeechRecognition._onSpeechResultsCallback = null;
  mockSpeechRecognition._onSpeechErrorCallback = null;
  mockSpeechRecognition._onSpeechStartCallback = null;
  mockSpeechRecognition._onSpeechEndCallback = null;
  mockSpeechRecognition.isAvailable.mockClear();
  mockSpeechRecognition.start.mockClear();
  mockSpeechRecognition.stop.mockClear();
  mockSpeechRecognition.cancel.mockClear();
  mockSpeechRecognition.destroy.mockClear();
  mockSpeechRecognition.removeAllListeners.mockClear();
  mockSpeechRecognition.getSpeechRecognitionServices.mockClear();
}
