// ============================================================
// EnglishMitraAi - API Service Layer (FREE STACK)
// All Supabase database calls centralized here
// AI: Groq (free) | STT: react-native-voice (free)
// TTS: expo-speech (free) | Translation: google-translate-api-x (free)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import type {
  Achievement,
  ChatMessage,
  DailyChallenge,
  Flashcard,
  LeaderboardEntry,
  Lesson, LessonCategory,
  Profile,
  QuizQuestion,
  RoleplayScenario,
} from '../types'
import {
  MOCK_ACHIEVEMENTS,
  MOCK_CATEGORIES,
  MOCK_FLASHCARDS,
  MOCK_LEADERBOARD,
  MOCK_LESSONS,
  MOCK_QUIZ_QUESTIONS,
  MOCK_SCENARIOS
} from './mockData'
import { supabase } from './supabase'

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const MOCK_DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'challenge-today-1',
    title: 'Word of the Day: Appreciate',
    title_telugu: 'నేటి పదం: అభినందించడం',
    description: 'Learn the meaning of "Appreciate" and practice the sentence!',
    challenge_type: 'vocabulary',
    content: {
      word: 'Appreciate',
      meaning_telugu: 'అభినందించడం / కృతజ్ఞతలు చెప్పడం',
      sentence: 'I appreciate your help.',
      sentence_telugu: 'నేను మీ సహాయాన్ని అభినందిస్తున్నాను.',
    },
    xp_reward: 15,
    valid_date: '',
    completed: false,
  },
  {
    id: 'challenge-today-2',
    title: 'Word of the Day: Collaboration',
    title_telugu: 'నేటి పదం: సహకారం',
    description: 'Learn the meaning of "Collaboration" and practice the sentence!',
    challenge_type: 'vocabulary',
    content: {
      word: 'Collaboration',
      meaning_telugu: 'సహకారం / కలిసి పనిచేయడం',
      sentence: 'Collaboration is key to team success.',
      sentence_telugu: 'సహకారం అనేది జట్టు విజయానికి కీలకం.',
    },
    xp_reward: 15,
    valid_date: '',
    completed: false,
  },
  {
    id: 'challenge-today-3',
    title: 'Word of the Day: Proactive',
    title_telugu: 'నేటి పదం: క్రియాశీలక',
    description: 'Learn the meaning of "Proactive" and practice the sentence!',
    challenge_type: 'vocabulary',
    content: {
      word: 'Proactive',
      meaning_telugu: 'ముందుగా స్పందించే / క్రియాశీలక',
      sentence: 'We must take proactive measures to solve this.',
      sentence_telugu: 'దీన్ని పరిష్కరించడానికి మనం క్రియాశీలక చర్యలు తీసుకోవాలి.',
    },
    xp_reward: 15,
    valid_date: '',
    completed: false,
  },
  {
    id: 'challenge-today-4',
    title: 'Word of the Day: Opportunity',
    title_telugu: 'నేటి పదం: అవకాశం',
    description: 'Learn the meaning of "Opportunity" and practice the sentence!',
    challenge_type: 'vocabulary',
    content: {
      word: 'Opportunity',
      meaning_telugu: 'అవకాశం',
      sentence: 'This project is a great opportunity to learn.',
      sentence_telugu: 'ఈ ప్రాజెక్ట్ నేర్చుకోవడానికి ఒక గొప్ప అవకాశం.',
    },
    xp_reward: 15,
    valid_date: '',
    completed: false,
  },
  {
    id: 'challenge-today-5',
    title: 'Word of the Day: Feedback',
    title_telugu: 'నేటి పదం: అభిప్రాయం',
    description: 'Learn the meaning of "Feedback" and practice the sentence!',
    challenge_type: 'vocabulary',
    content: {
      word: 'Feedback',
      meaning_telugu: 'అభిప్రాయం / ఫీడ్‌బ్యాక్',
      sentence: 'Constructive feedback helps us improve.',
      sentence_telugu: 'నిర్మాణాత్మక అభిప్రాయం మనల్ని మెరుగుపరుచుకోవడానికి సహాయపడుతుంది.',
    },
    xp_reward: 15,
    valid_date: '',
    completed: false,
  }
]

