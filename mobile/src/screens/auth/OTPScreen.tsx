import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Keyboard,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { authService } from '../../services/api'
import { useAppDispatch } from '../../hooks/useStore'
import { setSession, fetchProfile } from '../../store/slices/authSlice'

const OTP_LENGTH = 6

export default function OTPScreen() {
  const dispatch = useAppDispatch()
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const inputRefs = useRef<TextInput[]>([])

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all filled
    if (index === OTP_LENGTH - 1 && value) {
      const code = newOtp.join('')
      if (code.length === OTP_LENGTH) handleVerify(code)
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('')
    if (otpCode.length < OTP_LENGTH) {
      Alert.alert('Incomplete OTP', 'Please enter the complete 6-digit OTP.')
      return
    }

    Keyboard.dismiss()
    setLoading(true)
    try {
      const { session, user } = await authService.verifyOTP(phone!, otpCode)
      if (session && user) {
        dispatch(setSession({ session, user }))
        await dispatch(fetchProfile(user.id))
        router.replace('/main/home')
      }
    } catch (err: any) {
      Alert.alert('Invalid OTP', 'The OTP you entered is incorrect. Please try again.')
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      await authService.sendOTP(phone!)
      setResendTimer(60)
      Alert.alert('OTP Sent', 'A new OTP has been sent to your mobile.')
    } catch {
      Alert.alert('Error', 'Failed to resend OTP.')
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Phone</Text>
        <Text style={styles.headerSubtitle}>OTP Verification</Text>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sentText}>
          OTP పంపబడింది / OTP sent to
        </Text>
        <Text style={styles.phoneText}>{phone}</Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { if (ref) inputRefs.current[index] = ref }}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
              value={digit}
              onChangeText={(val) => handleOtpChange(val, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          onPress={() => handleVerify()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Continue ✓</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          {resendTimer > 0 ? (
            <Text style={styles.resendTimer}>Resend OTP in {resendTimer}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { paddingTop: 50, paddingBottom: 32, paddingHorizontal: 24 },
  backButton: { marginBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { flex: 1, padding: 32 },
  sentText: { fontSize: 16, color: '#6B7280', marginBottom: 4, textAlign: 'center' },
  phoneText: { fontSize: 20, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 40 },
  otpContainer: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 40 },
  otpInput: {
    width: 48, height: 56, borderRadius: 12,
    borderWidth: 2, borderColor: '#E5E7EB',
    textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpInputFilled: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  verifyButton: {
    backgroundColor: '#4F46E5', paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', elevation: 3,
  },
  verifyButtonDisabled: { backgroundColor: '#9CA3AF' },
  verifyButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  resendContainer: { marginTop: 24, alignItems: 'center' },
  resendTimer: { color: '#6B7280', fontSize: 14 },
  resendLink: { color: '#4F46E5', fontSize: 14, fontWeight: '600' },
})
