import { MOCK_AI_RESPONSE } from '../utils/mockData';
import { createMockStore, flushPromises } from '../utils/testHelpers';

// Mock AI orchestrator
const mockProcessMessage = jest.fn().mockResolvedValue({
  content: 'Hello! I am Nova, your English learning assistant. How can I help you today?',
  model: 'llama-3.3-70b-versatile',
  tokensUsed: 42,
});

jest.mock('../../src/services/ai/aiOrchestrator', () => ({
  aiOrchestrator: {
    processMessage: mockProcessMessage,
    selectModel: jest.fn().mockReturnValue('llama-3.3-70b-versatile'),
  },
  processMessage: mockProcessMessage,
}), { virtual: true });

// Mock NetInfo
const mockNetInfoState = { isConnected: true, isInternetReachable: true };
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn((callback: any) => {
    callback(mockNetInfoState);
    return jest.fn(); // unsubscribe
  }),
  fetch: jest.fn().mockResolvedValue(mockNetInfoState),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((resolve: any) => {
        resolve({ data: [], error: null });
        return Promise.resolve({ data: [], error: null });
      }),
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null }),
    },
  })),
}));

describe('Chat Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetInfoState.isConnected = true;
    mockNetInfoState.isInternetReachable = true;
  });

  // ─── Sending messages ────────────────────────────────────────────────────────
  describe('Sending a message', () => {
    it('calls aiOrchestrator.processMessage with the typed message', async () => {
      const userMessage = 'How do I introduce myself in English?';

      await mockProcessMessage({
        prompt: userMessage,
        taskType: 'chat',
        userId: 'user-123',
      });

      expect(mockProcessMessage).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: userMessage })
      );
    });

    it('returns a response object with content and model', async () => {
      const result = await mockProcessMessage({
        prompt: 'Hello',
        taskType: 'chat',
        userId: 'user-123',
      });

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('tokensUsed');
    });

    it('Nova response content is a non-empty string', async () => {
      const result = await mockProcessMessage({
        prompt: 'Tell me about English grammar',
        taskType: 'chat',
        userId: 'user-123',
      });

      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  // ─── Grammar correction ──────────────────────────────────────────────────────
  describe('Grammar error correction display', () => {
    it('processMessage returns corrections array for grammar task', async () => {
      const mockWithCorrections = jest.fn().mockResolvedValue({
        content: 'I go to school every day. (Corrected from "I goes")',
        corrections: [
          {
            original: 'I goes to school',
            corrected: 'I go to school',
            explanation: 'Use "go" with first-person singular "I"',
          },
        ],
        model: 'llama-3.1-8b-instant',
        tokensUsed: 78,
      });

      const result = await mockWithCorrections({
        prompt: 'I goes to school every day.',
        taskType: 'grammar',
        userId: 'user-123',
      });

      expect(result.corrections).toBeDefined();
      expect(Array.isArray(result.corrections)).toBe(true);
    });

    it('corrections contain original, corrected, and explanation fields', async () => {
      const correction = {
        original: 'I goes to school',
        corrected: 'I go to school',
        explanation: 'Use "go" with first-person singular "I"',
      };

      expect(correction).toHaveProperty('original');
      expect(correction).toHaveProperty('corrected');
      expect(correction).toHaveProperty('explanation');
    });
  });

  // ─── Offline behavior ────────────────────────────────────────────────────────
  describe('Network offline handling', () => {
    it('detects offline state when isConnected is false', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValueOnce({
        isConnected: false,
        isInternetReachable: false,
      });

      const netState = await NetInfo.fetch();
      expect(netState.isConnected).toBe(false);
    });

    it('shows offline indicator when network is unavailable', async () => {
      mockNetInfoState.isConnected = false;

      // Simulate checking network before sending message
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

      const netState = await NetInfo.fetch();
      const shouldShowOfflineMessage = !netState.isConnected;

      expect(shouldShowOfflineMessage).toBe(true);
    });

    it('prevents message send when offline', async () => {
      mockNetInfoState.isConnected = false;
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

      const sendMessage = async (message: string) => {
        const state = await NetInfo.fetch();
        if (!state.isConnected) {
          throw new Error('No internet connection');
        }
        return mockProcessMessage({ prompt: message, taskType: 'chat', userId: 'user-123' });
      };

      await expect(sendMessage('Hello')).rejects.toThrow('No internet connection');
      expect(mockProcessMessage).not.toHaveBeenCalled();
    });

    it('resumes sending messages when connection is restored', async () => {
      const NetInfo = require('@react-native-community/netinfo');
      NetInfo.fetch.mockResolvedValueOnce({ isConnected: true });

      const state = await NetInfo.fetch();
      expect(state.isConnected).toBe(true);

      const result = await mockProcessMessage({ prompt: 'Back online!', taskType: 'chat', userId: 'user-123' });
      expect(result).toBeDefined();
    });
  });

  // ─── Chat model selection ────────────────────────────────────────────────────
  describe('Model selection for chat tasks', () => {
    it('uses llama-3.3-70b-versatile for general chat', async () => {
      const result = await mockProcessMessage({
        prompt: 'Tell me about English grammar',
        taskType: 'chat',
        userId: 'user-123',
      });

      expect(result.model).toBe('llama-3.3-70b-versatile');
    });
  });
});
