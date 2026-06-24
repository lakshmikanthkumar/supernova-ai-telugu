import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams } from 'expo-router'
import { useAppSelector, useAppDispatch } from '../../hooks/useStore'
import { fetchAchievements, fetchLeaderboard } from '../../store/slices/gamificationSlice'
import type { Achievement, LeaderboardEntry } from '../../types'
import { Theme } from '../../theme'
import { Zap, Trophy, Flame, Medal, Lock, User } from 'lucide-react-native'

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
      <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={styles.header}>
        <View style={styles.headerTitleRow}>
          <ActivityIcon />
          <Text style={styles.headerTitle}>System Metrics</Text>
        </View>
        <Text style={styles.headerSubtitle}>Performance Analysis</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatItem label="TOTAL XP" value={`${profile?.xp_total || 0}`} Icon={Zap} color={Theme.colors.accent} />
          <StatItem label="LEVEL" value={`${profile?.current_level || 1}`} Icon={Trophy} color="#00C2FF" />
          <StatItem label="STREAK" value={`${profile?.streak_current || 0}d`} Icon={Flame} color="#FF5722" />
          <StatItem label="BADGES" value={`${earned.length}`} Icon={Medal} color="#00E676" />
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievements' && styles.tabActive]}
          onPress={() => setActiveTab('achievements')}
        >
          <View style={styles.tabTextRow}>
            <Medal size={16} color={activeTab === 'achievements' ? Theme.colors.secondary : Theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'achievements' && styles.tabTextActive]}>
              Badges ({earned.length}/{achievements.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <View style={styles.tabTextRow}>
            <Trophy size={16} color={activeTab === 'leaderboard' ? Theme.colors.secondary : Theme.colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
              Network Rank
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'achievements' && (
          <View style={styles.tabContent}>
            {earned.length > 0 && (
               <View>
                 <Text style={styles.sectionTitle}>Acquired Badges</Text>
                 <View style={styles.badgesGrid}>
                   {earned.map(a => <AchievementBadge key={a.id} achievement={a} earned />)}
                 </View>
               </View>
            )}
            <View>
              <Text style={styles.sectionTitle}>Locked Badges</Text>
              <View style={styles.badgesGrid}>
                {unearned.map(a => <AchievementBadge key={a.id} achievement={a} earned={false} />)}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.tabContent}>
            <Text style={styles.weekLabel}>Global Network - Active Nodes</Text>
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
                <Trophy size={48} color={Theme.colors.secondary} style={{ marginBottom: 16 }} />
                <Text style={styles.emptyText}>Network initialization complete. Waiting for sync.</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function ActivityIcon() {
  return <Trophy size={24} color={Theme.colors.text} strokeWidth={2.5} style={{ marginRight: 8 }} />
}

function StatItem({ label, value, Icon, color }: { label: string; value: string; Icon: any; color: string }) {
  return (
    <View style={styles.statItem}>
      <Icon size={20} color={color} style={{ marginBottom: 6 }} strokeWidth={2} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function AchievementBadge({ achievement, earned }: { achievement: Achievement; earned: boolean }) {
  return (
    <View style={[styles.badge, !earned && styles.badgeLocked]}>
      <View style={[styles.badgeCircle, { borderColor: earned ? Theme.colors.secondary : 'rgba(255,255,255,0.1)' }]}>
        {earned ? (
          <Medal size={24} color={Theme.colors.secondary} strokeWidth={1.5} />
        ) : (
          <Lock size={24} color={Theme.colors.textSecondary} strokeWidth={1.5} />
        )}
      </View>
      <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
        {achievement.name}
      </Text>
      {earned ? (
        <Text style={styles.badgeEarned}>✓ ACQUIRED</Text>
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
  const getRankColor = (r: number) => r === 1 ? '#FFD700' : r === 2 ? '#C0C0C0' : r === 3 ? '#CD7F32' : null

  return (
    <View style={[styles.leaderboardRow, isCurrentUser && styles.leaderboardRowHighlight]}>
      <View style={styles.rankContainer}>
        {getRankColor(rank) ? (
          <Trophy size={24} color={getRankColor(rank)!} strokeWidth={2} />
        ) : (
          <Text style={styles.rankNumber}>{rank}</Text>
        )}
      </View>
      <View style={styles.leaderboardAvatar}>
        {entry.full_name ? (
          <Text style={styles.leaderboardAvatarText}>
            {entry.full_name.charAt(0).toUpperCase()}
          </Text>
        ) : (
          <User size={18} color={Theme.colors.text} strokeWidth={2} />
        )}
      </View>
      <View style={styles.leaderboardInfo}>
        <Text style={[styles.leaderboardName, isCurrentUser && styles.leaderboardNameHighlight]}>
          {entry.full_name || 'Learner'} {isCurrentUser ? '(Local Node)' : ''}
        </Text>
      </View>
      <View style={styles.leaderboardXPRow}>
        <Zap size={14} color={Theme.colors.accent} strokeWidth={2.5} style={{ marginRight: 4 }} />
        <Text style={styles.leaderboardXP}>{entry.xp_earned.toLocaleString()}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: Theme.colors.secondary, marginTop: 4, marginBottom: 24, textTransform: 'uppercase', letterSpacing: 1.5 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statValue: { fontSize: 18, fontWeight: '800', color: Theme.colors.text },
  statLabel: { fontSize: 9, color: Theme.colors.textSecondary, marginTop: 4, fontWeight: '800', letterSpacing: 1 },
  tabRow: { flexDirection: 'row', backgroundColor: Theme.colors.surface, elevation: 4, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Theme.colors.secondary },
  tabTextRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabText: { fontSize: 13, color: Theme.colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  tabTextActive: { color: Theme.colors.secondary, fontWeight: '800' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, marginBottom: 16, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  badge: { width: '31%', alignItems: 'center', backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 14, elevation: 5, borderWidth: 1, borderColor: Theme.colors.border, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8 },
  badgeLocked: { opacity: 0.5 },
  badgeCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
  badgeName: { fontSize: 12, fontWeight: '800', color: Theme.colors.text, textAlign: 'center' },
  badgeNameLocked: { color: Theme.colors.textSecondary },
  badgeEarned: { fontSize: 10, color: '#00E676', marginTop: 6, fontWeight: '800', textTransform: 'uppercase' },
  badgeRequirement: { fontSize: 10, color: Theme.colors.textSecondary, textAlign: 'center', marginTop: 6, lineHeight: 14 },
  weekLabel: { fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  leaderboardRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Theme.colors.surface,
    borderRadius: 14, padding: 16, marginBottom: 10, elevation: 4, gap: 14,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  leaderboardRowHighlight: { backgroundColor: 'rgba(0,194,255,0.05)', borderWidth: 1, borderColor: Theme.colors.secondary },
  rankContainer: { width: 32, alignItems: 'center' },
  rankNumber: { fontSize: 16, fontWeight: '800', color: Theme.colors.textSecondary },
  leaderboardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  leaderboardAvatarText: { fontSize: 18, fontWeight: '800', color: Theme.colors.text },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  leaderboardNameHighlight: { color: Theme.colors.secondary, fontWeight: '800' },
  leaderboardXPRow: { flexDirection: 'row', alignItems: 'center' },
  leaderboardXP: { fontSize: 14, fontWeight: '800', color: Theme.colors.accent },
  emptyLeaderboard: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 15, color: Theme.colors.textSecondary, textAlign: 'center', fontStyle: 'italic' },
})
