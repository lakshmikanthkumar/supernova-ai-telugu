// ============================================================
// EnglishMitraAi - API Service Layer (FREE STACK)
// All Supabase database calls centralized here
// AI: Groq (free) | STT: react-native-voice (free)
// TTS: expo-speech (free) | Translation: google-translate-api-x (free)
// ============================================================

import { supabase } from './supabase'
import type {
  Profile, Lesson, LessonCategory, Flashcard, QuizQuestion,
  RoleplayScenario, ChatMessage, Achievement, LeaderboardEntry,
  DailyChallenge,
} from '../types'

// ============================================================
// AUTH
// ============================================================

export const authService = {
  async sendOTP(phone: string) {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { channel: 'sms' },
    })
    if (error) throw error
  },

  async verifyOTP(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone, token, type: 'sms',
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },
}

// ============================================================
// PROFILE
// ============================================================

export const profileService = {
  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  },

  async updateProfile(userId: string, updates: Partial<Profile>) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
    if (error) throw error
  },

  async uploadAvatar(userId: string, fileUri: string): Promise<string> {
    const response = await fetch(fileUri)
    const blob = await response.blob()
    const fileName = `${userId}/avatar.jpg`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    return data.publicUrl
  },
}

// ============================================================
// LESSONS
// ============================================================

