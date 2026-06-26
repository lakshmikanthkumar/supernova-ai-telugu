import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ActivityIndicator, Dimensions, ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Speech from 'expo-speech'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { flashcardService, gamificationService } from '../../services/api'
import { getDynamicFlashcards, recordContentSeen } from '../../services/personalization/contentRotationService'
import { Colors } from '../../constants/theme'
import type { Flashcard } from '../../types'
import { fetchFlashcards } from '../../store/slices/lessonsSlice'

const { width } = Dimensions.get('window')
const CARD_WIDTH = width - 48

type Mode = 'smart' | 'shuffle' | 'weak_first'

const MODES: { key: Mode; label: string }[] = [
  { key: 'smart', label: 'Smart 🧠' },
  { key: 'shuffle', label: 'Shuffle 🔀' },
  { key: 'weak_first', label: 'Weak Words 💪' },
]

// SM-2 confidence ratings
const CONFIDENCE_RATINGS = [
  { value: 0, label: 'Again', sublabel: 'మళ్ళీ చూడు', color: '#EF4444', bg: '#FEF2F2', size: 'small' },
  { value: 1, label: 'Hard',  sublabel: 'కష్టం',      color: '#F97316', bg: '#FFF7ED', size: 'small' },
  { value: 2, label: 'Good',  sublabel: 'సరే!',        color: '#10B981', bg: '#ECFDF5', size: 'large' },
  { value: 3, label: 'Easy',  sublabel: 'చాలా సులభం', color: Colors.primary, bg: '#FFF3EE', size: 'large' },
] as const

