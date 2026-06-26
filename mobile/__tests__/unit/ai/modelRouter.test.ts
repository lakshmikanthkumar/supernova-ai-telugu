/**
 * Unit tests for mobile/src/services/ai/modelRouter.ts
 *
 * Tests selectModel(), getAvailableModels(), and getFallbackChain()
 * using the actual exported API surface.
 */

// Mock aiHealthMonitor and aiRateLimiter before importing modelRouter
jest.mock('../../../src/services/ai/aiHealthMonitor', () => ({
  aiHealthMonitor: {
    isAvailable: jest.fn().mockReturnValue(true),
    getMetrics: jest.fn().mockReturnValue({ successRate: 1, avgLatency: 100, state: 'closed' }),
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
  },
}));

jest.mock('../../../src/services/ai/aiRateLimiter', () => ({
  aiRateLimiter: {
    canMakeRequest: jest.fn().mockReturnValue(true),
    recordRequest: jest.fn(),
    getUsageStats: jest.fn().mockReturnValue({ requestsThisMinute: 0, tokensThisMinute: 0 }),
  },
}));

import { selectModel, getAvailableModels, getFallbackChain, MODELS, TaskType } from '../../../src/services/ai/modelRouter';
import { aiHealthMonitor } from '../../../src/services/ai/aiHealthMonitor';
import { aiRateLimiter } from '../../../src/services/ai/aiRateLimiter';

const mockIsAvailable = aiHealthMonitor.isAvailable as jest.Mock;
const mockCanMakeRequest = aiRateLimiter.canMakeRequest as jest.Mock;

