import { useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAppDispatch } from './useStore'
import { setSession, fetchProfile, clearAuth } from '../store/slices/authSlice'

export function useAuth() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        dispatch(setSession({ session, user: session.user }))
        await dispatch(fetchProfile(session.user.id))
      } else if (event === 'SIGNED_OUT') {
        dispatch(clearAuth())
      }
    })

    return () => subscription.unsubscribe()
  }, [])
}
