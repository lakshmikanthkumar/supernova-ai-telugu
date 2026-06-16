import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ActivityIndicator, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Speech from 'expo-speech'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { fetchFlashcards } from '../../store/slices/lessonsSlice'
import { flashcardService, gamificationService } from '../../services/api'
import type { Flashcard } from '../../types'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width - 48

export default function FlashcardScreen() {
  const dispatch = useAppDispatch()
  const { flashcards } = useAppSelector(s => s.lessons)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 })
  const [sessionComplete, setSessionComplete] = useState(false)
  const flipAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    dispatch(fetchFlashcards({}))
    return () => { Speech.stop() }
  }, [])

  const currentCard = flashcards[currentIndex]

  const flipCard = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start()
    setIsFlipped(!isFlipped)

    if (!isFlipped) {
      Speech.speak(currentCard.english_word, { language: 'en-IN', rate: 0.85 })
    }
  }

  const handleAnswer = async (correct: boolean) => {
    await flashcardService.updateFlashcardProgress(currentCard.id, correct)
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }))

    // Slide out animation
    Animated.timing(slideAnim, {
      toValue: correct ? -width : width,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      flipAnim.setValue(0)
      setIsFlipped(false)
      slideAnim.setValue(0)
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(i => i + 1)
      } else {
        setSessionComplete(true)
        // Award XP for completing a set
        gamificationService.updateProgress('daily_checkin', undefined, 10)
      }
    })
  }

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })

  if (flashcards.length === 0) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#D97706" /></View>
  }

  if (sessionComplete) {
    const total = sessionStats.correct + sessionStats.incorrect
    const percentage = Math.round((sessionStats.correct / total) * 100)
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#D97706', '#B45309']} style={styles.header}>
          <Text style={styles.headerTitle}>Session Complete! 🎉</Text>
        </LinearGradient>
        <View style={styles.resultsContainer}>
          <Text style={styles.resultEmoji}>{percentage >= 80 ? '🏆' : percentage >= 60 ? '😊' : '💪'}</Text>
          <Text style={styles.resultPercentage}>{percentage}%</Text>
          <Text style={styles.resultLabel}>Accuracy / ఖచ్చితత్వం</Text>
          <View style={styles.resultStats}>
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatNumber}>{sessionStats.correct}</Text>
              <Text style={styles.resultStatLabel}>✅ Correct</Text>
            </View>
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatNumber}>{sessionStats.incorrect}</Text>
              <Text style={styles.resultStatLabel}>❌ Incorrect</Text>
            </View>
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatNumber}>{total}</Text>
              <Text style={styles.resultStatLabel}>📚 Total</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.restartBtn} onPress={() => {
            setCurrentIndex(0)
            setSessionStats({ correct: 0, incorrect: 0 })
            setSessionComplete(false)
          }}>
            <Text style={styles.restartBtnText}>Review Again 🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.back()}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#D97706', '#B45309']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🃏 Flashcards</Text>
        <Text style={styles.headerSubtitle}>ఫ్లాష్‌కార్డ్స్</Text>
        <Text style={styles.progress}>{currentIndex + 1} / {flashcards.length}</Text>
      </LinearGradient>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / flashcards.length) * 100}%` }]} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.correctStat}>✅ {sessionStats.correct}</Text>
        <Text style={styles.hintText}>Tap card to flip</Text>
        <Text style={styles.incorrectStat}>❌ {sessionStats.incorrect}</Text>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
            {/* Front */}
            <Animated.View style={[
              styles.card, styles.cardFront,
              { transform: [{ rotateY: frontRotate }], backfaceVisibility: 'hidden' }
            ]}>
              <Text style={styles.cardLanguageLabel}>English</Text>
              <Text style={styles.cardWord}>{currentCard.english_word}</Text>
              {currentCard.pronunciation_guide && (
                <Text style={styles.cardPhonetic}>/{currentCard.pronunciation_guide}/</Text>
              )}
              <TouchableOpacity style={styles.speakBtn} onPress={() => Speech.speak(currentCard.english_word, { language: 'en-IN', rate: 0.85 })}>
                <Text style={styles.speakBtnText}>🔊 Listen</Text>
              </TouchableOpacity>
              <Text style={styles.flipHint}>Tap to see meaning →</Text>
            </Animated.View>

            {/* Back */}
            <Animated.View style={[
              styles.card, styles.cardBack,
              {
                transform: [{ rotateY: backRotate }],
                backfaceVisibility: 'hidden',
                position: 'absolute', top: 0, left: 0,
              }
            ]}>
              <Text style={styles.cardLanguageLabel}>తెలుగు</Text>
              <Text style={styles.cardMeaning}>{currentCard.telugu_meaning}</Text>
              {currentCard.example_sentence && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleLabel}>Example:</Text>
                  <Text style={styles.exampleSentence}>{currentCard.example_sentence}</Text>
                  {currentCard.example_sentence_telugu && (
                    <Text style={styles.exampleSentenceTelugu}>{currentCard.example_sentence_telugu}</Text>
                  )}
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Answer Buttons */}
      {isFlipped && (
        <View style={styles.answerButtons}>
          <TouchableOpacity style={[styles.answerBtn, styles.incorrectBtn]} onPress={() => handleAnswer(false)}>
            <Text style={styles.answerBtnText}>😅 Didn't Know</Text>
            <Text style={styles.answerBtnSub}>తెలియలేదు</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.answerBtn, styles.correctBtn]} onPress={() => handleAnswer(true)}>
            <Text style={styles.answerBtnText}>😊 Got It!</Text>
            <Text style={styles.answerBtnSub}>తెలుసు!</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBEB' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16 },
  backBtn: { color: 'white', fontSize: 24, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progress: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  progressBar: { height: 4, backgroundColor: '#FDE68A' },
  progressFill: { height: 4, backgroundColor: '#D97706' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  correctStat: { fontSize: 16, fontWeight: '700', color: '#059669' },
  incorrectStat: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  hintText: { fontSize: 12, color: '#9CA3AF' },
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    width: CARD_WIDTH, minHeight: 280, borderRadius: 24, padding: 32,
    alignItems: 'center', justifyContent: 'center',
    elevation: 10, shadowColor: '#D97706', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25,
  },
  cardFront: { backgroundColor: 'white' },
  cardBack: { backgroundColor: '#FFF7ED', width: CARD_WIDTH, minHeight: 280, borderRadius: 24, padding: 32, alignItems: 'center', justifyContent: 'center' },
  cardLanguageLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  cardWord: { fontSize: 36, fontWeight: '900', color: '#111827', textAlign: 'center' },
  cardPhonetic: { fontSize: 18, color: '#6B7280', marginTop: 8 },
  cardMeaning: { fontSize: 30, fontWeight: '800', color: '#D97706', textAlign: 'center' },
  speakBtn: { marginTop: 20, backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  speakBtnText: { color: '#4F46E5', fontWeight: '600' },
  flipHint: { marginTop: 16, fontSize: 13, color: '#9CA3AF' },
  exampleBox: { marginTop: 16, backgroundColor: 'white', borderRadius: 12, padding: 14, width: '100%' },
  exampleLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
  exampleSentence: { fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20 },
  exampleSentenceTelugu: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  answerButtons: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, paddingBottom: 40 },
  answerBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  incorrectBtn: { backgroundColor: '#FEE2E2' },
  correctBtn: { backgroundColor: '#D1FAE5' },
  answerBtnText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  answerBtnSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  resultsContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  resultEmoji: { fontSize: 64, marginBottom: 16 },
  resultPercentage: { fontSize: 64, fontWeight: '900', color: '#D97706' },
  resultLabel: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  resultStats: { flexDirection: 'row', gap: 24, marginBottom: 40 },
  resultStatItem: { alignItems: 'center' },
  resultStatNumber: { fontSize: 32, fontWeight: '800', color: '#111827' },
  resultStatLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  restartBtn: { backgroundColor: '#D97706', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginBottom: 12 },
  restartBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  homeBtn: { paddingVertical: 12 },
  homeBtnText: { color: '#6B7280', fontSize: 15 },
})