export const lessonService = {
  async getCategories(): Promise<LessonCategory[]> {
    const { data, error } = await supabase
      .from('lesson_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    return data || []
  },

  async getLessonsByCategory(categoryId: string): Promise<Lesson[]> {
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        user_lesson_progress!left(status, score, attempts, time_spent_seconds, completed_at)
      `)
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order')
    if (error) throw error
    return (data || []).map(lesson => ({
      ...lesson,
      user_progress: lesson.user_lesson_progress?.[0] || null,
    }))
  },

  async getLessonById(lessonId: string): Promise<Lesson> {
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        *,
        lesson_categories(name, name_telugu, color_hex, icon_name),
        user_lesson_progress!left(status, score, attempts, time_spent_seconds, completed_at)
      `)
      .eq('id', lessonId)
      .single()
    if (error) throw error
    return {
      ...data,
      category: data.lesson_categories,
      user_progress: data.user_lesson_progress?.[0] || null,
    }
  },

  async searchLessons(query: string): Promise<Lesson[]> {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .or(`title.ilike.%${query}%,title_telugu.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(20)
    if (error) throw error
    return data || []
  },

  async markLessonStarted(lessonId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_lesson_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      status: 'in_progress',
      last_accessed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' })
  },
}

// ============================================================
// FLASHCARDS
// ============================================================

export const flashcardService = {
  async getFlashcards(lessonId?: string, categoryId?: string): Promise<Flashcard[]> {
    let query = supabase
      .from('flashcards')
      .select(`
        *,
        user_flashcard_progress!left(review_count, correct_count, last_reviewed_at, next_review_at, ease_factor, interval_days)
      `)
      .eq('is_active', true)

    if (lessonId) query = query.eq('lesson_id', lessonId)
    if (categoryId) query = query.eq('category_id', categoryId)

    const { data, error } = await query.limit(50)
    if (error) throw error

    return (data || []).map(fc => ({
      ...fc,
      user_progress: fc.user_flashcard_progress?.[0] || null,
    }))
  },

  async updateFlashcardProgress(flashcardId: string, correct: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: existing } = await supabase
      .from('user_flashcard_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('flashcard_id', flashcardId)
      .single()

    // SM-2 spaced repetition algorithm
    const easeFactor = existing?.ease_factor || 2.5
    const intervalDays = existing?.interval_days || 1
    const reviewCount = (existing?.review_count || 0) + 1
    const correctCount = (existing?.correct_count || 0) + (correct ? 1 : 0)

    let newEaseFactor = easeFactor
    let newInterval = intervalDays

    if (correct) {
      if (reviewCount === 1) newInterval = 1
      else if (reviewCount === 2) newInterval = 6
      else newInterval = Math.round(intervalDays * easeFactor)
      newEaseFactor = Math.max(1.3, easeFactor + 0.1)
    } else {
      newInterval = 1
      newEaseFactor = Math.max(1.3, easeFactor - 0.2)
    }

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + newInterval)

    await supabase.from('user_flashcard_progress').upsert({
      user_id: user.id,
      flashcard_id: flashcardId,
      review_count: reviewCount,
      correct_count: correctCount,
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReview.toISOString(),
      ease_factor: newEaseFactor,
      interval_days: newInterval,
    }, { onConflict: 'user_id,flashcard_id' })
  },
}

// ============================================================
// QUIZ
// ============================================================

export const quizService = {
  async getQuizQuestions(lessonId: string): Promise<QuizQuestion[]> {
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('sort_order')
    if (error) throw error
    return (data || []).map(q => ({
      ...q,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }))
  },

  async submitQuiz(
    lessonId: string,
    answers: { questionId: string; answer: string }[],
    timeTaken: number
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const questions = await quizService.getQuizQuestions(lessonId)
    let score = 0
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0)

    const detailedAnswers = answers.map(a => {
      const question = questions.find(q => q.id === a.questionId)
      const correct = question?.correct_answer === a.answer
      if (correct && question) score += question.points
      return { questionId: a.questionId, answer: a.answer, correct }
    })

    const passed = score >= maxScore * 0.6
    const xpEarned = passed ? Math.round(score / maxScore * 30) : 5

    const { data, error } = await supabase
      .from('user_quiz_attempts')
      .insert({
        user_id: user.id, lesson_id: lessonId,
        answers: detailedAnswers, score, max_score: maxScore,
        passed, time_taken_seconds: timeTaken, xp_earned: xpEarned,
      })
      .select()
      .single()
    if (error) throw error

    return { attempt: data, score, maxScore, passed, xpEarned }
  },
}

// ============================================================
// CHAT — Uses Groq via Edge Function (FREE)
// ============================================================

export const chatService = {
  async createSession(
    sessionType: string,
    scenarioId?: string,
    title?: string
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        session_type: sessionType,
        scenario_id: scenarioId || null,
        title: title || null,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at')
    if (error) throw error
    return data || []
  },

  async sendMessage(
    sessionId: string,
    message: string,
    sessionType: string,
    scenarioId?: string,
    options?: { includeCorrection?: boolean; includeTranslation?: boolean }
  ) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/tutor-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          message,
          session_type: sessionType,
          scenario_id: scenarioId,
          include_correction: options?.includeCorrection ?? true,
          include_translation: options?.includeTranslation ?? false,
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to get AI response')
    }

    return response.json()
  },

  async endSession(sessionId: string) {
    await supabase
      .from('chat_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
  },
}

// ============================================================
// PRONUNCIATION — Uses client-side Levenshtein + optional Groq enhancement
// ============================================================

export const pronunciationService = {
  async getPhrases() {
    const { data, error } = await supabase
      .from('pronunciation_phrases')
      .select('*')
      .order('difficulty')
      .limit(30)
    if (error) throw error
    return data || []
  },

  async submitPronunciationResult(
    transcript: string,
    targetPhrase: string,
    localScores: Record<string, unknown>
  ) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    // Send to edge function for AI-enhanced feedback (optional, non-blocking)
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/speech-to-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ transcript, target_phrase: targetPhrase, local_scores: localScores }),
        }
      )
      if (response.ok) return response.json()
    } catch { /* Return local scores on network failure */ }

    // Fallback: return local scores with basic feedback
    return localScores
  },
}

// ============================================================
// GAMIFICATION
// ============================================================

export const gamificationService = {
  async getAchievements(userId: string): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('achievements')
      .select(`*, user_achievements!left(earned_at)`)
      .eq('is_active', true)
    if (error) throw error
    return (data || []).map(a => ({
      ...a,
      earned_at: a.user_achievements?.[0]?.earned_at || null,
    }))
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const week = getWeekStart()
    const { data, error } = await supabase
      .from('leaderboard_weekly')
      .select(`user_id, xp_earned, week_start, profiles!inner(full_name, avatar_url)`)
      .eq('week_start', week)
      .order('xp_earned', { ascending: false })
      .limit(50)
    if (error) throw error

    return (data || []).map((entry, i) => ({
      rank: i + 1,
      user_id: entry.user_id,
      full_name: (entry.profiles as Profile).full_name,
      avatar_url: (entry.profiles as Profile).avatar_url,
      xp_earned: entry.xp_earned,
      week_start: entry.week_start,
    }))
  },

  async getDailyChallenge(): Promise<DailyChallenge | null> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('daily_challenges')
      .select(`*, user_daily_challenges!left(completed, score)`)
      .eq('valid_date', today)
      .eq('is_active', true)
      .single()
    if (error) return null
    return {
      ...data,
      completed: data.user_daily_challenges?.[0]?.completed || false,
    }
  },

  async updateProgress(action: string, lessonId?: string, xpAmount?: number) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, lesson_id: lessonId, xp_amount: xpAmount }),
      }
    )
    if (!response.ok) throw new Error('Failed to update progress')
    return response.json()
  },
}

// ============================================================
// ROLEPLAY
// ============================================================

export const roleplayService = {
  async getScenarios(): Promise<RoleplayScenario[]> {
    const { data, error } = await supabase
      .from('roleplay_scenarios')
      .select('*')
      .eq('is_active', true)
      .order('difficulty_level')
    if (error) throw error
    return data || []
  },

  async getScenarioById(id: string): Promise<RoleplayScenario> {
    const { data, error } = await supabase
      .from('roleplay_scenarios')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },
}

// ============================================================
// ADMIN
// ============================================================

export const adminService = {
  async getAllUsers(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return data || []
  },

  async getStats() {
    const [users, lessons, sessions] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('lessons').select('*', { count: 'exact', head: true }),
      supabase.from('chat_sessions').select('*', { count: 'exact', head: true }),
    ])
    return {
      totalUsers: users.count || 0,
      totalLessons: lessons.count || 0,
      totalChatSessions: sessions.count || 0,
    }
  },

  async createLesson(lesson: Partial<Lesson>) {
    const { data, error } = await supabase
      .from('lessons').insert(lesson).select().single()
    if (error) throw error
    return data
  },

  async updateLesson(lessonId: string, updates: Partial<Lesson>) {
    const { error } = await supabase
      .from('lessons').update(updates).eq('id', lessonId)
    if (error) throw error
  },

  async deleteLesson(lessonId: string) {
    const { error } = await supabase
      .from('lessons').update({ is_active: false }).eq('id', lessonId)
    if (error) throw error
  },
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  return monday.toISOString().split('T')[0]
}
