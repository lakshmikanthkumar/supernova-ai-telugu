import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Speech from 'expo-speech'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { flashcardService, gamificationService } from '../../services/api'
import { getDynamicFlashcards, recordContentSeen } from '../../services/personalization/contentRotationService'
import { fetchFlashcards } from '../../store/slices/lessonsSlice'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width - 48

type Mode = 'smart' | 'shuffle' | 'weak_first'

const MODES: { key: Mode; label: string }[] = [
  { key: 'smart', label: 'Smart 🧠' },
  { key: 'shuffle', label: 'Shuffle 🔀' },
  { key: 'weak_first', label: 'Weak Words 💪' },
]

export default function FlashcardScreen() {
  const dispatch = useAppDispatch()
  const { flashcards: reduxFlashcards, loading: reduxLoading } = useAppSelector(s => s.lessons)
  const { profile } = useAppSelector(s => s.auth)
  const userId = profile?.id

  const [mode, setMode] = useState<Mode>('smart')
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    newWordsSeen: 0,
    weakWordsReviewed: 0,
  })
  const [sessionComplete, setSessionComplete] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const flipAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const loadCards = useCallback(async (selectedMode: Mode) => {
    setLoading(true)
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionStats({ correct: 0, incorrect: 0, newWordsSeen: 0, weakWordsReviewed: 0 })
    setSessionComplete(false)
    flipAnim.setValue(0)
    slideAnim.setValue(0)

    if (userId) {
      try {
        const dynamic = await getDynamicFlashcards(userId, { mode: selectedMode, limit: 20 })
        if (dynamic && dynamic.length > 0) {
          setCards(dynamic)
          setLoading(false)
          return
        }
      } catch (_) {}
    }

    // Fallback to Redux
    dispatch(fetchFlashcards({}))
  }, [userId, dispatch])

  useEffect(() => {
    loadCards(mode)
    return () => { Speech.stop() }
  }, [])

  // Sync fallback redux cards when dynamic load yields nothing
  useEffect(() => {
    if (!userId && !reduxLoading) {
      setCards(reduxFlashcards)
      setLoading(false)
    } else if (userId && !loading && cards.length === 0 && !reduxLoading) {
      setCards(reduxFlashcards)
      setLoading(false)
    }
  }, [reduxFlashcards, reduxLoading])

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode)
    loadCards(newMode)
  }

  const currentCard = cards[currentIndex]

  // Derived session info
  const newWords = cards.filter(c => !c.review_count || c.review_count === 0).length
  const reviewWords = cards.length - newWords
  const newWordsToday = cards.filter(
    c => (!c.review_count || c.review_count === 0) && currentIndex > cards.indexOf(c)
  ).length

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
    const card = currentCard
    const isNew = !card.review_count || card.review_count === 0
    const isWeak = card.review_count && (card.correct_count ?? 0) / card.review_count < 0.6

    // Update progress
    await flashcardService.updateFlashcardProgress(card.id, correct)

    // Record content seen via rotation service
    if (userId) {
      await recordContentSeen(userId, 'flashcard', card.id, correct ? 100 : 0)
    }

    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
      newWordsSeen: prev.newWordsSeen + (isNew ? 1 : 0),
      weakWordsReviewed: prev.weakWordsReviewed + (isWeak ? 1 : 0),
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
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(i => i + 1)
      } else {
        const total = sessionStats.correct + (correct ? 1 : 0) + sessionStats.incorrect + (correct ? 0 : 1)
        const earned = Math.round((sessionStats.correct + (correct ? 1 : 0)) / total * 50) + 10
        setXpEarned(earned)
        setSessionComplete(true)
        gamificationService.updateProgress('daily_checkin', undefined, earned)
      }
    })
  }

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#4F46E5" /></View>
  }

  if (cards.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🏃</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 }}>No Flashcards Yet</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 }}>
          Flashcard content is being added. Check back soon!
        </Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={{ marginTop: 24, padding: 12 }}>
          <Text style={{ color: '#4F46E5', fontWeight: '700', fontSize: 16 }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (flashcards.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🃏</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151', marginBottom: 8 }}>No Flashcards Yet</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 }}>
          Flashcard content is being added. Check back soon!
        </Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={{ marginTop: 24, padding: 12 }}>
          <Text style={{ color: '#D97706', fontWeight: '700', fontSize: 16 }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (sessionComplete) {
    const total = sessionStats.correct + sessionStats.incorrect
    const percentage = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#4F46E5', '#6D28D9']} style={styles.header}>
          <Text style={styles.headerTitle}>Session Complete! 🎉</Text>
        </LinearGradient>
        <View style={styles.resultsContainer}>
          <Text style={styles.resultEmoji}>{percentage >= 80 ? '🏆' : percentage >= 60 ? '😊' : '💪'}</Text>
          <Text style={styles.resultPercentage}>{percentage}%</Text>
          <Text style={styles.resultLabel}>Accuracy / ఖచ్చితత్వం</Text>

          {/* XP earned banner */}
          <View style={styles.xpBanner}>
            <Text style={styles.xpBannerText}>Great session! +{xpEarned} XP 🚀</Text>
          </View>

          {/* Detailed breakdown */}
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownTitle}>Session Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📖 New words seen</Text>
              <Text style={styles.breakdownValue}>{sessionStats.newWordsSeen}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>🔁 Weak words reviewed</Text>
              <Text style={styles.breakdownValue}>{sessionStats.weakWordsReviewed}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>✅ Correct</Text>
              <Text style={styles.breakdownValue}>{sessionStats.correct}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>❌ Incorrect</Text>
              <Text style={styles.breakdownValue}>{sessionStats.incorrect}</Text>
            </View>
          </View>

          <View style={styles.endButtonsRow}>
            <TouchableOpacity style={styles.studyAgainBtn} onPress={() => loadCards(mode)}>
              <Text style={styles.studyAgainBtnText}>Study Again 🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchModeBtn} onPress={() => {
              setSessionComplete(false)
              setLoading(false)
            }}>
              <Text style={styles.switchModeBtnText}>Switch Mode</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/home')}>
            <Text style={styles.homeBtnText}>Done → Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#6D28D9']} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏃 Flashcards</Text>
        <Text style={styles.headerSubtitle}>ఫ్లాష్‌కార్డ్స్</Text>
        <Text style={styles.progress}>{currentIndex + 1} / {cards.length}</Text>
      </LinearGradient>

      {/* Mode selector */}
      <View style={styles.modeSelector}>
        {MODES.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeTab, mode === m.key && styles.modeTabActive]}
            onPress={() => handleModeChange(m.key)}
          >
            <Text style={[styles.modeTabText, mode === m.key && styles.modeTabTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Session info banner */}
      <View style={styles.sessionBanner}>
        <Text style={styles.sessionBannerText}>
          📚 Session: {cards.length} cards | 🎯 {newWords} new | 🔁 {reviewWords} review
        </Text>
        {newWords > 0 && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{newWords} new today</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / cards.length) * 100}%` as any }]} />
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
              {(!currentCard.review_count || currentCard.review_count === 0) && (
                <View style={styles.newWordBadge}>
                  <Text style={styles.newWordBadgeText}>NEW</Text>
                </View>
              )}
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
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16 },
  backBtn: { color: 'white', fontSize: 24, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progress: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  // Mode selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeTabActive: { backgroundColor: '#4F46E5' },
  modeTabText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  modeTabTextActive: { color: 'white' },

  // Session banner
  sessionBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionBannerText: { fontSize: 12, color: '#4338CA', fontWeight: '500', flex: 1 },
  newBadge: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  newBadgeText: { fontSize: 11, color: 'white', fontWeight: '700' },

  progressBar: { height: 4, backgroundColor: '#C7D2FE', marginTop: 10 },
  progressFill: { height: 4, backgroundColor: '#4F46E5' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  correctStat: { fontSize: 16, fontWeight: '700', color: '#059669' },
  incorrectStat: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  hintText: { fontSize: 12, color: '#9CA3AF' },
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    width: CARD_WIDTH, minHeight: 280, borderRadius: 24, padding: 32,
    alignItems: 'center', justifyContent: 'center',
    elevation: 10, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25,
  },
  cardFront: { backgroundColor: 'white' },
  cardBack: { backgroundColor: '#F5F3FF', width: CARD_WIDTH, minHeight: 280, borderRadius: 24, padding: 32, alignItems: 'center', justifyContent: 'center' },
  cardLanguageLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  cardWord: { fontSize: 36, fontWeight: '900', color: '#111827', textAlign: 'center' },
  cardPhonetic: { fontSize: 18, color: '#6B7280', marginTop: 8 },
  cardMeaning: { fontSize: 30, fontWeight: '800', color: '#4F46E5', textAlign: 'center' },
  speakBtn: { marginTop: 20, backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  speakBtnText: { color: '#4F46E5', fontWeight: '600' },
  flipHint: { marginTop: 16, fontSize: 13, color: '#9CA3AF' },
  exampleBox: { marginTop: 16, backgroundColor: 'white', borderRadius: 12, padding: 14, width: '100%' },
  exampleLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' },
  exampleSentence: { fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20 },
  exampleSentenceTelugu: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  newWordBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#10B981', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  newWordBadgeText: { fontSize: 10, color: 'white', fontWeight: '800', letterSpacing: 0.5 },
  answerButtons: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, paddingBottom: 40 },
  answerBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  incorrectBtn: { backgroundColor: '#FEE2E2' },
  correctBtn: { backgroundColor: '#D1FAE5' },
  answerBtnText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  answerBtnSub: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  // Results
  resultsContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultEmoji: { fontSize: 64, marginBottom: 16 },
  resultPercentage: { fontSize: 64, fontWeight: '900', color: '#4F46E5' },
  resultLabel: { fontSize: 16, color: '#6B7280', marginBottom: 12 },
  xpBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  xpBannerText: { fontSize: 16, fontWeight: '700', color: '#4F46E5', textAlign: 'center' },
  breakdownBox: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  breakdownTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  breakdownLabel: { fontSize: 14, color: '#6B7280' },
  breakdownValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  endButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 12, width: '100%' },
  studyAgainBtn: { flex: 1, backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  studyAgainBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  switchModeBtn: { flex: 1, backgroundColor: '#EEF2FF', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  switchModeBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  homeBtn: { paddingVertical: 12 },
  homeBtnText: { color: '#6B7280', fontSize: 15 },
})