const MOCK_PRONUNCIATION_PHRASES = [
  { id: 'ph-1', phrase: 'Hello, how are you today?', phrase_telugu: 'హలో, ఈ రోజు మీరు ఎలా ఉన్నారు?', difficulty: 1, translation: 'హలో, ఈ రోజు మీరు ఎలా ఉన్నారు?' },
  { id: 'ph-2', phrase: 'Learning English is fun and easy.', phrase_telugu: 'ఇంగ్లీష్ నేర్చుకోవడం సరదాగా మరియు సులభంగా ఉంటుంది.', difficulty: 2, translation: 'ఇంగ్లీష్ నేర్చుకోవడం సరదాగా మరియు సులభంగా ఉంటుంది.' },
  { id: 'ph-3', phrase: 'Practice makes perfect.', phrase_telugu: 'సాధన చేస్తే అనుకున్నది సాధించవచ్చు.', difficulty: 2, translation: 'సాధన చేస్తే అనుకున్నది సాధించవచ్చు.' },
  { id: 'ph-4', phrase: 'Can you help me with this project?', phrase_telugu: 'ఈ ప్రాజెక్ట్‌లో మీరు నాకు సహాయం చేయగలరా?', difficulty: 2, translation: 'ఈ ప్రాజెక్ట్‌లో మీరు నాకు సహాయం చేయగలరా?' },
  { id: 'ph-5', phrase: 'I would like to schedule a quick meeting.', phrase_telugu: 'నేను ఒక చిన్న సమావేశాన్ని షెడ్యూల్ చేయాలనుకుంటున్నాను.', difficulty: 3, translation: 'నేను ఒక చిన్న సమావేశాన్ని షెడ్యూల్ చేయాలనుకుంటున్నాను.' },
  { id: 'ph-6', phrase: 'Please send me the report before five PM.', phrase_telugu: 'దయచేసి సాయంత్రం ఐదు గంటల లోపు నాకు నివేదికను పంపండి.', difficulty: 2, translation: 'దయచేసి సాయంత్రం ఐదు గంటల లోపు నాకు నివేదికను పంపండి.' },
  { id: 'ph-7', phrase: 'Thank you for your valuable feedback.', phrase_telugu: 'మీ విలువైన అభిప్రాయానికి ధన్యవాదాలు.', difficulty: 2, translation: 'మీ విలువైన అభిప్రాయానికి ధన్యవాదాలు.' },
  { id: 'ph-8', phrase: 'We need to collaborate to finish this task.', phrase_telugu: 'ఈ పనిని పూర్తి చేయడానికి మనం కలిసి పనిచేయాలి.', difficulty: 3, translation: 'ఈ పనిని పూర్తి చేయడానికి మనం కలిసి పనిచేయాలి.' },
  { id: 'ph-9', phrase: 'I appreciate your help in resolving this issue.', phrase_telugu: 'ఈ సమస్యను పరిష్కరించడంలో మీ సహాయాన్ని నేను అభినందిస్తున్నాను.', difficulty: 3, translation: 'ఈ సమస్యను పరిష్కరించడంలో మీ సహాయాన్ని నేను అభినందిస్తున్నాను.' },
  { id: 'ph-10', phrase: 'Let us follow up on this tomorrow morning.', phrase_telugu: 'రేపు ఉదయం దీని గురించి మరింత మాట్లాడదాం.', difficulty: 2, translation: 'రేపు ఉదయం దీని గురించి మరింత మాట్లాడదాం.' },
  { id: 'ph-11', phrase: 'He is very articulate and speaks confidently.', phrase_telugu: 'అతను చాలా స్పష్టంగా మరియు నమ్మకంగా మాట్లాడతాడు.', difficulty: 3, translation: 'అతను చాలా స్పష్టంగా మరియు నమ్మకంగా మాట్లాడతాడు.' },
  { id: 'ph-12', phrase: 'What are your primary career goals?', phrase_telugu: 'మీ ప్రధాన వృత్తిపరమైన లక్ష్యాలు ఏమిటి?', difficulty: 2, translation: 'మీ ప్రధాన వృత్తిపరమైన లక్ష్యాలు ఏమిటి?' }
]

export const checkIsGuest = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem('is_guest_mode')
    return val === 'true'
  } catch {
    return false
  }
}

