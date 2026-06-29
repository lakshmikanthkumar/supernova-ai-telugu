// ============================================================
// Fluency Coach — Story Reader Screen
// The main reading experience with auto-scroll, voice tracking,
// live metrics, and real-time feedback.
// ============================================================

import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Animated, Alert, Modal, Pressable, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft, Pause, Play, Square, Mic, MicOff,
  ChevronLeft, ChevronRight, Settings2,
} from 'lucide-react-native'
import type { AppDispatch, RootState } from '../../../store'
import {
  pauseSession, resumeSession, setScrollMode, setScrollSpeed,
  selectSessionProgress, closeWordMeaning,
} from '../redux/fluencyCoachSlice'
import { useFluencySession } from '../hooks/useFluencySession'
import SentenceDisplay from '../components/SentenceDisplay'
import { LiveMetricsBanner } from '../components/LiveMetricsBanner'
import { FeedbackToast } from '../components/FeedbackToast'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../constants'

export default function StoryReaderScreen() {
  const dispatch     = useDispatch<AppDispatch>()
  const story        = useSelector((s: RootState) => s.fluencyCoach.currentStory)
  const sentenceIdx  = useSelector((s: RootState) => s.fluencyCoach.currentSentenceIndex)
  const isSession    = useSelector((s: RootState) => s.fluencyCoach.isSessionActive)
  const isPaused     = useSelector((s: RootState) => s.fluencyCoach.isPaused)
  const isListening  = useSelector((s: RootState) => s.fluencyCoach.isListening)
  const partial      = useSelector((s: RootState) => s.fluencyCoach.currentPartialTranscript)
  const sentScores   = useSelector((s: RootState) => s.fluencyCoach.sentenceScores)
  const progress     = useSelector(selectSessionProgress)
  const scrollMode   = useSelector((s: RootState) => s.fluencyCoach.scrollMode)
  const speedMult    = useSelector((s: RootState) => s.fluencyCoach.scrollSpeedMultiplier)
  const wordPopup    = useSelector((s: RootState) => s.fluencyCoach.wordMeaningPopup)
  const feedbackLoading = useSelector((s: RootState) => s.fluencyCoach.feedbackLoading)

  const scrollRef     = useRef<ScrollView>(null)
  const sentHeights   = useRef<Record<number, number>>({})
  const [showSettings, setShowSettings] = useState(false)
  const micPulse      = useRef(new Animated.Value(1)).current

  const {
    handleStart, handlePause, handleResume,
    handleSessionComplete,
  } = useFluencySession()

  // Guard: redirect if no story selected
  useEffect(() => {
    if (!story) router.replace('/features/fluency-coach')
  }, [story])

  // Mic pulse animation
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.25, duration: 700, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1.00, duration: 700, useNativeDriver: true }),
        ])
      ).start()
    } else {
      micPulse.stopAnimation()
      micPulse.setValue(1)
    }
  }, [isListening, micPulse])

  // Auto-scroll to current sentence
  useEffect(() => {
    if (!story?.sentences) return
    let y = 0
    for (let i = 0; i < sentenceIdx; i++) {
      y += sentHeights.current[i] ?? 62
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true })
  }, [sentenceIdx, story])

  // Navigate to results when session ends and feedback ready
  useEffect(() => {
    if (!isSession && !feedbackLoading && progress.current > 0) {
      router.replace('/features/fluency-results')
    }
  }, [isSession, feedbackLoading])

  const handleLayout = useCallback((index: number, height: number) => {
    sentHeights.current[index] = height
  }, [])

  const handleStop = useCallback(() => {
    Alert.alert(
      'Stop Reading?',
      'Your progress will be saved. You can resume this story later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => handleSessionComplete() },
      ]
    )
  }, [handleSessionComplete])

  const handleBack = useCallback(() => {
    if (isSession) {
      Alert.alert(
        'Leave session?',
        'Your reading session will be paused.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Leave', onPress: async () => {
              await handlePause()
              router.back()
            }
          },
        ]
      )
    } else {
      router.back()
    }
  }, [isSession, handlePause])

  if (!story) return null

  const sentences = story.sentences ?? []
  const diffColor = DIFFICULTY_COLORS[story.difficulty]

  return (
    <SafeAreaView style={styles.safe} edges={['top']} testID="story-reader-screen">

      {/* ── HEADER ───────────────────────────────────────── */}
      <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.headerBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{story.title}</Text>
          <View style={styles.headerMeta}>
            <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
            <Text style={styles.headerSub}>
              {DIFFICULTY_LABELS[story.difficulty].en} · {story.word_count} words
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.headerBtn}
          accessibilityLabel="Reading settings"
        >
          <Settings2 size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ── PROGRESS BAR ─────────────────────────────────── */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { width: `${progress.percent}%` }]}
          accessibilityLabel={`${progress.percent}% completed`}
        />
      </View>

      {/* ── LIVE METRICS (only during active session) ────── */}
      {isSession && (
        <View style={styles.metricsRow}>
          <LiveMetricsBanner />
        </View>
      )}

      {/* ── STORY SCROLL ─────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSession || scrollMode === 'manual'}
      >
        {sentences.map((sentence, idx) => (
          <SentenceDisplay
            key={sentence.id}
            sentence={sentence}
            index={idx}
            currentIndex={sentenceIdx}
            score={sentScores[idx]}
            onLayout={handleLayout}
          />
        ))}

        {/* Breathing room at bottom */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ── PARTIAL TRANSCRIPT BAR ───────────────────────── */}
      {isListening && !!partial && (
        <View style={styles.partialBar}>
          <Mic size={14} color="#7B61FF" />
          <Text style={styles.partialText} numberOfLines={2}>{partial}</Text>
        </View>
      )}

      {/* ── FEEDBACK TOAST ───────────────────────────────── */}
      <FeedbackToast />

      {/* ── CONTROL BAR ──────────────────────────────────── */}
      <View style={styles.controlBar}>
        {!isSession ? (
          /* PRE-SESSION: Start button */
          <TouchableOpacity
            style={styles.startBtn}
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel="Start reading"
          >
            <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.startBtnGradient}>
              <Mic size={22} color="white" />
              <Text style={styles.startBtnText}>Start Reading</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          /* IN-SESSION: Pause / Resume / Stop + Mic indicator */
          <View style={styles.sessionControls}>
            {/* Stop */}
            <TouchableOpacity
              style={styles.controlBtnRed}
              onPress={handleStop}
              accessibilityRole="button"
              accessibilityLabel="Stop session"
              testID="stop-session-btn"
            >
              <Square size={18} color="white" fill="white" />
            </TouchableOpacity>

            {/* Mic pulse */}
            <Animated.View style={{ transform: [{ scale: micPulse }] }}>
              <View
                style={[styles.micIndicator, isListening && styles.micIndicatorActive]}
                testID="mic-indicator"
              >
                {isListening
                  ? <Mic size={26} color="white" />
                  : <MicOff size={26} color="#6B7280" />
                }
              </View>
            </Animated.View>

            {/* Pause / Resume */}
            <TouchableOpacity
              style={styles.controlBtnPurple}
              onPress={isPaused ? handleResume : handlePause}
              accessibilityRole="button"
              accessibilityLabel={isPaused ? 'Resume reading' : 'Pause reading'}
            >
              {isPaused
                ? <Play size={18} color="white" fill="white" />
                : <Pause size={18} color="white" fill="white" />
              }
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── GENERATING FEEDBACK OVERLAY ──────────────────── */}
      {feedbackLoading && (
        <View style={styles.feedbackOverlay}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <Text style={styles.feedbackOverlayText}>Generating your AI feedback...</Text>
        </View>
      )}

      {/* ── WORD MEANING POPUP ────────────────────────────── */}
      <Modal
        visible={!!wordPopup}
        transparent
        animationType="slide"
        onRequestClose={() => dispatch(closeWordMeaning())}
      >
        <Pressable style={styles.popupOverlay} onPress={() => dispatch(closeWordMeaning())}>
          <Pressable style={styles.popup} onPress={() => {}}>
            <Text style={styles.popupWord}>{wordPopup?.word}</Text>
            <Text style={styles.popupMeaning}>{wordPopup?.meaning}</Text>
            {wordPopup?.example && (
              <Text style={styles.popupExample}>"{wordPopup.example}"</Text>
            )}
            <TouchableOpacity
              style={styles.popupClose}
              onPress={() => dispatch(closeWordMeaning())}
              accessibilityRole="button"
              accessibilityLabel="Close word meaning"
            >
              <Text style={styles.popupCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── SETTINGS SHEET ───────────────────────────────── */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable style={styles.popupOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={[styles.popup, styles.settingsSheet]} onPress={() => {}}>
            <Text style={styles.settingsTitle}>Reading Settings</Text>

            <Text style={styles.settingLabel}>Scroll Mode</Text>
            <View style={styles.settingRow}>
              {(['auto', 'voice_controlled', 'manual'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modePill, scrollMode === mode && styles.modePillActive]}
                  onPress={() => dispatch(setScrollMode(mode))}
                >
                  <Text style={[styles.modePillText, scrollMode === mode && styles.modePillTextActive]}>
                    {mode === 'auto' ? 'Auto' : mode === 'voice_controlled' ? 'Voice' : 'Manual'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.settingLabel}>Scroll Speed: {speedMult.toFixed(1)}×</Text>
            <View style={styles.speedRow}>
              <TouchableOpacity
                style={styles.speedBtn}
                onPress={() => dispatch(setScrollSpeed(speedMult - 0.25))}
                disabled={speedMult <= 0.5}
              >
                <ChevronLeft size={20} color={speedMult <= 0.5 ? '#D1D5DB' : '#7B61FF'} />
              </TouchableOpacity>
              <View style={styles.speedTrack}>
                <View style={[styles.speedFill, { width: `${((speedMult - 0.5) / 1.5) * 100}%` }]} />
              </View>
              <TouchableOpacity
                style={styles.speedBtn}
                onPress={() => dispatch(setScrollSpeed(speedMult + 0.25))}
                disabled={speedMult >= 2.0}
              >
                <ChevronRight size={20} color={speedMult >= 2.0 ? '#D1D5DB' : '#7B61FF'} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12,
  },
  headerBtn:    { padding: 8 },
  headerCenter: { flex: 1, marginHorizontal: 8 },
  headerTitle:  { color: 'white', fontSize: 15, fontWeight: '800' },
  headerMeta:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerSub:    { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  diffDot:      { width: 8, height: 8, borderRadius: 4 },

  progressTrack: { height: 3, backgroundColor: '#E5E7EB' },
  progressFill:  { height: 3, backgroundColor: '#7B61FF', borderRadius: 1.5 },

  metricsRow: { paddingVertical: 10 },

  scrollView:   { flex: 1 },
  scrollContent: { paddingTop: 8, paddingHorizontal: 4, paddingBottom: 20 },

  partialBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F0FF', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#EDE9FE',
  },
  partialText: { flex: 1, color: '#5B21B6', fontSize: 13, fontStyle: 'italic' },

  controlBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  startBtn:         { borderRadius: 16, overflow: 'hidden' },
  startBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18,
  },
  startBtnText: { color: 'white', fontSize: 17, fontWeight: '800' },

  sessionControls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-around',
  },
  controlBtnRed: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
  },
  controlBtnPurple: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center',
  },
  micIndicator: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4,
  },
  micIndicatorActive: {
    backgroundColor: '#7B61FF',
    elevation: 6,
  },

  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  feedbackOverlayText: { color: '#374151', fontSize: 15, fontWeight: '600' },

  popupOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  popup: {
    backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  popupWord:    { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  popupMeaning: { fontSize: 18, color: '#7B61FF', fontWeight: '600', marginBottom: 8 },
  popupExample: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', lineHeight: 20 },
  popupClose: {
    marginTop: 20, backgroundColor: '#7B61FF', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  popupCloseText: { color: 'white', fontWeight: '700', fontSize: 15 },

  settingsSheet: { paddingBottom: Platform.OS === 'ios' ? 48 : 32 },
  settingsTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 20 },
  settingLabel:  { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  settingRow:    { flexDirection: 'row', gap: 8, marginBottom: 20 },

  modePill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  modePillActive:     { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  modePillText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modePillTextActive: { color: 'white' },

  speedRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  speedBtn:  { padding: 4 },
  speedTrack: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3 },
  speedFill:  { height: 6, backgroundColor: '#7B61FF', borderRadius: 3 },

  doneBtn:    { backgroundColor: '#7B61FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
})
