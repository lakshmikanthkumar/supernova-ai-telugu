import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'

const { width } = Dimensions.get('window')

interface Module {
  icon: string
  title: string
  subtitle: string
  difficulty: 1 | 2 | 3
  estimatedTime: string
  route: string
  isNew?: boolean
  completed?: boolean
  progress?: number
}

interface Category {
  id: string
  icon: string
  name: string
  gradient: [string, string]
  modules: Module[]
  progressPct: number
}

const CATEGORIES: Category[] = [
  {
    id: 'speaking',
    icon: '🗣️',
    name: 'Speaking Skills',
    gradient: ['#4F46E5', '#7C3AED'],
    progressPct: 35,
    modules: [
      { icon: '💬', title: 'Daily Greetings', subtitle: 'Master everyday expressions', difficulty: 1, estimatedTime: '10 min', route: '/features/daily-greetings', progress: 60 },
      { icon: '🎤', title: 'Self Introduction', subtitle: 'Make a strong first impression', difficulty: 2, estimatedTime: '15 min', route: '/features/self-introduction', progress: 20 },
      { icon: '🎙️', title: 'Public Speaking', subtitle: 'Speak to any audience', difficulty: 3, estimatedTime: '25 min', route: '/features/public-speaking', isNew: true },
      { icon: '📞', title: 'Phone Simulator', subtitle: 'Practice real phone calls', difficulty: 2, estimatedTime: '20 min', route: '/features/phone-simulator', isNew: true },
    ],
  },
  {
    id: 'professional',
    icon: '💼',
    name: 'Professional English',
    gradient: ['#0891B2', '#0E7490'],
    progressPct: 20,
    modules: [
      { icon: '🏢', title: 'Office Conversations', subtitle: 'Excel at workplace English', difficulty: 2, estimatedTime: '20 min', route: '/features/office-conversations', progress: 45 },
      { icon: '📧', title: 'Email Writing', subtitle: 'Write professional emails', difficulty: 3, estimatedTime: '25 min', route: '/features/email-writing', isNew: true },
      { icon: '💼', title: 'Interview Prep', subtitle: 'Ace your next job interview', difficulty: 3, estimatedTime: '30 min', route: '/features/interview-training', isNew: true },
      { icon: '🤝', title: 'Business Communication', subtitle: 'Communicate with confidence', difficulty: 3, estimatedTime: '25 min', route: '/features/business-communication', isNew: true },
    ],
  },
  {
    id: 'fundamentals',
    icon: '📚',
    name: 'Language Fundamentals',
    gradient: ['#059669', '#047857'],
    progressPct: 50,
    modules: [
      { icon: '📝', title: 'Grammar Engine', subtitle: 'Master English grammar rules', difficulty: 2, estimatedTime: '15 min', route: '/features/grammar-engine', isNew: true },
      { icon: '📖', title: 'Vocabulary Builder', subtitle: '500+ essential words', difficulty: 1, estimatedTime: '10 min', route: '/lessons/flashcards', progress: 70 },
      { icon: '🔊', title: 'Pronunciation Lab', subtitle: 'Perfect your accent', difficulty: 2, estimatedTime: '20 min', route: '/lessons/pronunciation', progress: 40 },
      { icon: '🃏', title: 'Flashcards', subtitle: 'Spaced repetition learning', difficulty: 1, estimatedTime: '10 min', route: '/lessons/flashcards', progress: 80 },
    ],
  },
  {
    id: 'ai',
    icon: '🤖',
    name: 'AI Practice',
    gradient: ['#7C3AED', '#6D28D9'],
    progressPct: 15,
    modules: [
      { icon: '🤖', title: 'Nova Chat', subtitle: 'Chat freely with your AI tutor', difficulty: 1, estimatedTime: 'Open-ended', route: '/ai/chat', isNew: true },
      { icon: '🎭', title: 'Roleplay Scenarios', subtitle: 'Practice real-life situations', difficulty: 2, estimatedTime: '20 min', route: '/ai/roleplay' },
      { icon: '🎯', title: 'Daily Challenges', subtitle: 'Complete daily tasks for XP', difficulty: 2, estimatedTime: '15 min', route: '/daily-challenge' },
      { icon: '🧠', title: 'Quizzes', subtitle: 'Test your knowledge', difficulty: 2, estimatedTime: '10 min', route: '/lessons/quiz' },
    ],
  },
]

