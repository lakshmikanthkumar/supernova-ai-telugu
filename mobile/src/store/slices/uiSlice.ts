import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  showTeluguTranslations: boolean
  theme: 'light' | 'dark'
  toastMessage: string | null
  toastType: 'success' | 'error' | 'info' | null
  isOffline: boolean
}

const initialState: UIState = {
  showTeluguTranslations: true,
  theme: 'light',
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
})

export const { toggleTranslations, setTheme, showToast, clearToast, setOffline } = uiSlice.actions
export default uiSlice.reducer
