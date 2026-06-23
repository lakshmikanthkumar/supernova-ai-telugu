import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import lessonsReducer from './slices/lessonsSlice'
import chatReducer from './slices/chatSlice'
import gamificationReducer from './slices/gamificationSlice'
import uiReducer from './slices/uiSlice'
import speakingReducer from './slices/speakingSlice'
import interviewReducer from './slices/interviewSlice'
import emailReducer from './slices/emailSlice'
import grammarReducer from './slices/grammarSlice'
import learningPathReducer from './slices/learningPathSlice'
import greetingsReducer from './slices/greetingsSlice'
import dynamicFeedReducer from './slices/dynamicFeedSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    lessons: lessonsReducer,
    chat: chatReducer,
    gamification: gamificationReducer,
    ui: uiReducer,
    speaking: speakingReducer,
    interview: interviewReducer,
    email: emailReducer,
    grammar: grammarReducer,
    learningPath: learningPathReducer,
    greetings: greetingsReducer,
    dynamicFeed: dynamicFeedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