const RECENTLY_COMPLETED = [
  { icon: '💬', title: 'Daily Greetings — Lesson 3', xp: 30, time: '2h ago' },
  { icon: '🃏', title: 'Vocabulary Flashcards', xp: 20, time: 'Yesterday' },
  { icon: '🎭', title: 'Office Roleplay', xp: 40, time: '2 days ago' },
]

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <View style={styles.diffRow}>
      {[1, 2, 3].map(d => (
        <View key={d} style={[styles.diffDot, { backgroundColor: d <= level ? '#4F46E5' : '#E5E7EB' }]} />
      ))}
    </View>
  )
}

function ModuleCard({ module }: { module: Module }) {
  const hasProgress = typeof module.progress === 'number'
  return (
    <TouchableOpacity
      style={styles.moduleCard}
      activeOpacity={0.85}
      onPress={() => router.push(module.route as any)}
    >
      <View style={styles.moduleLeft}>
        <Text style={styles.moduleIcon}>{module.icon}</Text>
        <View style={styles.moduleInfo}>
          <View style={styles.moduleTitleRow}>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            {module.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
            {module.completed && (
              <View style={[styles.newBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.newBadgeText, { color: '#059669' }]}>✓ DONE</Text>
              </View>
            )}
          </View>
          <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
          <View style={styles.moduleMeta}>
            <DifficultyDots level={module.difficulty} />
            <Text style={styles.moduleTime}>⏱ {module.estimatedTime}</Text>
          </View>
          {hasProgress && (
            <View style={styles.moduleProgressBg}>
              <View style={[styles.moduleProgressFill, { width: `${module.progress ?? 0}%` as `${number}%` }]} />
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.moduleBtn, hasProgress ? styles.moduleBtnContinue : styles.moduleBtnStart]}
        onPress={() => router.push(module.route as any)}
      >
        <Text style={[styles.moduleBtnText, hasProgress ? { color: '#4F46E5' } : { color: 'white' }]}>
          {hasProgress ? 'Continue' : 'Start'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

export default function LearnHubScreen() {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string[]>(['speaking'])

  const toggleCategory = (id: string) => {
    setExpanded(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const filteredCategories = CATEGORIES.map(cat => ({
    ...cat,
    modules: cat.modules.filter(m =>
      search.trim() === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.modules.length > 0)

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Header ── */}
      <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.header}>
        <Text style={styles.headerTitle}>Learn English</Text>
        <Text style={styles.headerSubtitle}>Your complete learning journey</Text>
      </LinearGradient>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search topics, scenarios..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Personalized Path Card ── */}
      {search.trim() === '' && (
        <View style={styles.section}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/features/office-conversations' as any)}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.pathCard}>
              <View>
                <Text style={styles.pathLabel}>YOUR PERSONALIZED PATH</Text>
                <Text style={styles.pathTitle}>Next Recommended</Text>
                <Text style={styles.pathModule}>🏢 Office Conversations</Text>
                <Text style={styles.pathDesc}>Based on your progress, this module will boost your workplace English by 40%</Text>
              </View>
              <TouchableOpacity
                style={styles.pathBtn}
                onPress={() => router.push('/features/office-conversations' as any)}
              >
                <Text style={styles.pathBtnText}>Continue Path →</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Module Categories ── */}
      {filteredCategories.map(cat => (
        <View key={cat.id} style={styles.section}>
          <TouchableOpacity
            style={styles.categoryHeader}
            activeOpacity={0.8}
            onPress={() => toggleCategory(cat.id)}
          >
            <LinearGradient colors={cat.gradient} style={styles.catIconWrap}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.catName}>{cat.name}</Text>
              <View style={styles.catProgressRow}>
                <View style={styles.catProgressBg}>
                  <View style={[styles.catProgressFill, { width: `${cat.progressPct ?? 0}%` as `${number}%`, backgroundColor: cat.gradient[0] }]} />
                </View>
                <Text style={styles.catProgressPct}>{cat.progressPct}%</Text>
              </View>
            </View>
            <Text style={styles.expandArrow}>{expanded.includes(cat.id) ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {expanded.includes(cat.id) && (
            <View style={styles.moduleList}>
              {cat.modules.map(m => (
                <ModuleCard key={m.title} module={m} />
              ))}
            </View>
          )}
        </View>
      ))}

      {/* ── Progress Summary ── */}
      {search.trim() === '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Progress</Text>
          <View style={styles.progressSummaryCard}>
            {CATEGORIES.map(cat => (
              <View key={cat.id} style={styles.progressSummaryRow}>
                <Text style={styles.progressSumIcon}>{cat.icon}</Text>
                <Text style={styles.progressSumName}>{cat.name}</Text>
                <View style={styles.progressSumBarBg}>
                  <View style={[styles.progressSumBarFill, { width: `${cat.progressPct ?? 0}%` as `${number}%`, backgroundColor: cat.gradient[0] }]} />
                </View>
                <Text style={styles.progressSumPct}>{cat.progressPct}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Recently Completed ── */}
      {search.trim() === '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Completed</Text>
          <View style={styles.recentCard}>
            {RECENTLY_COMPLETED.map((item, idx) => (
              <View key={idx} style={[styles.recentRow, idx < RECENTLY_COMPLETED.length - 1 && styles.recentRowBorder]}>
                <Text style={styles.recentIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTitle}>{item.title}</Text>
                  <Text style={styles.recentTime}>{item.time}</Text>
                </View>
                <View style={styles.recentXP}>
                  <Text style={styles.recentXPText}>+{item.xp} XP</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header
  header: { padding: 24, paddingTop: 52, paddingBottom: 28 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  // Search
  searchWrap: { paddingHorizontal: 16, marginTop: -18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 14,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 14, color: '#111827' },
  searchClear: { fontSize: 14, color: '#9CA3AF', paddingLeft: 8 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },

  // Personalized Path
  pathCard: {
    borderRadius: 18, padding: 20,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  pathLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 1.2 },
  pathTitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  pathModule: { fontSize: 22, fontWeight: '800', color: 'white', marginTop: 4 },
  pathDesc: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, lineHeight: 18 },
  pathBtn: {
    marginTop: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10, paddingVertical: 11, paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  pathBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Category
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  catIconWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catIcon: { fontSize: 22 },
  catName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  catProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  catProgressBg: { flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  catProgressFill: { height: 6, borderRadius: 3 },
  catProgressPct: { fontSize: 12, color: '#6B7280', fontWeight: '600', width: 32 },
  expandArrow: { fontSize: 12, color: '#9CA3AF' },

  // Module list
  moduleList: { marginTop: 8, gap: 10 },
  moduleCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  moduleLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 12 },
  moduleIcon: { fontSize: 28, marginTop: 2 },
  moduleInfo: { flex: 1 },
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  moduleTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  newBadge: {
    backgroundColor: '#FEE2E2', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  newBadgeText: { color: '#EF4444', fontSize: 9, fontWeight: '800' },
  moduleSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  moduleMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  diffRow: { flexDirection: 'row', gap: 3 },
  diffDot: { width: 7, height: 7, borderRadius: 4 },
  moduleTime: { fontSize: 11, color: '#9CA3AF' },
  moduleProgressBg: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  moduleProgressFill: { height: 5, backgroundColor: '#4F46E5', borderRadius: 3 },
  moduleBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    marginLeft: 10, alignItems: 'center', justifyContent: 'center',
  },
  moduleBtnStart: { backgroundColor: '#4F46E5' },
  moduleBtnContinue: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
  moduleBtnText: { fontSize: 13, fontWeight: '700' },

  // Progress Summary
  progressSummaryCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, gap: 14,
  },
  progressSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressSumIcon: { fontSize: 18, width: 26, textAlign: 'center' },
  progressSumName: { fontSize: 13, color: '#374151', fontWeight: '600', width: 130 },
  progressSumBarBg: { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressSumBarFill: { height: 8, borderRadius: 4 },
  progressSumPct: { fontSize: 12, color: '#6B7280', fontWeight: '700', width: 36, textAlign: 'right' },

  // Recently Completed
  recentCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  recentRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  recentIcon: { fontSize: 24 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  recentTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  recentXP: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  recentXPText: { color: '#059669', fontWeight: '700', fontSize: 12 },
})
