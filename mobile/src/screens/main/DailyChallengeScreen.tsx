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
import { Theme } from '../../theme'
import { 
  Target, Zap, Flame, Star, ThumbsUp, Activity, AlertTriangle, PartyPopper 
} from 'lucide-react-native'


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
        'Challenge Completed!',
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
    if (score >= 80) return '#00E676'
    if (score >= 60) return Theme.colors.accent
    return Theme.colors.error
  }

  if (challengeLoading || !dailyChallenge) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.secondary} />
        <Text style={styles.loadingText}>Initializing Daily Protocol...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Target size={24} color={Theme.colors.text} strokeWidth={2.5} style={{ marginRight: 10 }} />
          <Text style={styles.headerTitle}>Daily Protocol</Text>
        </View>
        <Text style={styles.headerSubtitle}>రోజువారీ సవాల్ • Earn XP & Sync Knowledge</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {isCompleted ? (
          <View style={styles.completedCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={80} color="#00E676" />
            </View>
            <Text style={styles.completedTitle}>Protocol Completed!</Text>
            <Text style={styles.completedTelugu}>ఈరోజు సవాల్ విజయవంతంగా పూర్తయింది!</Text>
            <View style={styles.completedXpRow}>
              <Text style={styles.completedXp}>+ {dailyChallenge.xp_reward} XP Extracted</Text>
              <Zap size={24} color={Theme.colors.accent} strokeWidth={3} />
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
              <Text style={styles.doneBtnText}>Return to Interface</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Word of the Day Card */}
            <View style={styles.challengeCard}>
              <View style={styles.badgeRow}>
                <View style={styles.badgeWrapper}>
                  <Flame size={12} color={Theme.colors.secondary} strokeWidth={3} style={{ marginRight: 4 }} />
                  <Text style={styles.badgeText}>{dailyChallenge.challenge_type.toUpperCase()}</Text>
                </View>
                <View style={styles.rewardWrapper}>
                  <Zap size={14} color={Theme.colors.accent} strokeWidth={2.5} style={{ marginRight: 4 }} />
                  <Text style={styles.rewardText}>{dailyChallenge.xp_reward} XP</Text>
                </View>
              </View>

              <Text style={styles.challengeTitle}>{dailyChallenge.title}</Text>
              <Text style={styles.challengeTitleTelugu}>{dailyChallenge.title_telugu}</Text>

              <View style={styles.wordBox}>
                <Text style={styles.mainWord}>{content?.word}</Text>
                <TouchableOpacity onPress={playWord} style={styles.speakerBtn}>
                  <Ionicons name="volume-medium" size={24} color={Theme.colors.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.meaningTelugu}>{content?.meaning_telugu}</Text>
              
              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Target Sequence (ఉదాహరణ వాక్యం):</Text>
              <Text style={styles.exampleSentence}>"{content?.sentence}"</Text>
              <Text style={styles.exampleSentenceTelugu}>{content?.sentence_telugu}</Text>

              <View style={styles.soundActions}>
                <TouchableOpacity style={styles.soundBtn} onPress={playSentence}>
                  <Ionicons name="play-circle-outline" size={20} color={Theme.colors.secondary} />
                  <Text style={styles.soundBtnText}>Transmit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.soundBtn, styles.soundBtnSlow]} onPress={playSentenceSlow}>
                  <Ionicons name="play-circle-outline" size={20} color="#00E676" />
                  <Text style={styles.soundBtnTextSlow}>Slow Transmit</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Speaking Section */}
            <View style={styles.actionCard}>
              <Text style={styles.speakHeader}>Replicate this sequence to verify:</Text>
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
                    <ActivityIndicator color="#000" size="large" />
                  ) : (
                    <Ionicons name={isListening ? 'stop' : 'mic'} size={40} color="#000" />
                  )}
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.recordStatusText}>
                {isListening ? 'Receiving Audio... Tap to Terminate' : 'Tap to Initialize Mic'}
              </Text>
            </View>

            {/* Pronunciation Results */}
            {result && (
              <View style={styles.resultsCard}>
                <Text style={styles.resultsTitle}>Acoustic Analysis Result</Text>
                <View style={styles.scoreRow}>
                  <View style={[styles.scoreCircle, { borderColor: getScoreColor(result.overall_score) }]}>
                    <Text style={[styles.scoreText, { color: getScoreColor(result.overall_score) }]}>
                      {result.overall_score}
                    </Text>
                    <Text style={styles.scoreSub}>/100</Text>
                  </View>
                  <View style={styles.scoreFeedback}>
                    <View style={styles.gradeRow}>
                      {result.overall_score >= 80 ? (
                        <Star size={18} color="#00E676" style={{ marginRight: 6 }} />
                      ) : result.overall_score >= 60 ? (
                        <ThumbsUp size={18} color={Theme.colors.accent} style={{ marginRight: 6 }} />
                      ) : (
                        <Activity size={18} color={Theme.colors.error} style={{ marginRight: 6 }} />
                      )}
                      <Text style={[styles.gradeText, { color: Theme.colors.text }]}>
                        {result.overall_score >= 80 ? 'Optimal!' : result.overall_score >= 60 ? 'Acceptable' : 'Suboptimal. Retrying recommended.'}
                      </Text>
                    </View>
                    <Text style={styles.detailsText}>Captured: "{result.transcript}"</Text>
                  </View>
                </View>

                {result.overall_score >= 60 ? (
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={handleCompleteChallenge}
                    disabled={claiming}
                  >
                    {claiming ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <View style={styles.claimButtonRow}>
                        <PartyPopper size={20} color="#000" style={{ marginRight: 10 }} />
                        <Text style={styles.claimButtonText}>Extract +{dailyChallenge.xp_reward} XP Reward!</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.retryWarningBox}>
                    <AlertTriangle size={16} color={Theme.colors.error} style={{ marginRight: 6 }} />
                    <Text style={styles.retryWarning}>
                      Accuracy below 60% threshold. Audio pattern rejected.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Developer Bypass Button */}
            <TouchableOpacity style={styles.bypassButton} onPress={handleCompleteChallenge}>
               <View style={styles.bypassRow}>
                 <Zap size={14} color={Theme.colors.textSecondary} style={{ marginRight: 4 }} />
                 <Text style={styles.bypassText}>Force Bypass (Dev Mode)</Text>
               </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Theme.colors.background },
  loadingText: { marginTop: 16, fontSize: 16, color: Theme.colors.secondary, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  header: { paddingTop: 52, paddingBottom: 32, paddingHorizontal: 20 },
  backButton: { marginBottom: 16, width: 40 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: Theme.colors.secondary, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1.5 },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },
  challengeCard: { backgroundColor: Theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Theme.colors.border, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  badgeWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,194,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,194,255,0.3)' },
  badgeText: { color: Theme.colors.secondary, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  rewardWrapper: { flexDirection: 'row', alignItems: 'center' },
  rewardText: { color: Theme.colors.accent, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  challengeTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text },
  challengeTitleTelugu: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 4, marginBottom: 20 },
  wordBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  mainWord: { fontSize: 32, fontWeight: '900', color: Theme.colors.secondary, letterSpacing: 1 },
  speakerBtn: { backgroundColor: 'rgba(0,194,255,0.1)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,194,255,0.3)' },
  meaningTelugu: { fontSize: 18, color: '#00E676', fontWeight: '800', marginBottom: 16 },
  divider: { height: 1, backgroundColor: Theme.colors.border, marginVertical: 18 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: Theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  exampleSentence: { fontSize: 18, fontWeight: '700', color: Theme.colors.text, fontStyle: 'italic', lineHeight: 28 },
  exampleSentenceTelugu: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 6, marginBottom: 20 },
  soundActions: { flexDirection: 'row', gap: 12 },
  soundBtn: { flex: 1, borderWidth: 1.5, borderColor: Theme.colors.secondary, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(0,194,255,0.05)' },
  soundBtnSlow: { borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.05)' },
  soundBtnText: { color: Theme.colors.secondary, fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },
  soundBtnTextSlow: { color: '#00E676', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },
  actionCard: { backgroundColor: Theme.colors.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  speakHeader: { fontSize: 15, fontWeight: '800', color: Theme.colors.text, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
  speakHeaderTelugu: { fontSize: 13, color: Theme.colors.textSecondary, marginTop: 6, marginBottom: 24, textAlign: 'center' },
  partialTranscriptBox: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, marginBottom: 24, width: '100%', borderWidth: 1, borderColor: Theme.colors.border },
  partialTranscriptText: { color: Theme.colors.secondary, fontStyle: 'italic', textAlign: 'center', fontSize: 15, fontWeight: '600' },
  recordButton: { width: 88, height: 88, borderRadius: 44, backgroundColor: Theme.colors.secondary, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10 },
  recordButtonActive: { backgroundColor: Theme.colors.error, shadowColor: Theme.colors.error },
  recordStatusText: { fontSize: 13, color: Theme.colors.textSecondary, marginTop: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  resultsCard: { backgroundColor: Theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Theme.colors.border, marginTop: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  resultsTitle: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  scoreCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  scoreText: { fontSize: 24, fontWeight: '900' },
  scoreSub: { fontSize: 11, color: Theme.colors.textSecondary, fontWeight: '800' },
  scoreFeedback: { flex: 1 },
  gradeRow: { flexDirection: 'row', alignItems: 'center' },
  gradeText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  detailsText: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
  claimButton: { backgroundColor: Theme.colors.secondary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: Theme.colors.secondary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  claimButtonRow: { flexDirection: 'row', alignItems: 'center' },
  claimButtonText: { color: '#000', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  retryWarningBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  retryWarning: { color: Theme.colors.error, fontSize: 13, fontWeight: '800' },
  bypassButton: { marginTop: 30, paddingVertical: 12, alignItems: 'center' },
  bypassRow: { flexDirection: 'row', alignItems: 'center' },
  bypassText: { color: Theme.colors.textSecondary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, textDecorationLine: 'underline' },
  completedCard: { backgroundColor: Theme.colors.surface, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.border, marginTop: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  successIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0,230,118,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: 'rgba(0,230,118,0.3)' },
  completedTitle: { fontSize: 24, fontWeight: '900', color: Theme.colors.text, textAlign: 'center', letterSpacing: 0.5 },
  completedTelugu: { fontSize: 15, color: Theme.colors.textSecondary, marginTop: 8, textAlign: 'center' },
  completedXpRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  completedXp: { fontSize: 26, fontWeight: '900', color: Theme.colors.accent, marginRight: 8, textShadowColor: 'rgba(255,184,0,0.3)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },
  doneBtn: { backgroundColor: Theme.colors.secondary, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, width: '100%', alignItems: 'center', shadowColor: Theme.colors.secondary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  doneBtnText: { color: '#000', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
})
