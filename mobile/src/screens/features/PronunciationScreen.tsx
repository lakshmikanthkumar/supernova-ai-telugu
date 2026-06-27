// ============================================================
// PronunciationScreen — mic + TTS pronunciation practice
// Uses VoiceButton + useTTS hooks for safe lifecycle handling.
// ============================================================

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { VoiceButton } from '../../components/voice/VoiceButton'
import { useTTS } from '../../hooks/useTTS'

const PRACTICE_PHRASES = [
  'Good morning, how are you?',
  'I would like to schedule a meeting.',
  'Could you please repeat that?',
  'Thank you for your time.',
  'I am looking forward to working with you.',
]

export const PronunciationScreen: React.FC = () => {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const mounted = useRef(true)

  const phrase = PRACTICE_PHRASES[phraseIndex]

  const { speak, isSpeaking, stop } = useTTS({
    language: 'en-IN',
    rate: 'slow',
    onError: (err) => {
      console.warn('[PronunciationScreen] TTS error:', err)
      Alert.alert('Audio Error', 'Failed to play pronunciation.')
    },
  })

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      stop()
    }
  }, [])

  const handleVoiceResult = async (text: string) => {
    if (!mounted.current) return
    setAnalyzing(true)
    try {
      const result = analyzePronunciation(text, phrase)
      if (mounted.current) {
        setScore(result.score)
        setFeedback(result.feedback)
      }
    } catch {
      if (mounted.current) {
        Alert.alert('Error', 'Could not analyze pronunciation. Please try again.')
      }
    } finally {
      if (mounted.current) setAnalyzing(false)
    }
  }

  const nextPhrase = () => {
    setScore(null)
    setFeedback(null)
    setPhraseIndex(i => (i + 1) % PRACTICE_PHRASES.length)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Practice Phrase {phraseIndex + 1}/{PRACTICE_PHRASES.length}</Text>
        <Text style={styles.phraseText}>{phrase}</Text>

        <TouchableOpacity
          style={styles.listenBtn}
          onPress={() => isSpeaking ? stop() : speak(phrase)}
        >
          <Ionicons name={isSpeaking ? 'volume-high' : 'play-circle'} size={28} color="#0047AB" />
          <Text style={styles.listenBtnText}>{isSpeaking ? 'Playing...' : 'Listen'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.voiceSection}>
        <Text style={styles.voiceHint}>Tap the mic and say the phrase</Text>

        <VoiceButton
          onResult={handleVoiceResult}
          onError={(err) => Alert.alert('Microphone Error', err?.message ?? 'Please grant microphone permission.')}
          language="en-IN"
          timeout={10000}
          size="large"
          showTranscript
          placeholder="Tap to speak..."
        />

        {analyzing && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="small" color="#0047AB" />
            <Text style={styles.analyzingText}>Analyzing...</Text>
          </View>
        )}

        {score !== null && feedback && !analyzing && (
          <View style={styles.resultCard}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Pronunciation Score</Text>
              <Text style={[styles.scoreValue, { color: score >= 70 ? '#2ECC71' : '#F39C12' }]}>
                {score}%
              </Text>
            </View>
            <Text style={styles.feedbackText}>{feedback}</Text>

            <TouchableOpacity style={styles.nextBtn} onPress={nextPhrase}>
              <Text style={styles.nextBtnText}>Next Phrase →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// ── Pronunciation scoring (offline Levenshtein) ─────────────

function analyzePronunciation(spoken: string, target: string): { score: number; feedback: string } {
  const s = spoken.toLowerCase().replace(/[^a-z ]/g, '').trim()
  const t = target.toLowerCase().replace(/[^a-z ]/g, '').trim()
  const maxLen = Math.max(s.length, t.length)
  const score = maxLen === 0 ? 100 : Math.round((1 - levenshtein(s, t) / maxLen) * 100)

  let feedback: string
  if (score >= 80) feedback = 'Excellent! Your pronunciation is very clear. 🎉'
  else if (score >= 60) feedback = 'Good effort! Try speaking more slowly and clearly.'
  else feedback = 'Keep practicing! Listen again and try to match the rhythm and intonation.'

  return { score: Math.min(100, Math.max(0, score)), feedback }
}

function levenshtein(a: string, b: string): number {
  const m = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      m[i][j] = a[i - 1] === b[j - 1]
        ? m[i - 1][j - 1]
        : 1 + Math.min(m[i - 1][j], m[i][j - 1], m[i - 1][j - 1])
    }
  }
  return m[a.length][b.length]
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardLabel: { fontSize: 13, color: '#999', marginBottom: 8 },
  phraseText: { fontSize: 22, fontWeight: '600', color: '#2D3436', lineHeight: 32, marginBottom: 16 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F0F4FF', borderRadius: 12 },
  listenBtnText: { marginLeft: 10, fontSize: 15, color: '#0047AB', fontWeight: '500' },
  voiceSection: { alignItems: 'center', paddingVertical: 20 },
  voiceHint: { fontSize: 15, color: '#636E72', marginBottom: 24, textAlign: 'center' },
  analyzingBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, padding: 14, backgroundColor: '#F0F4FF', borderRadius: 12 },
  analyzingText: { fontSize: 14, color: '#0047AB' },
  resultCard: {
    marginTop: 24, backgroundColor: 'white', borderRadius: 16, padding: 20, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  scoreLabel: { fontSize: 15, color: '#636E72' },
  scoreValue: { fontSize: 30, fontWeight: '700' },
  feedbackText: { fontSize: 15, color: '#2D3436', lineHeight: 22, marginBottom: 16 },
  nextBtn: { padding: 14, backgroundColor: '#0047AB', borderRadius: 12, alignItems: 'center' },
  nextBtnText: { color: 'white', fontSize: 15, fontWeight: '600' },
})
