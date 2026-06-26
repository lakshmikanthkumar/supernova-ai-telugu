import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Dimensions, FlatList,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Colors } from '../../constants/theme'
import { Sun, Mic, Briefcase, Mail, Phone, Edit3, Volume2, Layers, Target, Bot, Users, Search, Star, ArrowRight, X } from 'lucide-react-native'

const { width } = Dimensions.get('window')
const CARD_WIDTH = (width - 48) / 2   // 2 columns, 16 outer + 8 gap each side

// ── Module definitions ──────────────────────────────────────────────────────
interface ModuleDef {
  name: string
  icon: any
  route: string
  category: string
  level: string
  time: string
  color: string
  progress?: number   // 0-100, undefined = not started
}

const MODULES: ModuleDef[] = [
  { name: 'Daily Greetings',     icon: Sun,  route: '/features/daily-greetings',     category: 'Speaking',    level: 'Beginner',     time: '5 min',  color: '#7B61FF', progress: 60 },
  { name: 'Self Introduction',   icon: Mic,  route: '/features/self-introduction',   category: 'Speaking',    level: 'Beginner',     time: '10 min', color: '#5A42F5', progress: 20 },
  { name: 'Office Conversations',icon: Briefcase,  route: '/features/office-conversations',category: 'Speaking',    level: 'Intermediate', time: '15 min', color: '#00D26A', progress: 45 },
  { name: 'Email Writing',       icon: Mail,  route: '/features/email-writing',       category: 'Writing',     level: 'Intermediate', time: '10 min', color: '#2ECC71' },
  { name: 'Interview Training',  icon: Briefcase,  route: '/features/interview-training',  category: 'Interview',   level: 'Advanced',     time: '20 min', color: '#E74C3C' },
  { name: 'Public Speaking',     icon: Mic, route: '/features/public-speaking',     category: 'Speaking',    level: 'Advanced',     time: '15 min', color: '#7C3AED' },
  { name: 'Phone Simulator',     icon: Phone,  route: '/features/phone-simulator',     category: 'Speaking',    level: 'Intermediate', time: '10 min', color: '#00D26A' },
  { name: 'Grammar Engine',      icon: Edit3, route: '/features/grammar-engine',      category: 'Grammar',     level: 'All Levels',   time: '5 min',  color: '#D97706' },
  { name: 'Pronunciation Lab',   icon: Volume2,  route: '/lessons/pronunciation',         category: 'Speaking',    level: 'Beginner',     time: '5 min',  color: '#00D26A', progress: 40 },
  { name: 'Flashcards',          icon: Layers,  route: '/lessons/flashcards',            category: 'Vocabulary',  level: 'All Levels',   time: '5 min',  color: '#7B61FF', progress: 80 },
  { name: 'Daily Challenges',    icon: Target,  route: '/daily-challenge',               category: 'All',         level: 'All Levels',   time: '10 min', color: '#5A42F5' },
  { name: 'AI Nova Chat',        icon: Bot,  route: '/ai/chat',                       category: 'Speaking',    level: 'All Levels',   time: '10 min', color: '#7B61FF' },
  { name: 'AI Roleplay',         icon: Users,  route: '/ai/roleplay',                   category: 'Speaking',    level: 'Intermediate', time: '15 min', color: '#7C3AED' },
]

const TOTAL_MODULES = MODULES.length

// Modules marked as AI-recommended (static — would be dynamic in production)
const RECOMMENDED_NAMES = ['Office Conversations', 'Grammar Engine', 'AI Nova Chat']

const CATEGORIES = ['All', 'Speaking', 'Writing', 'Vocabulary', 'Grammar', 'Interview']

const CATEGORY_COLORS: Record<string, string> = {
  All:       Colors.primary,
  Speaking:  '#7B61FF',
  Writing:   '#00D26A',
  Vocabulary:'#2ECC71',
  Grammar:   '#D97706',
  Interview: '#E74C3C',
}

// ── Sub-components ──────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const bg = level === 'Beginner'
    ? '#D1FAE5' : level === 'Intermediate'
      ? '#FEF3C7' : level === 'Advanced'
        ? '#FEE2E2' : '#EEF2FF'
  const fg = level === 'Beginner'
    ? '#00D26A' : level === 'Intermediate'
      ? '#D97706' : level === 'Advanced'
        ? '#DC2626' : '#7B61FF'
  return (
    <View style={[badgeStyles.wrap, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color: fg }]}>{level}</Text>
    </View>
  )
}

