import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, Alert, Dimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../services/supabase'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { fetchDailyChallenge } from '../../store/slices/gamificationSlice'
import { fetchProfile } from '../../store/slices/authSlice'
import {
  startListening, stopListening, initializeSpeechRecognition,
  destroySpeechRecognition, isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition'
import { speak, speakWord, stopSpeaking } from '../../services/audio/textToSpeech'
import { scorePronunciation, type PronunciationScore } from '../../services/pronunciation/pronunciationScorer'
import { gamificationService } from '../../services/api'

const { width } = Dimensions.get('window')

export default function DailyChallengeScreen() {
  const dispatch = useAppDispatch()
  const { profile } = useAppSelector(s => s.auth)
  const { dailyChallenge, loading: challengeLoading } = useAppSelector(s => s.gamification)

  const [isListening, setIsListening] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [result, setResult] = useState<PronunciationScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [sttAvailable, setSttAvailable] = useState(true)
  const [isCompleted, setIsCompleted] = useState(false)

  const scoreAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const checkAnim = useRef(new Animated.Value(0)).current

  // Cast the daily challenge content safely to access fields
  const content = (dailyChallenge?.content || {}) as any

  useEffect(() => {
    checkSTTAvailability()
    initializeSpeechRecognition()
    
    if (dailyChallenge) {
      setIsCompleted(dailyChallenge.completed || false)
    } else {
      dispatch(fetchDailyChallenge())
    }

    return () => {
      destroySpeechRecognition()
      stopSpeaking()
    }
  }, [dailyChallenge])

  const checkSTTAvailability = async () => {
    const available = await isSpeechRecognitionAvailable()
    setSttAvailable(available)
  }

  // Speak word/sentence
  const playWord = () => {
    if (!content?.word) return
    speakWord(content.word, { repeat: 1, language: 'en-IN' })
  }

  const playSentence = () => {
    if (!content?.sentence) return
    speak(content.sentence, { language: 'en-IN' })
  }

  const playSentenceSlow = () => {
    if (!content?.sentence) return
    speak(content.sentence, { rate: 'slow', language: 'en-IN' })
  }

  // Listening handlers
  const handleStartListening = async () => {
    if (!sttAvailable) {
      Alert.alert(
        'Speech Recognition',
        'Speech recognition is not available on this device.',
        [{ text: 'OK' }]
      )
      return
    }

    setResult(null)
    setPartialTranscript('')
    scoreAnim.setValue(0)
    setIsListening(true)

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start()

    await startListening({
      language: 'en-IN',
      partialResults: true,
      onPartialResult: (text) => setPartialTranscript(text),
      onFinalResult: async (recognitionResult) => {
        setIsListening(false)
        pulseAnim.setValue(1)
        setPartialTranscript('')
        await gradeRecognition(recognitionResult.transcript)
      },
      onError: (error) => {
        setIsListening(false)
        pulseAnim.setValue(1)
        setPartialTranscript('')
        Alert.alert('Recognition Error', error)
      },
      onEnd: () => {
        setIsListening(false)
        pulseAnim.setValue(1)
      },
    })
  }

  const handleStopListening = async () => {
    await stopListening()
    setIsListening(false)
    pulseAnim.setValue(1)
  }

  const gradeRecognition = async (transcript: string) => {
    const targetSentence = content?.sentence
    if (!targetSentence || !transcript.trim()) {
      Alert.alert('No Speech', 'We could not detect any speech. Please try again.')
      return
    }

    setLoading(true)
    try {
      const localScore = scorePronunciation(transcript, targetSentence)

      try {
        await gamificationService.updateProgress('daily_challenge_attempt', undefined, 0)
        setResult(localScore)
      } catch {
        setResult(localScore)
      }

      Animated.timing(scoreAnim, {
        toValue: localScore.overall_score,
        duration: 1200,
        useNativeDriver: false,
      }).start()
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteChallenge = async () => {
    if (!dailyChallenge) return
    setClaiming(true)
    try {
      // 1. Update progress in database via Supabase edge function/mock
      await gamificationService.updateProgress('daily_challenge', undefined, dailyChallenge.xp_reward)

      // 2. Also try writing to user_daily_challenges table directly if authenticated and ID is a valid UUID
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dailyChallenge.id)
        if (user && isUuid) {
          await supabase.from('user_daily_challenges').upsert({
            user_id: user.id,
            challenge_id: dailyChallenge.id,
            completed: true,
            score: result?.overall_score || 100,
            completed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,challenge_id' })
        } else if (user) {
          console.log('[DailyChallenge] Skipping direct table write because challenge_id is not a valid UUID:', dailyChallenge.id)
        }
      } catch (err) {
        console.warn('Direct user_daily_challenges write failed: ', err)
      }

      // 3. Refresh State
      setIsCompleted(true)
      dispatch(fetchDailyChallenge())
      if (profile?.id) {
        dispatch(fetchProfile(profile.id))
      }

      // Confetti/Success animation
      Animated.spring(checkAnim, {
        toValue: 1,
        tension: 50,
        friction: 4,
        useNativeDriver: true,
      }).start()

      Alert.alert(
        'Challenge Completed! 🎉',
        `Congratulations! You earned +${dailyChallenge.xp_reward} XP!`,
        [{ text: 'Great!', onPress: () => router.canGoBack() ? router.back() : router.replace('/home') }]
      )
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete challenge')
    } finally {
      setClaiming(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981'
    if (score >= 60) return '#F59E0B'
    return '#EF4444'
  }

  if (challengeLoading || !dailyChallenge) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading Daily Challenge...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎯 Daily Challenge</Text>
        <Text style={styles.headerSubtitle}>రోజువారీ సవాల్ • Earn XP & practice English</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {isCompleted ? (
          <View style={styles.completedCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
            </View>
            <Text style={styles.completedTitle}>Daily Challenge Completed!</Text>
            <Text style={styles.completedTelugu}>ఈరోజు సవాల్ విజయవంతంగా పూర్తయింది!</Text>
            <Text style={styles.completedXp}>+ {dailyChallenge.xp_reward} XP Earned ⚡</Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
              <Text style={styles.doneBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Word of the Day Card */}
            <View style={styles.challengeCard}>
              <View style={styles.badgeRow}>
                <Text style={styles.badgeText}>🔥 {dailyChallenge.challenge_type.toUpperCase()}</Text>
                <Text style={styles.rewardText}>⚡ {dailyChallenge.xp_reward} XP</Text>
              </View>

              <Text style={styles.challengeTitle}>{dailyChallenge.title}</Text>
              <Text style={styles.challengeTitleTelugu}>{dailyChallenge.title_telugu}</Text>

              <View style={styles.wordBox}>
                <Text style={styles.mainWord}>{content?.word}</Text>
                <TouchableOpacity onPress={playWord} style={styles.speakerBtn}>
                  <Ionicons name="volume-medium" size={24} color="#7C3AED" />
                </TouchableOpacity>
              </View>

              <Text style={styles.meaningTelugu}>{content?.meaning_telugu}</Text>
              
              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Practice Sentence (ఉదాహరణ వాక్యం):</Text>
              <Text style={styles.exampleSentence}>"{content?.sentence}"</Text>
              <Text style={styles.exampleSentenceTelugu}>{content?.sentence_telugu}</Text>

              <View style={styles.soundActions}>
                <TouchableOpacity style={styles.soundBtn} onPress={playSentence}>
                  <Ionicons name="play-circle-outline" size={20} color="#4F46E5" />
                  <Text style={styles.soundBtnText}>Listen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.soundBtn, styles.soundBtnSlow]} onPress={playSentenceSlow}>
                  <Ionicons name="play-circle-outline" size={20} color="#059669" />
                  <Text style={styles.soundBtnTextSlow}>Listen Slow</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Speaking Section */}
            <View style={styles.actionCard}>
              <Text style={styles.speakHeader}>Speak this sentence to complete the challenge:</Text>
              <Text style={styles.speakHeaderTelugu}>సవాల్ పూర్తి చేయడానికి ఈ వాక్యాన్ని పలకండి:</Text>

              {partialTranscript ? (
                <View style={styles.partialTranscriptBox}>
                  <Text style={styles.partialTranscriptText}>"{partialTranscript}"</Text>
                </View>
              ) : null}

              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.recordButton, isListening && styles.recordButtonActive]}
                  onPress={isListening ? handleStopListening : handleStartListening}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" size="large" />
                  ) : (
                    <Ionicons name={isListening ? 'stop' : 'mic'} size={40} color="white" />
                  )}
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.recordStatusText}>
                {isListening ? 'Listening... Tap to Stop' : 'Tap to Speak'}
              </Text>
            </View>

            {/* Pronunciation Results */}
            {result && (
              <View style={styles.resultsCard}>
                <Text style={styles.resultsTitle}>Pronunciation Result</Text>
                <View style={styles.scoreRow}>
                  <View style={[styles.scoreCircle, { borderColor: getScoreColor(result.overall_score) }]}>
                    <Text style={[styles.scoreText, { color: getScoreColor(result.overall_score) }]}>
                      {result.overall_score}
                    </Text>
                    <Text style={styles.scoreSub}>/100</Text>
                  </View>
                  <View style={styles.scoreFeedback}>
                    <Text style={styles.gradeText}>
                      {result.overall_score >= 80 ? 'Excellent! 🌟' : result.overall_score >= 60 ? 'Good Job! 👍' : 'Keep Practicing! 💪'}
                    </Text>
                    <Text style={styles.detailsText}>You said: "{result.transcript}"</Text>
                  </View>
                </View>

                {result.overall_score >= 60 ? (
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={handleCompleteChallenge}
                    disabled={claiming}
                  >
                    {claiming ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.claimButtonText}>Claim +{dailyChallenge.xp_reward} XP Reward! 🎉</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.retryWarning}>
                    ⚠️ Score at least 60% to claim reward. Try speaking again!
                  </Text>
                )}
              </View>
            )}

            {/* Developer Bypass Button */}
            <TouchableOpacity style={styles.bypassButton} onPress={handleCompleteChallenge}>
              <Text style={styles.bypassText}>⚡ Fast Complete (Dev Bypass)</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280', fontWeight: '600' },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  backButton: { marginBottom: 12, width: 40 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  challengeCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badgeText: { backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, color: '#7C3AED', fontWeight: '700', fontSize: 11 },
  rewardText: { color: '#F59E0B', fontWeight: '800', fontSize: 14 },
  challengeTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  challengeTitleTelugu: { fontSize: 14, color: '#6B7280', marginTop: 2, marginBottom: 16 },
  wordBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  mainWord: { fontSize: 32, fontWeight: '900', color: '#7C3AED' },
  speakerBtn: { backgroundColor: '#F3E8FF', width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  meaningTelugu: { fontSize: 18, color: '#059669', fontWeight: '700', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 },
  exampleSentence: { fontSize: 18, fontWeight: '700', color: '#1F2937', fontStyle: 'italic', lineHeight: 26 },
  exampleSentenceTelugu: { fontSize: 14, color: '#4B5563', marginTop: 4, marginBottom: 16 },
  soundActions: { flexDirection: 'row', gap: 10 },
  soundBtn: { flex: 1, borderWidth: 1.5, borderColor: '#4F46E5', borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  soundBtnSlow: { borderColor: '#059669' },
  soundBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  soundBtnTextSlow: { color: '#059669', fontWeight: '700', fontSize: 14 },
  actionCard: { backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 4, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  speakHeader: { fontSize: 15, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  speakHeaderTelugu: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 24, textAlign: 'center' },
  partialTranscriptBox: { backgroundColor: '#F5F3FF', padding: 14, borderRadius: 12, marginBottom: 20, width: '100%' },
  partialTranscriptText: { color: '#7C3AED', fontStyle: 'italic', textAlign: 'center', fontSize: 15 },
  recordButton: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  recordButtonActive: { backgroundColor: '#EF4444' },
  recordStatusText: { fontSize: 13, color: '#6B7280', marginTop: 12, fontWeight: '600' },
  resultsCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 4, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  resultsTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  scoreCircle: { width: 68, height: 68, borderRadius: 34, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: 22, fontWeight: '900' },
  scoreSub: { fontSize: 10, color: '#9CA3AF' },
  scoreFeedback: { flex: 1 },
  gradeText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  detailsText: { fontSize: 13, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },
  claimButton: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  claimButtonText: { color: 'white', fontWeight: '800', fontSize: 15 },
  retryWarning: { color: '#EF4444', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  bypassButton: { marginTop: 24, paddingVertical: 12, alignItems: 'center' },
  bypassText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  completedCard: { backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, marginTop: 20 },
  successIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  completedTitle: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  completedTelugu: { fontSize: 15, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  completedXp: { fontSize: 24, fontWeight: '900', color: '#F59E0B', marginVertical: 20 },
  doneBtn: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
})
