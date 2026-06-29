// ============================================================
// Fluency Coach — Reading Analytics & AI Feedback Generator
// ============================================================

import { orchestrateAICall } from '../../../services/ai/aiOrchestrator'
import { checkIsGuest } from '../../../services/api'
import type { Story, SessionStats, AIFeedback } from '../types'
import { WPM_GOOD_MIN, WPM_GOOD_MAX, WPM_TOO_SLOW, WPM_TOO_FAST } from '../constants'

// ── LOCAL SCORE COMPUTATION ───────────────────────────────────

function avgAccuracy(stats: SessionStats): number {
  const { sentenceAccuracies } = stats
  if (!sentenceAccuracies.length) return 0
  return Math.round(sentenceAccuracies.reduce((a, b) => a + b, 0) / sentenceAccuracies.length)
}

function wpmScore(wpm: number): number {
  if (wpm < WPM_TOO_SLOW)  return Math.round((wpm / WPM_TOO_SLOW) * 60)
  if (wpm <= WPM_GOOD_MAX) return Math.min(100, Math.round(60 + ((wpm - WPM_TOO_SLOW) / (WPM_GOOD_MAX - WPM_TOO_SLOW)) * 40))
  // Penalise reading too fast
  return Math.max(50, Math.round(100 - ((wpm - WPM_GOOD_MAX) / WPM_TOO_FAST) * 50))
}

function pausePenalty(pauseCount: number, totalSentences: number): number {
  const ratio = pauseCount / Math.max(1, totalSentences)
  if (ratio < 0.1) return 0
  if (ratio < 0.3) return 5
  if (ratio < 0.5) return 12
  return 20
}

function wpmLabel(wpm: number): AIFeedback['reading_speed_label'] {
  if (wpm < WPM_TOO_SLOW)  return 'slow'
  if (wpm <= WPM_GOOD_MAX) return 'good'
  if (wpm < WPM_TOO_FAST)  return 'fast'
  return 'very_fast'
}

// Exported for unit testing — computes local scores without AI
export function computeLocalScores(stats: SessionStats, _sentenceScores: number[]): Pick<AIFeedback, 'fluency_score' | 'pronunciation_score' | 'confidence_score' | 'reading_speed_wpm' | 'reading_speed_label'> {
  const accuracy        = _sentenceScores.length
    ? Math.round(_sentenceScores.reduce((a, b) => a + b, 0) / _sentenceScores.length)
    : avgAccuracy(stats)
  const wpm             = stats.currentWPM || Math.round(
    stats.wordsSpoken / Math.max((((stats.endTime ?? Date.now()) - stats.startTime) / 60_000), 0.01)
  )
  const fluencyScore    = Math.min(100, Math.max(0,
    Math.round(accuracy * 0.6 + wpmScore(wpm) * 0.4) - pausePenalty(stats.pauseCount, Math.max(1, _sentenceScores.length))
  ))
  const pronunciationScore = Math.min(100, Math.max(0, accuracy - 5))
  const confidenceScore    = Math.min(100, Math.max(0,
    accuracy * 0.5 + (stats.pauseCount < 3 ? 50 : wpm >= WPM_GOOD_MIN && wpm <= WPM_GOOD_MAX ? 40 : 20)
  ))
  return {
    fluency_score:        fluencyScore,
    pronunciation_score:  pronunciationScore,
    confidence_score:     confidenceScore,
    reading_speed_wpm:    wpm,
    reading_speed_label:  wpmLabel(wpm),
  }
}

function computeLocalFeedback(story: Story, stats: SessionStats): AIFeedback {
  const accuracy   = avgAccuracy(stats)
  const durationMs = (stats.endTime ?? Date.now()) - stats.startTime
  const durationMin = Math.max(durationMs / 60_000, 0.01)
  const wpm        = Math.round(stats.wordsSpoken / durationMin)
  const fluency    = Math.round(accuracy * 0.6 + wpmScore(wpm) * 0.4) - pausePenalty(stats.pauseCount, stats.sentenceAccuracies.length)
  const fluencyScore      = Math.min(100, Math.max(0, fluency))
  const pronunciationScore = Math.min(100, Math.max(0, accuracy - 5))
  const confidenceScore   = Math.min(100, Math.max(0, accuracy * 0.5 + (stats.pauseCount < 3 ? 50 : 30)))

  const strengths: string[] = []
  const suggestions: string[] = []

  if (fluencyScore >= 80) strengths.push('Excellent overall fluency and rhythm!')
  if (pronunciationScore >= 80) strengths.push('Great pronunciation accuracy.')
  if (wpm >= WPM_GOOD_MIN && wpm <= WPM_GOOD_MAX) strengths.push('Perfect reading pace — clear and confident.')
  if (stats.pauseCount === 0) strengths.push('No hesitation pauses — outstanding flow!')

  if (pronunciationScore < 70) suggestions.push('Practice individual sounds slowly before reading full sentences.')
  if (wpm < WPM_GOOD_MIN)      suggestions.push('Try to increase your reading speed by scanning ahead while speaking.')
  if (wpm > WPM_GOOD_MAX)      suggestions.push('Slow down slightly to improve clarity and listener comprehension.')
  if (stats.pauseCount > 3)    suggestions.push('Read the story once silently before reading aloud to reduce pauses.')
  if (suggestions.length === 0) suggestions.push('Keep up the great work and try a harder difficulty next time!')

  return {
    fluency_score:       fluencyScore,
    pronunciation_score: pronunciationScore,
    confidence_score:    confidenceScore,
    reading_speed_wpm:   wpm,
    reading_speed_label: wpmLabel(wpm),
    difficult_words:     [],   // AI will fill these; local fallback leaves empty
    improvement_suggestions: suggestions,
    strengths,
    overall_summary: `You read "${story.title}" with ${fluencyScore}% fluency. ${
      fluencyScore >= 80
        ? 'Superb performance! You are ready for a harder story.'
        : fluencyScore >= 60
        ? 'Good effort! A little more practice will make you excellent.'
        : 'Keep practising — every reading session makes you better!'
    }`,
    next_level_recommendation:
      fluencyScore >= 85 && story.difficulty === 'easy'    ? 'Try a Medium difficulty story next!'  :
      fluencyScore >= 85 && story.difficulty === 'medium'  ? 'You are ready for Hard stories!'       :
      'Practice this story again to improve your score.',
    telugu_tip: fluencyScore >= 80
      ? 'చాలా బాగా చేశారు! మీ ఉచ్చారణ మరింత మెరుగు పరచుకోవడానికి నిలువుగా చదవండి.'
      : 'రోజూ చదివే అభ్యాసం చేయండి — ముందుగా కంటితో చదివి, తర్వాత声 అచ్చుతో చదవండి.',
  }
}

