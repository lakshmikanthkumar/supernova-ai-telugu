// ============================================================
// EnglishMitraAi - Global TypeScript Types
// ============================================================

export interface Profile {
  id: string
  phone_number: string | null
  full_name: string
  avatar_url: string | null
  native_language: string
  current_level: number
  xp_total: number
  xp_today: number
  streak_current: number
  streak_longest: number
  last_active_date: string | null
  is_admin: boolean
  is_premium: boolean
  daily_goal_minutes: number
  notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface LessonCategory {
  id: string
  name: string
  name_telugu: string
  description: string
  description_telugu: string
  icon_name: string
  color_hex: string
  sort_order: number
  is_active: boolean
  lesson_count?: number
}

export interface Lesson {
  id: string
  category_id: string
  title: string
  title_telugu: string
  description: string
  description_telugu: string
  content: LessonContent
  difficulty_level: number
  xp_reward: number
  estimated_minutes: number
  sort_order: number
  is_premium: boolean
  is_active: boolean
  thumbnail_url: string | null
  audio_url: string | null
  created_at: string
  // Joined fields
  user_progress?: UserLessonProgress
  category?: LessonCategory
}

export interface LessonContent {
  vocabulary: VocabularyItem[]
  dialogues: Dialogue[]
  tips: Tip[]
}

export interface VocabularyItem {
  word: string
  telugu: string
  phonetic: string
  example: string
  audio_url?: string
}

export interface Dialogue {
  title: string
  lines: DialogueLine[]
}

export interface DialogueLine {
  speaker: string
  text: string
  telugu: string
}

export interface Tip {
  tip: string
  tip_telugu: string
}

export interface Flashcard {
  id: string
  lesson_id: string | null
  category_id: string | null
  english_word: string
  telugu_meaning: string
  pronunciation_guide: string | null
  example_sentence: string | null
  example_sentence_telugu: string | null
  audio_url: string | null
  image_url: string | null
  difficulty: number
  user_progress?: FlashcardProgress
}

export interface FlashcardProgress {
  review_count: number
  correct_count: number
  last_reviewed_at: string | null
  next_review_at: string | null
  ease_factor: number
  interval_days: number
}

export interface QuizQuestion {
  id: string
  lesson_id: string
  question_text: string
  question_text_telugu: string | null
  question_type: 'multiple_choice' | 'fill_blank' | 'pronunciation' | 'matching' | 'sentence_order'
  options: string[] | null
  correct_answer: string
  explanation: string | null
  explanation_telugu: string | null
  points: number
}

export interface UserLessonProgress {
  status: 'not_started' | 'in_progress' | 'completed'
  score: number
  attempts: number
  time_spent_seconds: number
  completed_at: string | null
}

export interface ChatSession {
  id: string
  user_id: string
  session_type: 'free_chat' | 'roleplay' | 'interview' | 'pronunciation'
  scenario_id: string | null
  title: string | null
  xp_earned: number
  messages_count: number
  started_at: string
  ended_at: string | null
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  audio_url: string | null
  grammar_corrections: GrammarCorrection[]
  pronunciation_score: number | null
  translations: Record<string, string>
  created_at: string
}

export interface GrammarCorrection {
  original: string
  corrected: string
  explanation: string
  explanation_telugu: string
}

export interface RoleplayScenario {
  id: string
  title: string
  title_telugu: string
  description: string
  description_telugu: string
  scenario_type: string
  ai_persona: string
  ai_persona_description: string
  system_prompt: string
  starter_message: string
  difficulty_level: number
  xp_reward: number
  is_premium: boolean
}

export interface Achievement {
  id: string
  name: string
  name_telugu: string
  description: string
  description_telugu: string
  icon_name: string
  badge_color: string
  requirement_type: string
  requirement_value: number
  xp_reward: number
  earned_at?: string
}

export interface PronunciationResult {
  transcript: string
  grading: {
    overall_score: number
    accuracy_score: number
    fluency_score: number
    feedback: string
    feedback_telugu: string
    words_analysis: WordAnalysis[]
    encouragement: string
  }
}

export interface WordAnalysis {
  word: string
  status: 'correct' | 'mispronounced' | 'missing' | 'extra'
  tip: string
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  full_name: string
  avatar_url: string | null
  xp_earned: number
  week_start: string
}

export interface DailyChallenge {
  id: string
  title: string
  title_telugu: string
  description: string
  challenge_type: string
  content: Record<string, unknown>
  xp_reward: number
  valid_date: string
  completed?: boolean
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined
  Onboarding: undefined
  Login: undefined
  Signup: undefined
  Main: undefined
  Lesson: { lessonId: string }
  Quiz: { lessonId: string }
  Flashcards: { categoryId?: string; lessonId?: string }
  PronunciationLab: { phraseId?: string }
  NovaChat: { sessionId?: string }
  Roleplay: { scenarioId: string }
  Progress: undefined
  Profile: undefined
  Settings: undefined
  AdminDashboard: undefined
  AddLesson: { lessonId?: string }
}
