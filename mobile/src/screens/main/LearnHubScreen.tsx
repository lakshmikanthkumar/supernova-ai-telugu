import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Theme } from '../../theme'
import { 
  Search, X, Mic, MessageCircle, Phone, Briefcase, 
  Building, Mail, Handshake, BookOpen, FileText, Book, 
  Volume2, Layers, Bot, PlaySquare, Target, Brain,
  ChevronDown, ChevronUp
} from 'lucide-react-native'


interface Module {
  icon: any
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
  icon: any
  name: string
  gradient: [string, string]
  modules: Module[]
  progressPct: number
}

const CATEGORIES: Category[] = [
  {
    id: 'speaking',
    icon: Mic,
    name: 'Vocal Synthesis',
    gradient: [Theme.colors.background, Theme.colors.primary],
    progressPct: 35,
    modules: [
      { icon: MessageCircle, title: 'Daily Greetings', subtitle: 'Master everyday expressions', difficulty: 1, estimatedTime: '10 min', route: '/features/daily-greetings', progress: 60 },
      { icon: Mic, title: 'Self Introduction', subtitle: 'Make a strong first impression', difficulty: 2, estimatedTime: '15 min', route: '/features/self-introduction', progress: 20 },
      { icon: Mic, title: 'Public Speaking', subtitle: 'Speak to any audience', difficulty: 3, estimatedTime: '25 min', route: '/features/public-speaking', isNew: true },
      { icon: Phone, title: 'Phone Simulator', subtitle: 'Practice real phone calls', difficulty: 2, estimatedTime: '20 min', route: '/features/phone-simulator', isNew: true },
    ],
  },
  {
    id: 'professional',
    icon: Briefcase,
    name: 'Corporate Protocol',
    gradient: [Theme.colors.background, '#0A1F44'],
    progressPct: 20,
    modules: [
      { icon: Building, title: 'Office Conversations', subtitle: 'Excel at workplace English', difficulty: 2, estimatedTime: '20 min', route: '/features/office-conversations', progress: 45 },
      { icon: Mail, title: 'Email Writing', subtitle: 'Write professional emails', difficulty: 3, estimatedTime: '25 min', route: '/features/email-writing', isNew: true },
      { icon: Briefcase, title: 'Interview Prep', subtitle: 'Ace your next job interview', difficulty: 3, estimatedTime: '30 min', route: '/features/interview-training', isNew: true },
      { icon: Handshake, title: 'Business Communication', subtitle: 'Communicate with confidence', difficulty: 3, estimatedTime: '25 min', route: '/features/business-communication', isNew: true },
    ],
  },
  {
    id: 'fundamentals',
    icon: BookOpen,
    name: 'Core Algorithms',
    gradient: [Theme.colors.background, '#0D274A'],
    progressPct: 50,
    modules: [
      { icon: FileText, title: 'Syntax Engine', subtitle: 'Master English grammar rules', difficulty: 2, estimatedTime: '15 min', route: '/features/grammar-engine', isNew: true },
      { icon: Book, title: 'Data Lexicon', subtitle: '500+ essential words', difficulty: 1, estimatedTime: '10 min', route: '/lessons/flashcards', progress: 70 },
      { icon: Volume2, title: 'Phonetics Lab', subtitle: 'Perfect your accent', difficulty: 2, estimatedTime: '20 min', route: '/lessons/pronunciation', progress: 40 },
      { icon: Layers, title: 'Memory Cards', subtitle: 'Spaced repetition learning', difficulty: 1, estimatedTime: '10 min', route: '/lessons/flashcards', progress: 80 },
    ],
  },
  {
    id: 'ai',
    icon: Bot,
    name: 'AI Simulation',
    gradient: [Theme.colors.background, '#102A45'],
    progressPct: 15,
    modules: [
      { icon: Bot, title: 'Nova Interface', subtitle: 'Chat freely with your AI tutor', difficulty: 1, estimatedTime: 'Open-ended', route: '/ai/chat', isNew: true },
      { icon: PlaySquare, title: 'Scenario Holodeck', subtitle: 'Practice real-life situations', difficulty: 2, estimatedTime: '20 min', route: '/ai/roleplay' },
      { icon: Target, title: 'Daily Tasks', subtitle: 'Complete daily tasks for XP', difficulty: 2, estimatedTime: '15 min', route: '/daily-challenge' },
      { icon: Brain, title: 'Knowledge Tests', subtitle: 'Test your knowledge', difficulty: 2, estimatedTime: '10 min', route: '/lessons/quiz' },
    ],
  },
]

