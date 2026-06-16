// ============================================================
// EnglishMitraAi - Supabase Client Configuration
// ============================================================

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// Custom storage adapter using SecureStore for auth tokens, AsyncStorage for other data
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (key.includes('auth')) {
        return await SecureStore.getItemAsync(key)
      }
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (key.includes('auth')) {
        await SecureStore.setItemAsync(key, value)
      } else {
        await AsyncStorage.setItem(key, value)
      }
    } catch { /* ignore */ }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (key.includes('auth')) {
        await SecureStore.deleteItemAsync(key)
      } else {
        await AsyncStorage.removeItem(key)
      }
    } catch { /* ignore */ }
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export default supabase
