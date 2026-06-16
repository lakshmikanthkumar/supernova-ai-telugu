import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { Provider } from 'react-redux'
import { store } from '../src/store'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useAuth } from '../src/hooks/useAuth'

SplashScreen.preventAutoHideAsync()

function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuth()
  return <>{children}</>
}

export default function RootLayout() {
  useEffect(() => { SplashScreen.hideAsync() }, [])

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
        </Stack>
      </AuthProvider>
    </Provider>
  )
}
