import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { supabase } from '../../services/supabase'
import { useAppDispatch } from '../../hooks/useStore'
import { setSession, fetchProfile, setOnboarded } from '../../store/slices/authSlice'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width } = Dimensions.get('window')

export default function SplashScreen() {
  const dispatch = useAppDispatch()
  const logoScale = useRef(new Animated.Value(0)).current
  const logoOpacity = useRef(new Animated.Value(0)).current
  const taglineOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Animate logo in
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()

    // Check auth state
    const checkAuth = async () => {
      await new Promise(r => setTimeout(r, 2000)) // Minimum splash duration

      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        dispatch(setSession({ session, user: session.user }))
        await dispatch(fetchProfile(session.user.id))
        router.replace('/main/home')
      } else {
        const onboarded = await AsyncStorage.getItem('onboarded')
        if (onboarded) {
          router.replace('/auth/login')
        } else {
          router.replace('/auth/onboarding')
        }
      }
    }

    checkAuth()
  }, [])

  return (
    <LinearGradient colors={['#4F46E5', '#7C3AED', '#2563EB']} style={styles.container}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🎓</Text>
        </View>
        <Text style={styles.appName}>EnglishMitra</Text>
        <Text style={styles.appNameAI}>AI</Text>
      </Animated.View>

      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        <Text style={styles.tagline}>మీ ఇంగ్లీష్ నైపుణ్యాన్ని మెరుగుపరచుకోండి</Text>
        <Text style={styles.taglineEn}>Improve Your English Skills</Text>
      </Animated.View>

      <View style={styles.poweredBy}>
        <Text style={styles.poweredByText}>Powered by GPT-4o & Whisper AI</Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoEmoji: { fontSize: 56 },
  appName: { fontSize: 42, fontWeight: '800', color: 'white', letterSpacing: 1 },
  appNameAI: {
    fontSize: 18, fontWeight: '700', color: '#FCD34D',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
    marginTop: 4,
  },
  taglineContainer: { alignItems: 'center', paddingHorizontal: 32 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: 6 },
  taglineEn: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  poweredBy: { position: 'absolute', bottom: 40 },
  poweredByText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
})
