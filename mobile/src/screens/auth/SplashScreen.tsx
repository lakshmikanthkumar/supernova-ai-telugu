import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { supabase } from '../../services/supabase'
import { useAppDispatch } from '../../hooks/useStore'
import { setSession, fetchProfile, setProfile, setOnboarded } from '../../store/slices/authSlice'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors } from '../../constants/theme'

import { Bot } from 'lucide-react-native'

export default function SplashScreen() {
  const dispatch = useAppDispatch()
  const { width } = useWindowDimensions()
  const logoScale = useRef(new Animated.Value(0.8)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const glowOpacity = useRef(new Animated.Value(0.4)).current
  const taglineOpacity = useRef(new Animated.Value(0)).current
  const shimmerAnim = useRef(new Animated.Value(0)).current

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

    // Shimmer loop on the badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start()

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
        let profileToSet = null
        try {
          const cachedProfile = await AsyncStorage.getItem('@englishmitra:profile_v2')
          if (cachedProfile) {
            profileToSet = JSON.parse(cachedProfile)
          }
        } catch (e) { console.warn(e) }

        if (!profileToSet) {
          profileToSet = {
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
          await AsyncStorage.setItem('@englishmitra:profile_v2', JSON.stringify(profileToSet))
        }

        dispatch(setSession({ session: MOCK_SESSION as any, user: MOCK_USER as any }))
        dispatch(setProfile(profileToSet as any))
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

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  })

  return (
    <LinearGradient colors={['#7B61FF', '#5A42F5', '#9D84FF']} style={styles.container}>
      {/* Decorative circles for depth */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        {/* Premium logo circle with inner glow */}
        <View style={styles.logoRing}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🎓</Text>
          </View>
        </View>

        {/* App name block */}
        <View style={styles.appNameRow}>
          <Text style={styles.appName}>EnglishMitra</Text>
          <Animated.View style={[styles.aiBadge, { opacity: shimmerOpacity }]}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </Animated.View>
        </View>

        <Text style={styles.poweredByMaansvi}>powered by Maansvi</Text>
      </Animated.View>

      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        {/* Telugu subtitle — the requested text */}
        <Text style={styles.taglineTelugu}>తెలుగులో ఇంగ్లీష్ నేర్చుకోండి</Text>
        <Text style={styles.taglineEn}>Learn English in Telugu</Text>

        {/* Decorative divider dots */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
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

  // Background decorative circles
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 60,
    left: -60,
  },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 44 },

  logoRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  logoEmoji: { fontSize: 52 },

  // App name
  appNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  aiBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  aiBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF8F0',
    letterSpacing: 1,
  },
  poweredByMaansvi: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginTop: 10,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },

  // Tagline
  taglineContainer: { alignItems: 'center', paddingHorizontal: 32 },
  taglineTelugu: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  taglineEn: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Decorative dots
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 18,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },

  // Bottom
  poweredBy: { position: 'absolute', bottom: 40 },
  poweredByText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, letterSpacing: 0.3 },
  aiGlowLine: {
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 120,
    alignSelf: 'center',
    marginBottom: 8,
  },
})
