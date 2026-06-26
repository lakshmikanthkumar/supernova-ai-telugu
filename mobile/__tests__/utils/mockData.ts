// Mock Lessons - 5 lessons across different categories
export const MOCK_LESSONS = [
  {
    id: 'lesson-001',
    title_english: 'Basic Greetings',
    title_telugu: 'ప్రాథమిక శుభాకాంక్షలు',
    description: 'Learn common Telugu-English greetings used in daily life',
    category: 'greetings',
    difficulty: 'beginner' as const,
    duration_minutes: 15,
    xp_reward: 50,
    thumbnail: 'https://example.com/thumbnails/greetings.png',
    is_premium: false,
  },
  {
    id: 'lesson-002',
    title_english: 'Office Communication',
    title_telugu: 'కార్యాలయ సంభాషణ',
    description: 'Professional vocabulary for workplace interactions',
    category: 'office',
    difficulty: 'intermediate' as const,
    duration_minutes: 25,
    xp_reward: 75,
    thumbnail: 'https://example.com/thumbnails/office.png',
    is_premium: false,
  },
  {
    id: 'lesson-003',
    title_english: 'Daily Life Vocabulary',
    title_telugu: 'రోజువారీ జీవిత పదజాలం',
    description: 'Essential words for everyday activities and conversations',
    category: 'daily_life',
    difficulty: 'beginner' as const,
    duration_minutes: 20,
    xp_reward: 60,
    thumbnail: 'https://example.com/thumbnails/daily.png',
    is_premium: false,
  },
  {
    id: 'lesson-004',
    title_english: 'Travel English',
    title_telugu: 'ప్రయాణ ఇంగ్లీషు',
    description: 'English phrases for traveling, airports, and hotels',
    category: 'travel',
    difficulty: 'intermediate' as const,
    duration_minutes: 30,
    xp_reward: 80,
    thumbnail: 'https://example.com/thumbnails/travel.png',
    is_premium: true,
  },
  {
    id: 'lesson-005',
    title_english: 'Business English',
    title_telugu: 'వ్యాపార ఇంగ్లీషు',
    description: 'Advanced business communication and formal language',
    category: 'business',
    difficulty: 'advanced' as const,
    duration_minutes: 40,
    xp_reward: 100,
    thumbnail: 'https://example.com/thumbnails/business.png',
    is_premium: true,
  },
];

// Mock Flashcards - 10 cards with Telugu script
export const MOCK_FLASHCARDS = [
  { id: 'fc-001', lesson_id: 'lesson-001', front_telugu: 'నమస్కారం', back_english: 'Hello / Greetings', phonetic: 'Namaskaram', example_sentence: 'నమస్కారం, ఎలా ఉన్నారు?' },
  { id: 'fc-002', lesson_id: 'lesson-001', front_telugu: 'ధన్యవాదాలు', back_english: 'Thank you', phonetic: 'Dhanyavaadaalu', example_sentence: 'మీ సహాయానికి ధన్యవాదాలు.' },
  { id: 'fc-003', lesson_id: 'lesson-001', front_telugu: 'క్షమించండి', back_english: 'Sorry / Excuse me', phonetic: 'Kshaminchhandi', example_sentence: 'క్షమించండి, మీరు తెలుగు మాట్లాడతారా?' },
  { id: 'fc-004', lesson_id: 'lesson-002', front_telugu: 'సమావేశం', back_english: 'Meeting', phonetic: 'Samavesham', example_sentence: 'రేపు సమావేశం ఉంది.' },
  { id: 'fc-005', lesson_id: 'lesson-002', front_telugu: 'నివేదిక', back_english: 'Report', phonetic: 'Nivedika', example_sentence: 'నివేదిక సిద్ధంగా ఉంది.' },
  { id: 'fc-006', lesson_id: 'lesson-003', front_telugu: 'ఆహారం', back_english: 'Food', phonetic: 'Aahaaram', example_sentence: 'ఆహారం చాలా రుచిగా ఉంది.' },
  { id: 'fc-007', lesson_id: 'lesson-003', front_telugu: 'నీళ్ళు', back_english: 'Water', phonetic: 'Neellu', example_sentence: 'నాకు నీళ్ళు కావాలి.' },
  { id: 'fc-008', lesson_id: 'lesson-004', front_telugu: 'విమానాశ్రయం', back_english: 'Airport', phonetic: 'Vimaanashrayam', example_sentence: 'విమానాశ్రయం ఎక్కడ ఉంది?' },
  { id: 'fc-009', lesson_id: 'lesson-004', front_telugu: 'పాస్‌పోర్ట్', back_english: 'Passport', phonetic: 'Passport', example_sentence: 'మీ పాస్‌పోర్ట్ చూపించండి.' },
  { id: 'fc-010', lesson_id: 'lesson-005', front_telugu: 'చర్చలు', back_english: 'Negotiations', phonetic: 'Charchanalu', example_sentence: 'చర్చలు విజయవంతంగా పూర్తయ్యాయి.' },
];

