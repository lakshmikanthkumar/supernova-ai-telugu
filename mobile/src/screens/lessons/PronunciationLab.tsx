import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { supabase } from '../../services/supabase'
import {
  startListening, stopListening, initializeSpeechRecognition,
  destroySpeechRecognition, isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition'
import { speak, speakWord, stopSpeaking } from '../../services/audio/textToSpeech'
import {
  scorePronunciation, detectPhonemeIssues,
  TELUGU_PRONUNCIATION_CHALLENGES,
  type PronunciationScore,
} from '../../services/pronunciation/pronunciationScorer'
import { pronunciationService } from '../../services/api'

interface Phrase {
  id: string
  phrase: string
  phonetic: string
  telugu_meaning: string
  difficulty: number
  category: string
  tips: string[]
}

export default function PronunciationLab() {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [result, setResult] = useState<PronunciationScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [sttAvailable, setSttAvailable] = useState(true)
  const scoreAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadPhrases()
    checkSTTAvailability()
    initializeSpeechRecognition()
    return () => {
      destroySpeechRecognition()
      stopSpeaking()
    }
  }, [])

  const loadPhrases = async () => {
    const data = await pronunciationService.getPhrases()
    if (data.length > 0) setPhrases(data)
  }

  const checkSTTAvailability = async () => {
    const available = await isSpeechRecognitionAvailable()
    setSttAvailable(available)
  }

  const currentPhrase = phrases[currentIndex]

  const playModel = () => {
    if (!currentPhrase) return
    speakWord(currentPhrase.phrase, { repeat: 1, language: 'en-IN' })
  }

  const playModelSlow = () => {
    if (!currentPhrase) return
    speak(currentPhrase.phrase, { rate: 'slow', language: 'en-IN' })
  }

  const handleStartListening = async () => {
    if (!sttAvailable) {
      Alert.alert(
        'Speech Recognition',
        'Speech recognition is not available on this device. Please update your device or try on a different phone.',
        [{ text: 'OK' }]
      )
      return
    }

    setResult(null)
    setPartialTranscript('')
    scoreAnim.setValue(0)
    setIsListening(true)

    await startListening({
      language: 'en-IN',
      partialResults: true,
      onPartialResult: (text) => setPartialTranscript(text),
      onFinalResult: async (recognitionResult) => {
        setIsListening(false)
        setPartialTranscript('')
        await gradeRecognition(recognitionResult.transcript)
      },
      onError: (error) => {
        setIsListening(false)
        setPartialTranscript('')
        Alert.alert('Recognition Error', error)
      },
      onEnd: () => {
        setIsListening(false)
      },
    })
  }

  const handleStopListening = async () => {
    await stopListening()
    setIsListening(false)
  }

  const gradeRecognition = async (transcript: string) => {
    if (!currentPhrase || !transcript.trim()) {
      Alert.alert('No Speech', 'We could not detect any speech. Please try again.')
      return
    }

    setLoading(true)
    try {
      // Step 1: Score locally using Levenshtein distance (instant, offline)
      const localScore = scorePronunciation(transcript, currentPhrase.phrase)

      // Step 2: Optionally enhance with Groq AI feedback (non-blocking)
      try {
        const enhanced = await pronunciationService.submitPronunciationResult(
          transcript,
          currentPhrase.phrase,
          localScore as unknown as Record<string, unknown>
        )
        setResult(enhanced as PronunciationScore)
      } catch {
        // Fall back to local score if network fails
        setResult(localScore)
      }

      // Animate score
      Animated.timing(scoreAnim, {
        toValue: localScore.overall_score,
        duration: 1200,
        useNativeDriver: false,
      }).start()
    } finally {
      setLoading(false)
    }
  }

  const nextPhrase = () => {
    setResult(null)
    scoreAnim.setValue(0)
    setPartialTranscript('')
    setCurrentIndex(i => Math.min(i + 1, phrases.length - 1))
  }

  const prevPhrase = () => {
    setResult(null)
    scoreAnim.setValue(0)
    setPartialTranscript('')
    setCurrentIndex(i => Math.max(i - 1, 0))
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    return '#EF4444'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent! 🌟'
    if (score >= 75) return 'Good! 👍'
    if (score >= 60) return 'Fair 😊'
    if (score >= 40) return 'Keep Practicing 💪'
    return 'Needs Work 📖'
  }

  if (phrases.length === 0) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#059669" /></View>
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#047857']} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔊 Pronunciation Lab</Text>
        <Text style={styles.headerSubtitle}>ఉచ్చారణ అభ్యాసం • Device Speech Recognition</Text>
        <Text style={styles.progress}>{currentIndex + 1} / {phrases.length}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Phrase Card */}
        <View style={styles.phraseCard}>
          <View style={styles.difficultyRow}>
            <Text style={styles.stars}>{'⭐'.repeat(currentPhrase.difficulty)}</Text>
            <Text style={styles.categoryTag}>{currentPhrase.category}</Text>
          </View>

          <Text style={styles.phrase}>{currentPhrase.phrase}</Text>
          <Text style={styles.phonetic}>/{currentPhrase.phonetic}/</Text>
          <Text style={styles.telugu}>{currentPhrase.telugu_meaning}</Text>

          {currentPhrase.tips?.length > 0 && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Tips to pronounce correctly:</Text>
              {currentPhrase.tips.map((tip, i) => (
                <Text key={i} style={styles.tipItem}>• {tip}</Text>
              ))}
            </View>
          )}

          {/* Listen Buttons */}
          <View style={styles.listenBtns}>
            <TouchableOpacity style={styles.listenBtn} onPress={playModel}>
              <Text style={styles.listenBtnText}>🔊 Normal Speed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.listenBtn, styles.listenBtnSlow]} onPress={playModelSlow}>
              <Text style={styles.listenBtnText}>🐢 Slow Speed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recording Section */}
        <View style={styles.recordingSection}>
          <Text style={styles.recordingLabel}>
            Now you try! / ఇప్పుడు మీరు ప్రయత్నించండి!
          </Text>

          {/* Partial transcript preview */}
          {partialTranscript ? (
            <View style={styles.partialTranscript}>
              <Text style={styles.partialText}>"{partialTranscript}"</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.recordBtn, isListening && styles.recordBtnActive]}
            onPress={isListening ? handleStopListening : handleStartListening}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="large" />
            ) : (
              <>
                <Text style={styles.recordBtnIcon}>{isListening ? '⏹️' : '🎤'}</Text>
                <Text style={styles.recordBtnText}>
                  {isListening ? 'Tap to Stop' : 'Tap to Speak'}
                </Text>
                {isListening && (
                  <Text style={styles.recordBtnSubtext}>🔴 Listening...</Text>
                )}
              </>
            )}
          </TouchableOpacity>

          {!sttAvailable && (
            <Text style={styles.sttWarning}>
              ⚠️ Speech recognition not available. Check device settings.
            </Text>
          )}
        </View>

        {/* Results */}
        {result && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Your Pronunciation Score</Text>

            {/* Score Circle */}
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreCircle, { borderColor: getScoreColor(result.overall_score) }]}>
                <Text style={[styles.scoreNumber, { color: getScoreColor(result.overall_score) }]}>
                  {result.overall_score}
                </Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
              <Text style={[styles.scoreLabel, { color: getScoreColor(result.overall_score) }]}>
                {getScoreLabel(result.overall_score)}
              </Text>
            </View>

            {/* Sub Scores */}
            <View style={styles.subScores}>
              <SubScoreBar label="Accuracy" score={result.accuracy_score} />
              <SubScoreBar label="Completeness" score={result.completeness_score} />
              <SubScoreBar label="Fluency" score={result.fluency_score} />
            </View>

            {/* What you said */}
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>You said:</Text>
              <Text style={styles.transcriptText}>"{result.transcript}"</Text>
              <Text style={styles.targetLabel}>Target:</Text>
              <Text style={styles.targetText}>"{result.target_phrase}"</Text>
            </View>

            {/* Feedback */}
            <Text style={styles.feedbackText}>{result.feedback}</Text>
            <Text style={styles.feedbackTelugu}>{result.feedback_telugu}</Text>

            {/* Word-level analysis */}
            {result.words_analysis?.length > 0 && (
              <View style={styles.wordAnalysis}>
                <Text style={styles.wordAnalysisTitle}>Word Analysis:</Text>
                {result.words_analysis
                  .filter(wa => wa.status !== 'extra')
                  .map((wa, i) => (
                    <View key={i} style={styles.wordItem}>
                      <Text style={[
                        styles.wordStatus,
                        {
                          color: wa.status === 'correct' ? '#10B981'
                            : wa.status === 'mispronounced' ? '#F59E0B'
                            : '#EF4444',
                        },
                      ]}>
                        {wa.status === 'correct' ? '✓' : wa.status === 'mispronounced' ? '~' : '✗'} {wa.word}
                      </Text>
                      {wa.tip && wa.status !== 'correct' && (
                        <Text style={styles.wordTip}>{wa.tip}</Text>
                      )}
                    </View>
                  ))}
              </View>
            )}

            <View style={styles.encouragementBox}>
              <Text style={styles.encouragement}>{result.encouragement}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={prevPhrase}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>
        <Text style={styles.navCounter}>{currentIndex + 1}/{phrases.length}</Text>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === phrases.length - 1 && styles.navBtnDisabled]}
          onPress={nextPhrase}
          disabled={currentIndex === phrases.length - 1}
        >
          <Text style={styles.navBtnText}>Next →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: '#374151' }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color }}>{score}%</Text>
      </View>
      <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${score}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
  backBtn: { color: 'white', fontSize: 24, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progress: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { flex: 1 },
  phraseCard: { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 4 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  stars: { fontSize: 16 },
  categoryTag: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, color: '#059669', fontWeight: '600' },
  phrase: { fontSize: 26, fontWeight: '800', color: '#111827', lineHeight: 36, marginBottom: 8 },
  phonetic: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
  telugu: { fontSize: 18, color: '#059669', fontWeight: '600', marginBottom: 16 },
  tipsContainer: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 16 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#059669', marginBottom: 6 },
  tipItem: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 2 },
  listenBtns: { flexDirection: 'row', gap: 10 },
  listenBtn: { flex: 1, backgroundColor: '#EEF2FF', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  listenBtnSlow: { backgroundColor: '#F0FDF4' },
  listenBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  recordingSection: { marginHorizontal: 16, marginBottom: 16, alignItems: 'center' },
  recordingLabel: { fontSize: 15, color: '#374151', marginBottom: 20, textAlign: 'center' },
  partialTranscript: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16, maxWidth: '90%' },
  partialText: { color: '#4F46E5', fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
  recordBtn: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4,
  },
  recordBtnActive: { backgroundColor: '#EF4444' },
  recordBtnIcon: { fontSize: 44, marginBottom: 6 },
  recordBtnText: { color: 'white', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  recordBtnSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 4 },
  sttWarning: { color: '#F59E0B', fontSize: 12, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
  resultsCard: { marginHorizontal: 16, backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 4, marginBottom: 16 },
  resultsTitle: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 20 },
  scoreContainer: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  scoreNumber: { fontSize: 32, fontWeight: '900' },
  scoreMax: { fontSize: 12, color: '#6B7280' },
  scoreLabel: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  subScores: { marginBottom: 16 },
  transcriptBox: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 16 },
  transcriptLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
  transcriptText: { fontSize: 15, color: '#111827', fontStyle: 'italic', marginBottom: 8 },
  targetLabel: { fontSize: 11, fontWeight: '700', color: '#059669', textTransform: 'uppercase' },
  targetText: { fontSize: 15, color: '#059669', fontStyle: 'italic' },
  feedbackText: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 6 },
  feedbackTelugu: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  wordAnalysis: { marginBottom: 16 },
  wordAnalysisTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  wordItem: { marginBottom: 6 },
  wordStatus: { fontSize: 15, fontWeight: '600' },
  wordTip: { fontSize: 12, color: '#6B7280', marginTop: 2, marginLeft: 16 },
  encouragementBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14 },
  encouragement: { fontSize: 15, color: '#059669', fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingBottom: 32, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  navBtn: { backgroundColor: '#ECFDF5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: '#059669', fontWeight: '700' },
  navCounter: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
})
