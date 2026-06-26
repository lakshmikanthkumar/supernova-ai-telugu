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
    // Compare with cache to prevent offline progress loss
    try {
      const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY)
      if (cached) {
        const cachedProfile = JSON.parse(cached) as Profile
        
        // If local cache has MORE progress than server, sync UP to server!
        const needsSyncUp = 
          (cachedProfile.xp_total > profile.xp_total) || 
          (cachedProfile.streak_current > profile.streak_current)
          
        if (needsSyncUp) {
          console.log(`[fetchProfile] Local cache is ahead (Local XP: ${cachedProfile.xp_total}, Server XP: ${profile.xp_total}). Syncing UP to Supabase...`)
          // Update the server in the background
          profileService.updateProfile(userId, {
            xp_total: Math.max(cachedProfile.xp_total, profile.xp_total),
            streak_current: Math.max(cachedProfile.streak_current, profile.streak_current),
            current_level: Math.max(cachedProfile.current_level, profile.current_level)
          }).catch(console.warn)
          
          // Return the cached profile as the source of truth for now
          return { ...profile, ...cachedProfile }
        }
      }
      
      // Server is ahead or equal, overwrite cache
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
      console.log('[fetchProfile] profile cached to AsyncStorage')
    } catch (err) {
      console.warn('[fetchProfile] cache resolution failed:', err)
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
    updateXP(state, action: PayloadAction<{ xpEarned: number; newTotal?: number; newLevel?: number }>) {
      if (state.profile) {
        const newTotal = action.payload.newTotal || (state.profile.xp_total + action.payload.xpEarned)
        const expectedLevel = Math.floor(newTotal / 500) + 1
        const newLevel = action.payload.newLevel || (expectedLevel > state.profile.current_level ? expectedLevel : state.profile.current_level)
        
        state.profile.xp_total = newTotal
        state.profile.current_level = newLevel
        
        // Asynchronously save to cache so it survives reloads in Guest Mode
        AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(state.profile)).catch(console.warn)
      }
    },
    updateStreak(state, action: PayloadAction<number>) {
      if (state.profile) {
        state.profile.streak_current = action.payload
        if (action.payload > state.profile.streak_longest) {
          state.profile.streak_longest = action.payload
        }
        
        // Asynchronously save to cache so it survives reloads
        AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(state.profile)).catch(console.warn)
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
