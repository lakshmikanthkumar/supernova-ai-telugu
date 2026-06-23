import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { useAppSelector, useAppDispatch } from '../../hooks/useStore'
import { fetchAchievements, fetchLeaderboard } from '../../store/slices/gamificationSlice'
import type { Achievement, LeaderboardEntry } from '../../types'

export default function ProgressScreen() {
  const dispatch = useAppDispatch()
  const { profile } = useAppSelector(s => s.auth)
  const { achievements, leaderboard } = useAppSelector(s => s.gamification)
  const { tab } = useLocalSearchParams<{ tab?: 'achievements' | 'leaderboard' }>()
  const [activeTab, setActiveTab] = useState<'achievements' | 'leaderboard'>(tab || 'achievements')

  useEffect(() => {
    if (tab) {
      setActiveTab(tab)
    }
  }, [tab])

  useEffect(() => {
    if (profile?.id) {
      dispatch(fetchAchievements(profile.id))
      dispatch(fetchLeaderboard())
    }
  }, [profile?.id])

  const earned = achievements.filter(a => a.earned_at)
  const unearned = achievements.filter(a => !a.earned_at)

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <Text style={styles.headerTitle}>📊 Your Progress</Text>
        <Text style={styles.headerSubtitle}>మీ పురోగతి</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatItem label="Total XP" value={`${profile?.xp_total || 0}`} emoji="⚡" />
          <StatItem label="Level" value={`${profile?.current_level || 1}`} emoji="🏆" />
          <StatItem label="Streak" value={`${profile?.streak_current || 0}d`} emoji="🔥" />
          <StatItem label="Badges" value={`${earned.length}`} emoji="🎖️" />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievements' && styles.tabActive]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.tabTextActive]}>
            🏅 Achievements ({earned.length}/{achievements.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
            🏆 Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'achievements' && (
          <View style={styles.tabContent}>
            {earned.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Earned Badges 🎉</Text>
                <View style={styles.badgesGrid}>
                  {earned.map(a => <AchievementBadge key={a.id} achievement={a} earned />)}
                </View>
              </View>
            )}
            <View>
              <Text style={styles.sectionTitle}>Locked Badges 🔒</Text>
              <View style={styles.badgesGrid}>
                {unearned.map(a => <AchievementBadge key={a.id} achievement={a} earned={false} />)}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.tabContent}>
            <Text style={styles.weekLabel}>This Week's Top Learners</Text>
            {leaderboard.map((entry, i) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                rank={i + 1}
                isCurrentUser={entry.user_id === profile?.id}
              />
            ))}
            {leaderboard.length === 0 && (
              <View style={styles.emptyLeaderboard}>
                <Text style={styles.emptyEmoji}>🏆</Text>
                <Text style={styles.emptyText}>Be the first to top the leaderboard this week!</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function StatItem({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function AchievementBadge({ achievement, earned }: { achievement: Achievement; earned: boolean }) {
  return (
    <View style={[styles.badge, !earned && styles.badgeLocked]}>
      <View style={[styles.badgeCircle, { borderColor: earned ? achievement.badge_color : '#E5E7EB' }]}>
        <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
          {earned ? '🏅' : '🔒'}
        </Text>
      </View>
      <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
        {achievement.name}
      </Text>
      {earned ? (
        <Text style={styles.badgeEarned}>✓ Earned</Text>
      ) : (
        <Text style={styles.badgeRequirement} numberOfLines={2}>
          {achievement.description}
        </Text>
      )}
    </View>
  )
}

function LeaderboardRow({ entry, rank, isCurrentUser }: {
  entry: LeaderboardEntry; rank: number; isCurrentUser: boolean
}) {
  const getMedal = (r: number) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : null

  return (
    <View style={[styles.leaderboardRow, isCurrentUser && styles.leaderboardRowHighlight]}>
      <View style={styles.rankContainer}>
        {getMedal(rank) ? (
          <Text style={styles.medal}>{getMedal(rank)}</Text>
        ) : (
          <Text style={styles.rankNumber}>{rank}</Text>
        )}
      </View>
      <View style={styles.leaderboardAvatar}>
        <Text style={styles.leaderboardAvatarText}>
          {entry.full_name?.charAt(0).toUpperCase() || '👤'}
        </Text>
      </View>
      <View style={styles.leaderboardInfo}>
        <Text style={[styles.leaderboardName, isCurrentUser && styles.leaderboardNameHighlight]}>
          {entry.full_name} {isCurrentUser ? '(You)' : ''}
        </Text>
      </View>
      <Text style={styles.leaderboardXP}>⚡ {entry.xp_earned.toLocaleString()}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, alignItems: 'center' },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: 'white' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  tabRow: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#4F46E5' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#4F46E5' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  badge: { width: '30%', alignItems: 'center', backgroundColor: 'white', borderRadius: 16, padding: 14, elevation: 3 },
  badgeLocked: { opacity: 0.5 },
  badgeCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeIcon: { fontSize: 28 },
  badgeIconLocked: { opacity: 0.5 },
  badgeName: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center' },
  badgeNameLocked: { color: '#9CA3AF' },
  badgeEarned: { fontSize: 11, color: '#059669', marginTop: 4, fontWeight: '600' },
  badgeRequirement: { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 4, lineHeight: 14 },
  weekLabel: { fontSize: 14, color: '#6B7280', marginBottom: 12, fontWeight: '600' },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    borderRadius: 14, padding: 14, marginBottom: 8, elevation: 2, gap: 12,
  },
  leaderboardRowHighlight: { backgroundColor: '#EEF2FF', borderWidth: 2, borderColor: '#4F46E5' },
  rankContainer: { width: 32, alignItems: 'center' },
  medal: { fontSize: 22 },
  rankNumber: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  leaderboardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  leaderboardAvatarText: { fontSize: 18, fontWeight: '700', color: '#4F46E5' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  leaderboardNameHighlight: { color: '#4F46E5' },
  leaderboardXP: { fontSize: 14, fontWeight: '700', color: '#F59E0B' },
  emptyLeaderboard: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
})
