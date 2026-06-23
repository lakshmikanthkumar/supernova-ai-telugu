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
import type { QuizQuestion } from '../../types'

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

  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const slideAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const xpFlashAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    loadQuiz()
    timerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

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

  const handleSelectAnswer = async (answer: string) => {
    if (selectedAnswer !== null) return
    setSelectedAnswer(answer)
    setShowExplanation(true)

    const isCorrect = answer === currentQuestion.correct_answer
    const userId = profile?.id

    if (isCorrect) {
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
    const newAnswers = [...answers, { questionId: currentQuestion.id, answer: selectedAnswer }]
    setAnswers(newAnswers)

    if (currentIndex < questions.length - 1) {
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -400, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCurrentIndex(i => i + 1)
        setSelectedAnswer(null)
        setShowExplanation(false)
        slideAnim.setValue(400)
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start()
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
    setLoading(true)
    progressAnim.setValue(0)
    loadQuiz()
    timerRef.current = setInterval(() => setTimeElapsed(t => t + 1), 1000)
  }

  const submitQuiz = async (finalAnswers: Answer[]) => {
    clearInterval(timerRef.current)
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

  const getScoreBadgeStyle = (pct: number) => {
    if (pct >= 80) return styles.scoreBadgeGreen
    if (pct >= 60) return styles.scoreBadgeYellow
    return styles.scoreBadgeRed
  }

  const getScoreTextColor = (pct: number) => {
    if (pct >= 80) return '#059669'
    if (pct >= 60) return '#D97706'
    return '#DC2626'
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#7C3AED" /></View>
  }

  if (quizComplete && result) {
    const pct = Math.round((result.score / result.maxScore) * 100)
    const wrongAnswers = questions.filter((q, i) => answers[i]?.answer !== q.correct_answer)

    const gradientColors: [string, string] = pct >= 80
      ? ['#059669', '#047857']
      : pct >= 60
        ? ['#D97706', '#B45309']
        : ['#DC2626', '#B91C1C']

    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={styles.resultHeader}>
          <Text style={styles.resultHeaderEmoji}>🎉</Text>
          <Text style={styles.resultHeaderTitle}>Daily Quiz Complete!</Text>
          <Text style={styles.resultHeaderTelugu}>రోజువారీ క్విజ్ పూర్తయింది!</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.resultContent}>
          {/* Score badge */}
          <View style={[styles.scoreBadge, getScoreBadgeStyle(pct)]}>
            <Text style={[styles.scoreBadgeNumber, { color: getScoreTextColor(pct) }]}>{pct}%</Text>
            <Text style={[styles.scoreBadgeLabel, { color: getScoreTextColor(pct) }]}>
              {pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good Job!' : 'Keep Practicing!'}
            </Text>
          </View>

          <View style={styles.resultScoreRow}>
            <View style={styles.resultScoreCard}>
              <Text style={[styles.resultScoreNumber, { color: getScoreTextColor(pct) }]}>{pct}%</Text>
              <Text style={styles.resultScoreLabel}>Score</Text>
            </View>
            <View style={styles.resultScoreCard}>
              <Text style={[styles.resultScoreNumber, { color: '#4F46E5' }]}>{result.xpEarned}</Text>
              <Text style={styles.resultScoreLabel}>XP Earned</Text>
            </View>
            <View style={styles.resultScoreCard}>
              <Text style={styles.resultScoreNumber}>{Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')}</Text>
              <Text style={styles.resultScoreLabel}>Time</Text>
            </View>
          </View>

          {/* Wrong answers review */}
          {wrongAnswers.length > 0 && (
            <>
              <Text style={styles.reviewSectionTitle}>Questions You Got Wrong ({wrongAnswers.length})</Text>
              {wrongAnswers.map((q) => {
                const userAns = answers.find(a => a.questionId === q.id)?.answer
                return (
                  <View key={q.id} style={[styles.reviewCard, styles.reviewWrong]}>
                    <Text style={styles.reviewQuestion}>{q.question_text}</Text>
                    {showTeluguTranslations && q.question_text_telugu && (
                      <Text style={styles.reviewQuestionTelugu}>{q.question_text_telugu}</Text>
                    )}
                    <Text style={[styles.reviewAnswer, { color: '#EF4444' }]}>
                      Your answer: {userAns ?? '—'}
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
              <Text style={styles.perfectText}>Perfect score! All answers correct!</Text>
            </View>
          )}

          {/* Review all answers toggle */}
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
                <Text style={[styles.reviewAnswer, { color: correct ? '#059669' : '#EF4444' }]}>
                  {correct ? '✅' : '❌'} Your answer: {userAnswer}
                </Text>
                {!correct && (
                  <Text style={styles.correctAnswer}>✓ Correct: {q.correct_answer}</Text>
                )}
                {q.explanation && <Text style={styles.reviewExplanation}>{q.explanation}</Text>}
              </View>
            )
          })}

          <TouchableOpacity style={styles.tryAgainBtn} onPress={handleTryAgain}>
            <Text style={styles.tryAgainBtnText}>Try Again with New Questions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/home')}>
            <Text style={styles.doneBtnText}>Back to Home</Text>
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

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quiz Time!</Text>
        <View style={styles.quizMeta}>
          <Text style={styles.questionCount}>Question {currentIndex + 1} of {questions.length}</Text>
          <Text style={styles.timer}>{Math.floor(timeElapsed / 60)}:{String(timeElapsed % 60).padStart(2, '0')}</Text>
        </View>
      </LinearGradient>

      {/* Animated progress bar */}
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
          <Text style={styles.xpFlashText}>+10 XP</Text>
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
            <Text style={styles.questionPoints}>{currentQuestion.points} pts</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.option, getOptionStyle(option)]}
                onPress={() => handleSelectAnswer(option)}
                disabled={!!selectedAnswer}
                activeOpacity={0.8}
              >
                <View style={styles.optionLetter}>
                  <Text style={styles.optionLetterText}>{String.fromCharCode(65 + i)}</Text>
                </View>
                <Text style={styles.optionText}>{option}</Text>
                {selectedAnswer && option === currentQuestion.correct_answer && (
                  <Text style={styles.optionIcon}>✅</Text>
                )}
                {selectedAnswer === option && option !== currentQuestion.correct_answer && (
                  <Text style={styles.optionIcon}>❌</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Explanation */}
          {showExplanation && (
            <View style={[styles.explanationCard, selectedAnswer === currentQuestion.correct_answer ? styles.explanationCorrect : styles.explanationWrong]}>
              <Text style={styles.explanationTitle}>
                {selectedAnswer === currentQuestion.correct_answer ? '✅ Correct!' : '❌ Incorrect!'}
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
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16 },
  backBtn: { color: 'white', fontSize: 24, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  quizMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  questionCount: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  timer: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: '#C4B5FD' },
  progressFill: { height: 6, backgroundColor: '#7C3AED' },
  content: { flex: 1 },
  questionCard: { margin: 16, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 4 },
  questionNumber: { fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  questionText: { fontSize: 18, fontWeight: '700', color: '#111827', lineHeight: 28 },
  questionTelugu: { fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 22 },
  questionPoints: { fontSize: 13, color: '#7C3AED', fontWeight: '600', marginTop: 12 },
  optionsContainer: { paddingHorizontal: 16, gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 2, backgroundColor: 'white' },
  optionDefault: { borderColor: '#E5E7EB' },
  optionCorrect: { borderColor: '#059669', backgroundColor: '#D1FAE5' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  optionLetter: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },
  optionText: { flex: 1, fontSize: 15, color: '#111827' },
  optionIcon: { fontSize: 18 },
  explanationCard: { margin: 16, borderRadius: 16, padding: 20 },
  explanationCorrect: { backgroundColor: '#D1FAE5', borderLeftWidth: 4, borderLeftColor: '#059669' },
  explanationWrong: { backgroundColor: '#FEE2E2', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  explanationTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  explanationText: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 6 },
  explanationTelugu: { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  nextBtn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  xpFlash: {
    position: 'absolute',
    top: 160,
    right: 24,
    zIndex: 100,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 8,
  },
  xpFlashText: { color: 'white', fontWeight: '800', fontSize: 15 },
  // Result screen
  resultHeader: { paddingTop: 60, paddingBottom: 32, alignItems: 'center' },
  resultHeaderEmoji: { fontSize: 56, marginBottom: 12 },
  resultHeaderTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
  resultHeaderTelugu: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  resultContent: { padding: 16 },
  scoreBadge: { alignSelf: 'center', borderRadius: 60, width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 4 },
  scoreBadgeGreen: { backgroundColor: '#D1FAE5', borderWidth: 3, borderColor: '#059669' },
  scoreBadgeYellow: { backgroundColor: '#FEF3C7', borderWidth: 3, borderColor: '#D97706' },
  scoreBadgeRed: { backgroundColor: '#FEE2E2', borderWidth: 3, borderColor: '#DC2626' },
  scoreBadgeNumber: { fontSize: 30, fontWeight: '900' },
  scoreBadgeLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  resultScoreRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  resultScoreCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 3 },
  resultScoreNumber: { fontSize: 26, fontWeight: '900', color: '#059669' },
  resultScoreLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  reviewSectionTitle: { fontSize: 18, fontWeight: '700', color: '#DC2626', marginBottom: 12 },
  reviewTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  reviewCard: { backgroundColor: 'white', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 2 },
  reviewCorrect: { borderLeftWidth: 4, borderLeftColor: '#059669' },
  reviewWrong: { borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  reviewQuestion: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  reviewQuestionTelugu: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  reviewAnswer: { fontSize: 14, fontWeight: '600' },
  correctAnswer: { fontSize: 14, color: '#059669', marginTop: 4, fontWeight: '600' },
  reviewExplanation: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  perfectCard: { backgroundColor: '#D1FAE5', borderRadius: 14, padding: 16, marginBottom: 16, alignItems: 'center' },
  perfectText: { fontSize: 16, fontWeight: '700', color: '#059669' },
  tryAgainBtn: { backgroundColor: '#7C3AED', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  tryAgainBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  doneBtn: { backgroundColor: '#4F46E5', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
})
