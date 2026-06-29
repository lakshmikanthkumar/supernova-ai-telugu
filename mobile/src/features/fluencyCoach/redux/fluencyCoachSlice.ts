// ============================================================
// Fluency Coach — Redux Slice
// ============================================================

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit'
import type { RootState } from '../../../store'
import type {
  FluencyCoachState, Story, AIFeedback, LiveFeedback,
  SessionStats, StoryCategory, DifficultyLevel, ScrollMode,
  SentenceMatchResult,
} from '../types'
import { fluencyCoachService } from '../services/fluencyCoachService'
import { readingAnalytics } from '../services/readingAnalytics'

// ── INITIAL STATE ─────────────────────────────────────────────

const initialSessionStats: SessionStats = {
  startTime:         0,
  endTime:           null,
  wordsSpoken:       0,
  totalWords:        0,
  pauseCount:        0,
  totalPauseMs:      0,
  missedSentences:   [],
  correctSentences:  0,
  currentWPM:        0,
  peakWPM:           0,
  sentenceAccuracies: [],
}

const initialState: FluencyCoachState = {
  stories:              [],
  filteredStories:      [],
  selectedCategory:     'all',
  selectedDifficulty:   'all',
  storiesLoading:       false,
  storiesError:         null,

  currentStory:         null,
  currentSentenceIndex: 0,
  isListening:          false,
  isPaused:             false,
  isSessionActive:      false,
  scrollMode:           'auto',
  scrollSpeedMultiplier: 1.0,
  completionPercent:    0,

  spokenWords:          [],
  currentPartialTranscript: '',
  sessionStats:         null,
  liveFeedback:         null,
  sentenceScores:       {},

  sessionId:            null,
  aiFeedback:           null,
  xpEarned:             0,
  feedbackLoading:      false,

  wordMeaningPopup:     null,
  error:                null,
}

// ── ASYNC THUNKS ──────────────────────────────────────────────

export const fetchStories = createAsyncThunk(
  'fluencyCoach/fetchStories',
  async (_, { rejectWithValue }) => {
    try {
      return await fluencyCoachService.fetchStories()
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to load stories')
    }
  }
)

export const startReadingSession = createAsyncThunk(
  'fluencyCoach/startSession',
  async (storyId: string, { rejectWithValue }) => {
    try {
      const sessionId = await fluencyCoachService.createSession(storyId)
      return sessionId
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to start session')
    }
  }
)

export const generateAIFeedback = createAsyncThunk(
  'fluencyCoach/generateFeedback',
  async (
    { story, stats }: { story: Story; stats: SessionStats },
    { rejectWithValue }
  ) => {
    try {
      const feedback = await readingAnalytics.generateFeedback(story, stats)
      return feedback
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to generate feedback')
    }
  }
)

export const saveSessionResults = createAsyncThunk(
  'fluencyCoach/saveResults',
  async (
    {
      sessionId, storyId, stats, feedback
    }: {
      sessionId: string
      storyId: string
      stats: SessionStats
      feedback: AIFeedback | null
    },
    { rejectWithValue }
  ) => {
    try {
      const xpEarned = await fluencyCoachService.saveSessionResults(
        sessionId, storyId, stats, feedback
      )
      return xpEarned
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to save results')
    }
  }
)

export const fetchWordMeaning = createAsyncThunk(
  'fluencyCoach/wordMeaning',
  async (word: string, { rejectWithValue }) => {
    try {
      return await fluencyCoachService.fetchWordMeaning(word)
    } catch (err: any) {
      return rejectWithValue(err.message)
    }
  }
)

// ── SLICE ─────────────────────────────────────────────────────

