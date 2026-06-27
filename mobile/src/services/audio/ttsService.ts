// ============================================================
// EnglishMitraAI - TTS Service
// Class wrapper over textToSpeech.ts; adds voice selection,
// queue management, and Indian English defaults.
// ============================================================

import * as ExpoSpeech from 'expo-speech'
import { Platform } from 'react-native'
import { speak as _speak, stopSpeaking, getAvailableVoices, type SpeechRate, type SpeechLanguage } from './textToSpeech'

export interface TTSOptions {
  voice?: string
  language?: SpeechLanguage
  rate?: SpeechRate
  pitch?: number
  volume?: number
  onStart?: () => void
  onDone?: () => void
  onError?: (error: Error) => void
}

class TTSService {
  private _isSpeaking = false
  private _isPaused = false
  private _queue: Array<{ text: string; options: TTSOptions }> = []
  private _selectedVoice: string | null = null
  private _processingQueue = false

  // ── Speak ─────────────────────────────────────────────────

  async speak(text: string, options: TTSOptions = {}): Promise<boolean> {
    if (!text?.trim()) return false

    try {
      this._isSpeaking = true

      await _speak(text, {
        language: options.language ?? 'en-IN',
        rate: options.rate ?? 'normal',
        pitch: options.pitch,
        onStart: options.onStart,
        onDone: () => {
          this._isSpeaking = false
          options.onDone?.()
        },
        onError: (msg: string) => {
          this._isSpeaking = false
          options.onError?.(new Error(msg))
        },
      })

      return true
    } catch (err: any) {
      this._isSpeaking = false
      options.onError?.(err instanceof Error ? err : new Error(String(err)))
      return false
    }
  }

  // ── Queue ─────────────────────────────────────────────────

  async speakQueue(texts: string[], options: TTSOptions = {}): Promise<void> {
    this._queue = texts.map(text => ({ text, options }))
    await this._processQueue()
  }

  private async _processQueue(): Promise<void> {
    if (this._processingQueue) return
    this._processingQueue = true

    while (this._queue.length > 0) {
      if (this._isPaused) {
        await new Promise<void>(resolve => {
          const check = setInterval(() => {
            if (!this._isPaused) { clearInterval(check); resolve() }
          }, 100)
        })
      }
      const item = this._queue.shift()!
      await this.speak(item.text, item.options)
    }

    this._processingQueue = false
  }

  // ── Controls ──────────────────────────────────────────────

  stop(): void {
    stopSpeaking()
    this._isSpeaking = false
    this._isPaused = false
    this._queue = []
    this._processingQueue = false
  }

  pause(): void {
    if (this._isSpeaking) {
      stopSpeaking()
      this._isPaused = true
      this._isSpeaking = false
    }
  }

  resume(): void {
    if (this._isPaused) {
      this._isPaused = false
      this._processQueue()
    }
  }

  // ── Voice selection ───────────────────────────────────────

  setVoice(voiceId: string): void {
    this._selectedVoice = voiceId
  }

  getSelectedVoice(): string | null {
    return this._selectedVoice
  }

  async getIndianVoices(): Promise<ExpoSpeech.Voice[]> {
    try {
      const all = await getAvailableVoices()
      return all.filter((v: ExpoSpeech.Voice) =>
        v.language === 'en-IN' ||
        (v.identifier ?? '').toLowerCase().includes('in') ||
        (v.name ?? '').toLowerCase().includes('indian')
      )
    } catch {
      return []
    }
  }

  async getAllVoices(): Promise<ExpoSpeech.Voice[]> {
    try {
      return await getAvailableVoices()
    } catch {
      return []
    }
  }

  // ── State ─────────────────────────────────────────────────

  getState(): { isSpeaking: boolean; isPaused: boolean; queueLength: number } {
    return {
      isSpeaking: this._isSpeaking,
      isPaused: this._isPaused,
      queueLength: this._queue.length,
    }
  }
}

export const ttsService = new TTSService()