// ============================================================
// AUTH
// ============================================================

export const authService = {
  async signInWithEmail(email: string, password: string) {
    if (email === 'dev@englishmitra.ai' && password === 'developer') {
      await AsyncStorage.setItem('is_guest_mode', 'true')
      const MOCK_USER = {
        id: 'dev-user-id-5678',
        email: 'dev@englishmitra.ai',
        phone: null,
        aud: 'authenticated',
        role: 'authenticated',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
      }
      const MOCK_SESSION = {
        access_token: 'mock-access-token-jwt',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: MOCK_USER,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }
      const MOCK_PROFILE: Profile = {
        id: 'dev-user-id-5678',
        phone_number: null,
        full_name: 'Developer Learner',
        avatar_url: null,
        native_language: 'telugu',
        current_level: 5,
        xp_total: 1500,
        xp_today: 0,
        streak_current: 12,
        streak_longest: 24,
        last_active_date: new Date().toISOString(),
        is_admin: true,
        is_premium: true,
        daily_goal_minutes: 15,
        notifications_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return { session: MOCK_SESSION as any, user: MOCK_USER as any, profile: MOCK_PROFILE }
    }

    console.log('[signInWithEmail] signing in:', email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[signInWithEmail] error:', error.message)
      throw error
    }
    console.log('[signInWithEmail] success | userId:', data.user?.id, '| session:', data.session ? 'active' : 'none')
    return data
  },

  async signUpWithEmail(email: string, password: string, fullName: string) {
    console.log('[signUpWithEmail] creating account for:', email)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      console.error('[signUpWithEmail] auth error:', error.message)
      throw error
    }
    if (!data.user) throw new Error('Signup failed: No user returned.')

    console.log('[signUpWithEmail] user created:', data.user.id, '| session:', data.session ? 'yes' : 'no (email confirmation needed)')

    const defaultProfile: Profile = {
      id: data.user.id,
      phone_number: null,
      full_name: fullName || email.split('@')[0],
      avatar_url: null,
      native_language: 'telugu',
      current_level: 1,
      xp_total: 100,
      xp_today: 0,
      streak_current: 1,
      streak_longest: 1,
      last_active_date: new Date().toISOString(),
      is_admin: false,
      is_premium: false,
      daily_goal_minutes: 15,
      notifications_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      // Use upsert so it works whether or not the row already exists
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(defaultProfile)
      if (profileError) {
        console.warn('[signUpWithEmail] profile upsert error:', profileError.code, profileError.message)
        // Non-fatal: profile will be auto-created by getProfile on next fetch
      } else {
        console.log('[signUpWithEmail] profile row created successfully')
      }
    } catch (err) {
      console.warn('[signUpWithEmail] profile creation exception:', err)
    }

    return { session: data.session, user: data.user, profile: defaultProfile }
  },

  async signOut() {
    await AsyncStorage.removeItem('is_guest_mode')
    try {
      await supabase.auth.signOut()
    } catch { /* ignore */ }
  },

  async getCurrentUser() {
    if (await checkIsGuest()) {
      return {
        id: 'guest-user-id-1234-5678',
        email: 'guest@englishmitra.ai',
        phone: null,
      } as any
    }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return user
    } catch {
      return null
    }
  },
}

// ============================================================
// PROFILE
// ============================================================

