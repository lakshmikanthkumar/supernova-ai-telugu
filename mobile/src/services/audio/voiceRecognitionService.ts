// ============================================================
// EnglishMitraAi - Centralized Voice Recognition Service
// ============================================================

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice'
import { Platform, PermissionsAndroid, AppState, AppStateStatus } from 'react-native'
import { voiceState } from './voiceStateManager'
import { voiceQueue } from './voiceQueueManager'
import { speechRetry } from './speechRetryHandler'
import { voiceAnalytics } from './voiceAnalytics'

// ============================================================
// Types
// ============================================================

export type RecognitionLanguage = 'en-IN' | 'en-US' | 'te-IN'

export interface RecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
}

export interface SpeechRecognitionOptions {
  language?: RecognitionLanguage
  continuous?: boolean
  partialResults?: boolean
  onPartialResult?: (text: string) => void
  onFinalResult?: (result: RecognitionResult) => void
  onError?: (error: string) => void
  onStart?: () => void
  onEnd?: () => void
}

// ============================================================
// AppState Lifecycle Management
// ============================================================

let appStateSubscription: any = null

function initAppStateListener() {
  if (appStateSubscription) return

  appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
    if (nextAppState.match(/inactive|background/)) {
      console.log('[VoiceService] App going to background. Cleaning up voice engine.')
      await stopListening()
      await destroySpeechRecognition()
    } else if (nextAppState === 'active') {
      console.log('[VoiceService] App came to foreground. Resetting voice engine.')
      await resetVoiceEngine()
    }
  })
}

// ============================================================
// Internal Helpers
// ============================================================

export async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop())
        return true
      } catch {
        return false
      }
    }
    return true
  }

  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'EnglishMitraAI needs microphone access to practice your English pronunciation.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        }
      )
      return granted === PermissionsAndroid.RESULTS.GRANTED
    } catch {
      return false
    }
  }
  return true
}

function getReadableError(errorCode: string): string {
  const errStr = String(errorCode).toLowerCase();

  // Handle specific Android error codes mapping
  if (errStr.includes('11/') || errStr === '11' || errStr.includes('too_many_requests') || errStr.includes('busy')) {
    return 'Speech service is temporarily busy. Please wait a second and try again.';
  }
  if (errStr.includes('10/') || errStr === '10' || errStr.includes('server_disconnected')) {
    return 'Speech service disconnected from server. Please check your internet connection.';
  }
  if (errStr.includes('12/') || errStr === '12' || errStr.includes('cannot_check_support')) {
    return 'Speech service support could not be checked on this device.';
  }
  if (errStr.includes('13/') || errStr === '13' || errStr.includes('language_not_supported')) {
    return 'The selected language is not supported for speech recognition on this device.';
  }
  if (errStr.includes('14/') || errStr === '14' || errStr.includes('language_unavailable')) {
    return 'Language data is not downloaded or available on this device. Please check Google Speech settings.';
  }

  const errorMap: Record<string, string> = {
    '7': 'I couldn\'t hear clearly. Please try again.',
    '8': 'Speech service is temporarily busy. Please wait a second and try again.',
    'no-speech': 'I couldn\'t hear clearly. Please try again.',
    'no match': 'I couldn\'t hear clearly. Please try again.',
    'didn\'t understand': 'I couldn\'t hear clearly. Please try again.',
    'network': 'Network error. Speech recognition requires internet connection.',
    'audio': 'Microphone error. Please check your microphone.',
    'not-allowed': 'Microphone permission denied.',
    'service-not-allowed': 'Speech service not available on this device.',
    'aborted': 'Speech recognition was cancelled.',
    'language-not-supported': 'Language not supported on this device.',
    'already started': 'Microphone is already active.',
    'timeout': 'Speech recognition timeout. Please try again.'
  }

  for (const [key, message] of Object.entries(errorMap)) {
    if (errStr.includes(key.toLowerCase())) {
      return message
    }
  }

  return `I couldn't hear clearly. Please try again.`
}

// ============================================================
// Web Recognition Implementation
// ============================================================

