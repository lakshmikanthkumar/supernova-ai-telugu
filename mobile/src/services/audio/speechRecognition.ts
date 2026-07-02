// ============================================================
// EnglishMitraAi - Speech Recognition Service (FREE)
// Replaces: OpenAI Whisper (paid)
// Uses: react-native-voice (device-native STT — completely free)
// Fallback: Web Speech API (window.SpeechRecognition / webkitSpeechRecognition)
// Supports: English + Telugu
// ============================================================

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice'
import { Platform, PermissionsAndroid } from 'react-native'

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
// STATE
// ============================================================

let isListening = false
let isStopping = false
let isStarting = false // Debounce flag
let currentOptions: SpeechRecognitionOptions = {}
let webRecognition: any = null
let silenceTimeoutHandle: NodeJS.Timeout | null = null

// ============================================================
// REQUEST MIC PERMISSION
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
  // iOS — permissions handled by app.json info.plist
  return true
}

// ============================================================
// INITIALIZE VOICE LISTENERS
// ============================================================

export function initializeSpeechRecognition(): void {
  if (Platform.OS === 'web') {
    return
  }

  // Results event — partial or final transcription
  Voice.onSpeechResults = (event: SpeechResultsEvent) => {
    const results = event.value || []
    if (results.length > 0 && currentOptions.onFinalResult) {
      currentOptions.onFinalResult({
        transcript: results[0],
        confidence: 0.85,
        isFinal: true,
      })
    }
  }

  // Partial results (real-time transcription while speaking)
  Voice.onSpeechPartialResults = (event: SpeechResultsEvent) => {
    const partial = event.value?.[0] || ''
    if (partial && currentOptions.onPartialResult) {
      currentOptions.onPartialResult(partial)
    }
  }

  // Recognition started
  Voice.onSpeechStart = (_: SpeechStartEvent) => {
    isListening = true
    currentOptions.onStart?.()
  }

  // Recognition ended
  Voice.onSpeechEnd = (_: SpeechEndEvent) => {
    isListening = false
    isStarting = false
    if (silenceTimeoutHandle) clearTimeout(silenceTimeoutHandle)
    currentOptions.onEnd?.()
  }

  // Error handling
  Voice.onSpeechError = (event: SpeechErrorEvent) => {
    isListening = false
    isStarting = false
    if (silenceTimeoutHandle) clearTimeout(silenceTimeoutHandle)
    const errMsg = event.error?.message || 'unknown'
    
    // Auto-retry once on Error 11 or 7 if it happens mid-flight and we haven't timed out
    if ((errMsg.includes('11') || errMsg.includes('7')) && currentOptions.onStart) {
      console.warn('[Voice] Mid-flight error:', errMsg, 'Attempting auto-recover.')
      // But we shouldn't infinitely loop. The UI can handle retries better.
    }
    
    const errorMessage = getReadableError(errMsg)
    currentOptions.onError?.(errorMessage)
  }
}

// ============================================================
// START LISTENING
// ============================================================

export async function startListening(options: SpeechRecognitionOptions = {}): Promise<void> {
  // Prevent concurrent start calls (debounce)
  if (isStarting) {
    console.warn('[Voice] Start already in progress, ignoring duplicate call.')
    return
  }
  
  isStarting = true
  
  // If already listening or currently stopping, force stop and wait
  if (isListening || isStopping) {
    await stopListening()
  }

  // Guard delay: Wait 300ms to let native SpeechRecognizer release audio focus and reset
  await new Promise(resolve => setTimeout(resolve, 300))

  currentOptions = options
  const language = options.language || 'en-IN'

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') {
      isStarting = false;
      return;
    }
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      isStarting = false;
      options.onError?.('Speech recognition not supported in this browser.')
      return;
    }

    try {
      if (webRecognition) {
        try { webRecognition.abort() } catch {}
      }

      webRecognition = new SpeechRecognitionClass()
      webRecognition.continuous = options.continuous ?? false
      webRecognition.interimResults = options.partialResults ?? true
      webRecognition.lang = language

      webRecognition.onstart = () => {
        isListening = true
        isStarting = false
        options.onStart?.()
      }

      webRecognition.onresult = (event: any) => {
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

      webRecognition.onerror = (event: any) => {
        isListening = false
        isStarting = false
        const errCode = event.error || 'unknown'
        options.onError?.(getReadableError(errCode))
      }

      webRecognition.onend = () => {
        isListening = false
        isStarting = false
        options.onEnd?.()
      }

      webRecognition.start()
      isListening = true
    } catch (err: any) {
      isListening = false
      isStarting = false
      options.onError?.(getReadableError(err.message || 'Failed to start web speech recognition'))
    }
    return
  }

  const hasPermission = await requestMicrophonePermission()
  if (!hasPermission) {
    options.onError?.('Microphone permission denied. Please allow microphone access in settings.')
    return
  }

  let attempts = 0
  const maxAttempts = 3 // Increased attempts for Error 11

  const tryStart = async (): Promise<void> => {
    try {
      await Voice.start(language, {
        EXTRA_PARTIAL_RESULTS: options.partialResults ?? true,
        EXTRA_MAX_RESULTS: 1,
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
      })
      isListening = true
      isStarting = false
      
      // Auto-stop after 15 seconds of total silence (fallback timeout)
      if (silenceTimeoutHandle) clearTimeout(silenceTimeoutHandle)
      silenceTimeoutHandle = setTimeout(() => {
        if (isListening) {
          console.log('[Voice] Silence timeout reached, stopping.')
          stopListening()
          options.onError?.('Listening timed out due to silence.')
        }
      }, 15000)
      
    } catch (err: any) {
      const errMsg = String(err.message || 'unknown')
      const isBusyOrRateLimited = errMsg.includes('8') || errMsg.includes('11') || errMsg.toLowerCase().includes('busy') || errMsg.toLowerCase().includes('request') || errMsg.includes('Recognizer not present')

      if (isBusyOrRateLimited && attempts < maxAttempts) {
        attempts++
        console.warn(`[Voice] Start failed (${errMsg}), attempt ${attempts}/${maxAttempts}. Retrying...`)
        try {
          // Safe teardown before retry
          await Voice.cancel()
          await new Promise(resolve => setTimeout(resolve, 200))
          await Voice.destroy()
        } catch {}
        // Exponential backoff with longer delay to let OS release resources
        await new Promise(resolve => setTimeout(resolve, 800 * attempts))
        return tryStart()
      }

      isListening = false
      isStarting = false
      options.onError?.(getReadableError(errMsg))
    }
  }

  await tryStart()
}

