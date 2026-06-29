// ============================================================
// Fluency Coach — Data & Persistence Service
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../../services/supabase'
import { checkIsGuest } from '../../../services/api'
import { explainWord } from '../../../services/ai/aiOrchestrator'
import type { Story, StorySentence, UserStoryProgress, ReadingSession, SessionStats, AIFeedback } from '../types'
import {
  MOCK_STORIES,
  CACHE_KEY_STORIES,
  CACHE_KEY_PROGRESS,
  CACHE_KEY_SESSION,
  STORIES_CACHE_TTL_MS,
  XP_PER_SENTENCE,
  XP_COMPLETION_BASE,
  XP_ACCURACY_BONUS,
  XP_SPEED_BONUS,
  WPM_GOOD_MIN,
  WPM_GOOD_MAX,
} from '../constants'

// ── SENTENCE PARSER ──────────────────────────────────────────
// Splits story content into sentences and attaches word arrays.
function parseSentences(storyId: string, content: string): StorySentence[] {
  // Split on sentence-ending punctuation followed by whitespace or end-of-string
  const raw = content
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 2)

  return raw.map((sentence, idx) => {
    const words = sentence
      .replace(/[^a-zA-Z\s']/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0)
    return {
      id:             `${storyId}_s${idx}`,
      story_id:       storyId,
      sentence,
      sentence_order: idx,
      word_count:     words.length,
      words,
    }
  })
}

function enrichWithSentences(story: Story): Story {
  const sentences = parseSentences(story.id, story.content)
  return { ...story, sentences }
}

// ── CACHE HELPERS ────────────────────────────────────────────

async function getCachedStories(): Promise<Story[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_STORIES)
    if (!raw) return null
    const { data, savedAt } = JSON.parse(raw)
    if (Date.now() - savedAt > STORIES_CACHE_TTL_MS) return null
    return (data as Story[]).map(enrichWithSentences)
  } catch {
    return null
  }
}

async function cacheStories(stories: Story[]) {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY_STORIES,
      JSON.stringify({ data: stories, savedAt: Date.now() })
    )
  } catch { /* storage full — non-fatal */ }
}

// ── FLUENCY COACH SERVICE ─────────────────────────────────────

