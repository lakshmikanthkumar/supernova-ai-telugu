// ============================================================
// Fluency Coach — Session Orchestration Hook
// Coordinates: voice recognition ↔ sentence tracking ↔ Redux
// ============================================================

import { useEffect, useRef, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../../store'
import {
  startListening, stopListening, initializeSpeechRecognition,
  destroySpeechRecognition,
} from '../../../services/audio/speechRecognition'
import {
  beginSession, pauseSession, resumeSession, endSession,
  advanceSentence, setSentenceIndex,
  setListening, setPartialTranscript,
  recordSentenceResult, recordPause,
  setLiveFeedback,
  startReadingSession, generateAIFeedback, saveSessionResults,
} from '../redux/fluencyCoachSlice'
import { VoiceReadingTracker, PauseDetector } from '../services/voiceReadingTracker'
import { fluencyCoachService } from '../services/fluencyCoachService'
import { LIVE_FEEDBACK_MESSAGES, PAUSE_HINT_THRESHOLD } from '../constants'
import type { LiveFeedbackType } from '../types'

const SENTENCE_COMPLETION_THRESHOLD = 65   // accuracy % to auto-advance

export function useFluencySession() {
  const dispatch = useDispatch<AppDispatch>()
  const story          = useSelector((s: RootState) => s.fluencyCoach.currentStory)
  const sentenceIndex  = useSelector((s: RootState) => s.fluencyCoach.currentSentenceIndex)
  const isListening    = useSelector((s: RootState) => s.fluencyCoach.isListening)
  const isPaused       = useSelector((s: RootState) => s.fluencyCoach.isPaused)
  const isSessionActive = useSelector((s: RootState) => s.fluencyCoach.isSessionActive)
  const sessionId      = useSelector((s: RootState) => s.fluencyCoach.sessionId)
  const sessionStats   = useSelector((s: RootState) => s.fluencyCoach.sessionStats)
  const scrollMode     = useSelector((s: RootState) => s.fluencyCoach.scrollMode)

  const tracker    = useRef(new VoiceReadingTracker())
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted  = useRef(true)
  const autoRestartCount = useRef(0)
  const MAX_AUTO_RESTARTS = 5

  // ── CLEANUP HELPERS ───────────────────────────────────────

  const clearPauseTimer = useCallback(() => {
    if (pauseTimer.current) {
      clearTimeout(pauseTimer.current)
      pauseTimer.current = null
    }
  }, [])

  const showFeedback = useCallback((type: LiveFeedbackType) => {
    if (!isMounted.current) return
    const msgs = LIVE_FEEDBACK_MESSAGES[type]
    dispatch(setLiveFeedback({ type, message: msgs.en, timestamp: Date.now() }))
    setTimeout(() => {
      if (isMounted.current) dispatch(setLiveFeedback(null))
    }, 3000)
  }, [dispatch])

  // ── START VOICE ───────────────────────────────────────────

  const startVoice = useCallback(async () => {
    if (!story?.sentences || !isMounted.current) return

    const sentence = story.sentences[sentenceIndex]
    if (!sentence) return

    tracker.current.startSentence()

    await startListening({
      language:       'en-IN',
      partialResults: true,

      onPartialResult: (text) => {
        if (!isMounted.current) return
        dispatch(setPartialTranscript(text))
        tracker.current.onPartialResult()
        clearPauseTimer()

        // Schedule pause detection
        pauseTimer.current = setTimeout(() => {
          if (!isMounted.current || !isListening) return
          dispatch(recordPause(PAUSE_HINT_THRESHOLD))
          showFeedback('pause_detected')
        }, PAUSE_HINT_THRESHOLD)
      },

      onFinalResult: async (result) => {
        if (!isMounted.current) return
        clearPauseTimer()
        dispatch(setPartialTranscript(''))
        autoRestartCount.current = 0

        const matchResult = tracker.current.analyseSentence(
          sentence, result.transcript, sentenceIndex
        )
        dispatch(recordSentenceResult(matchResult))

        // Live feedback based on WPM + accuracy
        const feedbackType = tracker.current.getLiveFeedbackType(
          matchResult.wpm, matchResult.accuracy
        ) as LiveFeedbackType | null
        if (feedbackType) showFeedback(feedbackType)

        // Advance to next sentence if threshold met
        const isLastSentence = sentenceIndex >= (story.sentences?.length ?? 1) - 1
        if (matchResult.accuracy >= SENTENCE_COMPLETION_THRESHOLD || isLastSentence) {
          if (isLastSentence) {
            showFeedback('almost_done')
            await handleSessionComplete()
          } else {
            dispatch(advanceSentence())
            // Restart listening for next sentence (small delay for UX)
            setTimeout(() => {
              if (isMounted.current && !isPaused) startVoice()
            }, 400)
          }
        } else {
          // Low accuracy — restart for the same sentence (retry)
          setTimeout(() => {
            if (isMounted.current && !isPaused) startVoice()
          }, 400)
        }
      },

      onError: (errorMessage) => {
        if (!isMounted.current) return
        clearPauseTimer()
        dispatch(setPartialTranscript(''))

        // Auto-restart on transient errors (network blip, no speech detected, etc.)
        const isTransient = errorMessage.includes('No speech') ||
          errorMessage.includes('busy') || errorMessage.includes('7')

        if (isTransient && autoRestartCount.current < MAX_AUTO_RESTARTS) {
          autoRestartCount.current += 1
          setTimeout(() => {
            if (isMounted.current && !isPaused) startVoice()
          }, 600 * autoRestartCount.current)  // exponential backoff
        } else {
          dispatch(setListening(false))
        }
      },

      onEnd: () => {
        if (!isMounted.current) return
        dispatch(setListening(false))
        clearPauseTimer()
      },
    })
    if (isMounted.current) dispatch(setListening(true))
  }, [
    story, sentenceIndex, dispatch, clearPauseTimer,
    showFeedback, isPaused, isListening,
  ])

  // ── START SESSION ─────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (!story) return
    initializeSpeechRecognition()
    dispatch(beginSession())
    dispatch(startReadingSession(story.id))
    tracker.current.reset()
    autoRestartCount.current = 0
    await startVoice()
  }, [story, dispatch, startVoice])

  // ── PAUSE / RESUME ────────────────────────────────────────

  const handlePause = useCallback(async () => {
    clearPauseTimer()
    dispatch(pauseSession())
    await stopListening()
    if (story && sessionStats) {
      await fluencyCoachService.saveActiveSession(story.id, sentenceIndex, sessionStats)
    }
  }, [dispatch, clearPauseTimer, story, sessionStats, sentenceIndex])

  const handleResume = useCallback(async () => {
    dispatch(resumeSession())
    autoRestartCount.current = 0
    await startVoice()
  }, [dispatch, startVoice])

  // ── COMPLETE ──────────────────────────────────────────────

  const handleSessionComplete = useCallback(async () => {
    clearPauseTimer()
    await stopListening()
    dispatch(endSession())
    await fluencyCoachService.clearActiveSession()

    if (!story || !sessionStats) return

    // Generate AI feedback + save — both run concurrently
    await Promise.all([
      dispatch(generateAIFeedback({ story, stats: { ...sessionStats, endTime: Date.now() } })),
      dispatch(saveSessionResults({
        sessionId: sessionId ?? `local_${Date.now()}`,
        storyId: story.id,
        stats: { ...sessionStats, endTime: Date.now() },
        feedback: null,  // will be updated on feedback fulfilled
      })),
    ])
  }, [dispatch, clearPauseTimer, story, sessionStats, sessionId])

  // ── APP BACKGROUND / FOREGROUND ──────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (next === 'background' && isSessionActive && !isPaused) {
        await handlePause()
      }
      // Don't auto-resume on foreground — let user explicitly tap Resume
    })
    return () => sub.remove()
  }, [isSessionActive, isPaused, handlePause])

  // ── MOUNT / UNMOUNT ───────────────────────────────────────

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      clearPauseTimer()
      stopListening().catch(() => {})
      destroySpeechRecognition()
    }
  }, [clearPauseTimer])

  // ── SENTENCE CHANGE: restart listening when voice-controlled ─

  useEffect(() => {
    if (scrollMode === 'voice_controlled' && isListening && isSessionActive && !isPaused) {
      tracker.current.startSentence()
    }
  }, [sentenceIndex, scrollMode, isListening, isSessionActive, isPaused])

  return {
    handleStart,
    handlePause,
    handleResume,
    handleSessionComplete,
    isSessionActive,
    isPaused,
    isListening,
  }
}
