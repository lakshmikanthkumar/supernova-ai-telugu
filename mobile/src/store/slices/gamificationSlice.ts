import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { gamificationService } from '../../services/api'
import type { Achievement, LeaderboardEntry, DailyChallenge } from '../../types'

interface GamificationState {
  achievements: Achievement[]
  leaderboard: LeaderboardEntry[]
  dailyChallenge: DailyChallenge | null
  recentXpGain: number | null
  levelUpPending: boolean
  newAchievements: Achievement[]
  loading: boolean
}

const initialState: GamificationState = {
  achievements: [],
  leaderboard: [],
  dailyChallenge: null,
  recentXpGain: null,
  levelUpPending: false,
  newAchievements: [],
  loading: false,
}

export const fetchAchievements = createAsyncThunk(
  'gamification/fetchAchievements',
  async (userId: string) => gamificationService.getAchievements(userId)
)

export const fetchLeaderboard = createAsyncThunk(
  'gamification/fetchLeaderboard',
  async () => gamificationService.getLeaderboard()
)

export const fetchDailyChallenge = createAsyncThunk(
  'gamification/fetchDailyChallenge',
  async () => gamificationService.getDailyChallenge()
)

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    showXPGain(state, action: PayloadAction<number>) {
      state.recentXpGain = action.payload
    },
    clearXPGain(state) {
      state.recentXpGain = null
    },
    setLevelUp(state, action: PayloadAction<boolean>) {
      state.levelUpPending = action.payload
    },
    addNewAchievement(state, action: PayloadAction<Achievement>) {
      state.newAchievements.push(action.payload)
    },
    clearNewAchievements(state) {
      state.newAchievements = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAchievements.fulfilled, (state, action) => {
        state.achievements = action.payload
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.leaderboard = action.payload
      })
      .addCase(fetchDailyChallenge.fulfilled, (state, action) => {
        state.dailyChallenge = action.payload
      })
  },
})

export const { showXPGain, clearXPGain, setLevelUp, addNewAchievement, clearNewAchievements } = gamificationSlice.actions
export default gamificationSlice.reducer
