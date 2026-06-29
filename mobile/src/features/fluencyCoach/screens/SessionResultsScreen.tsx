// ============================================================
// Fluency Coach — Session Results Screen
// Shows AI-generated scores, feedback, XP reward, and
// difficult words with Telugu meanings.
// ============================================================

import React, { useEffect, useRef, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { CheckCircle, TrendingUp, Zap, BookOpen, RefreshCw, Home } from 'lucide-react-native'
import type { AppDispatch, RootState } from '../../../store'
import { clearCurrentStory, selectAverageAccuracy } from '../redux/fluencyCoachSlice'
import { updateXP } from '../../../store/slices/authSlice'

// ── CIRCULAR SCORE RING ───────────────────────────────────────

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue:        score,
      duration:       1200,
      useNativeDriver: false,
    }).start()
  }, [score, anim])

  return (
    <View style={rStyles.container}>
      <View style={[rStyles.ring, { borderColor: color }]}>
        <Animated.Text style={[rStyles.scoreText, { color }]}>
          {anim.interpolate({ inputRange: [0, 100], outputRange: ['0', score.toString()] })}
        </Animated.Text>
        <Text style={rStyles.pct}>%</Text>
      </View>
      <Text style={rStyles.label}>{label}</Text>
    </View>
  )
}

const rStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  ring: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 5, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreText: { fontSize: 22, fontWeight: '800' },
  pct:       { fontSize: 12, color: '#9CA3AF', fontWeight: '600', alignSelf: 'flex-end', marginBottom: 4 },
  label:     { fontSize: 11, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
})

// ── RESULTS SCREEN ────────────────────────────────────────────

