// ============================================================
// useTTS — React hook for Text-to-Speech
// Wraps ttsService with component-safe lifecycle management.
// Automatically stops on unmount to prevent audio leaks.
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { ttsService, type TTSOptions } from '../services/audio/ttsService'
import { type SpeechLanguage, type SpeechRate } from '../services/audio/textToSpeech'

export interface UseTTSOptions {
  language?: SpeechLanguage
  rate?: SpeechRate
  pitch?: number
  onStart?: () => void
  onDone?: () => void
  onError?: (error: Error) => void
}

export interface UseTTSReturn {
  isSpeaking: boolean
  isPaused: boolean
  speak: (text: string, overrides?: Partial<UseTTSOptions>) => Promise<boolean>
  speakQueue: (texts: string[]) => Promise<void>
  stop: () => void
  pause: () => void
  resume: () => void
  getIndianVoices: () => Promise<any[]>
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const mounted = useRef(true)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      ttsService.stop()
    }
  }, [])

  const speak = useCallback(
    async (text: string, overrides: Partial<UseTTSOptions> = {}): Promise<boolean> => {
      if (!mounted.current) return false

      const merged = { ...optionsRef.current, ...overrides }

      setIsSpeaking(true)
      setIsPaused(false)

      const opts: TTSOptions = {
        language: merged.language ?? 'en-IN',
        rate: merged.rate ?? 'normal',
        pitch: merged.pitch,
        onStart: () => {
          if (mounted.current) setIsSpeaking(true)
          merged.onStart?.()
        },
        onDone: () => {
          if (mounted.current) { setIsSpeaking(false); setIsPaused(false) }
          merged.onDone?.()
        },
        onError: (err) => {
          if (mounted.current) { setIsSpeaking(false); setIsPaused(false) }
          merged.onError?.(err)
        },
      }

      const success = await ttsService.speak(text, opts)
      if (mounted.current) setIsSpeaking(false)
      return success
    },
    []
  )

  const speakQueue = useCallback(async (texts: string[]) => {
    if (!mounted.current) return
    await ttsService.speakQueue(texts, {
      language: optionsRef.current.language ?? 'en-IN',
      rate: optionsRef.current.rate ?? 'normal',
    })
  }, [])

  const stop = useCallback(() => {
    ttsService.stop()
    setIsSpeaking(false)
    setIsPaused(false)
  }, [])

  const pause = useCallback(() => {
    ttsService.pause()
    setIsPaused(true)
    setIsSpeaking(false)
  }, [])

  const resume = useCallback(() => {
    ttsService.resume()
    setIsPaused(false)
    setIsSpeaking(true)
  }, [])

  const getIndianVoices = useCallback(() => ttsService.getIndianVoices(), [])

  return { isSpeaking, isPaused, speak, speakQueue, stop, pause, resume, getIndianVoices }
}
