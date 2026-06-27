// ============================================================
// AudioDebugger — test microphone + TTS availability
// Use in a dev-only screen or __DEV__ guard.
// ============================================================

import { Platform } from 'react-native'
import {
  isSpeechRecognitionAvailable,
  requestMicrophonePermission,
} from '../services/audio/voiceRecognitionService'
import { ttsService } from '../services/audio/ttsService'

export interface MicTestResult {
  available: boolean
  hasPermission: boolean
  error?: string
}

export interface TTSTestResult {
  available: boolean
  totalVoices: number
  indianVoices: number
  error?: string
}

export const AudioDebugger = {
  async testMicrophone(): Promise<MicTestResult> {
    try {
      const available = await isSpeechRecognitionAvailable()
      if (!available) {
        return { available: false, hasPermission: false, error: 'Speech recognition not available on this device' }
      }
      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) {
        return { available: true, hasPermission: false, error: 'Microphone permission denied' }
      }
      return { available: true, hasPermission: true }
    } catch (err: any) {
      return { available: false, hasPermission: false, error: err?.message ?? 'Unknown error' }
    }
  },

  async testTTS(): Promise<TTSTestResult> {
    try {
      const all = await ttsService.getAllVoices()
      const indian = await ttsService.getIndianVoices()
      await ttsService.speak('Test', { language: 'en-IN' })
      return { available: true, totalVoices: all.length, indianVoices: indian.length }
    } catch (err: any) {
      return { available: false, totalVoices: 0, indianVoices: 0, error: err?.message ?? 'Unknown error' }
    }
  },

  getPlatformInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isDev: __DEV__,
    }
  },
}