describe('ModelRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailable.mockReturnValue(true);
    mockCanMakeRequest.mockReturnValue(true);
    (aiHealthMonitor.getMetrics as jest.Mock).mockReturnValue({ successRate: 1, avgLatency: 100, state: 'closed' });
  });

  // ─── MODELS registry ──────────────────────────────────────────────────────
  describe('MODELS registry', () => {
    it('contains at least 4 model configs', () => {
      expect(MODELS.length).toBeGreaterThanOrEqual(4);
    });

    it('every model has required fields', () => {
      MODELS.forEach(m => {
        expect(m.id).toBeTruthy();
        expect(m.provider).toMatch(/^(groq|gemini|openrouter)$/);
        expect(m.apiModel).toBeTruthy();
        expect(typeof m.priority).toBe('number');
        expect(m.contextWindow).toBeGreaterThan(0);
      });
    });

    it('includes groq-llama-70b as the highest-priority model', () => {
      const model = MODELS.find(m => m.id === 'groq-llama-70b');
      expect(model).toBeDefined();
      expect(model!.priority).toBe(1);
    });

    it('includes a gemini model', () => {
      const gemini = MODELS.find(m => m.provider === 'gemini');
      expect(gemini).toBeDefined();
    });

    it('includes an openrouter fallback model', () => {
      const openrouter = MODELS.find(m => m.provider === 'openrouter');
      expect(openrouter).toBeDefined();
    });
  });

  // ─── selectModel() ────────────────────────────────────────────────────────
  describe('selectModel()', () => {
    it('returns a ModelConfig for task "chat"', () => {
      const model = selectModel('chat');
      expect(model).not.toBeNull();
      expect(model!.id).toBeTruthy();
    });

    it('prefers groq-llama-70b for heavy tasks (chat)', () => {
      const model = selectModel('chat');
      expect(model!.id).toBe('groq-llama-70b');
    });

    it('prefers groq-llama-8b for light tasks (grammar_check)', () => {
      const model = selectModel('grammar_check');
      expect(model!.id).toBe('groq-llama-8b');
    });

    it('prefers groq-llama-8b for quiz_generation', () => {
      const model = selectModel('quiz_generation');
      expect(model!.id).toBe('groq-llama-8b');
    });

    it('returns a valid model for all defined task types', () => {
      const tasks: TaskType[] = [
        'chat', 'grammar_check', 'interview_coaching', 'quiz_generation',
        'word_explanation', 'roleplay', 'email_generation', 'speech_analysis',
        'translation', 'simple_qa',
      ];
      tasks.forEach(task => {
        const model = selectModel(task);
        expect(model).not.toBeNull();
        expect(model!.apiModel).toBeTruthy();
      });
    });

    it('skips models where isAvailable returns false', () => {
      mockIsAvailable.mockImplementation((id: string) => id !== 'groq-llama-70b');
      const model = selectModel('chat');
      expect(model).not.toBeNull();
      expect(model!.id).not.toBe('groq-llama-70b');
    });

    it('skips models where canMakeRequest returns false', () => {
      mockCanMakeRequest.mockImplementation((id: string) => id !== 'groq-llama-8b');
      const model = selectModel('grammar_check');
      expect(model).not.toBeNull();
      expect(model!.id).not.toBe('groq-llama-8b');
    });

    it('returns null when all models are unavailable', () => {
      mockIsAvailable.mockReturnValue(false);
      const model = selectModel('chat');
      expect(model).toBeNull();
    });

    it('returns null when all models are rate-limited', () => {
      mockCanMakeRequest.mockReturnValue(false);
      const model = selectModel('grammar_check');
      expect(model).toBeNull();
    });
  });

  // ─── getFallbackChain() ───────────────────────────────────────────────────
  describe('getFallbackChain()', () => {
    it('returns an array for task "chat"', () => {
      const chain = getFallbackChain('chat');
      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBeGreaterThan(0);
    });

    it('chat chain starts with groq-llama-70b', () => {
      const chain = getFallbackChain('chat');
      expect(chain[0]).toBe('groq-llama-70b');
    });

    it('grammar_check chain starts with groq-llama-8b', () => {
      const chain = getFallbackChain('grammar_check');
      expect(chain[0]).toBe('groq-llama-8b');
    });

    it('chat and grammar_check have different first entries', () => {
      const chatChain = getFallbackChain('chat');
      const grammarChain = getFallbackChain('grammar_check');
      expect(chatChain[0]).not.toBe(grammarChain[0]);
    });

    it('chain includes gemini and openrouter as backup providers', () => {
      const chain = getFallbackChain('chat');
      expect(chain.some(id => id.startsWith('gemini'))).toBe(true);
      expect(chain.some(id => id.startsWith('openrouter'))).toBe(true);
    });

    it('returns a chain for every task type', () => {
      const tasks: TaskType[] = [
        'chat', 'grammar_check', 'interview_coaching', 'quiz_generation',
        'word_explanation', 'roleplay', 'email_generation', 'speech_analysis',
        'translation', 'simple_qa',
      ];
      tasks.forEach(task => {
        const chain = getFallbackChain(task);
        expect(chain.length).toBeGreaterThan(0);
      });
    });
  });

  // ─── getAvailableModels() ─────────────────────────────────────────────────
  describe('getAvailableModels()', () => {
    it('returns an array of model configs with availability flag', () => {
      const models = getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      models.forEach(m => {
        expect(typeof m.available).toBe('boolean');
        expect(m.id).toBeTruthy();
      });
    });

    it('marks all models available when health and rate-limiter are OK', () => {
      const models = getAvailableModels();
      expect(models.every(m => m.available)).toBe(true);
    });

    it('marks groq-llama-70b unavailable when health monitor says so', () => {
      mockIsAvailable.mockImplementation((id: string) => id !== 'groq-llama-70b');
      const models = getAvailableModels();
      const llama70b = models.find(m => m.id === 'groq-llama-70b');
      expect(llama70b!.available).toBe(false);
    });

    it('returns metrics for each model', () => {
      const models = getAvailableModels();
      models.forEach(m => {
        expect(m.metrics).toBeDefined();
      });
    });
  });
});
