// Mock User
export const MOCK_USER = {
  id: 'user-123-uuid',
  email: 'test@englishmitra.com',
  created_at: '2024-01-01T00:00:00.000Z',
};

// Mock Profile
export const MOCK_PROFILE = {
  user_id: 'user-123-uuid',
  name: 'Test User',
  level: 'beginner',
  xp: 150,
  streak: 5,
  daily_goal_minutes: 20,
  goal: 'improve_speaking',
  is_premium: false,
  avatar_url: 'https://example.com/avatar.png',
  language_preference: 'telugu',
};

// Mock Lesson
export const MOCK_LESSON = {
  id: 'lesson-001',
  title: 'Basic Greetings',
  description: 'Learn common Telugu-English greetings',
  category: 'greetings',
  difficulty: 'beginner',
  duration_minutes: 15,
  content: { sections: [] },
  xp_reward: 50,
};

// Mock Flashcard
export const MOCK_FLASHCARD = {
  id: 'flashcard-001',
  lesson_id: 'lesson-001',
  front_telugu: 'నమస్కారం',
  back_english: 'Hello / Greetings',
  phonetic: 'Namaskaram',
  example_sentence: 'నమస్కారం, మీరు ఎలా ఉన్నారు?',
};

// Mock Quiz Question
export const MOCK_QUIZ_QUESTION = {
  id: 'quiz-001',
  lesson_id: 'lesson-001',
  question: 'What does "నమస్కారం" mean in English?',
  options: ['Goodbye', 'Hello / Greetings', 'Thank you', 'Sorry'],
  correct_answer: 1,
  explanation: 'నమస్కారం is a respectful Telugu greeting equivalent to Hello.',
};

// Mock Chat Session
export const MOCK_CHAT_SESSION = {
  id: 'session-001',
  user_id: 'user-123-uuid',
  title: 'Practice Session',
  created_at: '2024-01-01T10:00:00.000Z',
};

// Mock Achievement
export const MOCK_ACHIEVEMENT = {
  id: 'achievement-001',
  name: 'First Steps',
  description: 'Complete your first lesson',
  icon: 'star',
  xp_reward: 25,
  condition: { type: 'lessons_completed', count: 1 },
};

// Table names
export const SUPABASE_TABLES = [
  'profiles',
  'lessons',
  'lesson_progress',
  'flashcards',
  'flashcard_progress',
  'quiz_questions',
  'quiz_attempts',
  'chat_sessions',
  'chat_messages',
  'achievements',
  'user_achievements',
] as const;

export type SupabaseTable = typeof SUPABASE_TABLES[number];

// Default mock data per table
const TABLE_DEFAULTS: Record<SupabaseTable, object[]> = {
  profiles: [MOCK_PROFILE],
  lessons: [MOCK_LESSON],
  lesson_progress: [],
  flashcards: [MOCK_FLASHCARD],
  flashcard_progress: [],
  quiz_questions: [MOCK_QUIZ_QUESTION],
  quiz_attempts: [],
  chat_sessions: [MOCK_CHAT_SESSION],
  chat_messages: [],
  achievements: [MOCK_ACHIEVEMENT],
  user_achievements: [],
};

// Chainable query builder mock
function createChainableQuery(data: object | object[] | null) {
  const chain = {
    data,
    error: null,
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] ?? null : data, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] ?? null : data, error: null }),
    then: jest.fn().mockImplementation((resolve: (value: { data: object | object[] | null; error: null }) => void) => {
      resolve({ data, error: null });
      return Promise.resolve({ data, error: null });
    }),
  };

  // Make the chain thenable (awaitable)
  Object.defineProperty(chain, Symbol.toStringTag, { value: 'Promise' });

  return chain;
}

// Create mock Supabase client
export function createMockSupabaseClient(tableData: Partial<Record<SupabaseTable, object[]>> = {}) {
  const mergedData = { ...TABLE_DEFAULTS, ...tableData };

  const fromMock = jest.fn((table: string) => {
    const data = mergedData[table as SupabaseTable] ?? [];
    return createChainableQuery(data);
  });

  const authMock = {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: MOCK_USER, session: { access_token: 'mock-token', user: MOCK_USER } },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: MOCK_USER, session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: { access_token: 'mock-token', user: MOCK_USER } },
      error: null,
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    refreshSession: jest.fn().mockResolvedValue({
      data: { session: { access_token: 'new-mock-token', user: MOCK_USER } },
      error: null,
    }),
  };

  const storageMock = {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'mock/path' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.png' } }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };

  return {
    from: fromMock,
    auth: authMock,
    storage: storageMock,
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    channel: jest.fn().mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    }),
  };
}

// Call createMockSupabaseClient() and pass the result to jest.mock() separately.
// Cannot inline inside jest.mock() factory due to Jest's scope restriction.
export function mockSupabaseModule(tableData: Partial<Record<SupabaseTable, object[]>> = {}) {
  return createMockSupabaseClient(tableData);
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
