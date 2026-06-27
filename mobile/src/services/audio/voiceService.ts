// ============================================================
// EnglishMitraAI - Unified Voice Service
// Wraps voiceRecognitionService with a class-based API,
// event emitter pattern, and safe component lifecycle hooks.
// ============================================================

import {
  startListening,
  stopListening,
  cancelListening,
  destroySpeechRecognition,
  initializeSpeechRecognition,
  requestMicrophonePermission,
  isSpeechRecognitionAvailable,
  getIsListening,
  type RecognitionLanguage,
  type SpeechRecognitionOptions,
} from './voiceRecognitionService'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'error'

export interface VoiceRecognitionResult {
  text: string
  confidence: number
  isFinal: boolean
}

type EventCallback = (...args: any[]) => void

class VoiceService {
  private _state: VoiceState = 'idle'
  private _listeners: Map<string, EventCallback[]> = new Map()
  private _initialized = false

  // ── Initialization ──────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this._initialized) return
    initializeSpeechRecognition()
    this._initialized = true
  }

  // ── Core API ────────────────────────────────────────────────

  async startListening(options: {
    language?: RecognitionLanguage
    timeout?: number
    sessionId?: string
  } = {}): Promise<VoiceRecognitionResult> {
    if (!this._initialized) await this.initialize()

    const hasPermission = await requestMicrophonePermission()
    if (!hasPermission) throw new Error('Microphone permission denied')

    const available = await isSpeechRecognitionAvailable()
    if (!available) throw new Error('Speech recognition is not available on this device')

    this._setState('listening')
    this._emit('start', { sessionId: options.sessionId })

    return new Promise((resolve, reject) => {
      const opts: SpeechRecognitionOptions = {
        language: options.language ?? 'en-IN',
        partialResults: true,
        onPartialResult: (text: string) => {
          this._emit('partial', { text, confidence: 0.5, isFinal: false } as VoiceRecognitionResult)
        },
        onFinalResult: (result) => {
          this._setState('idle')
          const vr: VoiceRecognitionResult = {
            text: result.transcript,
            confidence: result.confidence,
            isFinal: true,
          }
          this._emit('result', vr)
          resolve(vr)
        },
        onError: (err: string) => {
          this._setState('error')
          this._emit('error', { message: err })
          reject(new Error(err))
        },
        onStart: () => {
          this._setState('listening')
          this._emit('listening')
        },
        onEnd: () => {
          this._setState('idle')
          this._emit('end')
        },
      }

      startListening(opts).catch((err) => {
        this._setState('error')
        this._emit('error', { message: String(err) })
        reject(err)
      })

      if (options.timeout) {
        setTimeout(() => {
          if (getIsListening()) {
            this.stopListening()
          }
        }, options.timeout)
      }
    })
  }

  async stopListening(): Promise<void> {
    this._setState('processing')
    await stopListening()
    this._setState('idle')
    this._emit('stop')
  }

  async cancelListening(): Promise<void> {
    await cancelListening()
    this._setState('idle')
    this._emit('cancel')
  }

  async destroy(): Promise<void> {
    await destroySpeechRecognition()
    this._initialized = false
    this._setState('idle')
    this._listeners.clear()
  }

  // ── State ────────────────────────────────────────────────────

  getState(): VoiceState {
    return this._state
  }

  isActive(): boolean {
    return getIsListening()
  }

  // ── Events ───────────────────────────────────────────────────

  on(event: string, cb: EventCallback): void {
    if (!this._listeners.has(event)) this._listeners.set(event, [])
    this._listeners.get(event)!.push(cb)
  }

  once(event: string, cb: EventCallback): void {
    const wrapper: EventCallback = (...args) => {
      cb(...args)
      this.removeListener(event, wrapper)
    }
    this.on(event, wrapper)
  }

  removeListener(event: string, cb: EventCallback): void {
    const list = this._listeners.get(event)
    if (!list) return
    const idx = list.indexOf(cb)
    if (idx > -1) list.splice(idx, 1)
  }

  private _emit(event: string, data?: any): void {
    this._listeners.get(event)?.forEach(cb => cb(data))
  }

  private _setState(s: VoiceState): void {
    this._state = s
  }
}

export const voiceService = new VoiceService()
