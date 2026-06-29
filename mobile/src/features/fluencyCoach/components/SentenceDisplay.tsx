// ============================================================
// Fluency Coach — Sentence Display Component
// Renders story sentences with highlighting, fading, and
// per-word tap-for-meaning support.
// ============================================================

import React, { memo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../../store'
import type { StorySentence } from '../types'
import { openWordMeaning, fetchWordMeaning } from '../redux/fluencyCoachSlice'
import { ACCURACY_GOOD, ACCURACY_EXCELLENT } from '../constants'

interface SentenceDisplayProps {
  sentence: StorySentence
  index: number
  currentIndex: number
  score?: number    // 0-100 if already spoken
  onLayout?: (index: number, height: number) => void
}

const SentenceDisplay = memo(({
  sentence,
  index,
  currentIndex,
  score,
  onLayout,
}: SentenceDisplayProps) => {
  const dispatch = useDispatch<AppDispatch>()
  const isSessionActive = useSelector((s: RootState) => s.fluencyCoach.isSessionActive)
  const wordMeaningPopup = useSelector((s: RootState) => s.fluencyCoach.wordMeaningPopup)

  const isCurrent  = index === currentIndex
  const isPast     = index < currentIndex
  const isFuture   = index > currentIndex

  const handleWordPress = useCallback((word: string) => {
    if (!isSessionActive) return
    // Strip punctuation before lookup
    const clean = word.replace(/[^a-zA-Z']/g, '').toLowerCase()
    if (clean.length < 3) return
    dispatch(fetchWordMeaning(clean) as any)
  }, [dispatch, isSessionActive])

  const handleLayout = useCallback((event: any) => {
    if (onLayout) {
      onLayout(index, event.nativeEvent.layout.height)
    }
  }, [index, onLayout])

  const getAccuracyColor = (s: number) => {
    if (s >= ACCURACY_EXCELLENT) return '#4CAF50'
    if (s >= ACCURACY_GOOD)      return '#FF9800'
    return '#F44336'
  }

  const renderWords = () => {
    const words = sentence.sentence.split(' ')
    return words.map((word, wIdx) => (
      <TouchableOpacity
        key={`${index}_w${wIdx}`}
        onPress={() => handleWordPress(word)}
        activeOpacity={isSessionActive ? 0.6 : 1}
        accessibilityRole="button"
        accessibilityLabel={`Word: ${word}. Tap for Telugu meaning.`}
        accessibilityHint={isSessionActive ? 'Tap to see Telugu meaning' : undefined}
      >
        <Text
          style={[
            styles.word,
            isCurrent  && styles.wordCurrent,
            isPast     && styles.wordPast,
            isFuture   && styles.wordFuture,
          ]}
        >
          {word}{' '}
        </Text>
      </TouchableOpacity>
    ))
  }

  return (
    <View
      style={[
        styles.container,
        isCurrent && styles.containerCurrent,
        isPast    && styles.containerPast,
      ]}
      onLayout={handleLayout}
      accessibilityLabel={`Sentence ${index + 1}: ${sentence.sentence}`}
      accessible={!isSessionActive}
    >
      {/* Accuracy indicator for past sentences */}
      {isPast && score !== undefined && (
        <View style={[styles.scoreBar, { backgroundColor: getAccuracyColor(score) }]}>
          <Text style={styles.scoreText}>{score}%</Text>
        </View>
      )}

      <View style={styles.wordRow}>
        {renderWords()}
      </View>

      {/* Current sentence indicator */}
      {isCurrent && (
        <View style={styles.activeLine} accessibilityHidden />
      )}
    </View>
  )
})

SentenceDisplay.displayName = 'SentenceDisplay'

export default SentenceDisplay

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  containerCurrent: {
    backgroundColor: 'rgba(123, 97, 255, 0.08)',
    borderLeftColor: '#7B61FF',
    borderLeftWidth: 4,
  },
  containerPast: {
    opacity: 0.45,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  word: {
    fontSize: 19,
    lineHeight: 30,
    color: '#1A1A2E',
    letterSpacing: 0.2,
  },
  wordCurrent: {
    color: '#1A1A2E',
    fontWeight: '500',
  },
  wordPast: {
    color: '#6B7280',
  },
  wordFuture: {
    color: '#9CA3AF',
  },
  activeLine: {
    height: 2,
    width: 32,
    backgroundColor: '#7B61FF',
    borderRadius: 1,
    marginTop: 8,
    marginLeft: 2,
  },
  scoreBar: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  scoreText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
})
