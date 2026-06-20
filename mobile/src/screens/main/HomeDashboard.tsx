import React, { useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { fetchCategories } from '../../store/slices/lessonsSlice'
import { fetchDailyChallenge } from '../../store/slices/gamificationSlice'
import { fetchProfile } from '../../store/slices/authSlice'
import XPCard from '../../components/gamification/XPCard'
import StreakBadge from '../../components/gamification/StreakBadge'
import LessonCard from '../../components/lesson/LessonCard'
import DailyChallengeCard from '../../components/gamification/DailyChallengeCard'

const { width } = Dimensions.get('window')

export default function HomeDashboard() {
  const dispatch = useAppDispatch()
  const { profile } = useAppSelector(s => s.auth)
  const { categories, loading } = useAppSelector(s => s.lessons)
  const { dailyChallenge } = useAppSelector(s => s.gamification)

  const loadData = useCallback(async () => {
    if (profile?.id) {
      await Promise.all([
        dispatch(fetchCategories()),
        dispatch(fetchDailyChallenge()),
        dispatch(fetchProfile(profile.id)),
      ])
    }
  }, [profile?.id])

  useEffect(() => { loadData() }, [])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning! 🌅'
    if (hour < 17) return 'Good Afternoon! ☀️'
    return 'Good Evening! 🌙'
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      {/* Header */}
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.userName}>{profile?.full_name || 'Student'}</Text>
            <Text style={styles.levelText}>Level {profile?.current_level || 1} • English Learner</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/main/profile')}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>
                {profile?.full_name?.charAt(0).toUpperCase() || '👤'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* XP Progress Bar */}
        <XPCard xpTotal={profile?.xp_total || 0} level={profile?.current_level || 1} />
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StreakBadge streak={profile?.streak_current || 0} />
        <StatCard label="XP Today" value={`${profile?.xp_today || 0}`} emoji="⚡" color="#F59E0B" />
        <StatCard label="Level" value={`${profile?.current_level || 1}`} emoji="🏆" color="#4F46E5" />
      </View>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <View style={styles.section}>
          <SectionHeader title="Daily Challenge" titleTelugu="రోజువారీ సవాల్" emoji="🎯" />
          <DailyChallengeCard challenge={dailyChallenge} />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionHeader title="Practice" titleTelugu="అభ్యాసం" emoji="🚀" />
        <View style={styles.quickActions}>
          <QuickActionCard
            emoji="🎤" title="Talk to Nova" titleTelugu="నోవాతో మాట్లాడండి"
            color="#4F46E5" onPress={() => router.push('/nova')}
          />
          <QuickActionCard
            emoji="🎭" title="Roleplay" titleTelugu="రోల్‌ప్లే"
            color="#0891B2" onPress={() => router.push('/ai/roleplay')}
          />
          <QuickActionCard
            emoji="🔊" title="Pronunciation" titleTelugu="ఉచ్చారణ"
            color="#059669" onPress={() => router.push('/lessons/pronunciation')}
          />
          <QuickActionCard
            emoji="🃏" title="Flashcards" titleTelugu="ఫ్లాష్‌కార్డ్స్"
            color="#D97706" onPress={() => router.push('/lessons/flashcards')}
          />
        </View>
      </View>

      {/* Lesson Categories */}
      <View style={styles.section}>
        <SectionHeader title="Learn Topics" titleTelugu="పాఠాల విషయాలు" emoji="📚" />
        <View style={styles.categoriesGrid}>
          {categories.map(cat => (
            <LessonCard
              key={cat.id}
              category={cat}
              onPress={() => router.push({ pathname: '/lessons/[id]', params: { id: cat.id } })}
            />
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

function StatCard({ label, value, emoji, color }: { label: string; value: string; emoji: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function SectionHeader({ title, titleTelugu, emoji }: { title: string; titleTelugu: string; emoji: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{emoji} {title}</Text>
      <Text style={styles.sectionTitleTelugu}>{titleTelugu}</Text>
    </View>
  )
}

function QuickActionCard({ emoji, title, titleTelugu, color, onPress }: {
  emoji: string; title: string; titleTelugu: string; color: string; onPress: () => void
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={[color, color + 'CC']} style={styles.quickActionInner}>
        <Text style={styles.quickActionEmoji}>{emoji}</Text>
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionTelugu}>{titleTelugu}</Text>
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 24, paddingTop: 52, paddingBottom: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  userName: { fontSize: 22, fontWeight: '800', color: 'white' },
  levelText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 22, color: 'white', fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16,
    marginTop: -16, marginBottom: 8,
  },
  statCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 14,
    alignItems: 'center', elevation: 3, borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  sectionTitleTelugu: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: { width: (width - 44) / 2, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  quickActionInner: { padding: 18, minHeight: 100, justifyContent: 'center' },
  quickActionEmoji: { fontSize: 32, marginBottom: 8 },
  quickActionTitle: { fontSize: 16, fontWeight: '700', color: 'white' },
  quickActionTelugu: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
})