function handleWebRecognition(options: SpeechRecognitionOptions, language: string) {
  if (typeof window === 'undefined') return
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognitionClass) {
    options.onError?.('Speech recognition not supported in this browser.')
    return
  }

  try {
    let webRecog = voiceState.getWebRecognition()
    if (webRecog) {
      try { webRecog.abort() } catch {}
    }

    webRecog = new SpeechRecognitionClass()
    webRecog.continuous = options.continuous ?? false
    webRecog.interimResults = options.partialResults ?? true
    webRecog.lang = language

    webRecog.onstart = () => {
      voiceState.setIsListening(true)
      options.onStart?.()
    }

    webRecog.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptText = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcriptText
        } else {
          interimTranscript += transcriptText
        }
      }

      if (interimTranscript && options.onPartialResult) {
        options.onPartialResult(interimTranscript)
      }

      if (finalTranscript && options.onFinalResult) {
        options.onFinalResult({
          transcript: finalTranscript,
          confidence: 0.9,
          isFinal: true,
        })
      }
    }

    webRecog.onerror = (event: any) => {
      voiceState.setIsListening(false)
      const errCode = event.error || 'unknown'
      options.onError?.(getReadableError(errCode))
    }

    webRecog.onend = () => {
      voiceState.setIsListening(false)
      options.onEnd?.()
    }

    webRecog.start()
    voiceState.setWebRecognition(webRecog)
    voiceState.setIsListening(true)
  } catch (err: any) {
    voiceState.setIsListening(false)
    options.onError?.(getReadableError(err.message || 'Failed to start web speech recognition'))
  }
}

// ============================================================
// Initialization & Listeners
// ============================================================

export function initializeSpeechRecognition(): void {
  initAppStateListener()
  if (Platform.OS === 'web') return

  Voice.onSpeechResults = (event: SpeechResultsEvent) => {
    const results = event.value || []
    const currentOptions = voiceState.getCurrentOptions()
    if (results.length > 0 && currentOptions.onFinalResult) {
      currentOptions.onFinalResult({
        transcript: results[0],
        confidence: 0.85,
        isFinal: true,
      })
    }
  }

  Voice.onSpeechPartialResults = (event: SpeechResultsEvent) => {
    const partial = event.value?.[0] || ''
    const currentOptions = voiceState.getCurrentOptions()
    if (partial && currentOptions.onPartialResult) {
      currentOptions.onPartialResult(partial)
    }
  }

  Voice.onSpeechStart = (_: SpeechStartEvent) => {
    voiceState.setIsListening(true)
    voiceAnalytics.logEvent({ type: 'start', message: 'Speech recognition started native' })
    voiceState.getCurrentOptions().onStart?.()
  }

  Voice.onSpeechEnd = (_: SpeechEndEvent) => {
    voiceState.setIsListening(false)
    voiceAnalytics.logEvent({ type: 'success', message: 'Speech recognition ended native' })
    voiceState.getCurrentOptions().onEnd?.()
  }

  Voice.onSpeechError = (event: SpeechErrorEvent) => {
    voiceState.setIsListening(false)
    const currentOptions = voiceState.getCurrentOptions()
    const errMsg = event.error?.message || 'unknown'
    const readable = getReadableError(errMsg)
    
    voiceAnalytics.logEvent({ type: 'error', errorStr: errMsg, message: readable })

    // Silently handle certain errors or just pass them to user
    if (readable) {
        currentOptions.onError?.(readable)
    }
  }
}

// ============================================================
// Core API
// ============================================================

