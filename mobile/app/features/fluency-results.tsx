/**
 * /features/fluency-results
 *
 * Session results screen.
 * Receives params: sessionId, fluencyScore, pronunciationScore (all optional —
 * the screen reads directly from Redux state as source of truth).
 * Params are used only for analytics / future server-side lookup.
 *
 * Prevents duplicate back-navigation into the reader.
 */
import React, { useEffect, useRef } from 'react'
import { BackHandler, Platform } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import SessionResultsScreen from '../../src/features/fluencyCoach/screens/SessionResultsScreen'

export default function FluencyResultsRoute() {
  // Consume params for telemetry (not for rendering — Redux is the source of truth)
  useLocalSearchParams<{
    sessionId?:        string
    fluencyScore?:     string
    pronunciationScore?: string
    score?:            string
  }>()

  const navigationGuard = useRef(false)

  // Block the reader from being shown again via Android back
  useEffect(() => {
    if (Platform.OS !== 'android') return

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigationGuard.current) {
        navigationGuard.current = true
        router.replace('/features/fluency-coach')
      }
      return true
    })
    return () => handler.remove()
  }, [])

  return <SessionResultsScreen />
}