function computeSM2Stats(cards: any[], sessionCorrect: number, sessionTotal: number) {
  const now = new Date()
  const dueToday = cards.filter(c => {
    if (!c.next_review_at) return true
    return new Date(c.next_review_at) <= now
  }).length
  const mastered = cards.filter(c => (c.ease_factor ?? 2.5) >= 2.5).length
  const learning = cards.filter(c => (c.interval_days ?? 0) < 7).length
  const accuracy = sessionTotal > 0 ? Math.round((sessionCorrect / sessionTotal) * 100) : 0
  return { dueToday, mastered, learning, accuracy }
}

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
  const cardScaleAnim = useRef(new Animated.Value(1)).current

  const loadCards = useCallback(async (selectedMode: Mode) => {
    setLoading(true)
    setCurrentIndex(0)
    setIsFlipped(false)
    setSessionStats({ correct: 0, incorrect: 0, newWordsSeen: 0, weakWordsReviewed: 0 })
    setSessionComplete(false)
    flipAnim.setValue(0)
    slideAnim.setValue(0)
    cardScaleAnim.setValue(1)

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

  // Session-level SM-2 stats
  const sessionTotal = sessionStats.correct + sessionStats.incorrect
  const sm2Stats = computeSM2Stats(cards, sessionStats.correct, sessionTotal)

  // Derived session info
  const newWords = cards.filter(c => !c.review_count || c.review_count === 0).length
  const reviewWords = cards.length - newWords

  // Flip animation: rotateY 0 → 180 (front disappears) → back appears
  const flipCard = () => {
    if (isFlipped) return // prevent re-flip when answer buttons are showing

    Animated.parallel([
      Animated.spring(flipAnim, {
        toValue: 1,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(cardScaleAnim, { toValue: 0.97, duration: 100, useNativeDriver: true }),
        Animated.timing(cardScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]),
    ]).start()

    setIsFlipped(true)
    Speech.speak(currentCard.english_word, { language: 'en-IN', rate: 0.85 })
  }

  // rating: 0=Again, 1=Hard, 2=Good, 3=Easy
  const handleConfidence = async (rating: 0 | 1 | 2 | 3) => {
    const card = currentCard
    const correct = rating >= 2
    const isNew = !card.review_count || card.review_count === 0
    const isWeak = card.review_count && (card.correct_count ?? 0) / card.review_count < 0.6

    // Update SM-2 progress (pass rating for SM-2 algorithm)
    await flashcardService.updateFlashcardProgress(card.id, correct)

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
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      flipAnim.setValue(0)
      setIsFlipped(false)
      slideAnim.setValue(0)
      cardScaleAnim.setValue(1)
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(i => i + 1)
      } else {
        const newCorrect = sessionStats.correct + (correct ? 1 : 0)
        const newTotal = sessionTotal + 1
        const earned = newTotal > 0 ? newCorrect * 5 + 10 : 10
        setXpEarned(earned)
        setSessionComplete(true)
        gamificationService.updateProgress('daily_checkin', undefined, earned)
      }
    })
  }

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (cards.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🏃</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 }}>No Flashcards Yet</Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 }}>
          Flashcard content is being added. Check back soon!
        </Text>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={{ marginTop: 24, padding: 12 }}>
          <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 16 }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Session Complete ─────────────────────────────────────────────────────
  if (sessionComplete) {
    const total = sessionStats.correct + sessionStats.incorrect
    const percentage = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0
    const encouragements = [
      'అద్భుతం! మీరు చాలా బాగా చేశారు! 🌟',
      'శభాష్! మీ కష్టం ఫలించింది! 💪',
      'వావ్! అద్భుతమైన ప్రదర్శన! 🎉',
    ]
    const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)]

    return (
      <View style={styles.container}>
        <LinearGradient colors={Colors.gradient} style={styles.header}>
          <Text style={styles.headerTitle}>Session Complete! 🎉</Text>
          <Text style={styles.headerSubtitle}>అభ్యాసం పూర్తయింది!</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.resultsContainer}>
          <Text style={styles.resultEmoji}>{percentage >= 80 ? '🏆' : percentage >= 60 ? '😊' : '💪'}</Text>
          <Text style={styles.resultPercentage}>{percentage}%</Text>
          <Text style={styles.resultLabel}>Accuracy / ఖచ్చితత్వం</Text>

          {/* Telugu encouragement */}
          <View style={styles.encouragementBox}>
            <Text style={styles.encouragementText}>{encouragement}</Text>
          </View>

          {/* XP earned banner */}
          <View style={styles.xpBanner}>
            <Text style={styles.xpBannerText}>+{xpEarned} XP earned! 🚀</Text>
          </View>

          {/* Detailed breakdown */}
          <View style={styles.breakdownBox}>
            <Text style={styles.breakdownTitle}>Session Breakdown</Text>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📋 Total Reviewed</Text>
              <Text style={styles.breakdownValue}>{total}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>✅ Correct (Good + Easy)</Text>
              <Text style={[styles.breakdownValue, { color: '#10B981' }]}>{sessionStats.correct}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>❌ Again + Hard</Text>
              <Text style={[styles.breakdownValue, { color: Colors.error }]}>{sessionStats.incorrect}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>📖 New words seen</Text>
              <Text style={styles.breakdownValue}>{sessionStats.newWordsSeen}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>🔁 Weak words reviewed</Text>
              <Text style={styles.breakdownValue}>{sessionStats.weakWordsReviewed}</Text>
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
            <Text style={styles.homeBtnText}>Return Home →</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  // ── Main Study Screen ────────────────────────────────────────────────────
  const progressPct = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Colors.gradient} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Flashcards</Text>
            <Text style={styles.headerSubtitle}>ఫ్లాష్‌కార్డ్స్</Text>
          </View>
          <Text style={styles.cardCountBadge}>{currentIndex + 1}/{cards.length}</Text>
        </View>

        {/* SM-2 Stats strip */}
        <View style={styles.sm2StatsRow}>
          <View style={styles.sm2Stat}>
            <Text style={styles.sm2StatValue}>{sm2Stats.dueToday}</Text>
            <Text style={styles.sm2StatLabel}>Due Today</Text>
          </View>
          <View style={styles.sm2StatDivider} />
          <View style={styles.sm2Stat}>
            <Text style={styles.sm2StatValue}>{sm2Stats.mastered}</Text>
            <Text style={styles.sm2StatLabel}>Mastered</Text>
          </View>
          <View style={styles.sm2StatDivider} />
          <View style={styles.sm2Stat}>
            <Text style={styles.sm2StatValue}>{sm2Stats.learning}</Text>
            <Text style={styles.sm2StatLabel}>Learning</Text>
          </View>
          <View style={styles.sm2StatDivider} />
          <View style={styles.sm2Stat}>
            <Text style={styles.sm2StatValue}>{sm2Stats.accuracy}%</Text>
            <Text style={styles.sm2StatLabel}>Accuracy</Text>
          </View>
        </View>
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

      {/* Progress bar */}
      <View style={styles.progressBarWrap}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: `${progressPct}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{currentIndex} of {cards.length} reviewed</Text>
      </View>

      {/* Session quick stats */}
      <View style={styles.statsRow}>
        <Text style={styles.correctStat}>✅ {sessionStats.correct}</Text>
        <Text style={styles.hintText}>{isFlipped ? 'Rate your recall' : 'Tap card to flip'}</Text>
        <Text style={styles.incorrectStat}>❌ {sessionStats.incorrect}</Text>
      </View>

      {/* Card */}
      <View style={styles.cardContainer}>
        <Animated.View style={[
          { transform: [{ translateX: slideAnim }, { scale: cardScaleAnim }] }
        ]}>
          <TouchableOpacity onPress={flipCard} activeOpacity={0.92} disabled={isFlipped}>
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
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={() => Speech.speak(currentCard.english_word, { language: 'en-IN', rate: 0.85 })}
              >
                <Text style={styles.speakBtnText}>🔊 Listen</Text>
              </TouchableOpacity>
              <Text style={styles.flipHint}>Tap to reveal meaning →</Text>
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

      {/* SM-2 Confidence Buttons (shown after flip) */}
      {isFlipped && (
        <View style={styles.confidenceSection}>
          <Text style={styles.confidenceLabel}>How well did you remember?</Text>
          <View style={styles.confidenceRow}>
            {CONFIDENCE_RATINGS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.confidenceBtn,
                  r.size === 'large' && styles.confidenceBtnLarge,
                  { backgroundColor: r.bg, borderColor: r.color },
                ]}
                onPress={() => handleConfidence(r.value as 0 | 1 | 2 | 3)}
              >
                <Text style={[styles.confidenceBtnEmoji]}>
                  {r.value === 0 ? '🔴' : r.value === 1 ? '🟡' : r.value === 2 ? '🟢' : '💎'}
                </Text>
                <Text style={[styles.confidenceBtnLabel, { color: r.color }]}>{r.label}</Text>
                <Text style={styles.confidenceBtnSublabel}>{r.sublabel}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  // ── Header ──
  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: { color: 'white', fontSize: 24, marginRight: 8, width: 36 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  cardCountBadge: {
    fontSize: 13, fontWeight: '700', color: 'white',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },

  // SM-2 stats strip
  sm2StatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sm2Stat: { flex: 1, alignItems: 'center' },
  sm2StatValue: { fontSize: 18, fontWeight: '900', color: 'white' },
  sm2StatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: '600' },
  sm2StatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginVertical: 4 },

  // ── Mode selector ──
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFE8DE',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  modeTabTextActive: { color: 'white' },

  // ── Progress bar ──
  progressBarWrap: { paddingHorizontal: 16, marginTop: 10 },
  progressBarTrack: { height: 6, backgroundColor: '#FFD5C2', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: Colors.textLight, marginTop: 4, textAlign: 'right' },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 8,
  },
  correctStat: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  incorrectStat: { fontSize: 15, fontWeight: '700', color: Colors.error },
  hintText: { fontSize: 11, color: Colors.textLight },

  // ── Card ──
  cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    width: CARD_WIDTH, minHeight: 270, borderRadius: 24, padding: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
  },
  cardFront: { backgroundColor: 'white' },
  cardBack: {
    backgroundColor: '#FFF3EE',
    width: CARD_WIDTH, minHeight: 270, borderRadius: 24, padding: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLanguageLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14,
  },
  cardWord: { fontSize: 36, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  cardPhonetic: { fontSize: 17, color: Colors.textSecondary, marginTop: 8, fontStyle: 'italic' },
  cardMeaning: { fontSize: 30, fontWeight: '800', color: Colors.primary, textAlign: 'center' },
  speakBtn: {
    marginTop: 20, backgroundColor: '#FFF0E8',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: '#FFD5C2',
  },
  speakBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  flipHint: { marginTop: 14, fontSize: 12, color: Colors.textLight },
  exampleBox: {
    marginTop: 14, backgroundColor: 'white',
    borderRadius: 12, padding: 12, width: '100%',
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  exampleLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.textLight,
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  exampleSentence: { fontSize: 14, color: Colors.text, fontStyle: 'italic', lineHeight: 20 },
  exampleSentenceTelugu: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  newWordBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#10B981', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  newWordBadgeText: { fontSize: 10, color: 'white', fontWeight: '800', letterSpacing: 0.5 },

  // ── Confidence buttons ──
  confidenceSection: {
    paddingHorizontal: 16, paddingBottom: 32, paddingTop: 4,
  },
  confidenceLabel: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textAlign: 'center', marginBottom: 10,
  },
  confidenceRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  confidenceBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5,
  },
  confidenceBtnLarge: { paddingVertical: 16 },
  confidenceBtnEmoji: { fontSize: 18, marginBottom: 4 },
  confidenceBtnLabel: { fontSize: 13, fontWeight: '800' },
  confidenceBtnSublabel: { fontSize: 10, color: Colors.textLight, marginTop: 2 },

  // ── Session Complete ──
  resultsContainer: { padding: 24, alignItems: 'center' },
  resultEmoji: { fontSize: 64, marginBottom: 12 },
  resultPercentage: { fontSize: 64, fontWeight: '900', color: Colors.primary },
  resultLabel: { fontSize: 16, color: Colors.textSecondary, marginBottom: 16 },
  encouragementBox: {
    backgroundColor: '#FFF3EE', borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
    marginBottom: 12, borderLeftWidth: 3, borderLeftColor: Colors.primary,
    width: '100%',
  },
  encouragementText: {
    fontSize: 15, fontWeight: '700', color: Colors.primary,
    textAlign: 'center', lineHeight: 22,
  },
  xpBanner: {
    backgroundColor: '#FFF0E8', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
    marginBottom: 20, borderWidth: 1, borderColor: '#FFD5C2',
  },
  xpBannerText: { fontSize: 16, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  breakdownBox: {
    width: '100%', backgroundColor: 'white',
    borderRadius: 16, padding: 16, marginBottom: 24,
    elevation: 2, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  breakdownTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.text,
    marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  breakdownLabel: { fontSize: 14, color: Colors.textSecondary },
  breakdownValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  endButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 12, width: '100%' },
  studyAgainBtn: {
    flex: 1, backgroundColor: Colors.primary,
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  studyAgainBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  switchModeBtn: {
    flex: 1, backgroundColor: '#FFF0E8',
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#FFD5C2',
  },
  switchModeBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  homeBtn: { paddingVertical: 12 },
  homeBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
})