const RECENTLY_COMPLETED = [
  { icon: MessageCircle, title: 'Daily Greetings — Node 3', xp: 30, time: '2h ago' },
  { icon: Layers, title: 'Data Lexicon Module', xp: 20, time: 'Yesterday' },
  { icon: PlaySquare, title: 'Corporate Simulation', xp: 40, time: '2 days ago' },
]

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <View style={styles.diffRow}>
      {[1, 2, 3].map(d => (
        <View key={d} style={[styles.diffDot, { backgroundColor: d <= level ? Theme.colors.secondary : 'rgba(255,255,255,0.1)' }]} />
      ))}
    </View>
  )
}

function ModuleCard({ module }: { module: Module }) {
  const hasProgress = typeof module.progress === 'number'
  const IconComp = module.icon
  return (
    <TouchableOpacity
      style={styles.moduleCard}
      activeOpacity={0.85}
      onPress={() => router.push(module.route as any)}
    >
      <View style={styles.moduleLeft}>
        <View style={styles.moduleIconWrap}>
          <IconComp size={24} color={Theme.colors.secondary} strokeWidth={1.5} />
        </View>
        <View style={styles.moduleInfo}>
          <View style={styles.moduleTitleRow}>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            {module.isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
            {module.completed && (
              <View style={[styles.newBadge, { backgroundColor: 'rgba(0,230,118,0.15)', borderColor: '#00E676', borderWidth: 1 }]}>
                <Text style={[styles.newBadgeText, { color: '#00E676' }]}>✓ VERIFIED</Text>
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
        <Text style={[styles.moduleBtnText, hasProgress ? { color: Theme.colors.secondary } : { color: '#000' }]}>
          {hasProgress ? 'Resume' : 'Execute'}
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
      <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={styles.header}>
        <Text style={styles.headerTitle}>Learning Hub</Text>
        <Text style={styles.headerSubtitle}>Central Knowledge Directory</Text>
      </LinearGradient>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color={Theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search queries, nodes..."
            placeholderTextColor={Theme.colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.searchClear}>
              <X size={18} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Personalized Path Card ── */}
      {search.trim() === '' && (
        <View style={styles.section}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/features/office-conversations' as any)}>
            <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={styles.pathCard}>
              <View>
                <Text style={styles.pathLabel}>OPTIMAL PATH</Text>
                <Text style={styles.pathTitle}>Next Recommended Node</Text>
                <View style={styles.pathModuleRow}>
                  <Building size={20} color={Theme.colors.text} />
                  <Text style={styles.pathModule}>Office Conversations</Text>
                </View>
                <Text style={styles.pathDesc}>Based on your metrics, this module will boost your workplace syntax by 40%</Text>
              </View>
              <TouchableOpacity
                style={styles.pathBtn}
                onPress={() => router.push('/features/office-conversations' as any)}
              >
                <Text style={styles.pathBtnText}>Execute Path →</Text>
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Module Categories ── */}
      {filteredCategories.map(cat => {
        const CatIcon = cat.icon
        return (
          <View key={cat.id} style={styles.section}>
            <TouchableOpacity
              style={styles.categoryHeader}
              activeOpacity={0.8}
              onPress={() => toggleCategory(cat.id)}
            >
              <LinearGradient colors={cat.gradient} style={styles.catIconWrap}>
                <CatIcon size={24} color={Theme.colors.text} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.catName}>{cat.name}</Text>
                <View style={styles.catProgressRow}>
                  <View style={styles.catProgressBg}>
                    <View style={[styles.catProgressFill, { width: `${cat.progressPct ?? 0}%` as `${number}%`, backgroundColor: Theme.colors.secondary }]} />
                  </View>
                  <Text style={styles.catProgressPct}>{cat.progressPct}%</Text>
                </View>
              </View>
              {expanded.includes(cat.id) ? (
                <ChevronUp size={20} color={Theme.colors.textSecondary} />
              ) : (
                <ChevronDown size={20} color={Theme.colors.textSecondary} />
              )}
            </TouchableOpacity>

            {expanded.includes(cat.id) && (
              <View style={styles.moduleList}>
                {cat.modules.map(m => (
                  <ModuleCard key={m.title} module={m} />
                ))}
              </View>
            )}
          </View>
        )
      })}

      {/* ── Progress Summary ── */}
      {search.trim() === '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Metrics</Text>
          <View style={styles.progressSummaryCard}>
            {CATEGORIES.map(cat => {
              const CatIcon = cat.icon
              return (
                <View key={cat.id} style={styles.progressSummaryRow}>
                  <View style={styles.progressSumIconWrap}>
                    <CatIcon size={18} color={Theme.colors.secondary} />
                  </View>
                  <Text style={styles.progressSumName}>{cat.name}</Text>
                  <View style={styles.progressSumBarBg}>
                    <View style={[styles.progressSumBarFill, { width: `${cat.progressPct ?? 0}%` as `${number}%`, backgroundColor: Theme.colors.secondary }]} />
                  </View>
                  <Text style={styles.progressSumPct}>{cat.progressPct}%</Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* ── Recently Completed ── */}
      {search.trim() === '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Logs</Text>
          <View style={styles.recentCard}>
            {RECENTLY_COMPLETED.map((item, idx) => {
              const RecentIcon = item.icon
              return (
                <View key={idx} style={[styles.recentRow, idx < RECENTLY_COMPLETED.length - 1 && styles.recentRowBorder]}>
                  <View style={styles.recentIconWrap}>
                     <RecentIcon size={24} color={Theme.colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTitle}>{item.title}</Text>
                    <Text style={styles.recentTime}>{item.time}</Text>
                  </View>
                  <View style={styles.recentXP}>
                    <Text style={styles.recentXPText}>+{item.xp} XP</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },

  // Header
  header: { padding: 24, paddingTop: 52, paddingBottom: 40 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Theme.colors.text, letterSpacing: 1 },
  headerSubtitle: { fontSize: 14, color: Theme.colors.secondary, marginTop: 6, textTransform: 'uppercase', letterSpacing: 1.5 },

  // Search
  searchWrap: { paddingHorizontal: 16, marginTop: -24 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Theme.colors.surface, borderRadius: 16, paddingHorizontal: 16,
    borderWidth: 1, borderColor: Theme.colors.secondary,
    shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 6, gap: 10
  },
  searchInput: { flex: 1, paddingVertical: 16, fontSize: 15, color: Theme.colors.text },
  searchClear: { padding: 4 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.5 },

  // Personalized Path
  pathCard: {
    borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: Theme.colors.secondary,
    shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  pathLabel: { fontSize: 11, color: Theme.colors.secondary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  pathTitle: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 6 },
  pathModuleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  pathModule: { fontSize: 24, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  pathDesc: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 8, lineHeight: 20 },
  pathBtn: {
    marginTop: 20, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  pathBtnText: { color: Theme.colors.text, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  // Category
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  catIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  catName: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  catProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  catProgressBg: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  catProgressFill: { height: 6, borderRadius: 3, shadowColor: Theme.colors.secondary, shadowOpacity: 1, shadowRadius: 5 },
  catProgressPct: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '700', width: 36 },

  // Module list
  moduleList: { marginTop: 12, gap: 12 },
  moduleCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 3,
  },
  moduleLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 14 },
  moduleIconWrap: { marginTop: 2, width: 36, alignItems: 'center' },
  moduleInfo: { flex: 1 },
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  moduleTitle: { fontSize: 15, fontWeight: '800', color: Theme.colors.text },
  newBadge: {
    backgroundColor: Theme.colors.accent, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  newBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  moduleSubtitle: { fontSize: 13, color: Theme.colors.textSecondary, marginTop: 4 },
  moduleMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  diffRow: { flexDirection: 'row', gap: 4 },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  moduleTime: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '600' },
  moduleProgressBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  moduleProgressFill: { height: 6, backgroundColor: Theme.colors.secondary, borderRadius: 3, shadowColor: Theme.colors.secondary, shadowOpacity: 1, shadowRadius: 5 },
  moduleBtn: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginLeft: 12, alignItems: 'center', justifyContent: 'center',
  },
  moduleBtnStart: { backgroundColor: Theme.colors.secondary, shadowColor: Theme.colors.secondary, shadowOpacity: 0.4, shadowOffset: {width: 0, height: 2}, shadowRadius: 6, elevation: 4 },
  moduleBtnContinue: { backgroundColor: 'rgba(0,194,255,0.1)', borderWidth: 1, borderColor: Theme.colors.secondary },
  moduleBtnText: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },

  // Progress Summary
  progressSummaryCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, gap: 16,
  },
  progressSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressSumIconWrap: { width: 30, alignItems: 'center' },
  progressSumName: { fontSize: 14, color: Theme.colors.text, fontWeight: '700', width: 140 },
  progressSumBarBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressSumBarFill: { height: 8, borderRadius: 4, shadowColor: Theme.colors.secondary, shadowOpacity: 1, shadowRadius: 5 },
  progressSumPct: { fontSize: 13, color: Theme.colors.secondary, fontWeight: '800', width: 40, textAlign: 'right' },

  // Recently Completed
  recentCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
  recentRowBorder: { borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  recentIconWrap: { width: 36, alignItems: 'center' },
  recentTitle: { fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  recentTime: { fontSize: 13, color: Theme.colors.textSecondary, marginTop: 4 },
  recentXP: { backgroundColor: 'rgba(0,230,118,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  recentXPText: { color: '#00E676', fontWeight: '800', fontSize: 13 },
})
