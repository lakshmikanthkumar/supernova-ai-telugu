import { levenshteinSimilarity, alignWords } from '../../../src/features/fluencyCoach/services/voiceReadingTracker'

describe('levenshteinSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1)
  })

  it('returns 0 for completely different strings', () => {
    expect(levenshteinSimilarity('abc', 'xyz')).toBeLessThan(0.1)
  })

  it('returns 0 when both strings are empty', () => {
    expect(levenshteinSimilarity('', '')).toBe(1)
  })

  it('is case-insensitive', () => {
    expect(levenshteinSimilarity('Hello', 'hello')).toBe(1)
  })

  it('gives high score for minor typo', () => {
    expect(levenshteinSimilarity('morning', 'mornig')).toBeGreaterThan(0.8)
  })

  it('gives low score for very different lengths', () => {
    expect(levenshteinSimilarity('a', 'abcdefghij')).toBeLessThan(0.3)
  })
})

describe('alignWords', () => {
  it('returns full match when spoken equals target', () => {
    const result = alignWords(['the', 'cat', 'sat'], ['the', 'cat', 'sat'])
    expect(result.matchedCount).toBe(3)
    expect(result.accuracy).toBe(100)
  })

  it('handles missing words gracefully', () => {
    const result = alignWords(['the', 'cat'], ['the', 'cat', 'sat'])
    expect(result.matchedCount).toBeLessThanOrEqual(2)
    expect(result.accuracy).toBeLessThan(100)
  })

  it('handles extra spoken words gracefully', () => {
    const result = alignWords(['the', 'big', 'cat', 'sat'], ['the', 'cat', 'sat'])
    expect(result.accuracy).toBeGreaterThan(50)
  })

  it('returns 0 accuracy for empty spoken words', () => {
    const result = alignWords([], ['the', 'cat', 'sat'])
    expect(result.accuracy).toBe(0)
  })

  it('returns 100 accuracy for empty target and spoken', () => {
    const result = alignWords([], [])
    expect(result.accuracy).toBe(100)
  })

  it('fuzzy matches close pronunciation', () => {
    const result = alignWords(['morining', 'tea'], ['morning', 'tea'])
    expect(result.accuracy).toBeGreaterThan(80)
  })
})
