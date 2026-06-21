import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { Session, User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { profileService } from '../../services/api'
import type { Profile } from '../../types'

const PROFILE_CACHE_KEY = '@englishmitra:profile_v2'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  profileLoading: boolean
  error: string | null
  isOnboarded: boolean
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  loading: false,
  profileLoading: false,
  error: null,
  isOnboarded: false,
}

// Load profile from AsyncStorage cache immediately on startup (before Supabase responds)
export const loadCachedProfile = createAsyncThunk(
  'auth/loadCachedProfile',
  async () => {
    try {
      const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY)
      if (cached) {
        const profile = JSON.parse(cached) as Profile
        console.log('[loadCachedProfile] restored:', profile.full_name, '| level:', profile.current_level)
        return profile
      }
      console.log('[loadCachedProfile] no cache found')
      return null
    } catch (err) {
      console.warn('[loadCachedProfile] error:', err)
      return null
    }
  }
)

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (userId: string) => {
    console.log('[fetchProfile] fetching from Supabase for userId:', userId)
    const profile = await profileService.getProfile(userId)
    console.log('[fetchProfile] success:', profile.full_name, '| level:', profile.current_level, '| xp:', profile.xp_total)
    // Always cache the fresh profile from Supabase
    try {
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
      console.log('[fetchProfile] profile cached to AsyncStorage')
    } catch (err) {
      console.warn('[fetchProfile] cache write failed:', err)
    }
    return profile
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
    console.log('[updateProfile] userId:', userId, '| updates:', JSON.stringify(updates))
    const confirmed = await profileService.updateProfile(userId, updates)
    console.log('[updateProfile] Supabase confirmed:', JSON.stringify(confirmed))
    // Merge confirmed fields into the cached profile
    try {
      const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY)
      if (cached) {
        const existing = JSON.parse(cached) as Profile
        const merged = { ...existing, ...confirmed }
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(merged))
        console.log('[updateProfile] cache updated with confirmed data')
      }
    } catch (err) {
      console.warn('[updateProfile] cache merge failed:', err)
    }
    return confirmed
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
      // Load from AsyncStorage cache immediately (warm start)
      .addCase(loadCachedProfile.fulfilled, (state, action) => {
        if (action.payload && !state.profile) {
          state.profile = action.payload
          console.log('[Redux] cached profile hydrated:', action.payload.full_name)
        }
      })
      // Fetch fresh profile from Supabase
      .addCase(fetchProfile.pending, (state) => { state.profileLoading = true })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profile = action.payload
        state.profileLoading = false
        state.error = null
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch profile'
        state.profileLoading = false
      })
      // Update profile — merge confirmed data from Supabase
      .addCase(updateProfile.pending, (state) => { state.profileLoading = true })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.profile && action.payload) {
          state.profile = { ...state.profile, ...action.payload }
        }
        state.profileLoading = false
        state.error = null
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update profile'
        state.profileLoading = false
      })
  },
})

export const {
  setSession, setProfile, setLoading, setError,
  setOnboarded, clearAuth, updateXP, updateStreak,
} = authSlice.actions

export { PROFILE_CACHE_KEY }

export default authSlice.reducer
