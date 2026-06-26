import React, { useState, useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSelector } from 'react-redux'
import { Colors } from '../../constants/theme'
import { pronunciationService } from '../../services/api'
import {
  destroySpeechRecognition,
  initializeSpeechRecognition,
  isSpeechRecognitionAvailable,
  startListening, stopListening,
} from '../../services/audio/speechRecognition'
import { speak, speakWord, stopSpeaking } from '../../services/audio/textToSpeech'
import {
  scorePronunciation,
  type PronunciationScore,
} from '../../services/pronunciation/pronunciationScorer'
import {
  getDynamicPronunciationPhrases,
  recordContentSeen,
} from '../../services/personalization/contentRotationService'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'greetings', label: 'Greetings' },
  { key: 'office', label: 'Office' },
  { key: 'interview', label: 'Interview' },
  { key: 'phone', label: 'Phone' },
  { key: 'daily_life', label: 'Daily Life' },
]

interface Phrase {
  id: string
  phrase: string
  phonetic: string
  telugu_meaning: string
  difficulty: number
  category: string
  tips: string[]
  review_count?: number | null
}

interface SessionResult {
  phraseId: string
  phrase: string
  score: number
}

export default function PronunciationLab() {
  const { profile } = useSelector((s: any) => s.auth)
  const userId = profile?.id

  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [result, setResult] = useState<PronunciationScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [sttAvailable, setSttAvailable] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([])
  const [sessionComplete, setSessionComplete] = useState(false)
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

  useEffect(() => {
    setCurrentIndex(0)
    setResult(null)
    scoreAnim.setValue(0)
    setPartialTranscript('')
    setSessionResults([])
    setSessionComplete(false)
    loadPhrases()
  }, [selectedCategory])

  const loadPhrases = async () => {
    setLoading(true)
    try {
      if (userId) {
        const fetched = await getDynamicPronunciationPhrases(userId, {
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
          count: 15,
        })
        setPhrases(fetched.length ? fetched : await pronunciationService.getPhrases())
      } else {
        setPhrases(await pronunciationService.getPhrases())
      }
    } finally {
      setLoading(false)
    }
  }

  const checkSTTAvailability = async () => {
    const available = await isSpeechRecognitionAvailable()
    setSttAvailable(available)
  }

  const currentPhrase = phrases[currentIndex]

  const phrasesLeft = phrases.length - sessionResults.length
  const sessionAvg =
    sessionResults.length > 0
      ? Math.round(sessionResults.reduce((acc, r) => acc + r.score, 0) / sessionResults.length)
      : null

  const todayFocus =
    CATEGORIES.find(c => c.key === selectedCategory)?.label ?? 'All Phrases'

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
      const localScore = scorePronunciation(transcript, currentPhrase.phrase)

      let finalScore: PronunciationScore = localScore
      try {
        const enhanced = await pronunciationService.submitPronunciationResult(
          transcript,
          currentPhrase.phrase,
          localScore as unknown as Record<string, unknown>
        )
        finalScore = enhanced as PronunciationScore
      } catch {
        // Fall back to local score if network fails
      }

      setResult(finalScore)

      Animated.timing(scoreAnim, {
        toValue: localScore.overall_score,
        duration: 1200,
        useNativeDriver: false,
      }).start()

      // Record to rotation service
      if (userId) {
        recordContentSeen(userId, 'pronunciation_phrase', currentPhrase.id, localScore.overall_score)
      }

      // Track session result
      setSessionResults(prev => {
        const exists = prev.find(r => r.phraseId === currentPhrase.id)
        if (exists) {
          return prev.map(r =>
            r.phraseId === currentPhrase.id ? { ...r, score: localScore.overall_score } : r
          )
        }
        return [...prev, { phraseId: currentPhrase.id, phrase: currentPhrase.phrase, score: localScore.overall_score }]
      })
    } finally {
      setLoading(false)
    }
  }

  const nextPhrase = () => {
    if (currentIndex === phrases.length - 1) {
      setSessionComplete(true)
      return
    }
    setResult(null)
    scoreAnim.setValue(0)
    setPartialTranscript('')
    setCurrentIndex(i => i + 1)
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

  // ── Session Complete Screen ──────────────────────────────────────────────
  if (sessionComplete) {
    const finalAvg = sessionResults.length > 0
      ? Math.round(sessionResults.reduce((a, r) => a + r.score, 0) / sessionResults.length)
      : 0
    const weakPhrases = sessionResults.filter(r => r.score < 70)

    return (
      <View style={styles.container}>
        <LinearGradient colors={['#00D26A', '#34D399']} style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Complete!</Text>
          <Text style={styles.headerSubtitle}>Great practice today!</Text>
        </LinearGradient>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.sessionCompleteCard}>
            <Text style={styles.sessionCompleteEmoji}>🎉</Text>
            <Text style={styles.sessionCompleteTitle}>Session Score</Text>
            <View style={[styles.scoreCircle, { borderColor: getScoreColor(finalAvg), marginBottom: 8 }]}>
              <Text style={[styles.scoreNumber, { color: getScoreColor(finalAvg) }]}>{finalAvg}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <Text style={styles.sessionCompleteSubtitle}>
              {sessionResults.length} phrases practiced
            </Text>

            {weakPhrases.length > 0 && (
              <View style={styles.weakPhrasesBox}>
                <Text style={styles.weakPhrasesTitle}>Phrases to Revisit (below 70%)</Text>
                {weakPhrases.map((r, i) => (
                  <View key={i} style={styles.weakPhraseRow}>
                    <Text style={styles.weakPhraseText}>{r.phrase}</Text>
                    <Text style={[styles.weakPhraseScore, { color: getScoreColor(r.score) }]}>{r.score}%</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.comeBackBox}>
              <Text style={styles.comeBackText}>Come back tomorrow for new phrases!</Text>
              <Text style={styles.comeBackSub}>మళ్ళీ రేపు కొత్త పదాలు మీ కోసం సిద్ధంగా ఉంటాయి</Text>
            </View>

            <TouchableOpacity
              style={styles.restartBtn}
              onPress={() => {
                setSessionComplete(false)
                setCurrentIndex(0)
                setResult(null)
                scoreAnim.setValue(0)
                setSessionResults([])
                loadPhrases()
              }}
            >
              <Text style={styles.restartBtnText}>Practice Again</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    )
  }

  if (phrases.length === 0) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#00D26A" /></View>
  }

  const isNewPhrase = !currentPhrase?.review_count || currentPhrase.review_count === 0

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#00D26A', '#34D399']} style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
            <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.sessionStats}>
            Session: {sessionResults.length}/{phrases.length}
            {sessionAvg !== null ? ` | Avg: ${sessionAvg}%` : ''}
          </Text>
        </View>
        <Text style={styles.headerTitle}>🔊 Pronunciation Lab</Text>
        <Text style={styles.headerSubtitle}>ఉచ్చారణ అభ్యాసం • Device Speech Recognition</Text>
        <Text style={styles.progress}>{currentIndex + 1} / {phrases.length}</Text>
      </LinearGradient>

      {/* Daily Challenge Header Card */}
      <View style={styles.challengeCard}>
        <View style={styles.challengeRow}>
          <View>
            <Text style={styles.challengeTitle}>Today's Focus: {todayFocus}</Text>
            <Text style={styles.challengeSub}>{phrasesLeft} phrase{phrasesLeft !== 1 ? 's' : ''} left to practice</Text>
          </View>
          <Text style={styles.challengeEmoji}>🎯</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${phrases.length > 0 ? (sessionResults.length / phrases.length) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      {/* Category Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryTab, selectedCategory === cat.key && styles.categoryTabActive]}
            onPress={() => setSelectedCategory(cat.key)}
          >
            <Text style={[styles.categoryTabText, selectedCategory === cat.key && styles.categoryTabTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Phrase Card */}
        <View style={styles.phraseCard}>
          <View style={styles.difficultyRow}>
            <Text style={styles.stars}>{'⭐'.repeat(currentPhrase.difficulty)}</Text>
            <Text style={styles.categoryTag}>{currentPhrase.category}</Text>
            {isNewPhrase && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New phrase! 🆕</Text>
              </View>
            )}
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

            <View style={styles.subScores}>
              <SubScoreBar label="Accuracy" score={result.accuracy_score} />
              <SubScoreBar label="Completeness" score={result.completeness_score} />
              <SubScoreBar label="Fluency" score={result.fluency_score} />
            </View>

            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptLabel}>You said:</Text>
              <Text style={styles.transcriptText}>"{result.transcript}"</Text>
              <Text style={styles.targetLabel}>Target:</Text>
              <Text style={styles.targetText}>"{result.target_phrase}"</Text>
            </View>

            <Text style={styles.feedbackText}>{result.feedback}</Text>
            <Text style={styles.feedbackTelugu}>{result.feedback_telugu}</Text>

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
          style={styles.navBtn}
          onPress={nextPhrase}
        >
          <Text style={styles.navBtnText}>
            {currentIndex === phrases.length - 1 ? 'Finish ✓' : 'Next →'}
          </Text>
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
  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: { color: 'white', fontSize: 24 },
  sessionStats: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progress: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  challengeCard: { backgroundColor: 'white', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14, elevation: 2 },
  challengeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  challengeTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  challengeSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  challengeEmoji: { fontSize: 28 },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#00D26A', borderRadius: 4 },
  categoryScroll: { flexGrow: 0, flexShrink: 0, marginTop: 10, maxHeight: 46 },
  categoryContent: { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  categoryTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  categoryTabActive: { backgroundColor: '#00D26A', borderColor: '#00D26A' },
  categoryTabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  categoryTabTextActive: { color: 'white' },
  content: { flex: 1 },
  phraseCard: { margin: 16, marginTop: 12, backgroundColor: 'white', borderRadius: 20, padding: 24, elevation: 4 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  stars: { fontSize: 16 },
  categoryTag: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, color: '#00D26A', fontWeight: '600' },
  newBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  newBadgeText: { fontSize: 11, color: '#D97706', fontWeight: '700' },
  phrase: { fontSize: 26, fontWeight: '800', color: '#111827', lineHeight: 36, marginBottom: 8 },
  phonetic: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
  telugu: { fontSize: 18, color: '#00D26A', fontWeight: '600', marginBottom: 16 },
  tipsContainer: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 16 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: '#00D26A', marginBottom: 6 },
  tipItem: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 2 },
  listenBtns: { flexDirection: 'row', gap: 10 },
  listenBtn: { flex: 1, backgroundColor: '#FFF0E8', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  listenBtnSlow: { backgroundColor: '#F0FDF4' },
  listenBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  recordingSection: { marginHorizontal: 16, marginBottom: 16, alignItems: 'center' },
  recordingLabel: { fontSize: 15, color: '#374151', marginBottom: 20, textAlign: 'center' },
  partialTranscript: { backgroundColor: '#FFF0E8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16, maxWidth: '90%' },
  partialText: { color: Colors.primary, fontSize: 15, fontStyle: 'italic', textAlign: 'center' },
  recordBtn: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#00D26A', alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: '#00D26A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4,
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
  targetLabel: { fontSize: 11, fontWeight: '700', color: '#00D26A', textTransform: 'uppercase' },
  targetText: { fontSize: 15, color: '#00D26A', fontStyle: 'italic' },
  feedbackText: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 6 },
  feedbackTelugu: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  wordAnalysis: { marginBottom: 16 },
  wordAnalysisTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  wordItem: { marginBottom: 6 },
  wordStatus: { fontSize: 15, fontWeight: '600' },
  wordTip: { fontSize: 12, color: '#6B7280', marginTop: 2, marginLeft: 16 },
  encouragementBox: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14 },
  encouragement: { fontSize: 15, color: '#00D26A', fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, paddingBottom: 32, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  navBtn: { backgroundColor: '#ECFDF5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: '#00D26A', fontWeight: '700' },
  navCounter: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  // Session complete
  sessionCompleteCard: { margin: 16, backgroundColor: 'white', borderRadius: 24, padding: 28, alignItems: 'center', elevation: 4 },
  sessionCompleteEmoji: { fontSize: 56, marginBottom: 12 },
  sessionCompleteTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  sessionCompleteSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  weakPhrasesBox: { width: '100%', backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, marginBottom: 16 },
  weakPhrasesTitle: { fontSize: 14, fontWeight: '700', color: '#B91C1C', marginBottom: 10 },
  weakPhraseRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  weakPhraseText: { fontSize: 14, color: '#374151', flex: 1 },
  weakPhraseScore: { fontSize: 14, fontWeight: '700', marginLeft: 8 },
  comeBackBox: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 20, width: '100%' },
  comeBackText: { fontSize: 15, fontWeight: '700', color: '#00D26A', textAlign: 'center', marginBottom: 4 },
  comeBackSub: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  restartBtn: { backgroundColor: '#00D26A', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  restartBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
})