// Mock Quiz Questions - 5 questions
export const MOCK_QUIZ_QUESTIONS = [
  {
    id: 'quiz-001',
    lesson_id: 'lesson-001',
    question: 'What does "నమస్కారం" mean?',
    options: ['Goodbye', 'Hello / Greetings', 'Thank you', 'Sorry'],
    correct_answer: 1,
    explanation: 'నమస్కారం is a respectful greeting in Telugu.',
  },
  {
    id: 'quiz-002',
    lesson_id: 'lesson-001',
    question: 'How do you say "Thank you" in Telugu?',
    options: ['నమస్కారం', 'క్షమించండి', 'ధన్యవాదాలు', 'సరే'],
    correct_answer: 2,
    explanation: 'ధన్యవాదాలు means Thank you in Telugu.',
  },
  {
    id: 'quiz-003',
    lesson_id: 'lesson-002',
    question: 'What is the Telugu word for "Meeting"?',
    options: ['నివేదిక', 'సమావేశం', 'కార్యాలయం', 'ఉద్యోగం'],
    correct_answer: 1,
    explanation: 'సమావేశం means Meeting in Telugu.',
  },
  {
    id: 'quiz-004',
    lesson_id: 'lesson-003',
    question: 'Which Telugu word means "Water"?',
    options: ['ఆహారం', 'పాలు', 'నీళ్ళు', 'రసం'],
    correct_answer: 2,
    explanation: 'నీళ్ళు means Water in Telugu.',
  },
  {
    id: 'quiz-005',
    lesson_id: 'lesson-004',
    question: 'What does "విమానాశ్రయం" mean?',
    options: ['Train Station', 'Bus Stop', 'Airport', 'Hotel'],
    correct_answer: 2,
    explanation: 'విమానాశ్రయం means Airport in Telugu.',
  },
];

// Mock User Progress
export const MOCK_USER_PROGRESS = {
  userId: 'user-123-uuid',
  totalXp: 325,
  currentStreak: 7,
  lessonsCompleted: 3,
  flashcardsReviewed: 45,
  quizzesTaken: 5,
  averageScore: 78.5,
  weeklyGoalProgress: {
    target: 140,
    completed: 95,
    percentage: 67.8,
  },
};

// Mock AI Response
export const MOCK_AI_RESPONSE = {
  message: 'Great job! Your sentence structure is mostly correct. Here is a suggestion to make it more natural.',
  corrections: [] as Array<{ original: string; corrected: string; explanation: string }>,
  suggestions: [
    'Try using "would like" instead of "want" for a more polite tone.',
    'Consider adding a greeting at the beginning of your message.',
  ],
  model: 'llama-3.3-70b-versatile',
  tokensUsed: 245,
};

// Factory functions
export interface LessonOverrides {
  id?: string;
  title_english?: string;
  title_telugu?: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes?: number;
  xp_reward?: number;
  thumbnail?: string;
  is_premium?: boolean;
}

export function createMockLesson(overrides: LessonOverrides = {}) {
  return {
    id: `lesson-${Date.now()}`,
    title_english: 'Test Lesson',
    title_telugu: 'పరీక్ష పాఠం',
    description: 'A test lesson for unit testing',
    category: 'greetings',
    difficulty: 'beginner' as const,
    duration_minutes: 15,
    xp_reward: 50,
    thumbnail: 'https://example.com/thumbnails/test.png',
    is_premium: false,
    ...overrides,
  };
}

export interface FlashcardOverrides {
  id?: string;
  lesson_id?: string;
  front_telugu?: string;
  back_english?: string;
  phonetic?: string;
  example_sentence?: string;
}

export function createMockFlashcard(overrides: FlashcardOverrides = {}) {
  return {
    id: `fc-${Date.now()}`,
    lesson_id: 'lesson-001',
    front_telugu: 'పరీక్ష',
    back_english: 'Test',
    phonetic: 'Pareeksha',
    example_sentence: 'పరీక్ష ఇవ్వండి.',
    ...overrides,
  };
}

export interface UserOverrides {
  id?: string;
  email?: string;
  name?: string;
  level?: string;
  xp?: number;
  streak?: number;
  is_premium?: boolean;
}

export function createMockUser(overrides: UserOverrides = {}) {
  return {
    id: `user-${Date.now()}`,
    email: 'test@englishmitra.com',
    name: 'Test User',
    level: 'beginner',
    xp: 0,
    streak: 0,
    daily_goal_minutes: 20,
    goal: 'improve_speaking',
    is_premium: false,
    avatar_url: null,
    language_preference: 'telugu',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
