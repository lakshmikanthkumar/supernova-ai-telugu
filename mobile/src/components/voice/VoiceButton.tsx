// ============================================================
// VoiceButton — reusable mic button component
// Safe: cancels voice on unmount, prevents double-tap,
// shows pulse animation while listening.
// ============================================================

import React, { useEffect, useRef } from 'react'
import {
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useVoice } from '../../hooks/useVoice'
import type { RecognitionLanguage } from '../../services/audio/voiceRecognitionService'

interface VoiceButtonProps {
  onResult: (text: string) => void
  onError?: (error: any) => void
  onStart?: () => void
  onStop?: () => void
  language?: RecognitionLanguage
  timeout?: number
  placeholder?: string
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  showTranscript?: boolean
}

const SIZES = {
  small:  { button: 44, icon: 20 },
  medium: { button: 56, icon: 24 },
  large:  { button: 72, icon: 32 },
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onResult,
  onError,
  onStart,
  onStop,
  language = 'en-IN',
  timeout = 8000,
  placeholder = 'Tap to speak...',
  disabled = false,
  size = 'medium',
  showTranscript = true,
}) => {
  const {
    isListening, state, transcript, partialTranscript,
    startListening, stopListening, cancelListening, isSupported, error,
  } = useVoice({ language, timeout, onResult, onError, onStart, onStop })

  const pulseAnim = useRef(new Animated.Value(1)).current
  const lastPressRef = useRef(0)

  useEffect(() => {
    return () => { cancelListening() }
  }, [])

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulseAnim.stopAnimation()
      pulseAnim.setValue(1)
    }
  }, [isListening])

  const handlePress = async () => {
    if (disabled || !isSupported) return
    const now = Date.now()
    if (now - lastPressRef.current < 400) return  // debounce double-tap
    lastPressRef.current = now

    if (isListening) {
      await stopListening()
    } else {
      await startListening()
    }
  }

  const dim = SIZES[size]

  if (!isSupported) {
    return (
      <View style={styles.unsupported}>
        <Ionicons name="mic-off-outline" size={24} color="#999" />
        <Text style={styles.unsupportedText}>Mic not available</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {showTranscript && (partialTranscript || transcript) ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptText}>{partialTranscript || transcript}</Text>
          {partialTranscript ? (
            <Text style={styles.listeningHint}>Listening...</Text>
          ) : null}
        </View>
      ) : showTranscript && !isListening ? (
        <Text style={styles.placeholder}>{placeholder}</Text>
      ) : null}

      <Animated.View style={[
        styles.buttonWrap,
        isListening && styles.buttonWrapActive,
        { transform: [{ scale: pulseAnim }] },
      ]}>
        <TouchableOpacity
          style={[
            styles.button,
            { width: dim.button, height: dim.button, borderRadius: dim.button / 2 },
            isListening && styles.buttonActive,
            disabled && styles.buttonDisabled,
          ]}
          onPress={handlePress}
          disabled={disabled || state === 'processing'}
          activeOpacity={0.7}
          accessibilityLabel={isListening ? 'Stop listening' : 'Start voice input'}
          accessibilityRole="button"
          accessibilityState={{ busy: isListening }}
        >
          {state === 'processing' ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={dim.icon}
              color={isListening ? '#FF6B35' : '#0047AB'}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  buttonWrap: { borderRadius: 100, padding: 4 },
  buttonWrapActive: { backgroundColor: 'rgba(255,107,53,0.12)' },
  button: {
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0047AB',
    elevation: Platform.OS === 'android' ? 4 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonActive: { backgroundColor: 'rgba(255,107,53,0.12)', borderColor: '#FF6B35' },
  buttonDisabled: { opacity: 0.5, borderColor: '#999' },
  transcriptBox: {
    backgroundColor: 'white', borderRadius: 12, padding: 12,
    marginBottom: 12, minHeight: 44, minWidth: 200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
  },
  transcriptText: { fontSize: 16, color: '#2D3436', textAlign: 'center' },
  listeningHint: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 4 },
  placeholder: { fontSize: 14, color: '#9CA3AF', marginBottom: 12 },
  errorText: { fontSize: 12, color: '#E74C3C', marginTop: 8, textAlign: 'center' },
  unsupported: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#F5F5F5', borderRadius: 8 },
  unsupportedText: { marginLeft: 8, color: '#999', fontSize: 14 },
})
