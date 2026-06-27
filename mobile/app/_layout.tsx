import { useEffect, useState, useRef } from 'react'
import { Stack, router } from 'expo-router'
import { Provider } from 'react-redux'
import { store, loadPersistedState } from '../src/store'
import { rehydrateGamification } from '../src/store/slices/gamificationSlice'
import { rehydrateLearningPath } from '../src/store/slices/learningPathSlice'
import { loadReminderSettings, loadNotificationHistory } from '../src/store/slices/notificationSlice'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../src/hooks/useAuth'
import { supabase } from '../src/services/supabase'
import { notificationService } from '../src/services/notifications/notificationService'
import { backgroundService } from '../src/services/notifications/backgroundService'

SplashScreen.preventAutoHideAsync()

// ── Map notification action → Expo Router path ────────────────

function handleNotificationAction(action: string, data?: any) {
  try {
    switch (action) {
      case 'daily_challenge':
        router.push('/(main)/daily-challenge')
        break
      case 'view_achievement':
        router.push('/(main)/progress')
        break
      case 'streak':
        router.push('/(main)/progress')
        break
      case 'start_lesson':
        if (data?.lessonId) router.push(`/lessons/${data.lessonId}`)
        else router.push('/(main)/learn-hub')
        break
      case 'open_app':
      default:
        router.push('/(main)/home')
        break
    }
  } catch {}
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth()
  return <>{children}</>
}

function NotificationNavigator() {
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    // Check if app was opened by tapping a notification
    notificationService.consumePendingNavigation().then((pending) => {
      if (pending) handleNotificationAction(pending.action, pending.data)
    })
  }, [])

  return null
}

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    async function init() {
      // 1. Rehydrate persisted Redux slices
      try {
        const persisted = await loadPersistedState()
        if (persisted.gamification) store.dispatch(rehydrateGamification(persisted.gamification))
        if (persisted.learningPath) store.dispatch(rehydrateLearningPath(persisted.learningPath))
      } catch (err) {
        console.warn('[_layout] rehydration error:', err)
      }

      // 2. Initialize notification infrastructure
      try {
        await notificationService.initialize()
        await backgroundService.register()
        store.dispatch(loadReminderSettings())
        store.dispatch(loadNotificationHistory())
      } catch (err) {
        console.warn('[_layout] notification init error:', err)
      }

      // 3. Restore auth session
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          console.log('[_layout] session:', session?.user?.id ?? 'none')
          setAuthReady(true)
          SplashScreen.hideAsync()
        })
        .catch((err) => {
          console.warn('[_layout] getSession error:', err)
          setAuthReady(true)
          SplashScreen.hideAsync()
        })
    }

    init()

    return () => { notificationService.cleanup() }
  }, [])

  if (!authReady) return null

  return (
    <Provider store={store}>
      <AuthProvider>
        <NotificationNavigator />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="lessons" />
          <Stack.Screen name="ai" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="features" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </Provider>
  )
}
