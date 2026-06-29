// ============================================================
// Fluency Coach — Voice Reading Tracker
// Matches spoken words against expected sentences.
// Uses Levenshtein-based fuzzy matching (no external dependency).
// ============================================================

import type { StorySentence, SentenceMatchResult, WordMatchResult } from '../types'
import {
  PAUSE_THRESHOLD_MS,
  WPM_TOO_FAST,
  WPM_TOO_SLOW,
  WPM_GOOD_MIN,
  WPM_GOOD_MAX,
  ACCURACY_GOOD,
} from '../constants'

// ── LEVENSHTEIN SIMILARITY ────────────────────────────────────
// Returns 0 (no match) → 1 (perfect match).

export function levenshteinSimilarity(a: string, b: string): number {
  const an = a.toLowerCase()
  const bn = b.toLowerCase()
  const la = an.length
  const lb = bn.length
  if (la === 0 && lb === 0) return 1
  if (la === 0 || lb === 0) return 0
  if (an === bn) return 1

  const matrix: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = an[i - 1] === bn[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const dist = matrix[la][lb]
  const maxLen = Math.max(la, lb)
  return 1 - dist / maxLen
}

// Threshold at which a spoken word is considered "correct"
const WORD_MATCH_THRESHOLD = 0.72

// ── NORMALISE ─────────────────────────────────────────────────

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenise(text: string): string[] {
  return normalise(text).split(' ').filter(w => w.length > 0)
}

// ── WORD-LEVEL MATCHING ───────────────────────────────────────

function matchWords(
  expected: string[],
  spoken: string[]
): WordMatchResult[] {
  // Dynamic-programming alignment (Needleman-Wunsch light):
  // For each expected word find the best spoken counterpart in order.

  const results: WordMatchResult[] = []
  let spokenIdx = 0

  for (const expWord of expected) {
    if (spokenIdx >= spoken.length) {
      results.push({ word: expWord, spokenWord: '', isCorrect: false, similarity: 0 })
      continue
    }

    let bestSim = 0
    let bestIdx = spokenIdx

    // Look ahead at most 3 positions to handle skipped filler words
    const lookAhead = Math.min(spokenIdx + 4, spoken.length)
    for (let i = spokenIdx; i < lookAhead; i++) {
      const sim = levenshteinSimilarity(expWord, spoken[i])
      if (sim > bestSim) {
        bestSim = sim
        bestIdx = i
      }
    }

    const isCorrect = bestSim >= WORD_MATCH_THRESHOLD
    results.push({
      word:       expWord,
      spokenWord: spoken[bestIdx] || '',
      isCorrect,
      similarity: bestSim,
    })

    if (isCorrect) spokenIdx = bestIdx + 1
  }

  return results
}

// ── PUBLIC ALIGNMENT WRAPPER (used by tests) ──────────────────

export function alignWords(
  spoken: string[],
  expected: string[]
): { matchedCount: number; accuracy: number; wordResults: WordMatchResult[] } {
  if (expected.length === 0 && spoken.length === 0) {
    return { matchedCount: 0, accuracy: 100, wordResults: [] }
  }
  if (expected.length === 0) {
    return { matchedCount: 0, accuracy: 0, wordResults: [] }
  }
  const wordResults = matchWords(expected, spoken)
  const matchedCount = wordResults.filter(w => w.isCorrect).length
  const accuracy = Math.round((matchedCount / expected.length) * 100)
  return { matchedCount, accuracy, wordResults }
}

// ── WPM CALCULATOR ────────────────────────────────────────────

export function calculateWPM(wordCount: number, durationMs: number): number {
  if (durationMs <= 0) return 0
  return Math.round((wordCount / (durationMs / 60_000)))
}

// ── PAUSE DETECTOR ────────────────────────────────────────────

export class PauseDetector {
  private lastActivityTime: number = Date.now()
  private pauseStartTime: number | null = null
  private totalPauseMs: number = 0
  private pauseCount: number = 0

  recordActivity() {
    if (this.pauseStartTime !== null) {
      const pauseDuration = Date.now() - this.pauseStartTime
      if (pauseDuration >= PAUSE_THRESHOLD_MS) {
        this.totalPauseMs += pauseDuration
        this.pauseCount += 1
      }
      this.pauseStartTime = null
    }
    this.lastActivityTime = Date.now()
  }

  checkForPause(): boolean {
    const silenceDuration = Date.now() - this.lastActivityTime
    if (silenceDuration >= PAUSE_THRESHOLD_MS && this.pauseStartTime === null) {
      this.pauseStartTime = this.lastActivityTime
      return true
    }
    return false
  }

  getStats() {
    return {
      totalPauseMs: this.totalPauseMs,
      pauseCount:   this.pauseCount,
    }
  }

  reset() {
    this.lastActivityTime = Date.now()
    this.pauseStartTime   = null
    this.totalPauseMs     = 0
    this.pauseCount       = 0
  }
}

// ── VOICE READING TRACKER ─────────────────────────────────────

export class VoiceReadingTracker {
  private sentenceStartTime: number = 0
  private pauseDetector = new PauseDetector()

  startSentence() {
    this.sentenceStartTime = Date.now()
    this.pauseDetector.recordActivity()
  }

  onPartialResult() {
    this.pauseDetector.recordActivity()
  }

  // Call when a final transcription result arrives for the current sentence.
  analyseSentence(
    sentence: StorySentence,
    spokenText: string,
    sentenceIndex: number
  ): SentenceMatchResult {
    const durationMs = Date.now() - this.sentenceStartTime
    const pauseDetected = this.pauseDetector.checkForPause()
    this.pauseDetector.recordActivity()

    const expectedWords = sentence.words ?? tokenise(sentence.sentence)
    const spokenWords   = tokenise(spokenText)

    const wordResults  = matchWords(expectedWords, spokenWords)
    const correctCount = wordResults.filter(w => w.isCorrect).length
    const accuracy     = expectedWords.length > 0
      ? Math.round((correctCount / expectedWords.length) * 100)
      : 0

    const wpm = calculateWPM(spokenWords.length, Math.max(durationMs, 1000))

    return { sentenceIndex, accuracy, wordResults, wpm, pauseDetected }
  }

  // Determine live feedback type from current WPM + accuracy.
  getLiveFeedbackType(wpm: number, accuracy: number): string | null {
    if (wpm > WPM_TOO_FAST) return 'too_fast'
    if (wpm > 0 && wpm < WPM_TOO_SLOW) return 'too_slow'
    if (accuracy >= 90) return 'great_pronunciation'
    if (wpm >= WPM_GOOD_MIN && wpm <= WPM_GOOD_MAX && accuracy >= ACCURACY_GOOD) return 'pace_good'
    return null
  }

  getPauseStats() {
    return this.pauseDetector.getStats()
  }

  reset() {
    this.sentenceStartTime = 0
    this.pauseDetector.reset()
  }
}
