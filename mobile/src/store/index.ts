import { configureStore, Middleware } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
import notificationReducer from './slices/notificationSlice'

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const GAMIFICATION_KEY = '@englishmitra:gamification_v1'
const LEARNING_PATH_KEY = '@englishmitra:learning_path_v1'

// ─── Debounce helper ─────────────────────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSave(fn: () => void, delay = 1500) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(fn, delay)
}

// ─── Persistence middleware ───────────────────────────────────────────────────
// Runs after every dispatched action and debounce-saves the slices we care about.
const saveStateMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  const result = next(action)

  debouncedSave(() => {
    const state = storeAPI.getState() as RootState

    // Gamification: only persist achievements (no transient XP/levelUp flags)
    const gamificationToPersist = {
      achievements: state.gamification.achievements,
    }

    // LearningPath: persist path, recommendations, weeklyGoal (no loading/error)
    const learningPathToPersist = {
      path: state.learningPath.path,
      recommendations: state.learningPath.recommendations,
      weeklyGoal: state.learningPath.weeklyGoal,
    }

    Promise.all([
      AsyncStorage.setItem(GAMIFICATION_KEY, JSON.stringify(gamificationToPersist)),
      AsyncStorage.setItem(LEARNING_PATH_KEY, JSON.stringify(learningPathToPersist)),
    ]).catch((err) => {
      console.warn('[store] Failed to persist state:', err)
    })
  })

  return result
}

// ─── Load persisted state on app startup ─────────────────────────────────────
// Call this before rendering the root component and dispatch the rehydrate
// actions to populate the store with the saved data.
export async function loadPersistedState(): Promise<{
  gamification: ReturnType<typeof import('./slices/gamificationSlice')['default']> | undefined
  learningPath: ReturnType<typeof import('./slices/learningPathSlice')['default']> | undefined
}> {
  try {
    const [gamificationRaw, learningPathRaw] = await Promise.all([
      AsyncStorage.getItem(GAMIFICATION_KEY),
      AsyncStorage.getItem(LEARNING_PATH_KEY),
    ])
    return {
      gamification: gamificationRaw ? JSON.parse(gamificationRaw) : undefined,
      learningPath: learningPathRaw ? JSON.parse(learningPathRaw) : undefined,
    }
  } catch (err) {
    console.warn('[store] Failed to load persisted state:', err)
    return { gamification: undefined, learningPath: undefined }
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────
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
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false })
      .concat(saveStateMiddleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
