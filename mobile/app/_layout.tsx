import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { Provider } from 'react-redux'
import { store, loadPersistedState } from '../src/store'
import { rehydrateGamification } from '../src/store/slices/gamificationSlice'
import { rehydrateLearningPath } from '../src/store/slices/learningPathSlice'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../src/hooks/useAuth'
import { supabase } from '../src/services/supabase'

SplashScreen.preventAutoHideAsync()

function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth()
  return <>{children}</>
}

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    async function init() {
      // Rehydrate persisted slices before revealing the UI
      try {
        const persisted = await loadPersistedState()
        if (persisted.gamification) {
          store.dispatch(rehydrateGamification(persisted.gamification))
        }
        if (persisted.learningPath) {
          store.dispatch(rehydrateLearningPath(persisted.learningPath))
        }
      } catch (err) {
        console.warn('[_layout] rehydration error:', err)
      }

      // Wait for Supabase to restore the session before hiding splash
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('[_layout] initial session restored:', session?.user?.id ?? 'no session')
        setAuthReady(true)
        SplashScreen.hideAsync()
      }).catch((err) => {
        console.warn('[_layout] getSession error:', err)
        setAuthReady(true)
        SplashScreen.hideAsync()
      })
    }

    init()
  }, [])

  if (!authReady) return null

  return (
    <Provider store={store}>
      <AuthProvider>
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
