// ============================================================
// Fluency Coach — Auto-Scroll Engine Hook
// Drives a ScrollView to advance at the configured WPM pace.
// ============================================================

import { useRef, useEffect, useCallback } from 'react'
import { ScrollView, Animated } from 'react-native'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import { BASE_SCROLL_PPS } from '../constants'

interface UseAutoScrollOptions {
  scrollViewRef: React.RefObject<ScrollView>
  sentenceHeights:  Record<number, number>   // sentenceIndex → height in px
  totalContentHeight: number
}

export function useAutoScroll({
  scrollViewRef,
  sentenceHeights,
  totalContentHeight,
}: UseAutoScrollOptions) {
  const isPaused      = useSelector((s: RootState) => s.fluencyCoach.isPaused)
  const isSessionActive = useSelector((s: RootState) => s.fluencyCoach.isSessionActive)
  const sentenceIndex = useSelector((s: RootState) => s.fluencyCoach.currentSentenceIndex)
  const speedMult     = useSelector((s: RootState) => s.fluencyCoach.scrollSpeedMultiplier)
  const scrollMode    = useSelector((s: RootState) => s.fluencyCoach.scrollMode)

  const animRef      = useRef<Animated.CompositeAnimation | null>(null)
  const scrollY      = useRef(new Animated.Value(0)).current
  const currentScrollY = useRef(0)

  // Track current scroll offset imperatively (Animated.Value changes are non-blocking)
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => { currentScrollY.current = value })
    return () => scrollY.removeListener(id)
  }, [scrollY])

  // ── SCROLL TO SENTENCE ─────────────────────────────────────
  // Called whenever sentenceIndex changes.
  const scrollToSentence = useCallback((index: number) => {
    if (!scrollViewRef.current) return

    // Compute Y offset: sum of heights of all sentences before this one
    let targetY = 0
    for (let i = 0; i < index; i++) {
      targetY += sentenceHeights[i] ?? 60
    }
    // Keep a small top margin so the current sentence isn't flush with the top
    targetY = Math.max(0, targetY - 80)

    scrollViewRef.current.scrollTo({ y: targetY, animated: true })
  }, [scrollViewRef, sentenceHeights])

  // ── AUTO-SCROLL ANIMATION ─────────────────────────────────
  // Runs a continuous scroll animation when in 'auto' mode.
  const startAutoScroll = useCallback(() => {
    if (scrollMode !== 'auto' || !isSessionActive || isPaused) return

    animRef.current?.stop()

    const pps = BASE_SCROLL_PPS * speedMult
    const remaining = totalContentHeight - currentScrollY.current
    if (remaining <= 0) return
    const duration = (remaining / pps) * 1000

    animRef.current = Animated.timing(scrollY, {
      toValue:         totalContentHeight,
      duration,
      useNativeDriver: true,
    })

    animRef.current.start(({ finished }) => {
      if (finished) animRef.current = null
    })
  }, [scrollMode, isSessionActive, isPaused, speedMult, totalContentHeight, scrollY])

  const stopAutoScroll = useCallback(() => {
    animRef.current?.stop()
    animRef.current = null
  }, [])

  // ── EFFECTS ───────────────────────────────────────────────

  // Scroll to current sentence when sentenceIndex changes
  useEffect(() => {
    if (scrollMode === 'voice_controlled' || scrollMode === 'auto') {
      scrollToSentence(sentenceIndex)
    }
  }, [sentenceIndex, scrollMode, scrollToSentence])

  // Pause/resume auto-scroll
  useEffect(() => {
    if (!isSessionActive) return
    if (isPaused) {
      stopAutoScroll()
    } else if (scrollMode === 'auto') {
      startAutoScroll()
    }
  }, [isPaused, isSessionActive, scrollMode, startAutoScroll, stopAutoScroll])

  // Start auto-scroll when session becomes active
  useEffect(() => {
    if (isSessionActive && !isPaused && scrollMode === 'auto') {
      startAutoScroll()
    }
    if (!isSessionActive) stopAutoScroll()
  }, [isSessionActive, scrollMode, startAutoScroll, stopAutoScroll, isPaused])

  // Update speed without restarting (re-calc remaining distance)
  useEffect(() => {
    if (isSessionActive && !isPaused && scrollMode === 'auto') {
      startAutoScroll()
    }
  }, [speedMult])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopAutoScroll() }
  }, [stopAutoScroll])

  return {
    scrollY,
    scrollToSentence,
    startAutoScroll,
    stopAutoScroll,
  }
}
