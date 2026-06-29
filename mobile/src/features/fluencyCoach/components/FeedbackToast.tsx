// ============================================================
// Fluency Coach — Live Feedback Toast
// Slides in from bottom with contextual coaching messages.
// ============================================================

import React, { memo, useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet, AccessibilityInfo } from 'react-native'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'

export const FeedbackToast = memo(() => {
  const liveFeedback = useSelector((s: RootState) => s.fluencyCoach.liveFeedback)
  const translateY   = useRef(new Animated.Value(80)).current
  const opacity      = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!liveFeedback) {
      Animated.parallel([
        Animated.timing(opacity,     { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY,  { toValue: 80, duration: 200, useNativeDriver: true }),
      ]).start()
      return
    }

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start()

    // Announce to screen reader
    AccessibilityInfo.announceForAccessibility(liveFeedback.message)
  }, [liveFeedback, translateY, opacity])

  if (!liveFeedback) return null

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }] }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={liveFeedback.message}
    >
      <Text style={styles.text}>{liveFeedback.message}</Text>
    </Animated.View>
  )
})
FeedbackToast.displayName = 'FeedbackToast'

const styles = StyleSheet.create({
  container: {
    position:         'absolute',
    bottom:           100,
    alignSelf:        'center',
    backgroundColor:  'rgba(26, 26, 46, 0.88)',
    borderRadius:     24,
    paddingHorizontal: 22,
    paddingVertical:   12,
    maxWidth:         '85%',
    elevation:         8,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.25,
    shadowRadius:     8,
  },
  text: {
    color:      'white',
    fontSize:   15,
    fontWeight: '600',
    textAlign:  'center',
  },
})
