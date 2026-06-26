import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'

interface XPToastProps {
  xp: number        // amount of XP earned
  visible: boolean
  onHide: () => void
}

const DISPLAY_DURATION_MS = 2500
const ANIMATION_DURATION_MS = 320
const RISE_DISTANCE = 60

export default function XPToast({ xp, visible, onHide }: XPToastProps) {
  const translateY = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // Reset to starting position (below final resting place)
      translateY.setValue(RISE_DISTANCE)
      opacity.setValue(0)

      // Slide up + fade in with a spring feel
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto-dismiss after DISPLAY_DURATION_MS
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: RISE_DISTANCE,
            duration: ANIMATION_DURATION_MS,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: ANIMATION_DURATION_MS,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            onHide()
          }
        })
      }, DISPLAY_DURATION_MS)

      return () => clearTimeout(timer)
    } else {
      // If externally hidden without waiting for the timer, snap invisible
      opacity.setValue(0)
      translateY.setValue(RISE_DISTANCE)
    }
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        <Text style={styles.text}>⚡ +{xp} XP</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // sits above the tab bar (tab bar ~60px + 30px breathing room)
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    // Prevent the absolutely-positioned toast from consuming taps
    pointerEvents: 'none',
  } as any,
  pill: {
    backgroundColor: '#7B61FF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    elevation: 6,
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  text: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
})
