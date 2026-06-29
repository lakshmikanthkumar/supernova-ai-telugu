import fluencyCoachReducer, {
  setCategory,
  setDifficulty,
  selectStory,
  clearCurrentStory,
  incrementSentence,
  setScrollMode,
  setScrollSpeedMultiplier,
  setPartialTranscript,
  setPaused,
  selectAverageAccuracy,
  selectLiveStats,
} from '../../../src/features/fluencyCoach/redux/fluencyCoachSlice'
import type { FluencyCoachState } from '../../../src/features/fluencyCoach/types'
import type { RootState } from '../../../src/store'

const story: any = {
  id: 's1',
  title: 'Test Story',
  content: 'Hello world.',
  preview: 'Hello...',
  category: 'beginner',
  difficulty: 'easy',
  estimated_time: 60,
  word_count: 2,
  xp_reward: 10,
  language: 'en',
}

function getInitial(): FluencyCoachState {
  return fluencyCoachReducer(undefined, { type: '@@INIT' })
}

describe('fluencyCoachSlice reducers', () => {
  it('has correct initial state shape', () => {
    const state = getInitial()
    expect(state.stories).toEqual([])
    expect(state.selectedCategory).toBe('all')
    expect(state.selectedDifficulty).toBe('all')
    expect(state.currentStory).toBeNull()
    expect(state.currentSentenceIndex).toBe(0)
    expect(state.isListening).toBe(false)
    expect(state.scrollMode).toBe('auto')
    expect(state.storiesLoading).toBe(false)
    expect(state.storiesError).toBeNull()
  })

  it('setCategory updates selectedCategory', () => {
    const state = fluencyCoachReducer(getInitial(), setCategory('office_communication'))
    expect(state.selectedCategory).toBe('office_communication')
  })

  it('setDifficulty updates selectedDifficulty', () => {
    const state = fluencyCoachReducer(getInitial(), setDifficulty('hard'))
    expect(state.selectedDifficulty).toBe('hard')
  })

  it('selectStory sets currentStory and resets session state', () => {
    const pre = { ...getInitial(), currentSentenceIndex: 5, sentenceScores: { 0: 80, 1: 90 } }
    const state = fluencyCoachReducer(pre as any, selectStory(story))
    expect(state.currentStory).toEqual(story)
    expect(state.currentSentenceIndex).toBe(0)
    expect(state.sentenceScores).toEqual({})
  })

  it('clearCurrentStory resets to null', () => {
    const pre = { ...getInitial(), currentStory: story }
    const state = fluencyCoachReducer(pre as any, clearCurrentStory())
    expect(state.currentStory).toBeNull()
  })

  it('incrementSentence advances index', () => {
    const pre = { ...getInitial(), currentStory: story, currentSentenceIndex: 1 }
    const state = fluencyCoachReducer(pre as any, incrementSentence())
    expect(state.currentSentenceIndex).toBe(2)
  })

  it('setScrollMode updates scrollMode', () => {
    const state = fluencyCoachReducer(getInitial(), setScrollMode('manual'))
    expect(state.scrollMode).toBe('manual')
  })

  it('setScrollSpeedMultiplier clamps to 0.5–2.0', () => {
    const low  = fluencyCoachReducer(getInitial(), setScrollSpeedMultiplier(0.1))
    const high = fluencyCoachReducer(getInitial(), setScrollSpeedMultiplier(5))
    expect(low.scrollSpeedMultiplier).toBeGreaterThanOrEqual(0.5)
    expect(high.scrollSpeedMultiplier).toBeLessThanOrEqual(2.0)
  })

  it('setPartialTranscript updates transcript', () => {
    const state = fluencyCoachReducer(getInitial(), setPartialTranscript('hello wor'))
    expect(state.currentPartialTranscript).toBe('hello wor')
  })

  it('setPaused toggles pause state', () => {
    const paused   = fluencyCoachReducer(getInitial(), setPaused(true))
    const unpaused = fluencyCoachReducer(paused, setPaused(false))
    expect(paused.isPaused).toBe(true)
    expect(unpaused.isPaused).toBe(false)
  })
})

describe('fluencyCoach selectors', () => {
  function makeRoot(overrides: Partial<FluencyCoachState> = {}): Pick<RootState, 'fluencyCoach'> {
    return { fluencyCoach: { ...getInitial(), ...overrides } as FluencyCoachState }
  }

  it('selectAverageAccuracy returns 0 when no scores', () => {
    expect(selectAverageAccuracy(makeRoot() as RootState)).toBe(0)
  })

  it('selectAverageAccuracy averages sentence scores', () => {
    // Record<number, number> shape matching slice state
    const root = makeRoot({ sentenceScores: { 0: 80, 1: 100, 2: 60 } })
    expect(selectAverageAccuracy(root as RootState)).toBe(80)
  })

  it('selectLiveStats derives from sessionStats', () => {
    const root = makeRoot({
      sessionStats: {
        startTime: Date.now(), endTime: null, wordsSpoken: 10, totalWords: 10,
        pauseCount: 2, totalPauseMs: 0, missedSentences: [], correctSentences: 1,
        currentWPM: 95, peakWPM: 100, sentenceAccuracies: [90],
      },
      sentenceScores: { 0: 90 },
    })
    const stats = selectLiveStats(root as RootState)
    expect(stats.wpm).toBe(95)
    expect(stats.pauses).toBe(2)
    expect(stats.accuracy).toBe(90)
  })
})