const fluencyCoachSlice = createSlice({
  name: 'fluencyCoach',
  initialState,
  reducers: {
    // ── Library filters
    setCategory(state, action: PayloadAction<StoryCategory | 'all'>) {
      state.selectedCategory = action.payload
      state.filteredStories = applyFilters(
        state.stories, action.payload, state.selectedDifficulty
      )
    },
    setDifficulty(state, action: PayloadAction<DifficultyLevel | 'all'>) {
      state.selectedDifficulty = action.payload
      state.filteredStories = applyFilters(
        state.stories, state.selectedCategory, action.payload
      )
    },

    // ── Story selection
    selectStory(state, action: PayloadAction<Story>) {
      state.currentStory = action.payload
      state.currentSentenceIndex = 0
      state.completionPercent = 0
      state.aiFeedback = null
      state.sessionId = null
      state.xpEarned = 0
      state.sentenceScores = {}
      state.spokenWords = []
      state.sessionStats = null
      state.error = null
    },
    clearCurrentStory(state) {
      state.currentStory = null
      state.isSessionActive = false
      state.isListening = false
      state.isPaused = false
    },

    // ── Session control
    beginSession(state) {
      if (!state.currentStory) return
      state.isSessionActive = true
      state.isPaused = false
      state.isListening = true
      state.currentSentenceIndex = 0
      state.completionPercent = 0
      state.spokenWords = []
      state.sentenceScores = {}
      state.liveFeedback = null
      state.currentPartialTranscript = ''
      state.sessionStats = {
        ...initialSessionStats,
        startTime: Date.now(),
        totalWords: state.currentStory.word_count,
      }
    },
    pauseSession(state) {
      state.isPaused = true
      state.isListening = false
    },
    resumeSession(state) {
      state.isPaused = false
      state.isListening = true
    },
    endSession(state) {
      state.isSessionActive = false
      state.isListening = false
      state.isPaused = false
      if (state.sessionStats) {
        state.sessionStats.endTime = Date.now()
      }
    },

    // ── Scroll
    setScrollMode(state, action: PayloadAction<ScrollMode>) {
      state.scrollMode = action.payload
    },
    setScrollSpeed(state, action: PayloadAction<number>) {
      state.scrollSpeedMultiplier = Math.min(2.0, Math.max(0.5, action.payload))
    },

    // ── Sentence progression
    advanceSentence(state) {
      if (!state.currentStory?.sentences) return
      const totalSentences = state.currentStory.sentences.length
      if (state.currentSentenceIndex < totalSentences - 1) {
        state.currentSentenceIndex += 1
        state.completionPercent = Math.round(
          (state.currentSentenceIndex / totalSentences) * 100
        )
      }
    },
    setSentenceIndex(state, action: PayloadAction<number>) {
      state.currentSentenceIndex = action.payload
      if (state.currentStory?.sentences) {
        state.completionPercent = Math.round(
          (action.payload / state.currentStory.sentences.length) * 100
        )
      }
    },

    // ── Voice tracking
    setListening(state, action: PayloadAction<boolean>) {
      state.isListening = action.payload
    },
    setPartialTranscript(state, action: PayloadAction<string>) {
      state.currentPartialTranscript = action.payload
    },
    recordSentenceResult(state, action: PayloadAction<SentenceMatchResult>) {
      const { sentenceIndex, accuracy, wpm, pauseDetected, wordResults } = action.payload
      state.sentenceScores[sentenceIndex] = accuracy

      if (!state.sessionStats) return
      // Update running stats
      state.sessionStats.sentenceAccuracies.push(accuracy)
      if (accuracy >= 70) {
        state.sessionStats.correctSentences += 1
      } else {
        const sentence = state.currentStory?.sentences?.[sentenceIndex]?.sentence
        if (sentence && !state.sessionStats.missedSentences.includes(sentence)) {
          state.sessionStats.missedSentences.push(sentence)
        }
      }
      const wordsSpoken = wordResults.filter(w => w.isCorrect).length
      state.sessionStats.wordsSpoken += wordsSpoken
      if (wpm > 0) {
        state.sessionStats.currentWPM = wpm
        if (wpm > state.sessionStats.peakWPM) {
          state.sessionStats.peakWPM = wpm
        }
      }
      if (pauseDetected) {
        state.sessionStats.pauseCount += 1
      }
    },
    recordPause(state, action: PayloadAction<number>) {
      if (state.sessionStats) {
        state.sessionStats.pauseCount += 1
        state.sessionStats.totalPauseMs += action.payload
      }
    },

    // ── Live feedback
    setLiveFeedback(state, action: PayloadAction<LiveFeedback | null>) {
      state.liveFeedback = action.payload
    },

    // ── Word meaning
    openWordMeaning(state, action: PayloadAction<{ word: string; meaning: string; example: string }>) {
      state.wordMeaningPopup = action.payload
    },
    closeWordMeaning(state) {
      state.wordMeaningPopup = null
    },

    // ── Session ID (set synchronously for mock/guest mode)
    setSessionId(state, action: PayloadAction<string>) {
      state.sessionId = action.payload
    },

    clearError(state) { state.error = null },
  },

  extraReducers: (builder) => {
    // fetchStories
    builder
      .addCase(fetchStories.pending, (state) => {
        state.storiesLoading = true
        state.storiesError = null
      })
      .addCase(fetchStories.fulfilled, (state, action) => {
        state.storiesLoading = false
        state.stories = action.payload
        state.filteredStories = applyFilters(
          action.payload, state.selectedCategory, state.selectedDifficulty
        )
      })
      .addCase(fetchStories.rejected, (state, action) => {
        state.storiesLoading = false
        state.storiesError = action.payload as string
      })

    // startReadingSession
    builder
      .addCase(startReadingSession.fulfilled, (state, action) => {
        state.sessionId = action.payload
      })
      .addCase(startReadingSession.rejected, (state) => {
        // Non-fatal: generate a local session ID
        state.sessionId = `local_${Date.now()}`
      })

    // generateAIFeedback
    builder
      .addCase(generateAIFeedback.pending, (state) => {
        state.feedbackLoading = true
      })
      .addCase(generateAIFeedback.fulfilled, (state, action) => {
        state.feedbackLoading = false
        state.aiFeedback = action.payload
      })
      .addCase(generateAIFeedback.rejected, (state) => {
        state.feedbackLoading = false
        // Provide a graceful local fallback — do not crash
      })

    // saveSessionResults
    builder
      .addCase(saveSessionResults.fulfilled, (state, action) => {
        state.xpEarned = action.payload
      })

    // fetchWordMeaning
    builder
      .addCase(fetchWordMeaning.fulfilled, (state, action) => {
        state.wordMeaningPopup = action.payload
      })
  },
})

