import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../services/supabase'
import { profileService } from '../../services/api'
import type { Profile } from '../../types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null
  isOnboarded: boolean
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: false,
  error: null,
  isOnboarded: false,
}

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (userId: string) => profileService.getProfile(userId)
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
    await profileService.updateProfile(userId, updates)
    return updates
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<{ session: Session | null; user: User | null }>) {
      state.session = action.payload.session
      state.user = action.payload.user
      state.loading = false
    },
    setProfile(state, action: PayloadAction<Profile>) {
      state.profile = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
      state.loading = false
    },
    setOnboarded(state, action: PayloadAction<boolean>) {
      state.isOnboarded = action.payload
    },
    clearAuth(state) {
      state.user = null
      state.session = null
      state.profile = null
      state.error = null
    },
    updateXP(state, action: PayloadAction<{ xpEarned: number; newTotal: number; newLevel: number }>) {
      if (state.profile) {
        state.profile.xp_total = action.payload.newTotal
        state.profile.current_level = action.payload.newLevel
      }
    },
    updateStreak(state, action: PayloadAction<number>) {
      if (state.profile) {
        state.profile.streak_current = action.payload
        if (action.payload > state.profile.streak_longest) {
          state.profile.streak_longest = action.payload
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => { state.loading = true })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profile = action.payload
        state.loading = false
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch profile'
        state.loading = false
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.profile) {
          Object.assign(state.profile, action.payload)
        }
      })
  },
})

export const {
  setSession, setProfile, setLoading, setError,
  setOnboarded, clearAuth, updateXP, updateStreak,
} = authSlice.actions

export default authSlice.reducer
