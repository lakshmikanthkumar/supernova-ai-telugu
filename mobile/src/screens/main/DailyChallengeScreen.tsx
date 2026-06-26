import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Alert, TextInput, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { fetchProfile } from '../../store/slices/authSlice'
import {
  startListening, stopListening, initializeSpeechRecognition,
  destroySpeechRecognition, isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition'
import { speak, speakWord, stopSpeaking } from '../../services/audio/textToSpeech'
import { gamificationService } from '../../services/api'
import { Colors } from '../../constants/theme'

const { width } = Dimensions.get('window')

// ─── Static challenge definitions ────────────────────────────────────────────

const SPEAKING_WORDS = [
  { word: 'Comfortable', phonetic: '/ˈkʌmf.tə.bəl/' },
  { word: 'Pronunciation', phonetic: '/prəˌnʌn.siˈeɪ.ʃən/' },
  { word: 'Opportunity', phonetic: '/ˌɒp.əˈtjuː.nɪ.ti/' },
  { word: 'Entrepreneur', phonetic: '/ˌɒn.trə.prəˈnɜː/' },
  { word: 'Particularly', phonetic: '/pəˈtɪk.jʊ.lə.li/' },
]

const VOCAB_WORDS = [
  { word: 'Eloquent', meaning: 'Fluent or persuasive in speaking', telugu: 'వాక్చాతుర్యం గల' },
  { word: 'Diligent', meaning: 'Having or showing care in work', telugu: 'శ్రద్ధగల' },
  { word: 'Pragmatic', meaning: 'Dealing with things sensibly', telugu: 'వ్యవహారజ్ఞుడు' },
  { word: 'Resilient', meaning: 'Able to recover quickly', telugu: 'తట్టుకునే శక్తి గల' },
  { word: 'Meticulous', meaning: 'Very careful and precise', telugu: 'చాలా జాగ్రత్తగల' },
]

const WRITING_VOCAB = ['ambitious', 'collaborate', 'achievement']

type ChallengeType = 'speaking' | 'writing' | 'vocabulary' | 'conversation'

const CHALLENGE_META: Record<ChallengeType, { icon: string; title: string; description: string; xp: number }> = {
  speaking: {
    icon: '🎤',
    title: 'Speaking Challenge',
    description: 'Say these 5 words correctly',
    xp: 50,
  },
  writing: {
    icon: '✍️',
    title: 'Writing Challenge',
    description: 'Write 3 sentences using today\'s vocab words',
    xp: 50,
  },
  vocabulary: {
    icon: '📖',
    title: 'Vocabulary Challenge',
    description: 'Learn 5 new words',
    xp: 50,
  },
  conversation: {
    icon: '💬',
    title: 'Conversation Challenge',
    description: 'Complete a 2-minute conversation with Nova',
    xp: 50,
  },
}

const ALL_CHALLENGE_TYPES: ChallengeType[] = ['speaking', 'writing', 'vocabulary', 'conversation']
const BONUS_XP = 100

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyChallengeScreen() {
  const dispatch = useAppDispatch()
  const { profile } = useAppSelector(s => s.auth)

  // Which challenges the user has completed today
  const [completed, setCompleted] = useState<Set<ChallengeType>>(new Set())
  // Which challenge card is currently expanded/active
  const [activeChallenge, setActiveChallenge] = useState<ChallengeType | null>(null)

  // ── Speaking challenge state ──────────────────────────────────────────────
  const [wordRecordingIndex, setWordRecordingIndex] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [wordResults, setWordResults] = useState<Record<number, 'pass' | 'fail'>>({})
  const [sttAvailable, setSttAvailable] = useState(true)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // ── Writing challenge state ───────────────────────────────────────────────
  const [writingText, setWritingText] = useState('')
  const [writingFeedback, setWritingFeedback] = useState<string | null>(null)
  const [writingChecking, setWritingChecking] = useState(false)

  // ── Vocabulary challenge state ────────────────────────────────────────────
  const [vocabIndex, setVocabIndex] = useState(0)
  const [vocabFlipped, setVocabFlipped] = useState(false)
  const flipAnim = useRef(new Animated.Value(0)).current

  // ── Claiming state ────────────────────────────────────────────────────────
  const [claiming, setClaiming] = useState(false)

  const streak = profile?.streak_current ?? 0
  const completedCount = completed.size
  const allDone = completedCount === 4

  useEffect(() => {
    initializeSpeechRecognition()
    isSpeechRecognitionAvailable().then(setSttAvailable)
    return () => {
      destroySpeechRecognition()
      stopSpeaking()
    }
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const markComplete = async (type: ChallengeType) => {
    const alreadyDone = completed.has(type)
    if (alreadyDone) return

    const next = new Set(completed)
    next.add(type)
    setCompleted(next)
    setActiveChallenge(null)

    // Award XP
    try {
      await gamificationService.updateProgress('daily_challenge', undefined, CHALLENGE_META[type].xp)
    } catch { /* non-fatal */ }

    if (next.size === 4) {
      // Bonus XP
      try {
        await gamificationService.updateProgress('daily_challenge_bonus', undefined, BONUS_XP)
      } catch {}
      if (profile?.id) dispatch(fetchProfile(profile.id))
      Alert.alert('All Challenges Done! 🎉', `Amazing! You earned +${BONUS_XP} bonus XP!`, [{ text: 'Awesome!' }])
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPEAKING CHALLENGE
  // ─────────────────────────────────────────────────────────────────────────

  const handleStartWordRecording = async (idx: number) => {
    if (!sttAvailable) {
      Alert.alert('STT Unavailable', 'Speech recognition is not available on this device.')
      return
    }
    setWordRecordingIndex(idx)
    setIsListening(true)

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    ).start()

    await startListening({
      language: 'en-IN',
      partialResults: false,
      onFinalResult: (result) => {
        pulseAnim.stopAnimation()
        pulseAnim.setValue(1)
        setIsListening(false)
        setWordRecordingIndex(null)

        const spoken = result.transcript.trim().toLowerCase()
        const target = SPEAKING_WORDS[idx].word.toLowerCase()
        const pass = spoken.includes(target) || target.includes(spoken.split(' ')[0])
        setWordResults(prev => ({ ...prev, [idx]: pass ? 'pass' : 'fail' }))

        if (pass) {
          speak(SPEAKING_WORDS[idx].word, { language: 'en-IN' }).catch(() => {})
        }

        // Check if all 5 words attempted (pass or fail, any attempt counts as complete)
        const nextResults = { ...wordResults, [idx]: pass ? 'pass' : 'fail' }
        const attempted = Object.keys(nextResults).length
        if (attempted >= SPEAKING_WORDS.length) {
          setTimeout(() => markComplete('speaking'), 600)
        }
      },
      onError: (err) => {
        pulseAnim.setValue(1)
        setIsListening(false)
        setWordRecordingIndex(null)
        Alert.alert('Error', err)
      },
      onEnd: () => {
        pulseAnim.setValue(1)
        setIsListening(false)
        setWordRecordingIndex(null)
      },
    })
  }

  const handlePlayWord = (word: string) => {
    speak(word, { language: 'en-IN' }).catch(() => {})
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WRITING CHALLENGE
  // ─────────────────────────────────────────────────────────────────────────

  const checkWriting = () => {
    const sentences = writingText.trim().split(/[.!?]+/).filter(s => s.trim().length > 3)
    if (sentences.length < 3) {
      setWritingFeedback('Please write at least 3 complete sentences.')
      return
    }
    const usedWords = WRITING_VOCAB.filter(w => writingText.toLowerCase().includes(w))
    if (usedWords.length < 1) {
      setWritingFeedback(`Try to use at least one of these words: ${WRITING_VOCAB.join(', ')}`)
      return
    }
    setWritingChecking(true)
    setTimeout(() => {
      setWritingChecking(false)
      setWritingFeedback(`Great job! You used: ${usedWords.join(', ')}. Your writing looks good!`)
      setTimeout(() => markComplete('writing'), 1200)
    }, 1000)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VOCABULARY CHALLENGE
  // ─────────────────────────────────────────────────────────────────────────

  const flipCard = () => {
    if (vocabFlipped) {
      Animated.timing(flipAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setVocabFlipped(false))
    } else {
      Animated.timing(flipAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => setVocabFlipped(true))
    }
  }

  const nextVocabWord = () => {
    flipAnim.setValue(0)
    setVocabFlipped(false)
    if (vocabIndex + 1 >= VOCAB_WORDS.length) {
      markComplete('vocabulary')
    } else {
      setVocabIndex(prev => prev + 1)
    }
  }

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const renderProgressSection = () => (
    <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.progressCard}>
      <View style={styles.progressTop}>
        <Text style={styles.progressTitle}>Today's Progress</Text>
        <Text style={styles.progressCount}>{completedCount} / 4 completed</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${(completedCount / 4) * 100}%` }]} />
      </View>

      <View style={styles.progressBottom}>
        <Text style={styles.streakText}>🔥 Keep your {streak}-day streak!</Text>
        <Text style={styles.bonusHint}>Complete all 4 for +{BONUS_XP} bonus XP</Text>
      </View>
    </LinearGradient>
  )

  const renderChallengeCard = (type: ChallengeType) => {
    const meta = CHALLENGE_META[type]
    const isDone = completed.has(type)
    const isActive = activeChallenge === type

    return (
      <View key={type} style={[styles.challengeCard, isDone && styles.challengeCardDone]}>
        {/* Card header row */}
        <View style={styles.cardHeader}>
          <View style={styles.cardIconWrap}>
            <Text style={styles.cardIcon}>{meta.icon}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{meta.title}</Text>
            <Text style={styles.cardDesc}>{meta.description}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.xpBadge}>+{meta.xp} XP</Text>
            <View style={[styles.progressDot, isDone && styles.progressDotDone]}>
              {isDone
                ? <Ionicons name="checkmark" size={12} color="white" />
                : <Text style={styles.progressDotText}>0/1</Text>
              }
            </View>
          </View>
        </View>

        {/* Start / collapse button */}
        {!isDone && (
          <TouchableOpacity
            style={[styles.startBtn, isActive && styles.startBtnActive]}
            onPress={() => setActiveChallenge(isActive ? null : type)}
          >
            <Text style={[styles.startBtnText, isActive && styles.startBtnTextActive]}>
              {isActive ? 'Hide' : 'Start'}
            </Text>
          </TouchableOpacity>
        )}

        {isDone && (
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
            <Text style={styles.doneText}>Completed! +{meta.xp} XP earned</Text>
          </View>
        )}

        {/* Inline challenge content */}
        {isActive && !isDone && (
          <View style={styles.challengeBody}>
            {type === 'speaking' && renderSpeakingChallenge()}
            {type === 'writing' && renderWritingChallenge()}
            {type === 'vocabulary' && renderVocabularyChallenge()}
            {type === 'conversation' && renderConversationChallenge()}
          </View>
        )}
      </View>
    )
  }

  // ── Speaking ──────────────────────────────────────────────────────────────

  const renderSpeakingChallenge = () => (
    <View>
      <Text style={styles.challengeInstruction}>
        Tap the mic next to each word and say it aloud. Tap 🔊 to hear the pronunciation first.
      </Text>
      {SPEAKING_WORDS.map((item, idx) => {
        const result = wordResults[idx]
        const isRecording = wordRecordingIndex === idx && isListening
        return (
          <View key={idx} style={styles.wordRow}>
            <View style={styles.wordInfo}>
              <Text style={styles.wordText}>{item.word}</Text>
              <Text style={styles.phoneticText}>{item.phonetic}</Text>
            </View>
            <TouchableOpacity style={styles.speakerBtn} onPress={() => handlePlayWord(item.word)}>
              <Text style={styles.speakerIcon}>🔊</Text>
            </TouchableOpacity>
            <Animated.View style={isRecording ? { transform: [{ scale: pulseAnim }] } : {}}>
              <TouchableOpacity
                style={[
                  styles.wordMicBtn,
                  isRecording && styles.wordMicBtnActive,
                  result === 'pass' && styles.wordMicBtnPass,
                  result === 'fail' && styles.wordMicBtnFail,
                ]}
                onPress={() => !isListening && handleStartWordRecording(idx)}
                disabled={isListening && wordRecordingIndex !== idx}
              >
                <Text style={styles.wordMicIcon}>
                  {result === 'pass' ? '✅' : result === 'fail' ? '❌' : isRecording ? '⏹️' : '🎤'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )
      })}
      <Text style={styles.speakingNote}>
        {Object.keys(wordResults).length} / {SPEAKING_WORDS.length} words attempted
      </Text>
    </View>
  )

  // ── Writing ───────────────────────────────────────────────────────────────

  const renderWritingChallenge = () => (
    <View>
      <Text style={styles.challengeInstruction}>
        Write 3 sentences using these words:{' '}
        <Text style={styles.vocabHighlight}>{WRITING_VOCAB.join(', ')}</Text>
      </Text>
      <TextInput
        style={styles.writingInput}
        value={writingText}
        onChangeText={setWritingText}
        placeholder="Write your sentences here..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
      {writingFeedback && (
        <View style={[
          styles.feedbackBox,
          writingFeedback.startsWith('Great') ? styles.feedbackSuccess : styles.feedbackWarn,
        ]}>
          <Text style={styles.feedbackText}>{writingFeedback}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.checkBtn, writingChecking && { opacity: 0.6 }]}
        onPress={checkWriting}
        disabled={writingChecking || !writingText.trim()}
      >
        {writingChecking
          ? <ActivityIndicator color="white" size="small" />
          : <Text style={styles.checkBtnText}>Check my writing</Text>
        }
      </TouchableOpacity>
    </View>
  )

  // ── Vocabulary ────────────────────────────────────────────────────────────

  const renderVocabularyChallenge = () => {
    const current = VOCAB_WORDS[vocabIndex]
    return (
      <View style={styles.vocabContainer}>
        <Text style={styles.challengeInstruction}>
          Tap the card to flip and see the meaning. Then tap Next.
        </Text>
        <Text style={styles.vocabProgress}>{vocabIndex + 1} / {VOCAB_WORDS.length}</Text>
        <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
          <View style={styles.flashcardWrapper}>
            {/* Front */}
            <Animated.View style={[styles.flashcard, styles.flashcardFront, { transform: [{ rotateY: frontInterpolate }] }]}>
              <Text style={styles.flashcardWord}>{current.word}</Text>
              <Text style={styles.flashcardHint}>Tap to see meaning</Text>
            </Animated.View>
            {/* Back */}
            <Animated.View style={[styles.flashcard, styles.flashcardBack, { transform: [{ rotateY: backInterpolate }] }]}>
              <Text style={styles.flashcardMeaning}>{current.meaning}</Text>
              <Text style={styles.flashcardTelugu}>{current.telugu}</Text>
            </Animated.View>
          </View>
        </TouchableOpacity>
        <View style={styles.vocabActions}>
          <TouchableOpacity style={styles.listenWordBtn} onPress={() => speak(current.word, { language: 'en-IN' })}>
            <Text style={styles.listenWordBtnText}>🔊 Hear word</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextWordBtn} onPress={nextVocabWord}>
            <Text style={styles.nextWordBtnText}>
              {vocabIndex + 1 >= VOCAB_WORDS.length ? 'Finish ✓' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Conversation ──────────────────────────────────────────────────────────

  const renderConversationChallenge = () => (
    <View>
      <Text style={styles.challengeInstruction}>
        Have a 2-minute conversation with Nova in English. Come back here when done!
      </Text>
      <TouchableOpacity
        style={styles.goToNovaBtn}
        onPress={() => router.push('/ai/chat' as any)}
      >
        <Text style={styles.goToNovaBtnText}>Open Nova Chat →</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.markDoneBtn} onPress={() => markComplete('conversation')}>
        <Text style={styles.markDoneBtnText}>I completed the conversation ✓</Text>
      </TouchableOpacity>
    </View>
  )

  // ── All done screen ───────────────────────────────────────────────────────

  if (allDone) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>🎯 Daily Challenge</Text>
              <Text style={styles.headerSubtitle}>రోజువారీ సవాల్ • Earn XP & practice English</Text>
            </View>
          </View>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.allDoneContainer}>
          <Text style={styles.allDoneEmoji}>🏆</Text>
          <Text style={styles.allDoneTitle}>All Challenges Complete!</Text>
          <Text style={styles.allDoneSubtitle}>You earned 200 XP + {BONUS_XP} bonus XP today!</Text>
          <Text style={styles.allDoneStreak}>🔥 {streak}-day streak maintained!</Text>
          <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/home')}>
            <Text style={styles.backHomeBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>🎯 Daily Challenge</Text>
            <Text style={styles.headerSubtitle}>రోజువారీ సవాల్ • Earn XP & practice English</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Today's progress */}
        {renderProgressSection()}

        {/* Challenge cards */}
        {ALL_CHALLENGE_TYPES.map(type => renderChallengeCard(type))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTextContainer: { flex: 1 },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  content: { flex: 1 },
  contentContainer: { padding: 16 },
  bottomSpacer: { height: 60 },

  // Progress card
  progressCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { color: 'white', fontSize: 17, fontWeight: '800' },
  progressCount: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '700' },
  progressBarBg: { height: 10, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: 'white', borderRadius: 5 },
  progressBottom: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streakText: { color: 'white', fontSize: 13, fontWeight: '700' },
  bonusHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },

  // Challenge card
  challengeCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16,
    marginBottom: 14, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  challengeCardDone: { borderWidth: 2, borderColor: Colors.success },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  cardIcon: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  xpBadge: {
    backgroundColor: '#FFF3E0', color: Colors.primary,
    fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center',
  },
  progressDotDone: { backgroundColor: Colors.success },
  progressDotText: { fontSize: 9, color: '#6B7280', fontWeight: '700' },
  startBtn: {
    marginTop: 14, backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  startBtnActive: { backgroundColor: '#4A32D5' },
  startBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  startBtnTextActive: { color: 'white' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  doneText: { color: Colors.success, fontSize: 13, fontWeight: '700' },
  challengeBody: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 14 },

  // Common instruction
  challengeInstruction: { fontSize: 13, color: '#4B5563', marginBottom: 12, lineHeight: 20 },

  // ── Speaking ──────────────────────────────────────────────────────────────
  wordRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  wordInfo: { flex: 1 },
  wordText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  phoneticText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  speakerBtn: { padding: 6 },
  speakerIcon: { fontSize: 20 },
  wordMicBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  wordMicBtnActive: { backgroundColor: Colors.error },
  wordMicBtnPass: { backgroundColor: '#ECFDF5' },
  wordMicBtnFail: { backgroundColor: '#FEF2F2' },
  wordMicIcon: { fontSize: 18 },
  speakingNote: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 10 },

  // ── Writing ───────────────────────────────────────────────────────────────
  vocabHighlight: { color: Colors.primary, fontWeight: '700' },
  writingInput: {
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB',
    borderRadius: 14, padding: 14, fontSize: 14, color: '#111827',
    minHeight: 110, marginBottom: 12,
  },
  feedbackBox: { borderRadius: 10, padding: 12, marginBottom: 10 },
  feedbackSuccess: { backgroundColor: '#ECFDF5' },
  feedbackWarn: { backgroundColor: '#FEF3C7' },
  feedbackText: { fontSize: 13, color: '#1F2937', lineHeight: 20 },
  checkBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center',
  },
  checkBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // ── Vocabulary ────────────────────────────────────────────────────────────
  vocabContainer: { alignItems: 'center' },
  vocabProgress: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', marginBottom: 10 },
  flashcardWrapper: { width: width - 80, height: 160 },
  flashcard: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backfaceVisibility: 'hidden', padding: 20,
  },
  flashcardFront: { backgroundColor: Colors.primary },
  flashcardBack: { backgroundColor: Colors.secondary ?? '#00D26A' },
  flashcardWord: { color: 'white', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  flashcardHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 },
  flashcardMeaning: { color: 'white', fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 24 },
  flashcardTelugu: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8, textAlign: 'center' },
  vocabActions: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  listenWordBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  listenWordBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  nextWordBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  nextWordBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // ── Conversation ──────────────────────────────────────────────────────────
  goToNovaBtn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 10,
  },
  goToNovaBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  markDoneBtn: {
    borderWidth: 1.5, borderColor: Colors.success, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center',
  },
  markDoneBtnText: { color: Colors.success, fontWeight: '700', fontSize: 14 },

  // ── Loading ───────────────────────────────────────────────────────────────
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F0' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280', fontWeight: '600' },

  // ── All done ──────────────────────────────────────────────────────────────
  allDoneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  allDoneEmoji: { fontSize: 72, marginBottom: 16 },
  allDoneTitle: { fontSize: 26, fontWeight: '900', color: '#111827', textAlign: 'center' },
  allDoneSubtitle: { fontSize: 16, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  allDoneStreak: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginTop: 16 },
  backHomeBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40, marginTop: 32,
  },
  backHomeBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
})
