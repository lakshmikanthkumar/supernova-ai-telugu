import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { quizService, gamificationService } from '../../services/api'
import { updateXP } from '../../store/slices/authSlice'
import { showToast } from '../../store/slices/uiSlice'
import { getDynamicQuizQuestions, recordContentSeen } from '../../services/personalization/contentRotationService'
import { Colors } from '../../constants/theme'
import type { QuizQuestion } from '../../types'

// Timer per question (seconds); set to 0 to disable
const QUESTION_TIME_LIMIT = 30

interface Answer { questionId: string; answer: string }

export default function QuizScreen() {
  const dispatch = useAppDispatch()
  const { id } = useLocalSearchParams<{ id: string }>()
  const profile = useAppSelector(s => s.auth.profile)
  const { showTeluguTranslations } = useAppSelector(s => s.ui)

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizComplete, setQuizComplete] = useState(false)
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean; xpEarned: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [xpFlash, setXpFlash] = useState(false)
  const [xpEarnedSoFar, setXpEarnedSoFar] = useState(0)
  // Per-question countdown (counts down from QUESTION_TIME_LIMIT)
  const [questionTimer, setQuestionTimer] = useState(QUESTION_TIME_LIMIT)

  const totalTimerRef = useRef<ReturnType<typeof setInterval>>()
  const questionTimerRef = useRef<ReturnType<typeof setInterval>>()
  const slideAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const xpFlashAnim = useRef(new Animated.Value(0)).current
  const optionFlashAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    loadQuiz()
    totalTimerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000)
    return () => {
      clearInterval(totalTimerRef.current)
      clearInterval(questionTimerRef.current)
    }
  }, [])

  // Per-question countdown timer
  useEffect(() => {
    if (!QUESTION_TIME_LIMIT || loading || selectedAnswer !== null) return
    clearInterval(questionTimerRef.current)
    setQuestionTimer(QUESTION_TIME_LIMIT)
    questionTimerRef.current = setInterval(() => {
      setQuestionTimer(t => {
        if (t <= 1) {
          clearInterval(questionTimerRef.current)
          // Auto-submit a blank answer when time runs out
          handleSelectAnswer('__timeout__')
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(questionTimerRef.current)
  }, [currentIndex, loading])

  // Stop question timer once answer selected
  useEffect(() => {
    if (selectedAnswer !== null) {
      clearInterval(questionTimerRef.current)
    }
  }, [selectedAnswer])

  useEffect(() => {
    if (questions.length > 0) {
      const pct = currentIndex / questions.length
      Animated.timing(progressAnim, {
        toValue: pct,
        duration: 300,
        useNativeDriver: false,
      }).start()
    }
  }, [currentIndex, questions.length])

  const loadQuiz = async () => {
    const userId = profile?.id
    try {
      let qs: QuizQuestion[]
      if (userId && id) {
        qs = await getDynamicQuizQuestions(userId, { lessonId: id as string, count: 10 })
      } else {
        qs = await quizService.getQuizQuestions(id as string)
      }
      // Always shuffle options
      qs = qs.map(q => ({
        ...q,
        options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : q.options
      }))
      setQuestions(qs)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[currentIndex]

  const showXpFlash = () => {
    setXpFlash(true)
    xpFlashAnim.setValue(0)
    Animated.sequence([
      Animated.timing(xpFlashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(xpFlashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setXpFlash(false))
  }

  // Flash the chosen option before showing explanation
  const flashOption = (correct: boolean) => {
    const targetColor = correct ? 1 : -1 // used symbolically; actual color via state
    optionFlashAnim.setValue(0)
    Animated.sequence([
      Animated.timing(optionFlashAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(optionFlashAnim, { toValue: 0.6, duration: 100, useNativeDriver: false }),
      Animated.timing(optionFlashAnim, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start()
  }

  const handleSelectAnswer = async (answer: string) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(answer)
    setShowExplanation(true)

    const isCorrect = answer !== '__timeout__' && answer === currentQuestion.correct_answer
    const userId = profile?.id

    flashOption(isCorrect)

    if (isCorrect) {
      const xpForQuestion = currentQuestion.points ?? 10
      setXpEarnedSoFar(prev => prev + xpForQuestion)
      showXpFlash()
    }

    if (userId && currentQuestion.id) {
      try {
        await recordContentSeen(userId, 'quiz_question', currentQuestion.id, isCorrect ? 100 : 0)
      } catch (_) {
        // non-critical
      }
    }
  }

  const handleNext = () => {
    if (!selectedAnswer) return
    const recorded = selectedAnswer === '__timeout__' ? '' : selectedAnswer
    const newAnswers = [...answers, { questionId: currentQuestion.id, answer: recorded }]
    setAnswers(newAnswers)

    if (currentIndex < questions.length - 1) {
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -400, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCurrentIndex(i => i + 1)
        setSelectedAnswer(null)
        setShowExplanation(false)
        slideAnim.setValue(400)
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }).start()
      })
    } else {
      submitQuiz(newAnswers)
    }
  }

  const handleTryAgain = () => {
    setQuizComplete(false)
    setResult(null)
    setCurrentIndex(0)
    setAnswers([])
    setSelectedAnswer(null)
    setShowExplanation(false)
    setTimeElapsed(0)
    setXpEarnedSoFar(0)
    setLoading(true)
    progressAnim.setValue(0)
    loadQuiz()
    totalTimerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000)
  }

  const submitQuiz = async (finalAnswers: Answer[]) => {
    clearInterval(totalTimerRef.current)
    clearInterval(questionTimerRef.current)
    setSubmitting(true)
    try {
      const res = await quizService.submitQuiz(id!, finalAnswers, timeElapsed)
      setResult({ score: res.score, maxScore: res.maxScore, passed: res.passed, xpEarned: res.xpEarned })
      setQuizComplete(true)

      if (res.passed) {
        await gamificationService.updateProgress('complete_quiz', id, res.xpEarned)
        dispatch(updateXP({ xpEarned: res.xpEarned, newTotal: 0, newLevel: 1 }))
        dispatch(showToast({ message: `Quiz Passed! +${res.xpEarned} XP`, type: 'success' }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getOptionStyle = (option: string) => {
    if (!selectedAnswer) return styles.optionDefault
    if (option === currentQuestion.correct_answer) return styles.optionCorrect
    if (option === selectedAnswer && option !== currentQuestion.correct_answer) return styles.optionWrong
    return styles.optionDefault
  }

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return '#00D26A'
    if (pct >= 60) return '#D97706'
    return '#DC2626'
  }

  const getScoreBadgeStyle = (pct: number) => {
    if (pct >= 80) return styles.scoreBadgeGreen
    if (pct >= 60) return styles.scoreBadgeYellow
    return styles.scoreBadgeRed
  }

  // Circular progress arc path helper
  const CircularProgress = ({ pct, color }: { pct: number; color: string }) => {
    const size = 130
    const strokeWidth = 10
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDash = (pct / 100) * circumference
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Background circle */}
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: '#E5E7EB',
        }} />
        {/* Filled arc approximated with segments */}
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: pct >= 25 ? color : 'transparent',
          borderRightColor: pct >= 50 ? color : 'transparent',
          borderBottomColor: pct >= 75 ? color : 'transparent',
          borderLeftColor: pct >= 100 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
          opacity: pct > 0 ? 1 : 0,
        }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color }}>{pct}%</Text>
          <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 2 }}>Score</Text>
        </View>
      </View>
    )
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
  }

  if (quizComplete && result) {
    const pct = Math.round((result.score / result.maxScore) * 100)
    const wrongAnswers = questions.filter((q, i) => answers[i]?.answer !== q.correct_answer)
    const scoreColor = getScoreColor(pct)

    const gradientColors: [string, string] = pct >= 80
      ? [Colors.primary, Colors.primaryDark]
      : pct >= 60
        ? ['#D97706', '#B45309']
        : ['#DC2626', '#B91C1C']

    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={styles.resultHeader}>
          <Text style={styles.resultHeaderEmoji}>{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'}</Text>
          <Text style={styles.resultHeaderTitle}>Quiz Complete!</Text>
          <Text style={styles.resultHeaderTelugu}>
            {pct >= 80 ? 'Great job! అద్భుతం!' : pct >= 60 ? 'Good effort! మంచి ప్రయత్నం!' : 'Keep practicing! అభ్యాసం చేయండి!'}
          </Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.resultContent}>

          {/* Circular progress + stats row */}
          <View style={styles.resultTopRow}>
            <CircularProgress pct={pct} color={scoreColor} />
            <View style={styles.resultStatsCol}>
              <View style={styles.resultStatCard}>
                <Text style={[styles.resultStatNumber, { color: Colors.primary }]}>{result.xpEarned}</Text>
                <Text style={styles.resultStatLabel}>XP Earned</Text>
              </View>
              <View style={styles.resultStatCard}>
                <Text style={styles.resultStatNumber}>
                  {Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')}
                </Text>
                <Text style={styles.resultStatLabel}>Time</Text>
              </View>
              <View style={styles.resultStatCard}>
                <Text style={[styles.resultStatNumber, { color: scoreColor }]}>
                  {questions.length - wrongAnswers.length}/{questions.length}
                </Text>
                <Text style={styles.resultStatLabel}>Correct</Text>
              </View>
            </View>
          </View>

          {/* Score badge */}
          <View style={[styles.scoreBadge, getScoreBadgeStyle(pct)]}>
            <Text style={[styles.scoreBadgeLabel, { color: scoreColor }]}>
              {pct >= 80
                ? '🏆 Excellent! అద్భుతం!'
                : pct >= 60
                  ? '👍 Good Job! మంచి పని!'
                  : '💪 Keep Practicing! మళ్ళీ ప్రయత్నించండి!'}
            </Text>
          </View>

          {/* Wrong answers review */}
          {wrongAnswers.length > 0 && (
            <>
              <Text style={styles.reviewSectionTitle}>
                Questions You Got Wrong ({wrongAnswers.length})
              </Text>
              {wrongAnswers.map((q) => {
                const userAns = answers.find(a => a.questionId === q.id)?.answer
                return (
                  <View key={q.id} style={[styles.reviewCard, styles.reviewWrong]}>
                    <Text style={styles.reviewQuestion}>{q.question_text}</Text>
                    {showTeluguTranslations && q.question_text_telugu && (
                      <Text style={styles.reviewQuestionTelugu}>{q.question_text_telugu}</Text>
                    )}
                    <Text style={[styles.reviewAnswer, { color: '#EF4444' }]}>
                      Your answer: {userAns || '(timed out)'}
                    </Text>
                    <Text style={styles.correctAnswer}>Correct: {q.correct_answer}</Text>
                    {q.explanation && <Text style={styles.reviewExplanation}>{q.explanation}</Text>}
                  </View>
                )
              })}
            </>
          )}

          {wrongAnswers.length === 0 && (
            <View style={styles.perfectCard}>
              <Text style={styles.perfectText}>Perfect score! All answers correct! 🎉</Text>
            </View>
          )}

          {/* All answers review */}
          <Text style={styles.reviewTitle}>All Answers</Text>
          {questions.map((q, i) => {
            const userAnswer = answers[i]?.answer
            const correct = userAnswer === q.correct_answer
            return (
              <View key={q.id} style={[styles.reviewCard, correct ? styles.reviewCorrect : styles.reviewWrong]}>
                <Text style={styles.reviewQuestion}>{q.question_text}</Text>
                {showTeluguTranslations && q.question_text_telugu && (
                  <Text style={styles.reviewQuestionTelugu}>{q.question_text_telugu}</Text>
                )}
                <Text style={[styles.reviewAnswer, { color: correct ? '#00D26A' : '#EF4444' }]}>
                  {correct ? '✅' : '❌'} Your answer: {userAnswer || '(timed out)'}
                </Text>
                {!correct && (
                  <Text style={styles.correctAnswer}>Correct: {q.correct_answer}</Text>
                )}
                {q.explanation && <Text style={styles.reviewExplanation}>{q.explanation}</Text>}
              </View>
            )
          })}

          {/* Action buttons */}
          <TouchableOpacity style={styles.tryAgainBtn} onPress={handleTryAgain}>
            <Text style={styles.tryAgainBtnText}>Try Again with New Questions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/home')}>
            <Text style={styles.doneBtnText}>Continue Learning →</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }

  if (!currentQuestion) return null

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  // Question timer color: red when <= 10s
  const timerColor = QUESTION_TIME_LIMIT > 0 && questionTimer <= 10 ? '#DC2626' : 'rgba(255,255,255,0.9)'
  const timerPct = QUESTION_TIME_LIMIT > 0 ? questionTimer / QUESTION_TIME_LIMIT : 1

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Quiz Time!</Text>
          {/* XP earned so far */}
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>⚡ XP Earned: {xpEarnedSoFar}</Text>
          </View>
        </View>
        <View style={styles.quizMeta}>
          <Text style={styles.questionCount}>Question {currentIndex + 1} of {questions.length}</Text>
          <View style={styles.timerRow}>
            <Text style={styles.totalTimer}>
              {Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')}
            </Text>
            {QUESTION_TIME_LIMIT > 0 && (
              <Text style={[styles.questionCountdown, { color: timerColor }]}>
                ⏱ {questionTimer}s
              </Text>
            )}
          </View>
        </View>
        {/* Per-question timer bar */}
        {QUESTION_TIME_LIMIT > 0 && (
          <View style={styles.questionTimerBar}>
            <View style={[
              styles.questionTimerFill,
              {
                width: `${timerPct * 100}%` as `${number}%`,
                backgroundColor: timerColor === '#DC2626' ? '#DC2626' : Colors.accent,
              },
            ]} />
          </View>
        )}
      </LinearGradient>

      {/* Overall progress bar */}
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* XP flash */}
      {xpFlash && (
        <Animated.View
          style={[
            styles.xpFlash,
            {
              opacity: xpFlashAnim,
              transform: [{
                translateY: xpFlashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }),
              }],
            },
          ]}
        >
          <Text style={styles.xpFlashText}>+{currentQuestion.points ?? 10} XP</Text>
        </Animated.View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <View style={styles.questionCard}>
            <Text style={styles.questionNumber}>Question {currentIndex + 1} of {questions.length}</Text>
            <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
            {showTeluguTranslations && currentQuestion.question_text_telugu && (
              <Text style={styles.questionTelugu}>{currentQuestion.question_text_telugu}</Text>
            )}
            <View style={styles.questionFooterRow}>
              <Text style={styles.questionPoints}>{currentQuestion.points ?? 10} pts</Text>
              <Text style={styles.xpEarnedInline}>Total XP: {xpEarnedSoFar}</Text>
            </View>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option, i) => {
              const optStyle = getOptionStyle(option)
              const isSelected = selectedAnswer === option
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.option, optStyle, isSelected && styles.optionSelected]}
                  onPress={() => handleSelectAnswer(option)}
                  disabled={!!selectedAnswer}
                  activeOpacity={0.75}
                >
                  <View style={[
                    styles.optionLetter,
                    optStyle === styles.optionCorrect ? styles.optionLetterCorrect
                      : optStyle === styles.optionWrong ? styles.optionLetterWrong
                        : styles.optionLetterDefault,
                  ]}>
                    <Text style={[
                      styles.optionLetterText,
                      optStyle === styles.optionCorrect ? { color: '#00D26A' }
                        : optStyle === styles.optionWrong ? { color: '#EF4444' }
                          : { color: Colors.primary },
                    ]}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                  </View>
                  <Text style={styles.optionText}>{option}</Text>
                  {selectedAnswer && option === currentQuestion.correct_answer && (
                    <Text style={styles.optionIcon}>✅</Text>
                  )}
                  {selectedAnswer === option && option !== currentQuestion.correct_answer && (
                    <Text style={styles.optionIcon}>❌</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Explanation */}
          {showExplanation && (
            <View style={[
              styles.explanationCard,
              selectedAnswer === currentQuestion.correct_answer
                ? styles.explanationCorrect
                : styles.explanationWrong,
            ]}>
              <Text style={styles.explanationTitle}>
                {selectedAnswer === '__timeout__'
                  ? '⏰ Time\'s up!'
                  : selectedAnswer === currentQuestion.correct_answer
                    ? '✅ Correct!'
                    : '❌ Incorrect!'}
              </Text>
              {currentQuestion.explanation && (
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              )}
              {showTeluguTranslations && currentQuestion.explanation_telugu && (
                <Text style={styles.explanationTelugu}>{currentQuestion.explanation_telugu}</Text>
              )}
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext} disabled={submitting}>
                {submitting ? <ActivityIndicator color="white" /> : (
                  <Text style={styles.nextBtnText}>
                    {currentIndex < questions.length - 1 ? 'Next Question →' : 'Finish Quiz ✓'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
  backBtn: { color: 'white', fontSize: 24, marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  xpBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  xpBadgeText: { color: 'white', fontWeight: '700', fontSize: 13 },
  quizMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  questionCount: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  timerRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  totalTimer: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  questionCountdown: { fontSize: 14, fontWeight: '800' },
  questionTimerBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  questionTimerFill: { height: 4, borderRadius: 2 },

  // Progress bar
  progressBar: { height: 6, backgroundColor: '#FFDDD0' },
  progressFill: { height: 6, backgroundColor: Colors.primary },

  // Content
  content: { flex: 1 },
  questionCard: {
    margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 20,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  questionNumber: {
    fontSize: 12, fontWeight: '700', color: Colors.primary,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  questionText: { fontSize: 18, fontWeight: '700', color: '#111827', lineHeight: 28 },
  questionTelugu: { fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 22 },
  questionFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  questionPoints: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  xpEarnedInline: { fontSize: 13, color: '#00D26A', fontWeight: '700' },

  // Options
  optionsContainer: { paddingHorizontal: 16, gap: 10 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 2, backgroundColor: 'white',
  },
  optionDefault: { borderColor: '#E5E7EB' },
  optionCorrect: { borderColor: '#00D26A', backgroundColor: '#D1FAE5' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  optionSelected: { borderWidth: 2.5 },
  optionLetter: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLetterDefault: { backgroundColor: '#FFF0EA' },
  optionLetterCorrect: { backgroundColor: '#A7F3D0' },
  optionLetterWrong: { backgroundColor: '#FECACA' },
  optionLetterText: { fontSize: 14, fontWeight: '700' },
  optionText: { flex: 1, fontSize: 15, color: '#111827' },
  optionIcon: { fontSize: 18 },

  // Explanation
  explanationCard: { margin: 16, borderRadius: 16, padding: 20 },
  explanationCorrect: {
    backgroundColor: '#D1FAE5',
    borderLeftWidth: 4, borderLeftColor: '#00D26A',
  },
  explanationWrong: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4, borderLeftColor: '#EF4444',
  },
  explanationTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8, color: '#111827' },
  explanationText: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 6 },
  explanationTelugu: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  nextBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },

  // XP flash
  xpFlash: {
    position: 'absolute', top: 165, right: 24, zIndex: 100,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, elevation: 8,
  },
  xpFlashText: { color: 'white', fontWeight: '800', fontSize: 15 },

  // ── Results screen ──
  resultHeader: { paddingTop: 60, paddingBottom: 32, alignItems: 'center' },
  resultHeaderEmoji: { fontSize: 56, marginBottom: 12 },
  resultHeaderTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
  resultHeaderTelugu: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },
  resultContent: { padding: 16 },

  // Circular progress + stats
  resultTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, gap: 12,
  },
  resultStatsCol: { flex: 1, gap: 8 },
  resultStatCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 12,
    alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  resultStatNumber: { fontSize: 22, fontWeight: '900', color: '#111827' },
  resultStatLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '600' },

  // Score badge
  scoreBadge: {
    borderRadius: 14, padding: 14, marginBottom: 20,
    alignItems: 'center',
  },
  scoreBadgeGreen: { backgroundColor: '#D1FAE5', borderWidth: 1.5, borderColor: '#00D26A' },
  scoreBadgeYellow: { backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: '#D97706' },
  scoreBadgeRed: { backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#DC2626' },
  scoreBadgeLabel: { fontSize: 16, fontWeight: '700' },

  // Review cards
  reviewSectionTitle: { fontSize: 18, fontWeight: '700', color: '#DC2626', marginBottom: 12 },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  reviewCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  reviewCorrect: { borderLeftWidth: 4, borderLeftColor: '#00D26A' },
  reviewWrong: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  reviewQuestion: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  reviewQuestionTelugu: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  reviewAnswer: { fontSize: 14, fontWeight: '600' },
  correctAnswer: { fontSize: 14, color: '#00D26A', marginTop: 4, fontWeight: '600' },
  reviewExplanation: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  perfectCard: {
    backgroundColor: '#D1FAE5', borderRadius: 14, padding: 16,
    marginBottom: 16, alignItems: 'center',
  },
  perfectText: { fontSize: 16, fontWeight: '700', color: '#00D26A' },

  // Buttons
  tryAgainBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16,
    elevation: 3,
  },
  tryAgainBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  doneBtn: {
    backgroundColor: Colors.secondary,
    paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12,
    elevation: 3,
  },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
})