// ── PURE HELPER ───────────────────────────────────────────────

function applyFilters(
  stories: Story[],
  category: StoryCategory | 'all',
  difficulty: DifficultyLevel | 'all'
): Story[] {
  return stories.filter(s => {
    const catMatch = category === 'all' || s.category === category
    const diffMatch = difficulty === 'all' || s.difficulty === difficulty
    return catMatch && diffMatch
  })
}

// ── SELECTORS ─────────────────────────────────────────────────

const selectFluency = (state: RootState) => state.fluencyCoach

export const selectFilteredStories = createSelector(
  selectFluency,
  (s) => s.filteredStories
)

export const selectCurrentSentence = createSelector(
  selectFluency,
  (s) => s.currentStory?.sentences?.[s.currentSentenceIndex] ?? null
)

export const selectAverageAccuracy = createSelector(
  selectFluency,
  (s) => {
    const scores = Object.values(s.sentenceScores)
    if (!scores.length) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }
)

export const selectSessionProgress = createSelector(
  selectFluency,
  (s) => ({
    current: s.currentSentenceIndex,
    total: s.currentStory?.sentences?.length ?? 0,
    percent: s.completionPercent,
    isComplete: s.completionPercent >= 100,
  })
)

export const selectLiveStats = createSelector(
  selectFluency,
  (s) => ({
    wpm:       s.sessionStats?.currentWPM ?? 0,
    accuracy:  s.sessionStats
      ? Math.round(
          (s.sessionStats.correctSentences /
            Math.max(1, s.sessionStats.sentenceAccuracies.length)) * 100
        )
      : 0,
    pauses:    s.sessionStats?.pauseCount ?? 0,
    wordsSpoken: s.sessionStats?.wordsSpoken ?? 0,
  })
)

export const {
  setCategory, setDifficulty,
  selectStory, clearCurrentStory,
  beginSession, pauseSession, resumeSession, endSession,
  setScrollMode, setScrollSpeed,
  advanceSentence, setSentenceIndex,
  setListening, setPartialTranscript,
  recordSentenceResult, recordPause,
  setLiveFeedback,
  openWordMeaning, closeWordMeaning,
  setSessionId,
  clearError,
} = fluencyCoachSlice.actions

export default fluencyCoachSlice.reducer
