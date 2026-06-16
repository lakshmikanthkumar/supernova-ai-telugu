import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import lessonsReducer from './slices/lessonsSlice'
import chatReducer from './slices/chatSlice'
import gamificationReducer from './slices/gamificationSlice'
import uiReducer from './slices/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    lessons: lessonsReducer,
    chat: chatReducer,
    gamification: gamificationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
