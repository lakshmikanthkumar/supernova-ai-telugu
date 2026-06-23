import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useAppDispatch } from '../../hooks/useStore'
import { authService, profileService } from '../../services/api'
import { setSession, setProfile } from '../../store/slices/authSlice'

export default function LoginScreen() {
  const dispatch = useAppDispatch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLocalLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '' })

  const validate = () => {
    const newErrors = { email: '', password: '' }
    let isValid = true

    if (!email.trim()) {
      newErrors.email = 'Email is required (ఈమెయిల్ తప్పనిసరి)'
      isValid = false
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address (సరైన ఈమెయిల్ నమోదు చేయండి)'
        isValid = false
      }
    }

    if (!password) {
      newErrors.password = 'Password is required (పాస్‌వర్డ్ తప్పనిసరి)'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleLogin = async () => {
    if (!validate()) {
      return
    }

    setLocalLoading(true)
    try {
      const data = await authService.signInWithEmail(email.trim(), password)
      
      let profile = null
      if ('profile' in data && data.profile) {
        profile = data.profile
      } else if (data.user) {
        profile = await profileService.getProfile(data.user.id)
      }

      dispatch(setSession({ session: data.session, user: data.user }))
      if (profile) {
        dispatch(setProfile(profile))
      }
      router.replace('/home')
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid email or password.')
    } finally {
      setLocalLoading(false)
    }
  }

  const handleGuestLogin = async () => {
    setLocalLoading(true)
    try {
      await AsyncStorage.setItem('is_guest_mode', 'true')
      
      const MOCK_USER = {
        id: 'guest-user-id-1234-5678',
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
        id: 'guest-user-id-1234-5678',
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
      router.replace('/home')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to initialize guest session')
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'white' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <Text style={styles.logoEmoji}>🎓</Text>
        <Text style={styles.appName}>EnglishMitraAI</Text>
        <Text style={styles.poweredByMaansvi}>powered by Maansvi</Text>
        <Text style={styles.tagline}>Telugu Medium Student కి English నేర్పే AI</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.welcomeText}>Login (లాగిన్) 👋</Text>
        <Text style={styles.welcomeSubtext}>మీ ఈమెయిల్ మరియు పాస్‌వర్డ్ నమోదు చేయండి</Text>
        <Text style={styles.welcomeSubtextEn}>Enter your email and password to continue</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Email (ఈమెయిల్)</Text>
          <View style={[styles.inputContainer, errors.email ? styles.inputErrorBorder : null]}>
            <TextInput
              style={styles.input}
              placeholder="example@gmail.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(text) => {
                setEmail(text)
                if (errors.email) {
                  setErrors(prev => ({ ...prev, email: '' }))
                }
              }}
            />
          </View>
          {errors.email ? (
            <Text style={styles.errorText}>{errors.email}</Text>
          ) : null}
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Password (పాస్‌వర్డ్)</Text>
          <View style={[styles.inputContainer, errors.password ? styles.inputErrorBorder : null]}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={(text) => {
                setPassword(text)
                if (errors.password) {
                  setErrors(prev => ({ ...prev, password: '' }))
                }
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.showHideButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text style={styles.errorText}>{errors.password}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>Login →</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/signup')} style={styles.switchAuthMode}>
          <Text style={styles.switchAuthText}>
            Don't have an account? <Text style={styles.switchAuthLink}>Create Account</Text>
          </Text>
          <Text style={styles.switchAuthTextTelugu}>
            ఖాతా లేదా? <Text style={styles.switchAuthLink}>ఖాతాను సృష్టించండి</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.devBypassContainer}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR QUICK ACCESS</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestLogin}
            disabled={loading}
          >
            <Text style={styles.guestButtonText}>⚡ Skip Login & Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  logoEmoji: { fontSize: 48, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: '800', color: 'white' },
  poweredByMaansvi: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  formContainer: { padding: 32, backgroundColor: 'white', flexGrow: 1 },
  welcomeText: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
  welcomeSubtext: { fontSize: 14, color: '#4B5563', marginBottom: 2 },
  welcomeSubtextEn: { fontSize: 13, color: '#9CA3AF', marginBottom: 24 },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2, borderColor: '#4F46E5', borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  showHideButton: {
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4F46E5', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', elevation: 3,
    marginTop: 8,
  },
  primaryButtonDisabled: { backgroundColor: '#9CA3AF' },
  primaryButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  switchAuthMode: { marginTop: 20, alignItems: 'center' },
  switchAuthText: { fontSize: 14, color: '#4B5563' },
  switchAuthTextTelugu: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  switchAuthLink: { color: '#4F46E5', fontWeight: '700' },
  devBypassContainer: { marginTop: 24 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginHorizontal: 12, letterSpacing: 1 },
  guestButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  guestButtonText: { color: '#4F46E5', fontSize: 16, fontWeight: '700' },
  termsContainer: { marginTop: 24, alignItems: 'center' },
  termsText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#4F46E5' },
})