const badgeStyles = StyleSheet.create({
  wrap: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  text: { fontSize: 9, fontWeight: '800' },
})

function ModuleGridCard({ mod }: { mod: ModuleDef }) {
  const hasProgress = typeof mod.progress === 'number'
  const isComplete = mod.progress === 100
  return (
    <TouchableOpacity
      style={gridCardStyles.card}
      activeOpacity={0.85}
      onPress={() => router.push(mod.route as any)}
    >
      {/* Color accent bar */}
      <View style={[gridCardStyles.colorBar, { backgroundColor: mod.color }]} />

      <View style={gridCardStyles.body}>
        {/* Icon */}
        <mod.icon size={28} color={mod.color} style={{ marginBottom: 6 }} />

        {/* Name */}
        <Text style={gridCardStyles.name} numberOfLines={2}>{mod.name}</Text>

        {/* Level badge */}
        <LevelBadge level={mod.level} />

        {/* Time */}
        <Text style={gridCardStyles.time}>{mod.time}</Text>

        {/* Progress bar */}
        <View style={gridCardStyles.progressBg}>
          <View style={[
            gridCardStyles.progressFill,
            {
              width: `${mod.progress ?? 0}%` as `${number}%`,
              backgroundColor: isComplete ? '#00D26A' : mod.color,
            },
          ]} />
        </View>

        {/* Progress label */}
        <Text style={[gridCardStyles.progressLabel, { color: isComplete ? '#00D26A' : '#9CA3AF' }]}>
          {isComplete ? '✓ Done' : hasProgress ? `${mod.progress}%` : 'Not started'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const gridCardStyles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    marginBottom: 12,
  },
  colorBar: { height: 5, width: '100%' },
  body: { padding: 12, gap: 6 },
  icon: { fontSize: 28 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  time: { fontSize: 11, color: '#9CA3AF' },
  progressBg: { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 5, borderRadius: 3 },
  progressLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
})

function RecommendedCard({ mod }: { mod: ModuleDef }) {
  return (
    <TouchableOpacity
      style={recCardStyles.card}
      activeOpacity={0.85}
      onPress={() => router.push(mod.route as any)}
    >
      <LinearGradient
        colors={[mod.color, `${mod.color}CC`]}
        style={recCardStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <mod.icon size={30} color='white' />
        <View style={recCardStyles.info}>
          <Text style={recCardStyles.label}>AI RECOMMENDED</Text>
          <Text style={recCardStyles.name}>{mod.name}</Text>
          <Text style={recCardStyles.meta}>{mod.time} · {mod.level}</Text>
        </View>
        <ArrowRight size={20} color='white' />
      </LinearGradient>
    </TouchableOpacity>
  )
}

const recCardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  icon: { fontSize: 30 },
  info: { flex: 1 },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: '800', letterSpacing: 1.2 },
  name: { fontSize: 16, fontWeight: '800', color: 'white', marginTop: 2 },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  arrow: { fontSize: 20, color: 'white', fontWeight: '700' },
})

// ── Main screen ─────────────────────────────────────────────────────────────

