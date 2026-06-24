import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { supabase } from '../../services/supabase'
import { useAppDispatch } from '../../hooks/useStore'
import { setSession, fetchProfile, setProfile, setOnboarded } from '../../store/slices/authSlice'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme } from '../../theme'

import { Bot } from 'lucide-react-native'

export default function SplashScreen() {
  const dispatch = useAppDispatch()
  const { width } = useWindowDimensions()
  const logoScale = useRef(new Animated.Value(0.8)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const taglineOpacity = useRef(new Animated.Value(0)).current
  const glowOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Futuristic pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 1500, useNativeDriver: true })
      ])
    ).start()

    // Animate logo in
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start()

    // Determine routing after minimum splash duration
    const checkAuth = async () => {
      await new Promise(r => setTimeout(r, 2500)) // Minimum splash duration

      const isGuest = await AsyncStorage.getItem('is_guest_mode')
      if (isGuest === 'true') {
        const guestUserId = 'guest-user-id-1234-5678'
        const MOCK_USER = {
          id: guestUserId,
          email: 'guest@englishmitra.ai',
          phone: null,
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
        }
        const MOCK_SESSION = {
          access_token: 'mock-access-token-jwt',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: MOCK_USER,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }
        const MOCK_PROFILE = {
          id: guestUserId,
          phone_number: null,
          full_name: 'Guest Learner',
          avatar_url: null,
          native_language: 'telugu',
          current_level: 1,
          xp_total: 120,
          xp_today: 0,
          streak_current: 3,
          streak_longest: 5,
          last_active_date: new Date().toISOString(),
          is_admin: false,
          is_premium: false,
          daily_goal_minutes: 15,
          notifications_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        dispatch(setSession({ session: MOCK_SESSION as any, user: MOCK_USER as any }))
        dispatch(setProfile(MOCK_PROFILE as any))
        console.log('[SplashScreen] guest mode — routing to home')
        router.replace('/home')
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[SplashScreen] session check | userId:', session?.user?.id ?? 'none')

        if (session?.user) {
          // Set session in Redux — useAuth's onAuthStateChange also handles fetchProfile
          dispatch(setSession({ session, user: session.user }))
          // Fetch profile here too (belt-and-suspenders for the SplashScreen path)
          await dispatch(fetchProfile(session.user.id))
          router.replace('/home')
          return
        }
      } catch (err) {
        console.warn('[SplashScreen] getSession error:', err)
      }

      const onboarded = await AsyncStorage.getItem('onboarded')
      if (onboarded) {
        router.replace('/login')
      } else {
        router.replace('/onboarding')
      }
    }

    checkAuth()
  }, [])

  return (
    <LinearGradient colors={[Theme.colors.background, '#051024', Theme.colors.primary]} style={styles.container}>
      <Animated.View style={[styles.glowCircle, { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, opacity: glowOpacity, transform: [{ scale: logoScale }] }]} />
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <View style={styles.logoCircle}>
          <Bot size={56} color={Theme.colors.secondary} />
        </View>
        <Text style={styles.appName}>EnglishMitra</Text>
        <Text style={styles.appNameAI}>AI</Text>
        <Text style={styles.poweredByMaansvi}>powered by Maansvi</Text>
      </Animated.View>

      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        <Text style={styles.tagline}>మీ ఇంగ్లీష్ నైపుణ్యాన్ని మెరుగుపరచుకోండి</Text>
        <Text style={styles.taglineEn}>Improve Your English Skills</Text>
      </Animated.View>

      <View style={styles.poweredBy}>
        <View style={styles.aiGlowLine} />
        <Text style={styles.poweredByText}>Powered by GPT-4o & Whisper AI</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glowCircle: {
    position: 'absolute',
    backgroundColor: Theme.colors.secondary,
    opacity: 0.15,
    top: '30%',
    filter: 'blur(40px)', // web
    ...Theme.shadows.neon,
  },
  logoContainer: { alignItems: 'center', marginBottom: 40, zIndex: 10 },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2, borderColor: Theme.colors.secondary,
    ...Theme.shadows.neon,
  },

  appName: { fontSize: 42, fontWeight: '800', color: Theme.colors.text, letterSpacing: 1 },
  appNameAI: {
    fontSize: 18, fontWeight: '800', color: Theme.colors.accent,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.4)',
    overflow: 'hidden',
  },
  poweredByMaansvi: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 12,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  taglineContainer: { alignItems: 'center', paddingHorizontal: 32, zIndex: 10 },
  tagline: { fontSize: 16, color: Theme.colors.text, textAlign: 'center', marginBottom: 8, fontWeight: '600' },
  taglineEn: { fontSize: 14, color: Theme.colors.textSecondary, textAlign: 'center', fontWeight: '500' },
  poweredBy: { position: 'absolute', bottom: 40, alignItems: 'center' },
  aiGlowLine: {
    width: 40,
    height: 3,
    backgroundColor: Theme.colors.secondary,
    borderRadius: 2,
    marginBottom: 12,
    ...Theme.shadows.neon,
  },
  poweredByText: { color: Theme.colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
})