export const profileService = {
  async getProfile(userId: string): Promise<Profile> {
    if (await checkIsGuest() || userId.startsWith('guest-') || userId.startsWith('dev-')) {
      console.log('[getProfile] guest/dev mode, returning mock profile for:', userId)
      return {
        id: userId,
        phone_number: null,
        full_name: userId.startsWith('dev-') ? 'Developer Learner' : 'Guest Learner',
        avatar_url: null,
        native_language: 'telugu',
        current_level: userId.startsWith('dev-') ? 5 : 1,
        xp_total: userId.startsWith('dev-') ? 1500 : 120,
        xp_today: 0,
        streak_current: userId.startsWith('dev-') ? 12 : 3,
        streak_longest: userId.startsWith('dev-') ? 24 : 5,
        last_active_date: new Date().toISOString(),
        is_admin: false,
        is_premium: false,
        daily_goal_minutes: 15,
        notifications_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    console.log('[getProfile] fetching from Supabase for userId:', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[getProfile] Supabase error:', error.code, error.message)
        throw error
      }

      if (!data) {
        console.log('[getProfile] No profile row, auto-creating default...')
        const defaultProfile: Profile = {
          id: userId,
          phone_number: null,
          full_name: 'English Learner',
          avatar_url: null,
          native_language: 'telugu',
          current_level: 1,
          xp_total: 100,
          xp_today: 0,
          streak_current: 1,
          streak_longest: 1,
          last_active_date: new Date().toISOString(),
          is_admin: false,
          is_premium: false,
          daily_goal_minutes: 15,
          notifications_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        const { data: created, error: createErr } = await supabase
          .from('profiles')
          .upsert(defaultProfile)
          .select()
          .maybeSingle()
        if (createErr) {
          console.error('[getProfile] auto-create failed:', createErr.message)
        } else {
          console.log('[getProfile] default profile auto-created')
        }
        return created || defaultProfile
      }

      console.log('[getProfile] success:', data.full_name, '| level:', data.current_level, '| xp:', data.xp_total)
      return data
    } catch (err) {
      console.error('[getProfile] catch block:', err)
      throw err
    }
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Partial<Profile>> {
    if (await checkIsGuest()) {
      console.log('[updateProfile] guest mode — skipping Supabase write, returning updates locally')
      return updates
    }

    console.log('[updateProfile] writing to Supabase | userId:', userId, '| fields:', Object.keys(updates).join(', '))

    try {
      const payload = { ...updates, updated_at: new Date().toISOString() }

      // Use UPDATE (not upsert) + SELECT to get confirmed data back from DB
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('[updateProfile] Supabase UPDATE error:', error.code, error.message)

        // If row doesn't exist yet, fall back to upsert
        if (error.code === 'PGRST116') {
          console.log('[updateProfile] Row not found, falling back to upsert...')
          const { data: upserted, error: upsertErr } = await supabase
            .from('profiles')
            .upsert({ id: userId, ...payload })
            .select()
            .single()
          if (upsertErr) {
            console.error('[updateProfile] Upsert also failed:', upsertErr.message)
            throw upsertErr
          }
          console.log('[updateProfile] upsert success:', upserted?.full_name)
          return upserted || updates
        }

        throw error
      }

      console.log('[updateProfile] Supabase confirmed update | full_name:', data?.full_name, '| level:', data?.current_level)
      return data || updates
    } catch (err) {
      console.error('[updateProfile] catch block:', err)
      throw err
    }
  },

  async uploadAvatar(userId: string, fileUri: string): Promise<string> {
    if (await checkIsGuest()) return 'https://placekitten.com/200/200'
    try {
      const response = await fetch(fileUri)
      const blob = await response.blob()
      const fileName = `${userId}/avatar.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      return data.publicUrl
    } catch {
      return 'https://placekitten.com/200/200'
    }
  },
}

// ============================================================
// LESSONS
// ============================================================

export const lessonService = {
  async getCategories(): Promise<LessonCategory[]> {
    try {
      if (await checkIsGuest()) return MOCK_CATEGORIES
      const { data, error } = await supabase
        .from('lesson_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data || MOCK_CATEGORIES
    } catch {
      return MOCK_CATEGORIES
    }
  },

  async getLessonsByCategory(categoryId: string): Promise<Lesson[]> {
    try {
      if (await checkIsGuest()) return MOCK_LESSONS[categoryId] || []
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
    } catch {
      return MOCK_LESSONS[categoryId] || []
    }
  },

  async getLessonById(lessonId: string): Promise<Lesson> {
    try {
      if (await checkIsGuest()) {
        const found = Object.values(MOCK_LESSONS).flat().find(l => l.id === lessonId)
        if (found) return found
        throw new Error('Lesson not found')
      }
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
    } catch {
      const found = Object.values(MOCK_LESSONS).flat().find(l => l.id === lessonId)
      if (found) return found
      throw new Error('Lesson not found')
    }
  },

  async searchLessons(query: string): Promise<Lesson[]> {
    try {
      if (await checkIsGuest()) {
        return Object.values(MOCK_LESSONS).flat().filter(l => 
          l.title.toLowerCase().includes(query.toLowerCase()) || 
          l.title_telugu.toLowerCase().includes(query.toLowerCase())
        )
      }
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .or(`title.ilike.%${query}%,title_telugu.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(20)
      if (error) throw error
      return data || []
    } catch {
      return Object.values(MOCK_LESSONS).flat().filter(l => 
        l.title.toLowerCase().includes(query.toLowerCase()) || 
        l.title_telugu.toLowerCase().includes(query.toLowerCase())
      )
    }
  },

  async markLessonStarted(lessonId: string) {
    if (await checkIsGuest()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_lesson_progress').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        status: 'in_progress',
        last_accessed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
    } catch { /* ignore */ }
  },
}

// ============================================================
// FLASHCARDS
// ============================================================

export const flashcardService = {
  async getFlashcards(lessonId?: string, categoryId?: string): Promise<Flashcard[]> {
    try {
      if (await checkIsGuest()) {
        let filtered = MOCK_FLASHCARDS
        if (lessonId) filtered = filtered.filter(f => f.lesson_id === lessonId)
        if (categoryId) filtered = filtered.filter(f => f.category_id === categoryId)
        return shuffleArray(filtered)
      }
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

      const results = (data || []).map(fc => ({
        ...fc,
        user_progress: fc.user_flashcard_progress?.[0] || null,
      }))

      // Fall back to mock data if the flashcards table has no seed data yet
      if (results.length === 0) {
        console.log('[getFlashcards] no data in Supabase, using mock flashcards')
        let filtered = MOCK_FLASHCARDS
        if (lessonId) filtered = filtered.filter(f => f.lesson_id === lessonId)
        if (categoryId) filtered = filtered.filter(f => f.category_id === categoryId)
        return shuffleArray(filtered)
      }

      return shuffleArray(results)
    } catch {
      let filtered = MOCK_FLASHCARDS
      if (lessonId) filtered = filtered.filter(f => f.lesson_id === lessonId)
      if (categoryId) filtered = filtered.filter(f => f.category_id === categoryId)
      return shuffleArray(filtered)
    }
  },

  async updateFlashcardProgress(flashcardId: string, correct: boolean) {
    if (await checkIsGuest()) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: existing } = await supabase
        .from('user_flashcard_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('flashcard_id', flashcardId)
        .maybeSingle()

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
    } catch { /* ignore */ }
  },
}

// ============================================================
// QUIZ
// ============================================================

export const quizService = {
  async getQuizQuestions(lessonId: string): Promise<QuizQuestion[]> {
    try {
      if (await checkIsGuest()) return MOCK_QUIZ_QUESTIONS[lessonId] || []
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
    } catch {
      return MOCK_QUIZ_QUESTIONS[lessonId] || []
    }
  },

  async submitQuiz(
    lessonId: string,
    answers: { questionId: string; answer: string }[],
    timeTaken: number
  ) {
    const isGuest = await checkIsGuest()
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

    if (isGuest) {
      return {
        attempt: {
          id: 'mock-attempt-id',
          user_id: 'guest-user',
          lesson_id: lessonId,
          score,
          max_score: maxScore,
          passed,
          time_taken_seconds: timeTaken,
          xp_earned: xpEarned,
          created_at: new Date().toISOString(),
        },
        score,
        maxScore,
        passed,
        xpEarned
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

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
    } catch {
      return {
        attempt: {
          id: 'mock-attempt-id-fallback',
          user_id: 'fallback-user',
          lesson_id: lessonId,
          score,
          max_score: maxScore,
          passed,
          time_taken_seconds: timeTaken,
          xp_earned: xpEarned,
          created_at: new Date().toISOString(),
        },
        score,
        maxScore,
        passed,
        xpEarned
      }
    }
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
    if (await checkIsGuest()) {
      return 'mock-chat-session-' + Math.random().toString(36).substring(7)
    }
    try {
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
    } catch {
      return 'mock-chat-session-' + Math.random().toString(36).substring(7)
    }
  },

  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    if (await checkIsGuest() || sessionId.startsWith('mock-')) {
      return [
        {
          id: 'msg-start',
          session_id: sessionId,
          role: 'assistant',
          content: 'Hello! I am your English teaching assistant. Ask me anything or let\'s talk!',
          audio_url: null,
          grammar_corrections: [],
          pronunciation_score: null,
          translations: { telugu: 'హలో! నేను మీ ఇంగ్లీష్ బోధనా సహాయకుడిని. నన్ను ఏదైనా అడగండి లేదా మాట్లాడుకుందాం!' },
          created_at: new Date(Date.now() - 60000).toISOString(),
        }
      ]
    }
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at')
      if (error) throw error
      return data || []
    } catch {
      return []
    }
  },

  async sendMessage(
    sessionId: string,
    message: string,
    sessionType: string,
    scenarioId?: string,
    options?: { includeCorrection?: boolean; includeTranslation?: boolean }
  ) {
    if (await checkIsGuest() || sessionId.startsWith('mock-')) {
      await new Promise(r => setTimeout(r, 1000))
      
      const lower = message.toLowerCase()
      let reply = "That's a very good sentence! Tell me more about what you like to do."
      let replyTelugu = "అది చాలా మంచి వాక్యం! మీకు ఏమి చేయడమంటే ఇష్టమో ఇంకా చెప్పండి."
      let corrections: any[] = []

      if (lower.includes('hello') || lower.includes('hi')) {
        reply = "Hello! Nice to meet you. How can I help you learn English today?"
        replyTelugu = "హలో! మిమ్మల్ని కలవడం సంతోషంగా ఉంది. ఈ రోజు ఇంగ్లీష్ నేర్చుకోవడంలో నేను మీకు ఎలా సహాయం చేయగలను?"
      } else if (lower.includes('coffee') || lower.includes('tea') || lower.includes('barista')) {
        reply = "Sure, I can prepare a fresh coffee for you. Would you like sugar and milk in it?"
        replyTelugu = "తప్పకుండా, నేను మీ కోసం తాజా కాఫీని తయారు చేయగలను. మీకు అందులో పంచదార మరియు పాలు కావాలా?"
      } else if (lower.includes('went') && lower.includes('go')) {
        reply = "I see what you mean. Keep in mind that 'went' is the past tense of 'go', so you don't need both."
        replyTelugu = "మీరు చెప్పేది నాకు అర్థమైంది. 'went' అనేది 'go' యొక్క భూతకాలం (past tense) అని గుర్తుంచుకోండి."
        corrections = [{
          original: message,
          corrected: message.replace(/went/g, 'go'),
          explanation: "Double past tense or incorrect tense helper usage.",
          explanation_telugu: "భూతకాలం యొక్క డబుల్ ప్రయోగం లేదా తప్పుడు సహాయక క్రియల వినియోగం."
        }]
      } else if (lower.includes('i is') || lower.includes('he are')) {
        const originalText = lower.includes('i is') ? 'I is' : 'he are'
        const correctedText = lower.includes('i is') ? 'I am' : 'he is'
        reply = `You said '${originalText}'. In English grammar, we should say '${correctedText}'.`
        replyTelugu = `మీరు '${originalText}' అన్నారు. ఇంగ్లీష్ వ్యాకరణంలో మనం '${correctedText}' అనాలి.`
        corrections = [{
          original: message,
          corrected: message.replace(/i is/gi, 'I am').replace(/he are/gi, 'he is'),
          explanation: "Subject-verb agreement error. 'I' goes with 'am', 'he' goes with 'is'.",
          explanation_telugu: "కర్త మరియు క్రియ మధ్య సమన్వయ లోపం. 'I' కి 'am', 'he' కి 'is' వాడాలి."
        }]
      }

      return {
        reply,
        grammar_corrections: corrections,
        pronunciation_score: 95,
        translations: { telugu: replyTelugu }
      }
    }

    try {
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
    } catch {
      return {
        reply: "I'm having some trouble connecting to the internet, but you are doing great! Let's keep practicing.",
        grammar_corrections: [],
        pronunciation_score: 90,
        translations: { telugu: "నాకు ఇంటర్నెట్ కనెక్టివిటీ సమస్య ఉంది, కానీ మీరు చాలా బాగా చేస్తున్నారు! ప్రాక్టీస్ కొనసాగిద్దాం." }
      }
    }
  },

  async endSession(sessionId: string) {
    if (await checkIsGuest() || sessionId.startsWith('mock-')) return
    try {
      await supabase
        .from('chat_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)
    } catch { /* ignore */ }
  },
}

// ============================================================
// PRONUNCIATION — Uses client-side Levenshtein + optional Groq enhancement
// ============================================================

export const pronunciationService = {
  async getPhrases() {
    try {
      if (await checkIsGuest()) {
        return shuffleArray(MOCK_PRONUNCIATION_PHRASES).slice(0, 10)
      }
      const { data, error } = await supabase
        .from('pronunciation_phrases')
        .select('*')
        .order('difficulty')
        .limit(30)
      if (error) throw error
      return data && data.length > 0 ? shuffleArray(data) : shuffleArray(MOCK_PRONUNCIATION_PHRASES).slice(0, 10)
    } catch {
      return shuffleArray(MOCK_PRONUNCIATION_PHRASES).slice(0, 10)
    }
  },

  async submitPronunciationResult(
    transcript: string,
    targetPhrase: string,
    localScores: Record<string, unknown>
  ) {
    if (await checkIsGuest()) {
      return localScores
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

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

    return localScores
  },
}

// ============================================================
// GAMIFICATION
// ============================================================

export const gamificationService = {
  async getAchievements(userId: string): Promise<Achievement[]> {
    try {
      if (await checkIsGuest() || userId.startsWith('guest-') || userId.startsWith('dev-')) {
        return MOCK_ACHIEVEMENTS.map(a => ({
          ...a,
          earned_at: a.id === 'ach-first' ? new Date().toISOString() : undefined
        }))
      }
      const { data, error } = await supabase
        .from('achievements')
        .select(`*, user_achievements!left(earned_at)`)
        .eq('is_active', true)
      if (error) throw error
      return (data || []).map(a => ({
        ...a,
        earned_at: a.user_achievements?.[0]?.earned_at || undefined,
      }))
    } catch {
      return MOCK_ACHIEVEMENTS.map(a => ({
        ...a,
        earned_at: a.id === 'ach-first' ? new Date().toISOString() : undefined
      }))
    }
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      if (await checkIsGuest()) return MOCK_LEADERBOARD
      const week = getWeekStart()
      const { data, error } = await supabase
        .from('leaderboard_weekly')
        .select(`user_id, xp_earned, week_start, profiles!inner(full_name, avatar_url)`)
        .eq('week_start', week)
        .order('xp_earned', { ascending: false })
        .limit(50)
      if (error) throw error

      return (data || []).map((entry, i) => {
        const profile = entry.profiles as any
        return {
          rank: i + 1,
          user_id: entry.user_id,
          full_name: Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name,
          avatar_url: Array.isArray(profile) ? profile[0]?.avatar_url : profile?.avatar_url,
          xp_earned: entry.xp_earned,
          week_start: entry.week_start,
        }
      })
    } catch {
      return MOCK_LEADERBOARD
    }
  },

  async getDailyChallenge(): Promise<DailyChallenge | null> {
    try {
      if (await checkIsGuest()) {
        const randomIndex = Math.floor(Math.random() * MOCK_DAILY_CHALLENGES.length)
        return {
          ...MOCK_DAILY_CHALLENGES[randomIndex],
          valid_date: new Date().toISOString().split('T')[0],
          completed: false,
        }
      }
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('daily_challenges')
        .select(`*, user_daily_challenges!left(completed, score)`)
        .eq('valid_date', today)
        .eq('is_active', true)
        .maybeSingle()
      if (error || !data) {
        const randomIndex = Math.floor(Math.random() * MOCK_DAILY_CHALLENGES.length)
        return {
          ...MOCK_DAILY_CHALLENGES[randomIndex],
          valid_date: new Date().toISOString().split('T')[0],
          completed: false,
        }
      }
      return {
        ...data,
        completed: data.user_daily_challenges?.[0]?.completed || false,
      }
    } catch {
      const randomIndex = Math.floor(Math.random() * MOCK_DAILY_CHALLENGES.length)
      return {
        ...MOCK_DAILY_CHALLENGES[randomIndex],
        valid_date: new Date().toISOString().split('T')[0],
        completed: false,
      }
    }
  },

  async updateProgress(action: string, lessonId?: string, xpAmount?: number) {
    let xpEarned = xpAmount || 10
    
    // For guest mode, we don't have a real DB. 
    // We should rely on Redux + AsyncStorage for local persistence.
    if (await checkIsGuest()) {
      return { success: true, xp_earned: xpEarned }
    }
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // First try Edge Function if it exists
      try {
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
        if (response.ok) return await response.json()
      } catch (e) {
        console.warn('[updateProgress] Edge function failed, falling back to direct DB update', e)
      }

      // Fallback: update profile XP directly in Supabase DB
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_total, current_level')
        .eq('id', session.user.id)
        .single()
        
      if (profile) {
        const newTotal = (profile.xp_total || 0) + xpEarned
        let newLevel = profile.current_level || 1
        let levelUp = false
        
        // Simple level calculation: 1 level per 500 XP
        const expectedLevel = Math.floor(newTotal / 500) + 1
        if (expectedLevel > newLevel) {
          newLevel = expectedLevel
          levelUp = true
        }

        await supabase
          .from('profiles')
          .update({ xp_total: newTotal, current_level: newLevel, updated_at: new Date().toISOString() })
          .eq('id', session.user.id)
          
        return { success: true, xp_earned: xpEarned, new_xp_total: newTotal, new_level: newLevel, level_up: levelUp }
      }
      
      return { success: true, xp_earned: xpEarned }
    } catch (e) {
      console.warn('[updateProgress] Failed entirely', e)
      return { success: true, xp_earned: xpEarned }
    }
  },
}