export async function resetVoiceEngine(): Promise<void> {
  if (Platform.OS === 'web') {
    let webRecog = voiceState.getWebRecognition()
    if (webRecog) {
      try { webRecog.abort() } catch {}
    }
    voiceState.resetState()
    return
  }

  console.log('[VoiceService] Resetting voice engine...')
  voiceState.setIsStopping(true)
  try {
    if (voiceState.getIsListening()) {
      await Voice.cancel()
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    await Voice.removeAllListeners()
    await Voice.destroy()
  } catch (e) {
    console.warn('[VoiceService] Error during voice engine reset:', e)
  }
  
  // Wait for native resources to clean up (Samsung specifically needs more time)
  await new Promise(resolve => setTimeout(resolve, 300))
  
  voiceState.resetState()
  initializeSpeechRecognition()
  console.log('[VoiceService] Voice engine reset complete.')
}

export async function retryListening(options: SpeechRecognitionOptions = {}): Promise<void> {
    console.log('[VoiceService] Retrying listening...')
    voiceAnalytics.logEvent({ type: 'retry', message: 'Retrying listening...' })
    await stopListening()
    await startListening(options)
}

export async function startListening(options: SpeechRecognitionOptions = {}): Promise<void> {
  await voiceQueue.enqueue(async () => {
    // 1. Pre-checks and locks
    if (voiceState.getIsListening() || voiceState.getIsStopping()) {
      console.log('[VoiceService] Currently busy. Stopping existing session before start.')
      await stopListening()
    }

    voiceState.setCurrentOptions(options)
    const language = options.language || 'en-IN'

    // 2. Web Handling
    if (Platform.OS === 'web') {
      handleWebRecognition(options, language)
      return
    }

    // 3. Permission Check
    const hasPermission = await requestMicrophonePermission()
    if (!hasPermission) {
      options.onError?.('Microphone permission denied. Please allow microphone access in settings.')
      return
    }

    // 4. Samsung/Android Warmup Delay (fixes aggressive battery optimization / mic session overlap)
    await new Promise(resolve => setTimeout(resolve, 300))

    // 5. Try Start with Retry Engine
    await speechRetry.executeWithRetry(async () => {
        // Ensure clean state before start
        try {
            if (voiceState.getIsListening()) {
                await Voice.cancel()
                await new Promise(resolve => setTimeout(resolve, 200))
            }
            await Voice.destroy()
            await new Promise(resolve => setTimeout(resolve, 100))
        } catch {}

        await Voice.start(language, {
            EXTRA_PARTIAL_RESULTS: options.partialResults ?? true,
            EXTRA_MAX_RESULTS: 1,
            // Add specific hints for better accuracy and stability
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
        })
        voiceState.setIsListening(true)
    }, options)
    
  }, options)
}

export async function stopListening(): Promise<void> {
  if (Platform.OS === 'web') {
    let webRecog = voiceState.getWebRecognition()
    if (webRecog) {
      try { webRecog.stop() } catch {}
      voiceState.setIsListening(false)
    }
    return
  }

  voiceState.setIsStopping(true)
  try {
    await Voice.stop()
  } catch { /* ignore */ }

  await new Promise(resolve => setTimeout(resolve, 200))
  voiceState.setIsListening(false)
  voiceState.setIsStopping(false)
}

export async function cancelListening(): Promise<void> {
  if (Platform.OS === 'web') {
    let webRecog = voiceState.getWebRecognition()
    if (webRecog) {
      try { webRecog.abort() } catch {}
      voiceState.setIsListening(false)
      voiceState.setCurrentOptions({})
    }
    return
  }

  voiceState.setIsStopping(true)
  try {
    await Voice.cancel()
  } catch { /* ignore */ }

  await new Promise(resolve => setTimeout(resolve, 200))
  voiceState.setIsListening(false)
  voiceState.setIsStopping(false)
  voiceState.setCurrentOptions({})
}

export async function destroySpeechRecognition(): Promise<void> {
  if (Platform.OS === 'web') {
    let webRecog = voiceState.getWebRecognition()
    if (webRecog) {
      try { webRecog.abort() } catch {}
      voiceState.setWebRecognition(null)
      voiceState.setIsListening(false)
      voiceState.setCurrentOptions({})
    }
    return
  }

  voiceState.setIsStopping(true)
  try {
    if (voiceState.getIsListening()) {
      await Voice.cancel()
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    await Voice.removeAllListeners()
    await Voice.destroy()
  } catch (e) {
    console.warn('[VoiceService] Error in destroy:', e)
  }

  await new Promise(resolve => setTimeout(resolve, 200))
  voiceState.setIsListening(false)
  voiceState.setIsStopping(false)
  voiceState.setCurrentOptions({})
}

export async function recognizeOnce(
  language: RecognitionLanguage = 'en-IN',
  timeoutMs: number = 10000
): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolved = false
    let timeoutHandle: ReturnType<typeof setTimeout>

    const cleanup = () => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      destroySpeechRecognition()
    }

    initializeSpeechRecognition()

    startListening({
      language,
      partialResults: false,
      onFinalResult: (result) => {
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(result.transcript)
        }
      },
      onError: (error) => {
        if (!resolved) {
          resolved = true
          cleanup()
          reject(new Error(error))
        }
      },
    })

    timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true
        stopListening()
        cleanup()
        reject(new Error('Speech recognition timeout. Please try again.'))
      }
    }, timeoutMs)
  })
}

export async function isSpeechRecognitionAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    const SpeechRecognitionClass = typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    return !!SpeechRecognitionClass
  }

  try {
    const available = await Voice.isAvailable()
    return !!available
  } catch {
    return false
  }
}

export async function getSupportedLocales(): Promise<string[]> {
  if (Platform.OS === 'web') {
    return ['en-IN', 'en-US', 'te-IN']
  }

  try {
    const locales = await Voice.getSpeechRecognitionServices()
    return locales || []
  } catch {
    return []
  }
}

export function getIsListening(): boolean {
  return voiceState.getIsListening()
}
