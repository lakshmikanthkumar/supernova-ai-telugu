// ============================================================
// EnglishMitraAi - Text to Speech Service (FREE — expo-speech)
// Replaces: ElevenLabs / Azure TTS (both paid)
// Uses: Device-native TTS engine (completely free)
// ============================================================

import * as ExpoSpeech from 'expo-speech'

// ============================================================
// Types
// ============================================================

export type SpeechRate = 'slow' | 'normal' | 'fast'
export type SpeechLanguage = 'en-IN' | 'en-US' | 'en-GB' | 'te-IN'

interface SpeechOptions {
  rate?: SpeechRate
  language?: SpeechLanguage
  pitch?: number
  onStart?: () => void
  onDone?: () => void
  onError?: (error: string) => void
}

// ============================================================
// RATE MAPPINGS
// expo-speech rate: 0.0 (slowest) to 1.0 (fastest), default ~0.5
// ============================================================

const RATE_MAP: Record<SpeechRate, number> = {
  slow: 0.65,
  normal: 0.85,
  fast: 1.0,
}

// ============================================================
// SPEAK — Main function
// Speaks English text with Indian English accent
// ============================================================

let isSpeaking = false

export async function speak(
  text: string,
  options: SpeechOptions = {}
): Promise<void> {
  const {
    rate = 'normal',
    language = 'en-IN',
    pitch = 1.0,
    onStart,
    onDone,
    onError,
  } = options

  // Stop any existing speech first
  await stopSpeaking()

  // Clean text — remove markdown, emoji for cleaner speech
  const cleanText = cleanTextForSpeech(text)
  if (!cleanText.trim()) return

  return new Promise((resolve) => {
    isSpeaking = true
    onStart?.()

    ExpoSpeech.speak(cleanText, {
      language,
      rate: RATE_MAP[rate],
      pitch,
      onStart: () => {
        isSpeaking = true
      },
      onDone: () => {
        isSpeaking = false
        onDone?.()
        resolve()
      },
      onError: (err) => {
        isSpeaking = false
        onError?.(err.message || 'Speech error')
        resolve()
      },
    })
  })
}

// ============================================================
// SPEAK WORD — For vocabulary, speaks slowly with emphasis
// ============================================================

export async function speakWord(
  word: string,
  options: { repeat?: number; language?: SpeechLanguage } = {}
): Promise<void> {
  const { repeat = 1, language = 'en-IN' } = options

  for (let i = 0; i < repeat; i++) {
    await speak(word, { rate: 'slow', language, pitch: 1.0 })
    if (i < repeat - 1) {
      await delay(500)
    }
  }
}

// ============================================================
// SPEAK SENTENCE — For dialogues and examples
// ============================================================

export async function speakSentence(
  sentence: string,
  language: SpeechLanguage = 'en-IN'
): Promise<void> {
  await speak(sentence, { rate: 'normal', language, pitch: 1.0 })
}

// ============================================================
// SPEAK TELUGU — Speaks Telugu text using device Telugu voice
// Falls back gracefully if Telugu voice not available
// ============================================================

export async function speakTelugu(text: string): Promise<void> {
  try {
    await speak(text, { language: 'te-IN', rate: 'normal', pitch: 1.0 })
  } catch {
    // Device may not have Telugu voice — silently skip
    console.log('[TTS] Telugu voice not available on this device')
  }
}

// ============================================================
// SPEAK PRONUNCIATION GUIDE
// Speaks phonetic transcription slowly
// ============================================================

export async function speakPhonetic(
  word: string,
  phonetic: string
): Promise<void> {
  // First say the word normally
  await speak(word, { rate: 'slow', language: 'en-US', pitch: 1.0 })
  await delay(400)
  // Then spell it out phonetically
  await speak(phonetic, { rate: 'slow', language: 'en-US', pitch: 0.9 })
}

// ============================================================
// STOP SPEAKING
// ============================================================

export async function stopSpeaking(): Promise<void> {
  try {
    const speaking = await ExpoSpeech.isSpeakingAsync()
    if (speaking) {
      ExpoSpeech.stop()
      isSpeaking = false
    }
  } catch { /* ignore */ }
}

// ============================================================
// IS SPEAKING
// ============================================================

export async function checkIsSpeaking(): Promise<boolean> {
  try {
    return await ExpoSpeech.isSpeakingAsync()
  } catch {
    return false
  }
}

// ============================================================
// GET AVAILABLE VOICES
// Returns list of available voices on the device
// ============================================================

export async function getAvailableVoices(): Promise<ExpoSpeech.Voice[]> {
  try {
    return await ExpoSpeech.getAvailableVoicesAsync()
  } catch {
    return []
  }
}

// ============================================================
// SPEAK DIALOGUE LINE
// Used in lesson dialogues — reads with natural pauses
// ============================================================

export async function speakDialogue(lines: Array<{ text: string; speaker: string }>): Promise<void> {
  for (const line of lines) {
    await speak(line.text, { rate: 'normal', language: 'en-IN' })
    await delay(600) // Natural pause between speakers
  }
}

// ============================================================
// HELPERS
// ============================================================

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[.*?\]/g, '') // Remove [brackets]
    .replace(/\(.*?\)/g, '') // Remove (parentheses)
    .replace(/[*_~`]/g, '')  // Remove markdown
    .replace(/💡|✅|❌|🔊|→|←|⭐|🎯|🏆|⚡|🔥|👋|😊|🎉/g, '') // Remove common emoji
    .replace(/\s+/g, ' ')
    .trim()
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
