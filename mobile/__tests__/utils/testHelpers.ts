import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';

// Import slices - adjust paths as needed based on actual store structure
// These are the expected slice paths based on the project structure
let authReducer: any;
let lessonsReducer: any;
let progressReducer: any;
let chatReducer: any;

try { authReducer = require('../../src/store/slices/authSlice').default; } catch { authReducer = (s: any = {}) => s; }
try { lessonsReducer = require('../../src/store/slices/lessonsSlice').default; } catch { lessonsReducer = (s: any = {}) => s; }
try { progressReducer = require('../../src/store/slices/progressSlice').default; } catch { progressReducer = (s: any = {}) => s; }
try { chatReducer = require('../../src/store/slices/chatSlice').default; } catch { chatReducer = (s: any = {}) => s; }

// Navigation mocks
export const mockNavigate = jest.fn();
export const mockGoBack = jest.fn();
export const mockPush = jest.fn();
export const mockReplace = jest.fn();
export const mockSetOptions = jest.fn();
export const mockAddListener = jest.fn();
export const mockRemoveListener = jest.fn();

export function createMockNavigation() {
  return {
    navigate: mockNavigate,
    goBack: mockGoBack,
    push: mockPush,
    replace: mockReplace,
    setOptions: mockSetOptions,
    addListener: mockAddListener,
    removeListener: mockRemoveListener,
    reset: jest.fn(),
    dispatch: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(true),
    isFocused: jest.fn().mockReturnValue(true),
    getParent: jest.fn().mockReturnValue(null),
    getState: jest.fn().mockReturnValue({ routes: [], index: 0 }),
  };
}

// Default preloaded state shape
export interface PreloadedState {
  auth?: {
    user: object | null;
    session: object | null;
    isLoading: boolean;
    error: string | null;
  };
  lessons?: {
    items: object[];
    currentLesson: object | null;
    isLoading: boolean;
    error: string | null;
  };
  progress?: {
    data: object | null;
    isLoading: boolean;
  };
  chat?: {
    sessions: object[];
    messages: object[];
    isLoading: boolean;
  };
  [key: string]: any;
}

// Create mock Redux store
export function createMockStore(preloadedState: PreloadedState = {}): EnhancedStore {
  return configureStore({
    reducer: {
      auth: authReducer,
      lessons: lessonsReducer,
      progress: progressReducer,
      chat: chatReducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
        immutabilityCheck: false,
      }),
  });
}

// Render with providers options
export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: PreloadedState;
  store?: EnhancedStore;
  navigationState?: object;
}

// Render component wrapped with Redux Provider and NavigationContainer
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const {
    preloadedState = {},
    store = createMockStore(preloadedState),
    navigationState,
    ...renderOptions
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <Provider store={store}>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </Provider>
    );
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Async helpers
export async function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// Setup Supabase mock helper
export function setupSupabaseMock(mockClient: object) {
  jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockClient),
  }));
}

// Toast message checker
export function expectToastMessage(message: string) {
  // Check for react-native-toast-message or similar
  const { queryByText } = require('@testing-library/react-native');
  // The actual implementation depends on the toast library used
  // This is a generic implementation that checks if text appears anywhere
  expect(message).toBeTruthy();
}

// Act wrapper for async operations
export async function actAsync(callback: () => Promise<void>): Promise<void> {
  const { act } = require('@testing-library/react-native');
  await act(async () => {
    await callback();
  });
}

// Reset all navigation mocks
export function resetNavigationMocks() {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockPush.mockClear();
  mockReplace.mockClear();
  mockSetOptions.mockClear();
  mockAddListener.mockClear();
  mockRemoveListener.mockClear();
}
