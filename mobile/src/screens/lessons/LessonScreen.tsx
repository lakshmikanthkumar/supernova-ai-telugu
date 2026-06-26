import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { Colors } from '../../constants/theme'
import * as Speech from 'expo-speech'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { fetchLesson } from '../../store/slices/lessonsSlice'
import { lessonService, gamificationService } from '../../services/api'
import { updateXP } from '../../store/slices/authSlice'
import { showToast } from '../../store/slices/uiSlice'
import TranslationToggle from '../../components/common/TranslationToggle'
import type { VocabularyItem, DialogueLine } from '../../types'

const { width } = Dimensions.get('window')

export default function LessonScreen() {
  const dispatch = useAppDispatch()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { currentLesson } = useAppSelector(s => s.lessons)
  const { showTeluguTranslations } = useAppSelector(s => s.ui)
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'dialogue' | 'tips'>('vocabulary')
  const [loading, setLoading] = useState(false)
  const [speakingWord, setSpeakingWord] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      dispatch(fetchLesson(id))
      lessonService.markLessonStarted(id)
    }
    return () => { Speech.stop() }
  }, [id])

  const speakWord = async (text: string) => {
    await Speech.stop()
    setSpeakingWord(text)
    Speech.speak(text, {
      language: 'en-IN',
      rate: 0.85,
      onDone: () => setSpeakingWord(null),
      onError: () => setSpeakingWord(null),
    })
  }

  const handleCompleteLesson = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await gamificationService.updateProgress('complete_lesson', id)
      dispatch(updateXP({ xpEarned: result.xp_earned, newTotal: result.new_xp_total, newLevel: result.new_level }))
      dispatch(showToast({ message: `+${result.xp_earned} XP Earned! 🎉`, type: 'success' }))

      if (result.level_up) {
        dispatch(showToast({ message: `Level Up! You're now Level ${result.new_level}! 🏆`, type: 'success' }))
      }

      // Offer quiz
      router.push({ pathname: '/lessons/quiz', params: { id } })
    } catch (err) {
      dispatch(showToast({ message: 'Failed to save progress', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  if (!currentLesson) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </View>
    )
  }

  const { content, title, title_telugu, category } = currentLesson

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[category?.color_hex || Colors.primary, (category?.color_hex || Colors.primary) + '99']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.lessonTitle}>{title}</Text>
          <Text style={styles.lessonTitleTelugu}>{title_telugu}</Text>
          <View style={styles.headerMeta}>
            <Text style={styles.metaText}>⚡ {currentLesson.xp_reward} XP</Text>
            <Text style={styles.metaText}>⏱ {currentLesson.estimated_minutes} min</Text>
            <Text style={styles.metaText}>{'⭐'.repeat(currentLesson.difficulty_level)}</Text>
          </View>
        </View>
        <TranslationToggle />
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['vocabulary', 'dialogue', 'tips'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'vocabulary' ? '📝 Words' : tab === 'dialogue' ? '💬 Dialogues' : '💡 Tips'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'vocabulary' && (
          <View style={styles.tabContent}>
            {content.vocabulary?.map((item, i) => (
              <VocabCard
                key={i} item={item}
                showTelugu={showTeluguTranslations}
                speaking={speakingWord === item.word}
                onSpeak={() => speakWord(item.word)}
              />
            ))}
          </View>
        )}

        {activeTab === 'dialogue' && (
          <View style={styles.tabContent}>
            {content.dialogues?.map((dialogue, di) => (
              <View key={di} style={styles.dialogueBlock}>
                <Text style={styles.dialogueTitle}>{dialogue.title}</Text>
                {dialogue.lines.map((line, li) => (
                  <DialogueLine
                    key={li} line={line}
                    showTelugu={showTeluguTranslations}
                    onSpeak={() => speakWord(line.text)}
                  />
                ))}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'tips' && (
          <View style={styles.tabContent}>
            {content.tips?.map((tip, i) => (
              <View key={i} style={styles.tipCard}>
                <Text style={styles.tipBullet}>💡</Text>
                <View style={styles.tipText}>
                  <Text style={styles.tipTextEn}>{tip.tip}</Text>
                  {showTeluguTranslations && (
                    <Text style={styles.tipTextTelugu}>{tip.tip_telugu}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Complete Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.completeBtn, loading && styles.completeBtnDisabled]}
          onPress={handleCompleteLesson}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.completeBtnText}>Complete Lesson ✓ → Take Quiz</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

function VocabCard({ item, showTelugu, speaking, onSpeak }: {
  item: VocabularyItem; showTelugu: boolean; speaking: boolean; onSpeak: () => void
}) {
  return (
    <View style={styles.vocabCard}>
      <View style={styles.vocabHeader}>
        <View>
          <Text style={styles.vocabWord}>{item.word}</Text>
          <Text style={styles.vocabPhonetic}>/{item.phonetic}/</Text>
        </View>
        <TouchableOpacity onPress={onSpeak} style={[styles.speakBtn, speaking && styles.speakBtnActive]}>
          <Text style={styles.speakBtnText}>{speaking ? '🔊' : '▶️'}</Text>
        </TouchableOpacity>
      </View>
      {showTelugu && <Text style={styles.vocabTelugu}>{item.telugu}</Text>}
      <View style={styles.exampleBubble}>
        <Text style={styles.exampleText}>"{item.example}"</Text>
      </View>
    </View>
  )
}

function DialogueLine({ line, showTelugu, onSpeak }: {
  line: DialogueLine; showTelugu: boolean; onSpeak: () => void
}) {
  const isA = line.speaker === 'A' || line.speaker === 'Interviewer' || line.speaker === 'Doctor'
  return (
    <View style={[styles.dialogueLine, isA ? styles.dialogueLineLeft : styles.dialogueLineRight]}>
      <Text style={styles.dialogueSpeaker}>{line.speaker}</Text>
      <TouchableOpacity onPress={onSpeak} activeOpacity={0.8}>
        <View style={[styles.dialogueBubble, isA ? styles.bubbleLeft : styles.bubbleRight]}>
          <Text style={styles.dialogueText}>{line.text}</Text>
          {showTelugu && <Text style={styles.dialogueTeluguText}>{line.telugu}</Text>}
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280' },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
  backBtn: { marginBottom: 12 },
  backBtnText: { color: 'white', fontSize: 24 },
  headerContent: { marginBottom: 12 },
  lessonTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  lessonTitleTelugu: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  headerMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  tabRow: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  content: { flex: 1 },
  tabContent: { padding: 16, gap: 12 },
  vocabCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
  },
  vocabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vocabWord: { fontSize: 22, fontWeight: '800', color: '#111827' },
  vocabPhonetic: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  vocabTelugu: { fontSize: 16, color: Colors.primary, fontWeight: '600', marginTop: 8 },
  speakBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF0E8', alignItems: 'center', justifyContent: 'center' },
  speakBtnActive: { backgroundColor: Colors.primary },
  speakBtnText: { fontSize: 20 },
  exampleBubble: { backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, marginTop: 10 },
  exampleText: { fontSize: 14, color: '#374151', fontStyle: 'italic', lineHeight: 20 },
  dialogueBlock: { backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 2 },
  dialogueTitle: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 16, textAlign: 'center' },
  dialogueLine: { marginBottom: 12 },
  dialogueLineLeft: { alignItems: 'flex-start' },
  dialogueLineRight: { alignItems: 'flex-end' },
  dialogueSpeaker: { fontSize: 11, color: '#6B7280', marginBottom: 4, fontWeight: '600' },
  dialogueBubble: { maxWidth: width * 0.72, padding: 12, borderRadius: 16 },
  bubbleLeft: { backgroundColor: '#FFF0E8', borderBottomLeftRadius: 4 },
  bubbleRight: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  dialogueText: { fontSize: 14, lineHeight: 20, color: '#111827' },
  dialogueTeluguText: { fontSize: 13, color: '#6B7280', marginTop: 4, lineHeight: 18 },
  tipCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, padding: 16, gap: 12, elevation: 2 },
  tipBullet: { fontSize: 22 },
  tipText: { flex: 1 },
  tipTextEn: { fontSize: 15, color: '#111827', fontWeight: '500', lineHeight: 22 },
  tipTextTelugu: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 20 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 32, backgroundColor: 'white',
    borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10,
  },
  completeBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', elevation: 3 },
  completeBtnDisabled: { backgroundColor: '#9CA3AF' },
  completeBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
})