export default function LearnHubScreen() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  // Derived data
  const completedCount = useMemo(
    () => MODULES.filter(m => m.progress === 100).length,
    []
  )

  const filteredModules = useMemo(() => {
    const q = search.trim().toLowerCase()
    return MODULES.filter(m => {
      const matchesCategory =
        activeCategory === 'All' ||
        m.category === activeCategory ||
        m.category === 'All'
      const matchesSearch =
        q === '' ||
        m.name.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.level.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [search, activeCategory])

  const recommendedModules = useMemo(
    () => MODULES.filter(m => RECOMMENDED_NAMES.includes(m.name)),
    []
  )

  const showRecommended = search.trim() === '' && activeCategory === 'All'

  // Pair modules into rows for 2-column grid
  const gridRows: (ModuleDef | null)[][] = useMemo(() => {
    const rows: (ModuleDef | null)[][] = []
    for (let i = 0; i < filteredModules.length; i += 2) {
      rows.push([filteredModules[i], filteredModules[i + 1] ?? null])
    }
    return rows
  }, [filteredModules])

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>Learn English</Text>
        <Text style={styles.headerSubtitle}>Your complete learning journey</Text>

        {/* Progress summary */}
        <View style={styles.progressSummary}>
          <View style={styles.progressSummaryTextCol}>
            <Text style={styles.progressSummaryCount}>
              {completedCount} of {TOTAL_MODULES} modules completed
            </Text>
            <View style={styles.progressSummaryBarBg}>
              <View style={[
                styles.progressSummaryBarFill,
                { width: `${Math.round((completedCount / TOTAL_MODULES) * 100)}%` as `${number}%` },
              ]} />
            </View>
          </View>
          <View style={styles.progressSummaryPctWrap}>
            <Text style={styles.progressSummaryPct}>
              {Math.round((completedCount / TOTAL_MODULES) * 100)}%
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Search Bar ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color='#9CA3AF' style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search modules, categories..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color='#9CA3AF' style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category Filter Tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.tab,
                active && { backgroundColor: CATEGORY_COLORS[cat] ?? Colors.primary },
              ]}
              onPress={() => setActiveCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{cat}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* ── Recommended section ── */}
      {showRecommended && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}><Star size={18} color='#F59E0B' style={{marginRight: 6}} /><Text style={styles.sectionTitle}>AI Recommended for You</Text></View>
            <Text style={styles.sectionSubtitle}>Based on your progress</Text>
          </View>
          {recommendedModules.map(m => (
            <RecommendedCard key={m.name} mod={m} />
          ))}
        </View>
      )}

      {/* ── Modules Grid ── */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>
            {activeCategory === 'All' ? 'All Modules' : `${activeCategory} Modules`}
          </Text>
          <Text style={styles.sectionCount}>{filteredModules.length} modules</Text>
        </View>

        {filteredModules.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={40} color='#9CA3AF' style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No modules found for "{search}"</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {gridRows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((mod, ci) =>
                  mod ? (
                    <ModuleGridCard key={mod.name} mod={mod} />
                  ) : (
                    <View key={`empty-${ci}`} style={{ width: CARD_WIDTH }} />
                  )
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ── Recently Completed ── */}
      {search.trim() === '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Active</Text>
          <View style={styles.recentCard}>
            {MODULES.filter(m => typeof m.progress === 'number' && m.progress > 0 && m.progress < 100)
              .slice(0, 3)
              .map((m, idx, arr) => (
                <TouchableOpacity
                  key={m.name}
                  style={[styles.recentRow, idx < arr.length - 1 && styles.recentRowBorder]}
                  onPress={() => router.push(m.route as any)}
                  activeOpacity={0.8}
                >
                  <m.icon size={26} color={m.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentTitle}>{m.name}</Text>
                    <View style={styles.recentProgressRow}>
                      <View style={styles.recentProgressBg}>
                        <View style={[styles.recentProgressFill, { width: `${m.progress}%` as `${number}%`, backgroundColor: m.color }]} />
                      </View>
                      <Text style={styles.recentProgressPct}>{m.progress}%</Text>
                    </View>
                  </View>
                  <View style={[styles.continueBtn, { backgroundColor: m.color + '22' }]}>
                    <Text style={[styles.continueBtnText, { color: m.color }]}>Continue</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },

  // Header
  header: {
    padding: 24, paddingTop: 52, paddingBottom: 24,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  progressSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  progressSummaryTextCol: { flex: 1 },
  progressSummaryCount: { fontSize: 13, color: 'white', fontWeight: '700', marginBottom: 8 },
  progressSummaryBarBg: { height: 7, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 4, overflow: 'hidden' },
  progressSummaryBarFill: { height: 7, backgroundColor: 'white', borderRadius: 4 },
  progressSummaryPctWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  progressSummaryPct: { fontSize: 16, fontWeight: '900', color: 'white' },

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

  // Category tabs
  tabsScroll: { marginTop: 16 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, backgroundColor: 'white',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: 'white' },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  sectionCount: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

  // Grid
  grid: { gap: 0 },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },

  // Recently active
  recentCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  recentRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  recentIcon: { fontSize: 26 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 6 },
  recentProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentProgressBg: { flex: 1, height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  recentProgressFill: { height: 5, borderRadius: 3 },
  recentProgressPct: { fontSize: 11, color: '#6B7280', fontWeight: '700', width: 30 },
  continueBtn: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  continueBtnText: { fontSize: 12, fontWeight: '700' },
})
