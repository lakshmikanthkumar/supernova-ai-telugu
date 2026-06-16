import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { authService } from '../../services/api'
import { useAppDispatch } from '../../hooks/useStore'
import { setLoading, setError } from '../../store/slices/authSlice'

export default function LoginScreen() {
  const dispatch = useAppDispatch()
  const [phone, setPhone] = useState('')
  const [loading, setLocalLoading] = useState(false)

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.startsWith('91') && digits.length >= 12) return `+${digits}`
    if (digits.length === 10) return `+91${digits}`
    return `+${digits}`
  }

  const handleSendOTP = async () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.')
      return
    }

    const formattedPhone = formatPhone(digits)
    setLocalLoading(true)
    try {
      await authService.sendOTP(formattedPhone)
      router.push({ pathname: '/auth/otp', params: { phone: formattedPhone } })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <Text style={styles.logoEmoji}>🎓</Text>
        <Text style={styles.appName}>EnglishMitraAI</Text>
        <Text style={styles.tagline}>Telugu Medium Student కి English నేర్పే AI</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.welcomeText}>Welcome! 👋</Text>
        <Text style={styles.welcomeSubtext}>మీ మొబైల్ నంబర్ ఎంటర్ చేయండి</Text>
        <Text style={styles.welcomeSubtextEn}>Enter your mobile number to continue</Text>

        <View style={styles.inputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.flagEmoji}>🇮🇳</Text>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="9876543210"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <Text style={styles.otpInfo}>
          మీకు OTP SMS వస్తుంది • We'll send you an OTP
        </Text>

        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendOTP}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.sendButtonText}>Send OTP →</Text>
          )}
        </TouchableOpacity>

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
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
  formContainer: { padding: 32, backgroundColor: 'white', flexGrow: 1 },
  welcomeText: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 6 },
  welcomeSubtext: { fontSize: 15, color: '#4B5563', marginBottom: 2 },
  welcomeSubtextEn: { fontSize: 13, color: '#9CA3AF', marginBottom: 28 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: '#4F46E5', borderRadius: 14,
    overflow: 'hidden', marginBottom: 12,
  },
  countryCode: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 16,
    backgroundColor: '#F3F4F6', gap: 6,
    borderRightWidth: 1, borderRightColor: '#E5E7EB',
  },
  flagEmoji: { fontSize: 20 },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 18, color: '#111827' },
  otpInfo: { fontSize: 13, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  sendButton: {
    backgroundColor: '#4F46E5', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', elevation: 3,
  },
  sendButtonDisabled: { backgroundColor: '#9CA3AF' },
  sendButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  termsContainer: { marginTop: 24, alignItems: 'center' },
  termsText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#4F46E5' },
})
