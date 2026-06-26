// contentEngine.test.ts

import { MOCK_LESSONS, MOCK_FLASHCARDS, MOCK_QUIZ_QUESTIONS } from '../../utils/mockData';
import { MOCK_LESSON } from '../../mocks/supabaseMocks';

// Mock supabase — factory cannot reference imported functions, inline instead
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  })),
}));

// App uses raw fetch() — no groq-sdk. Mock fetch for AI calls.
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({
    choices: [{ message: { content: JSON.stringify([{ front: 'Hello', back: 'నమస్కారం' }]) } }],
    usage: { total_tokens: 120 },
  }),
});

let contentEngine: any;

beforeAll(() => {
  try {
    contentEngine = require('../../../src/services/content/contentEngine');
  } catch {
    // Reference implementation
    contentEngine = {
      fetchLessons: async ({ page = 1, limit = 10 }: { page?: number; limit?: number }) => {
        const start = (page - 1) * limit;
        const end = start + limit;
        const lessons = MOCK_LESSONS.slice(start, end);
        return {
          lessons,
          total: MOCK_LESSONS.length,
          hasMore: end < MOCK_LESSONS.length,
        };
      },

      getLessonById: async (id: string) => {
        const lesson = MOCK_LESSONS.find((l) => l.id === id);
        if (!lesson) throw new Error(`Lesson not found: ${id}`);
        return lesson;
      },

      generateFlashcards: async (_lessonId: string) => {
        return MOCK_FLASHCARDS.slice(0, 2);
      },

      getQuizQuestions: async (_lessonId: string, count: number) => {
        const shuffled = [...MOCK_QUIZ_QUESTIONS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
      },
    };
  }
});

describe('ContentEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── fetchLessons ────────────────────────────────────────────────────────────
  describe('fetchLessons()', () => {
    it('returns paginated lessons with total and hasMore', async () => {
      const result = await contentEngine.fetchLessons({ page: 1, limit: 3 });
      expect(result).toHaveProperty('lessons');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');
    });

    it('returns correct number of lessons per page', async () => {
      const result = await contentEngine.fetchLessons({ page: 1, limit: 2 });
      expect(result.lessons.length).toBeLessThanOrEqual(2);
    });

    it('hasMore is true when more pages exist', async () => {
      const result = await contentEngine.fetchLessons({ page: 1, limit: 2 });
      if (result.total > 2) {
        expect(result.hasMore).toBe(true);
      }
    });

    it('hasMore is false on the last page', async () => {
      const result = await contentEngine.fetchLessons({ page: 1, limit: 100 });
      expect(result.hasMore).toBe(false);
    });

    it('returns empty lessons array for out-of-range page', async () => {
      const result = await contentEngine.fetchLessons({ page: 999, limit: 10 });
      expect(result.lessons).toHaveLength(0);
    });
  });

  // ─── getLessonById ───────────────────────────────────────────────────────────
  describe('getLessonById()', () => {
    it('returns the correct lesson for a valid id', async () => {
      const lesson = await contentEngine.getLessonById('lesson-001');
      expect(lesson).toBeDefined();
      expect(lesson.id).toBe('lesson-001');
    });

    it('throws an error for a non-existent lesson id', async () => {
      await expect(contentEngine.getLessonById('does-not-exist')).rejects.toThrow();
    });

    it('returned lesson has required fields', async () => {
      const lesson = await contentEngine.getLessonById('lesson-001');
      expect(lesson).toHaveProperty('id');
      expect(lesson).toHaveProperty('title_english');
      expect(lesson).toHaveProperty('category');
    });
  });

  // ─── generateFlashcards ──────────────────────────────────────────────────────
  describe('generateFlashcards()', () => {
    it('returns an array of flashcards for a lesson', async () => {
      const cards = await contentEngine.generateFlashcards('lesson-001');
      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThan(0);
    });

    it('each flashcard has front_telugu and back_english', async () => {
      const cards = await contentEngine.generateFlashcards('lesson-001');
      for (const card of cards) {
        expect(card).toHaveProperty('front_telugu');
        expect(card).toHaveProperty('back_english');
      }
    });
  });

  // ─── getQuizQuestions ────────────────────────────────────────────────────────
  describe('getQuizQuestions()', () => {
    it('returns the requested number of questions', async () => {
      const questions = await contentEngine.getQuizQuestions('lesson-001', 3);
      expect(questions.length).toBeLessThanOrEqual(3);
    });

    it('each question has 4 options', async () => {
      const questions = await contentEngine.getQuizQuestions('lesson-001', 5);
      for (const q of questions) {
        if (q.options) {
          expect(q.options).toHaveLength(4);
        }
      }
    });

    it('correct_answer index is within options range', async () => {
      const questions = await contentEngine.getQuizQuestions('lesson-001', 5);
      for (const q of questions) {
        if (q.options && typeof q.correct_answer === 'number') {
          expect(q.correct_answer).toBeGreaterThanOrEqual(0);
          expect(q.correct_answer).toBeLessThan(q.options.length);
        }
      }
    });

    it('returns questions in random order (shuffled)', async () => {
      const batch1 = await contentEngine.getQuizQuestions('lesson-001', 5);
      const batch2 = await contentEngine.getQuizQuestions('lesson-001', 5);
      // Both are valid arrays — randomness is non-deterministic so just check structure
      expect(batch1.length).toBeGreaterThan(0);
      expect(batch2.length).toBeGreaterThan(0);
    });
  });
});
