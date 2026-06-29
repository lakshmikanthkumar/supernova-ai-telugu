/**
 * /features/fluency-reader
 *
 * Reading session screen.
 * Accepts params: storyId (optional — falls back to Redux currentStory).
 *
 * Back-navigation flow:
 *   - If session is active → show confirm-before-exit alert
 *   - Else → go back normally
 *
 * Deep link: englishmitraai://fluency-reader/:storyId
 */
import React, { useEffect, useCallback } from 'react'
import { Alert, BackHandler, Platform } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../src/store'
import {
  selectStory,
  endSession,
} from '../../src/features/fluencyCoach/redux/fluencyCoachSlice'
import { fluencyCoachService } from '../../src/features/fluencyCoach/services/fluencyCoachService'
import StoryReaderScreen from '../../src/features/fluencyCoach/screens/StoryReaderScreen'

export default function FluencyReaderRoute() {
  const dispatch    = useDispatch<AppDispatch>()
  const { storyId } = useLocalSearchParams<{ storyId?: string }>()
  const currentStory     = useSelector((s: RootState) => s.fluencyCoach.currentStory)
  const isSessionActive  = useSelector((s: RootState) => s.fluencyCoach.isSessionActive)
  const stories          = useSelector((s: RootState) => s.fluencyCoach.stories)

  // ── Resolve story from deep-link param ───────────────────────
  useEffect(() => {
    if (!storyId || currentStory?.id === storyId) return
    const found = stories.find(s => s.id === storyId)
    if (found) dispatch(selectStory(found))
  }, [storyId, stories, currentStory?.id, dispatch])

  // ── Session recovery on mount ─────────────────────────────────
  useEffect(() => {
    if (currentStory) return  // already have an active story

    fluencyCoachService.getActiveSession().then(saved => {
      if (!saved) return
      const found = stories.find(s => s.id === saved.storyId)
      if (found) {
        dispatch(selectStory(found))
        // The StoryReaderScreen restores sentence index from the hook
      }
    })
  }, [])  // run only once on mount

  // ── Android hardware back button ──────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress()
      return true  // prevent default back
    })
    return () => handler.remove()
  }, [isSessionActive])  // re-register when session state changes

  const handleBackPress = useCallback(() => {
    if (!isSessionActive) {
      if (router.canGoBack()) router.back()
      else router.replace('/features/fluency-coach')
      return
    }

    Alert.alert(
      'Exit Reading Session?',
      'Your progress in this sentence will be lost. Reading stats so far are saved.',
      [
        { text: 'Keep Reading', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            dispatch(endSession())
            if (router.canGoBack()) router.back()
            else router.replace('/features/fluency-coach')
          },
        },
      ]
    )
  }, [isSessionActive, dispatch])

  return <StoryReaderScreen />
}