// ============================================================
// STOP LISTENING
// ============================================================

export async function stopListening(): Promise<void> {
  if (Platform.OS === 'web') {
    if (webRecognition) {
      try {
        webRecognition.stop()
      } catch {}
      isListening = false
    }
    isStarting = false
    isStopping = false
    return
  }

  isStopping = true
  if (silenceTimeoutHandle) {
    clearTimeout(silenceTimeoutHandle)
    silenceTimeoutHandle = null
  }
  
  try {
    await Voice.stop()
  } catch { /* ignore */ }

  // Wait 150ms for native speech recognition engine to completely close
  await new Promise(resolve => setTimeout(resolve, 150))
  isListening = false
  isStopping = false
  isStarting = false
}

// ============================================================
// CANCEL LISTENING (discard results)
// ============================================================

export async function cancelListening(): Promise<void> {
  if (Platform.OS === 'web') {
    if (webRecognition) {
      try {
        webRecognition.abort()
      } catch {}
      isListening = false
      currentOptions = {}
    }
    isStarting = false
    isStopping = false
    return
  }

  isStopping = true
  if (silenceTimeoutHandle) {
    clearTimeout(silenceTimeoutHandle)
    silenceTimeoutHandle = null
  }
  
  try {
    await Voice.cancel()
  } catch { /* ignore */ }

  await new Promise(resolve => setTimeout(resolve, 150))
  isListening = false
  isStopping = false
  isStarting = false
  currentOptions = {}
}

// ============================================================
// DESTROY (call on screen unmount)
// ============================================================

export async function destroySpeechRecognition(): Promise<void> {
  if (Platform.OS === 'web') {
    if (webRecognition) {
      try {
        webRecognition.abort()
      } catch {}
      webRecognition = null
      isListening = false
      currentOptions = {}
    }
    isStarting = false
    isStopping = false
    return
  }

  isStopping = true
  if (silenceTimeoutHandle) {
    clearTimeout(silenceTimeoutHandle)
    silenceTimeoutHandle = null
  }
  
  try {
    if (isListening) {
      await Voice.cancel()
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    await Voice.removeAllListeners()
    await Voice.destroy()
  } catch (e) {
    console.warn('[Voice] Error in destroy:', e)
  }

  await new Promise(resolve => setTimeout(resolve, 150))
  isListening = false
  isStopping = false
  isStarting = false
  currentOptions = {}
}

// ============================================================
// ONE-SHOT RECOGNITION
// Records until user stops speaking, returns transcript
// ============================================================

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

    // Auto-stop after timeout
    timeoutHandle = setTimeout(() => {
      if (!resolved) {
        resolved = true
        stopListening()
        cleanup()
        reject(new Error('Speech recognition timed out. Please try again.'))
      }
    }, timeoutMs)
  })
}

// ============================================================
// CHECK IF SPEECH RECOGNITION IS AVAILABLE
// ============================================================

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

// ============================================================
// GET SUPPORTED LOCALES (for debugging)
// ============================================================

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
  return isListening
}

// ============================================================
// READABLE ERROR MESSAGES
// ============================================================

function getReadableError(errorCode: string): string {
  const errStr = String(errorCode).toLowerCase();

  // Handle specific Android API 31+ error codes mapping (fallback message is 11/Didn't understand etc. from react-native-voice default case)
  if (errStr.includes('11/') || errStr === '11' || errStr.includes('too_many_requests')) {
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
    '7': 'No speech detected. Please speak clearly and try again.',
    'no-speech': 'No speech detected. Please speak clearly and try again.',
    'no match': 'Could not understand speech. Please speak more clearly.',
    'network': 'Network error. Speech recognition requires internet connection.',
    'audio': 'Microphone error. Please check your microphone.',
    'not-allowed': 'Microphone permission denied.',
    'service-not-allowed': 'Speech service not available on this device.',
    'aborted': 'Speech recognition was cancelled.',
    'language-not-supported': 'Language not supported on this device.',
  }

  for (const [key, message] of Object.entries(errorMap)) {
    if (errStr.includes(key.toLowerCase())) {
      return message
    }
  }

  return `Speech recognition error: ${errorCode}. Please try again.`
}