export default function SessionResultsScreen() {
  const dispatch    = useDispatch<AppDispatch>()
  const story       = useSelector((s: RootState) => s.fluencyCoach.currentStory)
  const feedback    = useSelector((s: RootState) => s.fluencyCoach.aiFeedback)
  const xpEarned    = useSelector((s: RootState) => s.fluencyCoach.xpEarned)
  const loading     = useSelector((s: RootState) => s.fluencyCoach.feedbackLoading)
  const sessionStats = useSelector((s: RootState) => s.fluencyCoach.sessionStats)
  const avgAccuracy = useSelector(selectAverageAccuracy)

  const xpAnim = useRef(new Animated.Value(0)).current

  // Award XP in Redux + animate counter
  useEffect(() => {
    if (xpEarned > 0) {
      dispatch(updateXP({ xpEarned }))
      Animated.timing(xpAnim, { toValue: xpEarned, duration: 1500, useNativeDriver: false }).start()
    }
  }, [xpEarned, dispatch, xpAnim])

  const handleTryAgain = useCallback(() => {
    router.replace('/features/fluency-reader')
  }, [])

  const handleChooseAnother = useCallback(() => {
    dispatch(clearCurrentStory())
    router.replace('/features/fluency-coach')
  }, [dispatch])

  const handleGoHome = useCallback(() => {
    dispatch(clearCurrentStory())
    router.replace('/home')
  }, [dispatch])

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <Text style={styles.loadingText}>Analysing your reading performance...</Text>
          <Text style={styles.loadingSubtext}>AI is preparing personalised feedback</Text>
        </View>
      </SafeAreaView>
    )
  }

  const fluency      = feedback?.fluency_score      ?? avgAccuracy
  const pronunciation = feedback?.pronunciation_score ?? Math.round(avgAccuracy * 0.9)
  const confidence   = feedback?.confidence_score   ?? Math.round(avgAccuracy * 0.8)
  const wpm          = feedback?.reading_speed_wpm  ?? sessionStats?.currentWPM ?? 0
  const wpmLabel     = feedback?.reading_speed_label ?? (wpm >= 80 && wpm <= 140 ? 'good' : wpm < 80 ? 'slow' : 'fast')

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HERO HEADER ──────────────────────────────────── */}
        <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.hero}>
          <CheckCircle size={40} color="white" />
          <Text style={styles.heroTitle}>Session Complete! 🎉</Text>
          <Text style={styles.heroStory} numberOfLines={2}>{story?.title}</Text>

          {/* XP Badge */}
          {xpEarned > 0 && (
            <View style={styles.xpBadge}>
              <Zap size={16} color="#F59E0B" />
              <Animated.Text style={styles.xpText}>
                +{xpAnim.interpolate({ inputRange: [0, xpEarned], outputRange: ['0', String(xpEarned)] })} XP
              </Animated.Text>
            </View>
          )}
        </LinearGradient>

        {/* ── SCORE RINGS ──────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Performance Scores</Text>
          <View style={styles.scoreRow}>
            <ScoreRing score={fluency}       label="Fluency"       color="#7B61FF" />
            <ScoreRing score={pronunciation} label="Pronunciation"  color="#10B981" />
            <ScoreRing score={confidence}    label="Confidence"     color="#F59E0B" />
          </View>
        </View>

        {/* ── SPEED STAT ───────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Reading Speed</Text>
          <View style={styles.speedStatRow}>
            <TrendingUp size={24} color="#7B61FF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.wpmValue}>{wpm} <Text style={styles.wpmUnit}>WPM</Text></Text>
              <Text style={[
                styles.wpmLabel,
                { color: wpmLabel === 'good' ? '#10B981' : wpmLabel === 'slow' ? '#F59E0B' : '#EF4444' }
              ]}>
                {wpmLabel === 'good'      ? '✅ Perfect pace'    :
                 wpmLabel === 'slow'      ? '🐢 A bit slow'       :
                 wpmLabel === 'fast'      ? '⚡ Slightly fast'    :
                 '🚀 Very fast — slow down a bit'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── AI FEEDBACK ──────────────────────────────────── */}
        {feedback && (
          <>
            {/* Strengths */}
            {feedback.strengths.length > 0 && (
              <View style={[styles.card, styles.strengthCard]}>
                <Text style={styles.cardTitle}>💪 What you did great</Text>
                {feedback.strengths.map((s, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.greenDot}>●</Text>
                    <Text style={styles.bulletText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suggestions */}
            {feedback.improvement_suggestions.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🎯 How to improve</Text>
                {feedback.improvement_suggestions.map((s, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.purpleDot}>▶</Text>
                    <Text style={styles.bulletText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Difficult Words */}
            {feedback.difficult_words.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📚 Words to practise</Text>
                {feedback.difficult_words.map((w, i) => (
                  <View key={i} style={styles.wordCard}>
                    <View style={styles.wordHeader}>
                      <Text style={styles.wordText}>{w.word}</Text>
                      <Text style={styles.wordTelugu}>{w.telugu_meaning}</Text>
                    </View>
                    {w.pronunciation_tip && (
                      <Text style={styles.wordTip}>🔊 {w.pronunciation_tip}</Text>
                    )}
                    {w.example_sentence && (
                      <Text style={styles.wordExample}>"{w.example_sentence}"</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Summary */}
            <View style={[styles.card, styles.summaryCard]}>
              <BookOpen size={20} color="#7B61FF" />
              <Text style={styles.summaryText}>{feedback.overall_summary}</Text>
              {feedback.telugu_tip && (
                <Text style={styles.teluguTip}>{feedback.telugu_tip}</Text>
              )}
            </View>

            {/* Next step */}
            {feedback.next_level_recommendation && (
              <View style={styles.nextStepCard}>
                <Text style={styles.nextStepIcon}>🚀</Text>
                <Text style={styles.nextStepText}>{feedback.next_level_recommendation}</Text>
              </View>
            )}
          </>
        )}

        {/* ── ACTION BUTTONS ────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleTryAgain}
            accessibilityRole="button"
            accessibilityLabel="Try this story again"
          >
            <RefreshCw size={18} color="white" />
            <Text style={styles.btnPrimaryText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={handleChooseAnother}
            accessibilityRole="button"
            accessibilityLabel="Choose another story"
          >
            <BookOpen size={18} color="#7B61FF" />
            <Text style={styles.btnSecondaryText}>New Story</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnHome}
            onPress={handleGoHome}
            accessibilityRole="button"
            accessibilityLabel="Go to home screen"
          >
            <Home size={18} color="#6B7280" />
            <Text style={styles.btnHomeText}>Home</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F9FA' },
  scroll: { paddingBottom: 24 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  loadingText:      { fontSize: 16, fontWeight: '700', color: '#374151', textAlign: 'center' },
  loadingSubtext:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  hero: {
    alignItems: 'center', paddingTop: 40, paddingBottom: 36, paddingHorizontal: 24, gap: 10,
  },
  heroTitle: { color: 'white', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  heroStory: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  xpBadge:  {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, marginTop: 4,
  },
  xpText: { color: '#FEF3C7', fontSize: 18, fontWeight: '800' },

  card: {
    backgroundColor: 'white', borderRadius: 16, margin: 16, marginBottom: 0,
    padding: 20, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 16 },

  scoreRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },

  strengthCard: { borderLeftWidth: 4, borderLeftColor: '#10B981' },
  bulletRow:    { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  greenDot:     { color: '#10B981', fontSize: 14, marginTop: 2 },
  purpleDot:    { color: '#7B61FF', fontSize: 12, marginTop: 3 },
  bulletText:   { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  speedStatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#F3F0FF', borderRadius: 12, padding: 16,
  },
  wpmValue: { fontSize: 28, fontWeight: '800', color: '#7B61FF' },
  wpmUnit:  { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  wpmLabel: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  wordCard:   { borderRadius: 10, backgroundColor: '#F9FAFB', padding: 12, marginBottom: 10 },
  wordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  wordText:   { fontSize: 16, fontWeight: '800', color: '#111827' },
  wordTelugu: { fontSize: 14, color: '#7B61FF', fontWeight: '600' },
  wordTip:    { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  wordExample: { fontSize: 13, color: '#374151', fontStyle: 'italic' },

  summaryCard: { flexDirection: 'column', gap: 12, borderLeftWidth: 4, borderLeftColor: '#7B61FF' },
  summaryText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  teluguTip:   { fontSize: 13, color: '#7B61FF', lineHeight: 20, fontStyle: 'italic' },

  nextStepCard: {
    margin: 16, marginBottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16,
  },
  nextStepIcon: { fontSize: 24 },
  nextStepText: { flex: 1, fontSize: 14, color: '#92400E', fontWeight: '600', lineHeight: 20 },

  actions: {
    flexDirection: 'row', gap: 10,
    marginHorizontal: 16, marginTop: 24,
  },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7B61FF', borderRadius: 12, paddingVertical: 14,
  },
  btnPrimaryText: { color: 'white', fontWeight: '700', fontSize: 14 },

  btnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 2, borderColor: '#7B61FF', borderRadius: 12, paddingVertical: 14,
    backgroundColor: 'white',
  },
  btnSecondaryText: { color: '#7B61FF', fontWeight: '700', fontSize: 14 },

  btnHome: {
    width: 52, alignItems: 'center', justifyContent: 'center', gap: 2,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingVertical: 14,
    backgroundColor: 'white',
  },
  btnHomeText: { color: '#6B7280', fontSize: 10, fontWeight: '600' },
})
