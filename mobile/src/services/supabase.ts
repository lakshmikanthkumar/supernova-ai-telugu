// ============================================================
// EnglishMitraAi - Supabase Client Configuration
// ============================================================

import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

// SecureStore has a 2048-byte limit per value.
// Supabase JWT session tokens routinely exceed this, causing silent storage failures and 401 errors.
// Solution: store small values in SecureStore, large values (>1800 bytes) in AsyncStorage with a prefix.
const ASYNC_FALLBACK_PREFIX = '@supabase_large:'
const SECURE_SIZE_LIMIT = 1800

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Check AsyncStorage fallback first (large values stored here)
      const asyncVal = await AsyncStorage.getItem(ASYNC_FALLBACK_PREFIX + key)
      if (asyncVal !== null) return asyncVal
      // Then try SecureStore for small values
      return await SecureStore.getItemAsync(key)
    } catch {
      try { return await AsyncStorage.getItem(key) } catch { return null }
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (value.length > SECURE_SIZE_LIMIT) {
        // Too large for SecureStore — use AsyncStorage fallback
        await AsyncStorage.setItem(ASYNC_FALLBACK_PREFIX + key, value)
        // Remove any stale SecureStore entry
        try { await SecureStore.deleteItemAsync(key) } catch { /* ignore */ }
      } else {
        await SecureStore.setItemAsync(key, value)
        // Remove any stale AsyncStorage fallback entry
        try { await AsyncStorage.removeItem(ASYNC_FALLBACK_PREFIX + key) } catch { /* ignore */ }
      }
    } catch {
      // Final fallback: plain AsyncStorage
      try { await AsyncStorage.setItem(key, value) } catch { /* ignore */ }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try { await SecureStore.deleteItemAsync(key) } catch { /* ignore */ }
    try { await AsyncStorage.removeItem(ASYNC_FALLBACK_PREFIX + key) } catch { /* ignore */ }
    try { await AsyncStorage.removeItem(key) } catch { /* ignore */ }
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
