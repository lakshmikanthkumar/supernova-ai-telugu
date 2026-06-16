// ============================================================
// EnglishMitraAi - Speech Recognition Service (FREE)
// Replaces: OpenAI Whisper (paid)
// Uses: react-native-voice (device-native STT — completely free)
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
let currentOptions: SpeechRecognitionOptions = {}

// ============================================================
// REQUEST MIC PERMISSION
// ============================================================

export async function requestMicrophonePermission(): Promise<boolean> {
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
  // Results event — partial or final transcription
  Voice.onSpeechResults = (event: SpeechResultsEvent) => {
    const results = event.value || []
    if (results.length > 0 && currentOptions.onFinalResult) {
      currentOptions.onFinalResult({
        transcript: results[0],
        confidence: 0.85, // react-native-voice doesn't always provide confidence
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
    currentOptions.onEnd?.()
  }

  // Error handling
  Voice.onSpeechError = (event: SpeechErrorEvent) => {
    isListening = false
    const errorMessage = getReadableError(event.error?.message || 'unknown')
    currentOptions.onError?.(errorMessage)
  }
}

// ============================================================
// START LISTENING
// ============================================================

export async function startListening(options: SpeechRecognitionOptions = {}): Promise<void> {
  if (isListening) {
    await stopListening()
  }

  const hasPermission = await requestMicrophonePermission()
  if (!hasPermission) {
    options.onError?.('Microphone permission denied. Please allow microphone access in settings.')
    return
  }

  currentOptions = options
  const language = options.language || 'en-IN'

  try {
    await Voice.start(language, {
      EXTRA_PARTIAL_RESULTS: options.partialResults ?? true,
      EXTRA_MAX_RESULTS: 1,
    })
    isListening = true
  } catch (err: any) {
    isListening = false
    options.onError?.(getReadableError(err.message || 'Failed to start speech recognition'))
  }
}

// ============================================================
// STOP LISTENING
// ============================================================

export async function stopListening(): Promise<void> {
  try {
    await Voice.stop()
    isListening = false
  } catch { /* ignore */ }
}

// ============================================================
// CANCEL LISTENING (discard results)
// ============================================================

export async function cancelListening(): Promise<void> {
  try {
    await Voice.cancel()
    isListening = false
    currentOptions = {}
  } catch { /* ignore */ }
}

// ============================================================
// DESTROY (call on screen unmount)
// ============================================================

export async function destroySpeechRecognition(): Promise<void> {
  try {
    await Voice.destroy()
    isListening = false
    currentOptions = {}
  } catch { /* ignore */ }
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
  const errorMap: Record<string, string> = {
    '7': 'No speech detected. Please speak clearly and try again.',
    'no match': 'Could not understand speech. Please speak more clearly.',
    'network': 'Network error. Speech recognition requires internet connection.',
    'audio': 'Microphone error. Please check your microphone.',
    'not-allowed': 'Microphone permission denied.',
    'service-not-allowed': 'Speech service not available on this device.',
    'aborted': 'Speech recognition was cancelled.',
    'language-not-supported': 'Language not supported on this device.',
  }

  for (const [key, message] of Object.entries(errorMap)) {
    if (errorCode.toLowerCase().includes(key.toLowerCase())) {
      return message
    }
  }

  return `Speech recognition error: ${errorCode}. Please try again.`
}
