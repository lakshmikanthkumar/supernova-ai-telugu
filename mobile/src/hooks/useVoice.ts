// ============================================================
// useVoice — React hook for voice recognition
// Wraps voiceService with component-safe lifecycle management.
// Automatically cancels on unmount to prevent crashes.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { Alert } from 'react-native'
import {
  voiceService,
  type VoiceState,
  type VoiceRecognitionResult,
} from '../services/audio/voiceService'
import { type RecognitionLanguage } from '../services/audio/voiceRecognitionService'

export interface UseVoiceOptions {
  language?: RecognitionLanguage
  timeout?: number
  onResult?: (text: string) => void
  onError?: (error: any) => void
  onStart?: () => void
  onStop?: () => void
}

export interface UseVoiceReturn {
  isListening: boolean
  state: VoiceState
  transcript: string
  partialTranscript: string
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  cancelListening: () => Promise<void>
  reset: () => void
  isSupported: boolean
  error: string | null
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false)
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const mounted = useRef(true)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // ── Init + cleanup ──────────────────────────────────────────

  useEffect(() => {
    mounted.current = true

    voiceService.initialize().catch((err) => {
      if (mounted.current) {
        setIsSupported(false)
        setError(String(err))
      }
    })

    return () => {
      mounted.current = false
      voiceService.cancelListening()
    }
  }, [])

  // ── Event listeners ─────────────────────────────────────────

  useEffect(() => {
    const onStart = () => {
      if (!mounted.current) return
      setIsListening(true)
      setState('listening')
      setError(null)
      optionsRef.current.onStart?.()
    }

    const onStop = () => {
      if (!mounted.current) return
      setIsListening(false)
      setState('idle')
      optionsRef.current.onStop?.()
    }

    const onResult = (result: VoiceRecognitionResult) => {
      if (!mounted.current) return
      setTranscript(result.text)
      setPartialTranscript('')
      optionsRef.current.onResult?.(result.text)
    }

    const onPartial = (result: VoiceRecognitionResult) => {
      if (!mounted.current) return
      setPartialTranscript(result.text)
    }

    const onError = (err: { message: string }) => {
      if (!mounted.current) return
      setIsListening(false)
      setState('error')
      const msg = err?.message ?? 'Speech recognition error'
      setError(msg)
      optionsRef.current.onError?.(err)
    }

    const onCancel = () => {
      if (!mounted.current) return
      setIsListening(false)
      setState('idle')
      setPartialTranscript('')
    }

    voiceService.on('start', onStart)
    voiceService.on('stop', onStop)
    voiceService.on('result', onResult)
    voiceService.on('partial', onPartial)
    voiceService.on('error', onError)
    voiceService.on('cancel', onCancel)

    return () => {
      voiceService.removeListener('start', onStart)
      voiceService.removeListener('stop', onStop)
      voiceService.removeListener('result', onResult)
      voiceService.removeListener('partial', onPartial)
      voiceService.removeListener('error', onError)
      voiceService.removeListener('cancel', onCancel)
    }
  }, [])

  // ── Actions ─────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (!isSupported) {
      Alert.alert('Not Supported', 'Speech recognition is not available on this device.')
      return
    }
    try {
      setTranscript('')
      setPartialTranscript('')
      setError(null)
      await voiceService.startListening({
        language: optionsRef.current.language ?? 'en-IN',
        timeout: optionsRef.current.timeout ?? 10000,
      })
    } catch (err: any) {
      if (!mounted.current) return
      const msg = err?.message ?? 'Failed to start voice recognition'
      setError(msg)
      setIsListening(false)
      setState('error')
      if (!msg.includes('cancel') && !msg.includes('aborted')) {
        Alert.alert('Microphone Error', msg)
      }
    }
  }, [isSupported])

  const stopListening = useCallback(async () => {
    try {
      await voiceService.stopListening()
      if (mounted.current) {
        setIsListening(false)
        setState('idle')
      }
    } catch {}
  }, [])

  const cancelListening = useCallback(async () => {
    try {
      await voiceService.cancelListening()
      if (mounted.current) {
        setIsListening(false)
        setState('idle')
        setPartialTranscript('')
      }
    } catch {}
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setPartialTranscript('')
    setError(null)
    setIsListening(false)
    setState('idle')
  }, [])

  return {
    isListening,
    state,
    transcript,
    partialTranscript,
    startListening,
    stopListening,
    cancelListening,
    reset,
    isSupported,
    error,
  }
}
