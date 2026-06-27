import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ThemeMode } from '../../theme/themeConfig'

const THEME_KEY = '@englishmitra:theme_mode'

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const loadTheme = createAsyncThunk('ui/loadTheme', async () => {
  const saved = await AsyncStorage.getItem(THEME_KEY)
  return (saved as ThemeMode | null) ?? 'system'
})

export const saveTheme = createAsyncThunk('ui/saveTheme', async (mode: ThemeMode) => {
  await AsyncStorage.setItem(THEME_KEY, mode)
  return mode
})

// ─── Slice ────────────────────────────────────────────────────────────────────

interface UIState {
  showTeluguTranslations: boolean
  theme: 'light' | 'dark'
  themeMode: ThemeMode
  toastMessage: string | null
  toastType: 'success' | 'error' | 'info' | null
  isOffline: boolean
}

const initialState: UIState = {
  showTeluguTranslations: true,
  theme: 'light',
  themeMode: 'system',
  toastMessage: null,
  toastType: null,
  isOffline: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTranslations(state) {
      state.showTeluguTranslations = !state.showTeluguTranslations
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload
      state.themeMode = action.payload
    },
    showToast(state, action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>) {
      state.toastMessage = action.payload.message
      state.toastType = action.payload.type
    },
    clearToast(state) {
      state.toastMessage = null
      state.toastType = null
    },
    setOffline(state, action: PayloadAction<boolean>) {
      state.isOffline = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTheme.fulfilled, (state, action) => {
        state.themeMode = action.payload
        if (action.payload !== 'system') state.theme = action.payload
      })
      .addCase(saveTheme.fulfilled, (state, action) => {
        state.themeMode = action.payload
        if (action.payload !== 'system') state.theme = action.payload
      })
  },
})

export const { toggleTranslations, setTheme, showToast, clearToast, setOffline } = uiSlice.actions
export default uiSlice.reducer