// ── AI-ENHANCED FEEDBACK ─────────────────────────────────────

const FLUENCY_FEEDBACK_PROMPT = (
  story: Story,
  accuracy: number,
  wpm: number,
  pauseCount: number,
  missedSentences: string[]
) => `
You are an expert English fluency coach for Telugu-medium Indian students.
A student just completed reading the story "${story.title}" (${story.difficulty} difficulty).

Performance data:
- Average word accuracy: ${accuracy}%
- Reading speed: ${wpm} WPM (ideal: 80–140 WPM)
- Pause count: ${pauseCount}
- Missed/inaccurate sentences: ${missedSentences.slice(0, 3).join(' | ') || 'none'}

Story content excerpt: "${story.content.slice(0, 200)}..."

Return ONLY valid JSON (no markdown fences):
{
  "fluency_score": <number 0-100>,
  "pronunciation_score": <number 0-100>,
  "confidence_score": <number 0-100>,
  "reading_speed_wpm": ${wpm},
  "reading_speed_label": "<slow|good|fast|very_fast>",
  "difficult_words": [
    {"word": "...", "telugu_meaning": "...", "pronunciation_tip": "...", "example_sentence": "..."}
  ],
  "improvement_suggestions": ["...", "...", "..."],
  "strengths": ["...", "..."],
  "overall_summary": "2-3 sentence personalised feedback in simple English",
  "next_level_recommendation": "one sentence",
  "telugu_tip": "Telugu script motivational tip"
}
`

export const readingAnalytics = {

  async generateFeedback(story: Story, stats: SessionStats): Promise<AIFeedback> {
    // Always compute local scores first as fallback
    const localFeedback = computeLocalFeedback(story, stats)

    // Skip AI call for guest mode or no-op sessions
    if (await checkIsGuest()) return localFeedback
    if (stats.sentenceAccuracies.length === 0) return localFeedback

    const accuracy = avgAccuracy(stats)
    const durationMin = Math.max(((stats.endTime ?? Date.now()) - stats.startTime) / 60_000, 0.01)
    const wpm = Math.round(stats.wordsSpoken / durationMin)

    try {
      const prompt = FLUENCY_FEEDBACK_PROMPT(
        story, accuracy, wpm, stats.pauseCount, stats.missedSentences
      )
      const result = await orchestrateAICall('speech_analysis', [
        { role: 'system', content: 'You are a fluency coach. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ], { maxTokens: 600, temperature: 0.3, jsonMode: true })

      // Parse + validate AI response
      const parsed = JSON.parse(result.content)
      const merged: AIFeedback = {
        ...localFeedback,
        ...parsed,
        // Clamp scores to valid range
        fluency_score:       Math.min(100, Math.max(0, Number(parsed.fluency_score)       || localFeedback.fluency_score)),
        pronunciation_score: Math.min(100, Math.max(0, Number(parsed.pronunciation_score) || localFeedback.pronunciation_score)),
        confidence_score:    Math.min(100, Math.max(0, Number(parsed.confidence_score)    || localFeedback.confidence_score)),
        reading_speed_wpm:   wpm,
        // Protect against malformed arrays
        difficult_words:     Array.isArray(parsed.difficult_words)           ? parsed.difficult_words.slice(0, 5) : [],
        improvement_suggestions: Array.isArray(parsed.improvement_suggestions) ? parsed.improvement_suggestions    : localFeedback.improvement_suggestions,
        strengths:           Array.isArray(parsed.strengths)                 ? parsed.strengths                   : localFeedback.strengths,
      }
      return merged
    } catch {
      return localFeedback
    }
  },

  // Compute final XP for a session
  computeXP(stats: SessionStats, story: Story): number {
    const accuracy = avgAccuracy(stats)
    const durationMin = Math.max(((stats.endTime ?? Date.now()) - stats.startTime) / 60_000, 0.01)
    const wpm = Math.round(stats.wordsSpoken / durationMin)
    return Math.min(
      story.xp_reward * 2,   // cap at 2× story reward
      story.xp_reward +
      Math.floor(accuracy / 10) * 2 +
      (wpm >= WPM_GOOD_MIN && wpm <= WPM_GOOD_MAX ? 10 : 0)
    )
  },
}
