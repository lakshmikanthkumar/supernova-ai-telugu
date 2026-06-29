import { computeLocalScores } from '../../../src/features/fluencyCoach/services/readingAnalytics'
import type { SessionStats } from '../../../src/features/fluencyCoach/types'

function makeStats(overrides: Partial<SessionStats> = {}): SessionStats {
  return {
    startTime:          Date.now() - 60_000,
    endTime:            Date.now(),
    wordsSpoken:        80,
    totalWords:         100,
    pauseCount:         2,
    totalPauseMs:       3_000,
    missedSentences:    1,
    correctSentences:   9,
    currentWPM:         100,
    peakWPM:            120,
    sentenceAccuracies: [95, 90, 85, 92, 88, 91, 87, 93, 89, 60],
    ...overrides,
  }
}

describe('computeLocalScores', () => {
  it('returns scores between 0 and 100', () => {
    const result = computeLocalScores(makeStats(), [80, 90, 85, 92, 88, 91, 87, 93, 89, 60])
    expect(result.fluency_score).toBeGreaterThanOrEqual(0)
    expect(result.fluency_score).toBeLessThanOrEqual(100)
    expect(result.pronunciation_score).toBeGreaterThanOrEqual(0)
    expect(result.pronunciation_score).toBeLessThanOrEqual(100)
    expect(result.confidence_score).toBeGreaterThanOrEqual(0)
    expect(result.confidence_score).toBeLessThanOrEqual(100)
  })

  it('penalises high pause count', () => {
    const few  = computeLocalScores(makeStats({ pauseCount: 1 }), [90])
    const many = computeLocalScores(makeStats({ pauseCount: 15 }), [90])
    expect(few.fluency_score).toBeGreaterThan(many.fluency_score)
  })

  it('gives higher confidence for good WPM range', () => {
    const good = computeLocalScores(makeStats({ currentWPM: 100 }), [90])
    const slow = computeLocalScores(makeStats({ currentWPM: 40 }), [90])
    const fast = computeLocalScores(makeStats({ currentWPM: 200 }), [90])
    expect(good.confidence_score).toBeGreaterThan(slow.confidence_score)
    expect(good.confidence_score).toBeGreaterThan(fast.confidence_score)
  })

  it('sets reading_speed_label correctly', () => {
    const slow   = computeLocalScores(makeStats({ currentWPM: 50 }), [])
    const good   = computeLocalScores(makeStats({ currentWPM: 100 }), [])
    const fast   = computeLocalScores(makeStats({ currentWPM: 160 }), [])
    expect(slow.reading_speed_label).toBe('slow')
    expect(good.reading_speed_label).toBe('good')
    expect(fast.reading_speed_label).toBe('fast')
  })

  it('handles zero sentence scores gracefully', () => {
    const result = computeLocalScores(makeStats({ wordsSpoken: 0, totalWords: 0 }), [])
    expect(result.fluency_score).toBeGreaterThanOrEqual(0)
  })
})
