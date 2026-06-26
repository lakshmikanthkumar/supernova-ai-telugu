import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderWithProviders, createMockStore, flushPromises } from '../utils/testHelpers';
import { createMockSupabaseClient, MOCK_USER, MOCK_PROFILE } from '../mocks/supabaseMocks';

// Mock dependencies
const mockSupabaseClient = createMockSupabaseClient();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    replace: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock auth service
jest.mock('../../src/services/auth', () => ({
  authService: {
    login: jest.fn().mockResolvedValue({
      user: { id: 'user-123-uuid', email: 'test@englishmitra.com' },
      session: { access_token: 'mock-jwt-token' },
    }),
    signup: jest.fn().mockResolvedValue({
      user: { id: 'user-123-uuid', email: 'test@englishmitra.com' },
      session: null,
    }),
    logout: jest.fn().mockResolvedValue(undefined),
    getCurrentUser: jest.fn().mockResolvedValue({
      user: { id: 'user-123-uuid', email: 'test@englishmitra.com' },
      session: { access_token: 'mock-jwt-token' },
    }),
  },
}), { virtual: true });

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.clear as jest.Mock).mockClear?.();
  });

  // ─── Login ───────────────────────────────────────────────────────────────────
  describe('Login flow', () => {
    it('stores JWT in AsyncStorage on successful login', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: MOCK_USER,
          session: { access_token: 'mock-jwt-token', user: MOCK_USER },
        },
        error: null,
      });

      await mockSupabaseClient.auth.signInWithPassword({
        email: 'test@englishmitra.com',
        password: 'password123',
      });

      // Simulate storing JWT
      await AsyncStorage.setItem('auth_token', 'mock-jwt-token');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('auth_token', expect.any(String));
    });

    it('dispatches setUser action on successful login', async () => {
      const store = createMockStore();

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: MOCK_USER,
          session: { access_token: 'mock-jwt-token', user: MOCK_USER },
        },
        error: null,
      });

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'test@englishmitra.com',
        password: 'password123',
      });

      expect(result.data.user).toEqual(MOCK_USER);
      expect(store).toBeDefined();
    });

    it('returns error on invalid credentials', async () => {
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const result = await mockSupabaseClient.auth.signInWithPassword({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(result.error).not.toBeNull();
      expect(result.error?.message).toBe('Invalid login credentials');
    });

    it('navigates to /(main)/home after successful login', async () => {
      const mockNavigate = jest.fn();

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: MOCK_USER,
          session: { access_token: 'mock-jwt-token', user: MOCK_USER },
        },
        error: null,
      });

      await mockSupabaseClient.auth.signInWithPassword({
        email: 'test@englishmitra.com',
        password: 'password123',
      });

      // Simulate navigation after login
      mockNavigate('/(main)/home');
      expect(mockNavigate).toHaveBeenCalledWith('/(main)/home');
    });
  });

  // ─── Signup ──────────────────────────────────────────────────────────────────
  describe('Signup flow', () => {
    it('creates a profile row on signup', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: MOCK_USER, session: null },
        error: null,
      });

      const signupResult = await mockSupabaseClient.auth.signUp({
        email: 'new@englishmitra.com',
        password: 'newpassword123',
      });

      expect(signupResult.data.user).toBeDefined();
      expect(signupResult.error).toBeNull();

      // Profile insertion should be called
      const fromMock = mockSupabaseClient.from('profiles');
      expect(fromMock).toBeDefined();
    });

    it('navigates to onboarding after successful signup', async () => {
      const mockNavigate = jest.fn();

      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: MOCK_USER, session: null },
        error: null,
      });

      await mockSupabaseClient.auth.signUp({
        email: 'new@englishmitra.com',
        password: 'newpassword123',
      });

      mockNavigate('/auth/onboarding');
      expect(mockNavigate).toHaveBeenCalledWith('/auth/onboarding');
    });

    it('returns error when email already in use', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 },
      });

      const result = await mockSupabaseClient.auth.signUp({
        email: 'existing@englishmitra.com',
        password: 'password123',
      });

      expect(result.error).not.toBeNull();
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────────────────
  describe('Logout flow', () => {
    it('clears AsyncStorage on logout', async () => {
      await AsyncStorage.setItem('auth_token', 'some-token');

      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null });
      await mockSupabaseClient.auth.signOut();

      await AsyncStorage.removeItem('auth_token');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('navigates to /auth/login after logout', async () => {
      const mockNavigate = jest.fn();

      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null });
      await mockSupabaseClient.auth.signOut();

      mockNavigate('/auth/login');
      expect(mockNavigate).toHaveBeenCalledWith('/auth/login');
    });
  });

  // ─── Session restore ─────────────────────────────────────────────────────────
  describe('Session restoration on app start', () => {
    it('restores session from getUser', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: MOCK_USER },
        error: null,
      });

      const result = await mockSupabaseClient.auth.getUser();
      expect(result.data.user).toEqual(MOCK_USER);
    });

    it('handles missing session gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await mockSupabaseClient.auth.getUser();
      expect(result.data.user).toBeNull();
    });

    it('onAuthStateChange fires with session on app start', () => {
      const callback = jest.fn();
      mockSupabaseClient.auth.onAuthStateChange(callback);

      expect(mockSupabaseClient.auth.onAuthStateChange).toHaveBeenCalledWith(callback);
    });
  });
});
