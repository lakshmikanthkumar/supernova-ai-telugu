import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { generateDailyFeed, invalidateDailyFeed, DailyFeed } from '../../services/personalization/personalizationEngine'
import { getDailyChallenges } from '../../services/randomization/contentEngine'

interface DynamicFeedState {
  feed: DailyFeed | null
  feedDate: string | null  // tracks which date the feed was generated
  challenges: any[]
  isRefreshing: boolean
  lastRefreshed: number | null
  error: string | null
}

const initialState: DynamicFeedState = {
  feed: null,
  feedDate: null,
  challenges: [],
  isRefreshing: false,
  lastRefreshed: null,
  error: null,
}

export const loadDailyFeed = createAsyncThunk(
  'dynamicFeed/loadDailyFeed',
  async (userId: string) => {
    const feed = await generateDailyFeed(userId)
    const today = new Date().toISOString().split('T')[0]
    return { feed, date: today }
  }
)

export const refreshDailyFeed = createAsyncThunk(
  'dynamicFeed/refreshDailyFeed',
  async (userId: string) => {
    await invalidateDailyFeed(userId)
    const feed = await generateDailyFeed(userId)
    const today = new Date().toISOString().split('T')[0]
    return { feed, date: today }
  }
)

export const loadDailyChallenges = createAsyncThunk(
  'dynamicFeed/loadDailyChallenges',
  async (userId: string) => getDailyChallenges(userId, 3)
)

const dynamicFeedSlice = createSlice({
  name: 'dynamicFeed',
  initialState,
  reducers: {
    clearFeed(state) {
      state.feed = null
      state.feedDate = null
    },
    markChallengeComplete(state, action: PayloadAction<string>) {
      state.challenges = state.challenges.filter(c => c.id !== action.payload)
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadDailyFeed.pending, state => { state.isRefreshing = true; state.error = null })
      .addCase(loadDailyFeed.fulfilled, (state, action) => {
        state.feed = action.payload.feed
        state.feedDate = action.payload.date
        state.challenges = action.payload.feed.dailyChallenges
        state.isRefreshing = false
        state.lastRefreshed = Date.now()
      })
      .addCase(loadDailyFeed.rejected, (state, action) => {
        state.isRefreshing = false
        state.error = action.error.message ?? 'Failed to load feed'
      })
      .addCase(refreshDailyFeed.pending, state => { state.isRefreshing = true })
      .addCase(refreshDailyFeed.fulfilled, (state, action) => {
        state.feed = action.payload.feed
        state.feedDate = action.payload.date
        state.challenges = action.payload.feed.dailyChallenges
        state.isRefreshing = false
        state.lastRefreshed = Date.now()
      })
      .addCase(refreshDailyFeed.rejected, state => { state.isRefreshing = false })
      .addCase(loadDailyChallenges.fulfilled, (state, action) => {
        state.challenges = action.payload
      })
  },
})

export const { clearFeed, markChallengeComplete } = dynamicFeedSlice.actions
export default dynamicFeedSlice.reducer
