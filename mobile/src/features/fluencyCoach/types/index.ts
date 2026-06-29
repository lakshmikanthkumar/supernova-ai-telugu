// ============================================================
// Fluency Coach — TypeScript Types
// ============================================================

export type StoryCategory =
  | 'beginner'
  | 'daily_conversations'
  | 'office_communication'
  | 'interviews'
  | 'public_speaking'
  | 'motivational'
  | 'news_reading'
  | 'pronunciation_practice'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export type ScrollMode = 'auto' | 'voice_controlled' | 'manual'

export type LiveFeedbackType =
  | 'pace_good'
  | 'too_fast'
  | 'too_slow'
  | 'pause_detected'
  | 'great_pronunciation'
  | 'speak_louder'
  | 'almost_done'
  | 'sentence_complete'

export interface Story {
  id: string
  title: string
  content: string
  category: StoryCategory
  difficulty: DifficultyLevel
  estimated_time: number   // seconds
  language: string
  xp_reward: number
  word_count: number
  preview: string          // first 80 chars shown on card
  created_at?: string
  sentences?: StorySentence[]
  is_premium?: boolean
  // User-specific (joined)
  user_progress?: UserStoryProgress | null
}

export interface StorySentence {
  id: string
  story_id: string
  sentence: string
  sentence_order: number
  word_count: number
  // Derived at runtime
  words?: string[]
}

export interface UserStoryProgress {
  id: string
  user_id: string
  story_id: string
  completion_percent: number
  fluency_score: number
  pronunciation_score: number
  reading_speed: number    // WPM
  total_pauses: number
  completed_at: string | null
  best_session_id: string | null
}

export interface ReadingSession {
  id: string
  user_id: string
  story_id: string
  started_at: string
  ended_at: string | null
  words_per_minute: number
  mistakes: number
  ai_feedback: AIFeedback | null
  completion_percent: number
}

export interface AIFeedback {
  fluency_score: number           // 0–100
  pronunciation_score: number     // 0–100
  confidence_score: number        // 0–100
  reading_speed_wpm: number
  reading_speed_label: 'slow' | 'good' | 'fast' | 'very_fast'
  difficult_words: DifficultWord[]
  improvement_suggestions: string[]
  strengths: string[]
  overall_summary: string
  next_level_recommendation: string
  telugu_tip: string
}

export interface DifficultWord {
  word: string
  telugu_meaning: string
  pronunciation_tip: string
  example_sentence: string
}

export interface SessionStats {
  startTime: number
  endTime: number | null
  wordsSpoken: number
  totalWords: number
  pauseCount: number
  totalPauseMs: number
  missedSentences: string[]
  correctSentences: number
  currentWPM: number
  peakWPM: number
  sentenceAccuracies: number[]    // per-sentence 0–100 score
}

export interface LiveFeedback {
  type: LiveFeedbackType
  message: string
  timestamp: number
}

export interface WordMatchResult {
  word: string
  spokenWord: string
  isCorrect: boolean
  similarity: number   // 0–1 Levenshtein-based
}

export interface SentenceMatchResult {
  sentenceIndex: number
  accuracy: number      // 0–100
  wordResults: WordMatchResult[]
  wpm: number
  pauseDetected: boolean
}

export interface CategoryMeta {
  id: StoryCategory
  label: string
  labelTelugu: string
  icon: string
  color: string
  description: string
}

export interface FluencyCoachState {
  // Library
  stories: Story[]
  filteredStories: Story[]
  selectedCategory: StoryCategory | 'all'
  selectedDifficulty: DifficultyLevel | 'all'
  storiesLoading: boolean
  storiesError: string | null

  // Active session
  currentStory: Story | null
  currentSentenceIndex: number
  isListening: boolean
  isPaused: boolean
  isSessionActive: boolean
  scrollMode: ScrollMode
  scrollSpeedMultiplier: number    // 0.5x – 2x
  completionPercent: number

  // Tracking
  spokenWords: string[]
  currentPartialTranscript: string
  sessionStats: SessionStats | null
  liveFeedback: LiveFeedback | null
  sentenceScores: Record<number, number>   // sentenceIndex → accuracy

  // Results
  sessionId: string | null
  aiFeedback: AIFeedback | null
  xpEarned: number
  feedbackLoading: boolean

  // UI
  wordMeaningPopup: { word: string; meaning: string; example: string } | null
  error: string | null
}