export const fluencyCoachService = {

  // ── Fetch stories (cache-first, Supabase, then mock fallback)
  async fetchStories(): Promise<Story[]> {
    // 1. Try cache
    const cached = await getCachedStories()
    if (cached?.length) return cached

    // 2. Guest mode / no network → mock data
    if (await checkIsGuest()) {
      return MOCK_STORIES.map(enrichWithSentences)
    }

    // 3. Fetch from Supabase
    try {
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select(`
          *,
          user_story_progress!left(
            id, completion_percent, fluency_score, pronunciation_score,
            reading_speed, total_pauses, completed_at
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!storiesData?.length) throw new Error('empty')

      const stories: Story[] = storiesData.map(row => ({
        id:             row.id,
        title:          row.title,
        content:        row.content,
        category:       row.category,
        difficulty:     row.difficulty,
        estimated_time: row.estimated_time,
        language:       row.language || 'en',
        xp_reward:      row.xp_reward,
        word_count:     row.word_count,
        preview:        row.content.slice(0, 80) + '...',
        created_at:     row.created_at,
        is_premium:     row.is_premium || false,
        user_progress:  row.user_story_progress?.[0] || null,
      })).map(enrichWithSentences)

      await cacheStories(stories)
      return stories
    } catch {
      const fallback = MOCK_STORIES.map(enrichWithSentences)
      await cacheStories(fallback)
      return fallback
    }
  },

  // ── Create a new reading session in Supabase
  async createSession(storyId: string): Promise<string> {
    const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    if (await checkIsGuest()) return localId

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return localId

      const { data, error } = await supabase
        .from('reading_sessions')
        .insert({
          user_id:    user.id,
          story_id:   storyId,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    } catch {
      return localId
    }
  },

  // ── Save completed session + award XP
  async saveSessionResults(
    sessionId: string,
    storyId:   string,
    stats:     SessionStats,
    feedback:  AIFeedback | null
  ): Promise<number> {
    const accuracies = stats.sentenceAccuracies
    const avgAccuracy = accuracies.length
      ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
      : 0

    const durationMs = stats.endTime
      ? stats.endTime - stats.startTime
      : Date.now() - stats.startTime
    const durationMin = durationMs / 60_000
    const wpm = durationMin > 0 ? Math.round(stats.wordsSpoken / durationMin) : 0

    const completionPct = Math.round(
      (stats.correctSentences / Math.max(1, stats.sentenceAccuracies.length)) * 100
    )
    const xpEarned =
      XP_COMPLETION_BASE +
      (stats.correctSentences * XP_PER_SENTENCE) +
      XP_ACCURACY_BONUS(avgAccuracy) +
      XP_SPEED_BONUS(wpm)

    // Persist locally for offline mode
    try {
      await AsyncStorage.setItem(
        CACHE_KEY_PROGRESS(storyId),
        JSON.stringify({
          completion_percent: completionPct,
          fluency_score:      feedback?.fluency_score ?? Math.round(avgAccuracy),
          pronunciation_score: feedback?.pronunciation_score ?? Math.round(avgAccuracy * 0.9),
          reading_speed:      wpm,
          total_pauses:       stats.pauseCount,
          completed_at:       completionPct >= 80 ? new Date().toISOString() : null,
          savedAt:            Date.now(),
        })
      )
    } catch { /* non-fatal */ }

    if (await checkIsGuest()) return xpEarned

    // Supabase writes — non-blocking after XP return
    const saveToDb = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Update session record
        if (!sessionId.startsWith('local_')) {
          await supabase
            .from('reading_sessions')
            .update({
              ended_at:         new Date().toISOString(),
              words_per_minute: wpm,
              mistakes:         stats.missedSentences.length,
              ai_feedback:      feedback,
              completion_percent: completionPct,
            })
            .eq('id', sessionId)
        }

        // Upsert user_story_progress
        await supabase
          .from('user_story_progress')
          .upsert({
            user_id:             user.id,
            story_id:            storyId,
            completion_percent:  completionPct,
            fluency_score:       feedback?.fluency_score ?? Math.round(avgAccuracy),
            pronunciation_score: feedback?.pronunciation_score ?? Math.round(avgAccuracy * 0.9),
            reading_speed:       wpm,
            total_pauses:        stats.pauseCount,
            completed_at:        completionPct >= 80 ? new Date().toISOString() : null,
          }, { onConflict: 'user_id,story_id' })

        // Award XP via profiles update
        const { data: profile } = await supabase
          .from('profiles')
          .select('xp_total, current_level')
          .eq('id', user.id)
          .single()

        if (profile) {
          const newXP   = (profile.xp_total || 0) + xpEarned
          const newLevel = Math.max(profile.current_level || 1, Math.floor(newXP / 500) + 1)
          await supabase
            .from('profiles')
            .update({ xp_total: newXP, current_level: newLevel, updated_at: new Date().toISOString() })
            .eq('id', user.id)
        }
      } catch { /* offline or auth expired — local data already saved */ }
    }

    saveToDb()   // fire-and-forget — don't block UI
    return xpEarned
  },

  // ── Get word meaning (Telugu) via AI
  async fetchWordMeaning(
    word: string
  ): Promise<{ word: string; meaning: string; example: string }> {
    try {
      const result = await explainWord(word.toLowerCase().trim())
      return {
        word,
        meaning: result.meaning_telugu,
        example: result.example_sentences?.[0] ?? `Use "${word}" in a sentence.`,
      }
    } catch {
      return {
        word,
        meaning: word,   // fallback: show the word itself
        example: `Practice using "${word}" in a sentence.`,
      }
    }
  },

  // ── Resume a previously interrupted session
  async getActiveSession(): Promise<{
    storyId: string
    sentenceIndex: number
    stats: Partial<SessionStats>
  } | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY_SESSION)
      if (!raw) return null
      const saved = JSON.parse(raw)
      // Only restore sessions from the last 2 hours
      if (Date.now() - saved.savedAt > 2 * 60 * 60 * 1000) {
        await AsyncStorage.removeItem(CACHE_KEY_SESSION)
        return null
      }
      return saved
    } catch {
      return null
    }
  },

  async saveActiveSession(storyId: string, sentenceIndex: number, stats: SessionStats) {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY_SESSION,
        JSON.stringify({ storyId, sentenceIndex, stats, savedAt: Date.now() })
      )
    } catch { /* non-fatal */ }
  },

  async clearActiveSession() {
    await AsyncStorage.removeItem(CACHE_KEY_SESSION).catch(() => {})
  },
}