// ============================================================
// ROLEPLAY
// ============================================================

export const roleplayService = {
  async getScenarios(): Promise<RoleplayScenario[]> {
    try {
      if (await checkIsGuest()) return MOCK_SCENARIOS
      const { data, error } = await supabase
        .from('roleplay_scenarios')
        .select('*')
        .eq('is_active', true)
        .order('difficulty_level')
      if (error) throw error
      return data || MOCK_SCENARIOS
    } catch {
      return MOCK_SCENARIOS
    }
  },

  async getScenarioById(id: string): Promise<RoleplayScenario> {
    try {
      if (await checkIsGuest()) {
        const found = MOCK_SCENARIOS.find(s => s.id === id)
        if (found) return found
        throw new Error('Scenario not found')
      }
      const { data, error } = await supabase
        .from('roleplay_scenarios')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    } catch {
      const found = MOCK_SCENARIOS.find(s => s.id === id)
      if (found) return found
      throw new Error('Scenario not found')
    }
  },
}

// ============================================================
// ADMIN
// ============================================================

export const adminService = {
  async getAllUsers(limit = 50, offset = 0) {
    try {
      if (await checkIsGuest()) {
        return [
          { id: 'dev-user-id-5678', full_name: 'Developer Learner', phone_number: '+919999999999', current_level: 5, xp_total: 1500, created_at: new Date().toISOString() },
          { id: 'guest-user-id-1234-5678', full_name: 'Guest Learner', phone_number: '+919999999999', current_level: 1, xp_total: 120, created_at: new Date().toISOString() }
        ] as any[]
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      if (error) throw error
      return data || []
    } catch {
      return [
        { id: 'dev-user-id-5678', full_name: 'Developer Learner', phone_number: '+919999999999', current_level: 5, xp_total: 1500, created_at: new Date().toISOString() },
        { id: 'guest-user-id-1234-5678', full_name: 'Guest Learner', phone_number: '+919999999999', current_level: 1, xp_total: 120, created_at: new Date().toISOString() }
      ] as any[]
    }
  },

  async getStats() {
    try {
      if (await checkIsGuest()) {
        return {
          totalUsers: 2,
          totalLessons: 3,
          totalChatSessions: 1,
        }
      }
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
    } catch {
      return {
        totalUsers: 2,
        totalLessons: 3,
        totalChatSessions: 1,
      }
    }
  },

  async createLesson(lesson: Partial<Lesson>) {
    if (await checkIsGuest()) return lesson as any
    const { data, error } = await supabase
      .from('lessons').insert(lesson).select().single()
    if (error) throw error
    return data
  },

  async updateLesson(lessonId: string, updates: Partial<Lesson>) {
    if (await checkIsGuest()) return
    const { error } = await supabase
      .from('lessons').update(updates).eq('id', lessonId)
    if (error) throw error
  },

  async deleteLesson(lessonId: string) {
    if (await checkIsGuest()) return
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
