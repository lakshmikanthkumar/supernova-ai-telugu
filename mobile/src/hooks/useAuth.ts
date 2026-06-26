import { useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAppDispatch } from './useStore'
import { setSession, fetchProfile, clearAuth, loadCachedProfile } from '../store/slices/authSlice'
import AsyncStorage from '@react-native-async-storage/async-storage'

export function useAuth() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Step 1: Immediately load cached profile from AsyncStorage for instant UI
    dispatch(loadCachedProfile())

    // Step 2: Listen for Supabase auth events — fetches fresh profile from DB
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useAuth] event:', event, '| userId:', session?.user?.id ?? 'none')

      if (session?.user) {
        dispatch(setSession({ session, user: session.user }))
        // Fetch fresh profile — will overwrite cache with authoritative Supabase data
        dispatch(fetchProfile(session.user.id))
      } else if (event === 'SIGNED_OUT') {
        console.log('[useAuth] signed out — clearing auth state and profile cache')
        try {
          await AsyncStorage.removeItem('@englishmitra:profile_v2')
        } catch { /* ignore */ }
        dispatch(clearAuth())
      }
    })

    return () => subscription.unsubscribe()
  }, [dispatch])
}
