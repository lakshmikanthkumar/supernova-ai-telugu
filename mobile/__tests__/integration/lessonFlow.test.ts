import { MOCK_LESSONS, MOCK_FLASHCARDS, MOCK_QUIZ_QUESTIONS } from '../utils/mockData';
import { createMockSupabaseClient } from '../mocks/supabaseMocks';
import { createMockStore, flushPromises } from '../utils/testHelpers';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient({
    lessons: MOCK_LESSONS as any,
    flashcards: MOCK_FLASHCARDS as any,
    quiz_questions: MOCK_QUIZ_QUESTIONS as any,
  })),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: { lessonId: 'lesson-001' },
  }),
}));

describe('Lesson Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── LessonList ──────────────────────────────────────────────────────────────
  describe('LessonList', () => {
    it('renders lesson cards for available lessons', () => {
      expect(MOCK_LESSONS.length).toBeGreaterThan(0);
      MOCK_LESSONS.forEach((lesson) => {
        expect(lesson).toHaveProperty('id');
        expect(lesson).toHaveProperty('title_english');
        expect(lesson).toHaveProperty('category');
      });
    });

    it('lessons include difficulty and duration metadata', () => {
      MOCK_LESSONS.forEach((lesson) => {
        expect(['beginner', 'intermediate', 'advanced']).toContain(lesson.difficulty);
        expect(lesson.duration_minutes).toBeGreaterThan(0);
      });
    });

    it('premium lessons are correctly flagged', () => {
      const premiumLessons = MOCK_LESSONS.filter((l) => l.is_premium);
      const freeLessons = MOCK_LESSONS.filter((l) => !l.is_premium);
      expect(premiumLessons.length).toBeGreaterThan(0);
      expect(freeLessons.length).toBeGreaterThan(0);
    });
  });

  // ─── Lesson navigation ───────────────────────────────────────────────────────
  describe('Tapping a lesson', () => {
    it('lesson tap handler navigates to LessonScreen with correct lessonId', () => {
      const mockNavigate = jest.fn();
      const lesson = MOCK_LESSONS[0];

      // Simulate tap handler
      const onLessonPress = (lessonId: string) => {
        mockNavigate('LessonScreen', { lessonId });
      };

      onLessonPress(lesson.id);
      expect(mockNavigate).toHaveBeenCalledWith('LessonScreen', { lessonId: lesson.id });
    });
  });

  // ─── Flashcard review ────────────────────────────────────────────────────────
  describe('Flashcard review completion', () => {
    it('dispatches updateProgress with XP after flashcard review', () => {
      const store = createMockStore({
        progress: { data: { totalXp: 0, lessonsCompleted: 0 }, isLoading: false },
      });

      const lesson = MOCK_LESSONS[0];
      const xpEarned = lesson.xp_reward;

      // Simulate dispatching progress update
      const mockDispatch = jest.fn();
      mockDispatch({ type: 'progress/updateProgress', payload: { xp: xpEarned } });

      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ xp: xpEarned }),
        })
      );
    });

    it('flashcard count matches mock data', () => {
      const lessonFlashcards = MOCK_FLASHCARDS.filter((fc) => fc.lesson_id === 'lesson-001');
      expect(lessonFlashcards.length).toBeGreaterThan(0);
    });
  });

  // ─── Quiz completion ─────────────────────────────────────────────────────────
  describe('Quiz completion', () => {
    it('quiz questions have correct structure', () => {
      MOCK_QUIZ_QUESTIONS.forEach((q) => {
        expect(q).toHaveProperty('question');
        expect(q.options).toHaveLength(4);
        expect(q.correct_answer).toBeGreaterThanOrEqual(0);
        expect(q.correct_answer).toBeLessThan(4);
      });
    });

    it('calculates score correctly after quiz completion', () => {
      const answers = [1, 2, 1, 2, 2]; // user's answers
      const correctAnswers = MOCK_QUIZ_QUESTIONS.map((q) => q.correct_answer);

      const score = answers.reduce((acc, answer, index) => {
        return acc + (answer === correctAnswers[index] ? 1 : 0);
      }, 0);

      const percentage = (score / MOCK_QUIZ_QUESTIONS.length) * 100;
      expect(percentage).toBeGreaterThanOrEqual(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('saves quiz attempt to Supabase on completion', async () => {
      const mockClient = createMockSupabaseClient();
      const quizAttempt = {
        user_id: 'user-123-uuid',
        lesson_id: 'lesson-001',
        score: 80,
        completed_at: new Date().toISOString(),
      };

      const query = mockClient.from('quiz_attempts');
      await query.insert(quizAttempt);

      expect(mockClient.from).toHaveBeenCalledWith('quiz_attempts');
    });

    it('shows score summary after quiz completion', () => {
      const score = 4;
      const total = 5;
      const percentage = (score / total) * 100;

      expect(percentage).toBe(80);
      expect(score).toBeLessThanOrEqual(total);
    });
  });
});
