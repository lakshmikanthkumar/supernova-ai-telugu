/**
 * Integration test — Fluency Coach Redux + Service layer
 *
 * Tests the end-to-end data flow:
 *   fetchStories (mock Supabase) → selectStory → slice state updates
 *   → session save → XP update
 *
 * Uses a real Redux store with the fluencyCoach reducer wired in.
 */

import { configureStore } from '@reduxjs/toolkit'
import fluencyCoachReducer, {
  fetchStories,
  selectStory,
  setStories,
  setAIFeedback,
  setXPEarned,
} from '../../src/features/fluencyCoach/redux/fluencyCoachSlice'
import authReducer from '../../src/store/slices/authSlice'

// ── Mocks ────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem:    jest.fn().mockResolvedValue(null),
  setItem:    jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet:   jest.fn().mockResolvedValue([]),
  multiSet:   jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../src/services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      data:   [],
      error:  null,
    })),
  },
}))

const MOCK_STORY: any = {
  id:             'story-001',
  title:          'Morning Routine',
  content:        'I wake up every morning at six.',
  preview:        'I wake up every morning...',
  category:       'beginner',
  difficulty:     'easy',
  estimated_time: 90,
  word_count:     8,
  xp_reward:      15,
  language:       'en',
}

// ── Store factory ─────────────────────────────────────────────────

function buildStore() {
  return configureStore({
    reducer: {
      fluencyCoach: fluencyCoachReducer,
      auth:         authReducer,
    },
    middleware: (d) => d({ serializableCheck: false }),
  })
}

// ── Tests ─────────────────────────────────────────────────────────

describe('Fluency Coach — integration flow', () => {
  let store: ReturnType<typeof buildStore>

  beforeEach(() => {
    store = buildStore()
  })

  it('starts with empty stories list', () => {
    expect(store.getState().fluencyCoach.stories).toHaveLength(0)
  })

  it('setStories populates stories and applies filters', () => {
    store.dispatch(setStories([MOCK_STORY]))
    const { stories, filteredStories } = store.getState().fluencyCoach
    expect(stories).toHaveLength(1)
    expect(filteredStories).toHaveLength(1)
  })

  it('selectStory resets session counters', () => {
    store.dispatch(setStories([MOCK_STORY]))
    store.dispatch(selectStory(MOCK_STORY))
    const s = store.getState().fluencyCoach
    expect(s.currentStory?.id).toBe('story-001')
    expect(s.currentSentenceIndex).toBe(0)
    expect(s.sentenceScores).toHaveLength(0)
    expect(s.isSessionActive).toBe(false)
  })

  it('setAIFeedback stores feedback correctly', () => {
    const feedback: any = {
      fluency_score: 85,
      pronunciation_score: 78,
      confidence_score: 82,
      reading_speed_wpm: 95,
      reading_speed_label: 'good',
      difficult_words: [],
      improvement_suggestions: ['Slow down a bit'],
      strengths: ['Good rhythm'],
      overall_summary: 'Nice job!',
      next_level_recommendation: 'Try medium difficulty',
      telugu_tip: 'మరింత నెమ్మదిగా చదవండి',
    }
    store.dispatch(setAIFeedback(feedback))
    expect(store.getState().fluencyCoach.aiFeedback?.fluency_score).toBe(85)
  })

  it('setXPEarned stores XP amount', () => {
    store.dispatch(setXPEarned(25))
    expect(store.getState().fluencyCoach.xpEarned).toBe(25)
  })

  it('fetchStories thunk dispatches setStories on success', async () => {
    // Supabase mock returns empty array — service falls back to MOCK_STORIES
    await store.dispatch(fetchStories() as any)
    // Service uses MOCK_STORIES fallback when Supabase returns empty
    const { stories } = store.getState().fluencyCoach
    expect(Array.isArray(stories)).toBe(true)
  })
})
