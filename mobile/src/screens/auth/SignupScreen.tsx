import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View, Image,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useAppDispatch } from '../../hooks/useStore'
import { authService } from '../../services/api'
import { setSession, setProfile } from '../../store/slices/authSlice'
import { Colors } from '../../constants/theme'
import { Theme } from '../../theme'

export default function SignupScreen() {
  const dispatch = useAppDispatch()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLocalLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const validate = () => {
    const newErrors = { fullName: '', email: '', password: '', confirmPassword: '' }
    let isValid = true

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required (పూర్తి పేరు తప్పనిసరి)'
      isValid = false
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters (పూర్తి పేరు కనీసం 2 అక్షరాలు ఉండాలి)'
      isValid = false
    }

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
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters (పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి)'
      isValid = false
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required (పాస్‌వర్డ్‌ను ధృవీకరించడం తప్పనిసరి)'
      isValid = false
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match (పాస్‌వర్డ్‌లు సరిపోలడం లేదు)'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSignup = async () => {
    if (!validate()) {
      return
    }

    setLocalLoading(true)
    try {
      const data = await authService.signUpWithEmail(email.trim(), password, fullName.trim())
      if (data.session) {
        dispatch(setSession({ session: data.session, user: data.user }))
        if (data.profile) {
          dispatch(setProfile(data.profile))
        }
        Alert.alert('Account Created!', 'Your account has been created successfully. Welcome to EnglishMitraAI!')
        router.replace('/onboarding')
      } else {
        // Email confirmation is enabled in Supabase
        Alert.alert(
          'Verification Email Sent',
          'Please check your email and click the confirmation link to activate your account before logging in.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        )
      }
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message || 'Failed to create account. Please try again.')
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
        is_admin: true,
        is_premium: true,
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
      style={{ flex: 1, backgroundColor: Theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header}>
        {/* <Text style={styles.logoEmoji}>🎓</Text> */}
        <Image source={require('../../assets/images/logo.png')} style={styles.logoEmoji} />
        <Text style={styles.appName}>EnglishMitraAI</Text>
        <Text style={styles.poweredByMaansvi}>powered by Maansvi</Text>
        <Text style={styles.taglineMain}>తెలుగులో ఇంగ్లీష్ నేర్చుకోండి</Text>
        <Text style={styles.tagline}>Telugu Medium Student కి English నేర్పే AI</Text>
      </LinearGradient>

      <View style={styles.formContainerWrapper}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.welcomeText}>Create Account ✨</Text>
          <Text style={styles.welcomeSubtext}>కొత్త ఖాతాను సృష్టించండి</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Full Name (పూర్తి పేరు)</Text>
          <View style={[styles.inputContainer, errors.fullName ? styles.inputErrorBorder : null]}>
            <TextInput
              style={styles.input}
              placeholder="Ravi Kumar"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              autoCorrect={false}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text)
                if (errors.fullName) {
                  setErrors(prev => ({ ...prev, fullName: '' }))
                }
              }}
            />
          </View>
          {errors.fullName ? (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          ) : null}
        </View>

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
              placeholder="•••••••• (Min. 6 chars)"
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

        <View style={styles.inputWrapper}>
          <Text style={styles.inputLabel}>Confirm Password (పాస్‌వర్డ్‌ను ధృవీకరించండి)</Text>
          <View style={[styles.inputContainer, errors.confirmPassword ? styles.inputErrorBorder : null]}>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text)
                if (errors.confirmPassword) {
                  setErrors(prev => ({ ...prev, confirmPassword: '' }))
                }
              }}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.showHideButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <LinearGradient
            colors={loading ? [Colors.primary, Colors.primary] : [Colors.primary, '#0096FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account →</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')} style={styles.switchAuthMode}>
          <Text style={styles.switchAuthText}>
            Already have an account? <Text style={styles.switchAuthLink}>Login</Text>
          </Text>
          <Text style={styles.switchAuthTextTelugu}>
            ఇప్పటికే ఖాతా ఉందా? <Text style={styles.switchAuthLink}>లాగిన్</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.devBypassContainer}>
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR QUICK ACCESS</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={loading ? [Theme.colors.surface, Theme.colors.surface] : [Theme.colors.secondary, '#0096FF']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 0}}
              style={styles.primaryButtonGradient}
            >
              {loading ? (
                <ActivityIndicator color={Theme.colors.text} />
              ) : (
                <Text style={styles.primaryButtonText}>Initialize Account →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')} style={styles.switchAuthMode}>
            <Text style={styles.switchAuthText}>
              Already have an account? <Text style={styles.switchAuthLink}>Login</Text>
            </Text>
            <Text style={styles.switchAuthTextTelugu}>
              ఇప్పటికే ఖాతా ఉందా? <Text style={styles.switchAuthLink}>లాగిన్</Text>
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
              activeOpacity={0.8}
            >
              <Ionicons name="flash-outline" size={18} color={Theme.colors.accent} style={{marginRight: 6}} />
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingBottom: 40, alignItems: 'center' },
  logoEmoji: { width: 40, height: 40, marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: '800', color: 'white', letterSpacing: 0.5 },
  dividerText: {textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: '600', letterSpacing: 1, marginTop: 24, marginBottom: 12},
  termsText:{textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: '600', letterSpacing: 1, marginTop: 24, marginBottom: 12},
  poweredByMaansvi: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 4,
    fontStyle: 'italic',
  },
  taglineMain: {
    fontSize: 16,
    color: 'white',
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
    letterSpacing: 0.3,
  },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  formContainer: { padding: 32, backgroundColor: 'white', flexGrow: 1 },
  welcomeText: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  welcomeSubtext: { fontSize: 14, color: '#4B5563', marginBottom: 2 },
  welcomeSubtextEn: { fontSize: 13, color: '#9CA3AF', marginBottom: 24 },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2, borderColor: Colors.primary, borderRadius: 14,
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
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainerWrapper: { flex: 1, backgroundColor: 'white' },
  primaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    elevation: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primaryButtonDisabled: { backgroundColor: '#9CA3AF' },
  primaryButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  guestButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  switchAuthMode: { marginTop: 20, alignItems: 'center' },
  switchAuthText: { fontSize: 14, color: '#4B5563' },
  switchAuthTextTelugu: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

})
