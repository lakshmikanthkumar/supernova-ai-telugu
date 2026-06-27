import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppSelector, useAppDispatch } from '../../hooks/useStore'
import { fetchAchievements, fetchLeaderboard } from '../../store/slices/gamificationSlice'
import { Colors, Shadow, Radius } from '../../constants/theme'
import { useTheme } from '../../context/ThemeContext'
import { Mic, Edit3, BookOpen, CheckCircle, Headphones, Flame, Trophy, Calendar, Clock, BarChart2, User, Award, ArrowRight, Zap, Medal, Lock } from 'lucide-react-native'
import type { Achievement, LeaderboardEntry } from '../../types'
import { Theme } from '../../theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLevel(xp: number) {
  return Math.floor(xp / 500) + 1
}

function getXpToNextLevel(xp: number) {
  const lvl = getLevel(xp)
  return lvl * 500 - xp
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Generate 7-day XP data seeded from total XP so it is deterministic but varied */
function generateWeeklyData(xpTotal: number): number[] {
  const base = Math.max(xpTotal, 50)
  return DAY_LABELS.map((_, i) => {
    const seed = (base * (i + 3)) % 200
    return Math.round(10 + seed % 90)
  })
}

const SKILLS = [
  { label: 'Speaking',   icon: Mic, divisor: 20 },
  { label: 'Writing',    icon: Edit3, divisor: 15 },
  { label: 'Vocabulary', icon: BookOpen, divisor: 10 },
  { label: 'Grammar',    icon: CheckCircle, divisor: 12 },
  { label: 'Listening',  icon: Headphones, divisor: 18 },
]

function skillValue(xp: number, divisor: number) {
  return Math.min(100, Math.round((xp / divisor) % 100))
}

// ─── Animated bar used in the weekly chart ───────────────────────────────────

function AnimatedBar({
  value,
  maxValue,
  isToday,
  label,
}: {
  value: number
  maxValue: number
  isToday: boolean
  label: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const chartStyles = getChartStyles(c)
  const anim = useRef(new Animated.Value(0)).current
  const BAR_MAX_HEIGHT = 80

  useEffect(() => {
    Animated.spring(anim, {
      toValue: maxValue > 0 ? (value / maxValue) * BAR_MAX_HEIGHT : 0,
      useNativeDriver: false,
      tension: 60,
      friction: 8,
    }).start()
  }, [value, maxValue])

  return (
    <View style={chartStyles.barWrapper}>
      <Text style={chartStyles.barValue}>{value}</Text>
      <View style={[chartStyles.barTrack, { height: BAR_MAX_HEIGHT }]}>
        <Animated.View
          style={[
            chartStyles.barFill,
            {
              height: anim,
              backgroundColor: isToday ? c.primary : c.secondary,
              opacity: isToday ? 1 : 0.6,
            },
          ]}
        />
      </View>
      <Text style={[chartStyles.dayLabel, isToday && chartStyles.dayLabelToday]}>
        {label}
      </Text>
    </View>
  )
}

// ─── Animated skill progress bar ─────────────────────────────────────────────

function SkillBar({ label, icon: IconComp, pct }: { label: string; icon: any; pct: number }) {
  const { theme } = useTheme()
  const c = theme.colors
  const skillStyles = getSkillStyles(c)
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 700,
      useNativeDriver: false,
    }).start()
  }, [pct])

  const widthInterp = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={skillStyles.row}>
      <View style={{ width: 36, alignItems: 'center' }}><IconComp size={22} color={c.textSecondary} /></View>
      <View style={skillStyles.info}>
        <View style={skillStyles.labelRow}>
          <Text style={skillStyles.label}>{label}</Text>
          <Text style={skillStyles.pct}>{pct}%</Text>
        </View>
        <View style={skillStyles.track}>
          <Animated.View style={[skillStyles.fill, { width: widthInterp }]} />
        </View>
      </View>
    </View>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ icon: IconComp, label, value }: { icon: any; label: string; value: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  const statStyles = getStatStyles(c)
  return (
    <View style={statStyles.card}>
      <IconComp size={26} color={c.primary} style={{ marginBottom: 6 }} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  )
}

// ─── Leaderboard row ─────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry
  rank: number
  isCurrentUser: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const lbStyles = getLbStyles(c)
  const medal = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : null
  return (
    <View style={[lbStyles.row, isCurrentUser && lbStyles.rowHighlight]}>
      <View style={lbStyles.rankBox}>
        {medal ? (
          <Trophy size={22} color={medal as string} />
        ) : (
          <Text style={lbStyles.rankNum}>{rank}</Text>
        )}
      </View>
      <View style={lbStyles.avatar}>
        <User size={20} color={c.primary} />
      </View>
      <View style={lbStyles.nameBox}>
        <Text style={[lbStyles.name, isCurrentUser && lbStyles.nameHighlight]}>
          {entry.full_name}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
      </View>
      <Text style={lbStyles.xp}>{entry.xp_earned.toLocaleString()}</Text>
    </View>
  )
}

// ─── Achievement badge (compact) ─────────────────────────────────────────────

function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const { theme } = useTheme()
  const c = theme.colors
  const achStyles = getAchStyles(c)
  return (
    <View style={achStyles.badge}>
      <View style={[achStyles.circle, { borderColor: achievement.badge_color || c.primary }]}>
        <Award size={26} color={achievement.badge_color || c.primary} />
      </View>
      <Text style={achStyles.name} numberOfLines={2}>{achievement.name}</Text>
    </View>
  )
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const styles = getStyles(c)
  const chartStyles = getChartStyles(c)
  const statStyles = getStatStyles(c)
  const achStyles = getAchStyles(c)
  const lbStyles = getLbStyles(c)

  const dispatch = useAppDispatch()
  const router = useRouter()
  const { profile } = useAppSelector(s => s.auth)
  const { achievements, leaderboard } = useAppSelector(s => s.gamification)
  const { tab } = useLocalSearchParams<{ tab?: 'progress' | 'leaderboard' }>()
  const [activeTab, setActiveTab] = useState<'progress' | 'leaderboard'>(
    (tab as 'progress' | 'leaderboard') || 'progress'
  )

  useEffect(() => {
    if (tab === 'leaderboard' || tab === 'progress') setActiveTab(tab)
  }, [tab])

  useEffect(() => {
    if (profile?.id) {
      dispatch(fetchAchievements(profile.id))
      dispatch(fetchLeaderboard())
    }
  }, [profile?.id])

  const xp = profile?.xp_total ?? 0
  const level = getLevel(xp)
  const xpToNext = getXpToNextLevel(xp)
  const streak = profile?.streak_current ?? 0
  const earned = achievements.filter(a => a.earned_at)
  const recentBadges = earned.slice(-3).reverse()

  const weeklyData = generateWeeklyData(xp)
  const maxWeekly = Math.max(...weeklyData, 1)

  // Today is the last entry (index 6 = Sunday, but we pin "today" to current weekday)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient colors={[c.primary, c.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>My Progress</Text>
        <View style={styles.headerMeta}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Lv {level}</Text>
          </View>
          <Text style={styles.xpText}>
            {xp.toLocaleString()} XP
          </Text>
        </View>
        <Text style={styles.xpSubtitle}>
          Level {level} · {xpToNext.toLocaleString()} XP to next level
        </Text>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && styles.tabActive]}
          onPress={() => setActiveTab('progress')}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}><BarChart2 size={16} color={activeTab === 'progress' ? c.primary : c.textSecondary} style={{marginRight: 6}} /><Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>Progress</Text></View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}><Trophy size={16} color={activeTab === 'leaderboard' ? c.primary : c.textSecondary} style={{marginRight: 6}} /><Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>Leaderboard</Text></View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'progress' && (
          <>
            {/* ── Weekly Activity Chart ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Weekly Activity</Text>
              <Text style={styles.sectionSub}>XP earned per day</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={chartStyles.container}>
                  {weeklyData.map((val, i) => (
                    <AnimatedBar
                      key={i}
                      value={val}
                      maxValue={maxWeekly}
                      isToday={i === todayIndex}
                      label={DAY_LABELS[i]}
                    />
                  ))}
                </View>
              </ScrollView>
              <View style={chartStyles.legend}>
                <View style={chartStyles.legendDot} />
                <Text style={chartStyles.legendText}>Today</Text>
                <View style={[chartStyles.legendDot, { backgroundColor: c.secondary, opacity: 0.6 }]} />
                <Text style={chartStyles.legendText}>Other days</Text>
              </View>
            </View>

            {/* ── Skills Progress ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Skills Overview</Text>
              <Text style={styles.sectionSub}>Based on your activity</Text>
              {SKILLS.map(s => (
                <SkillBar
                  key={s.label}
                  label={s.label}
                  icon={s.icon}
                  pct={skillValue(xp, s.divisor)}
                />
              ))}
            </View>

            {/* ── Stats Grid ── */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Learning Statistics</Text>
              <View style={statStyles.grid}>
                <StatCard icon={Calendar} label="Current Streak" value={`${streak} days`} />
                <StatCard icon={Trophy} label="Total XP" value={xp.toLocaleString()} />
                <StatCard icon={BookOpen}
                  label="Lessons Done"
                  value={`${Math.round(xp / 50)}`}
                />
                <StatCard icon={Clock}
                  label="Minutes Learned"
                  value={`${Math.round(xp / 3)}`}
                />
              </View>
            </View>

            {/* ── Achievements Summary ── */}
            <View style={styles.card}>
              <View style={achStyles.header}>
                <View>
                  <Text style={styles.sectionTitle}>Achievements</Text>
                  <Text style={achStyles.count}>
                    {earned.length}/20 badges earned
                  </Text>
                </View>
                <TouchableOpacity
                  style={achStyles.viewAllBtn}
                  onPress={() => router.push('/(main)/profile')}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={achStyles.viewAllText}>View All</Text><ArrowRight size={14} color={c.primary} style={{marginLeft: 2}}/></View>
                </TouchableOpacity>
              </View>
              {recentBadges.length > 0 ? (
                <View style={achStyles.badgeRow}>
                  {recentBadges.map(a => (
                    <AchievementBadge key={a.id} achievement={a} />
                  ))}
                </View>
              ) : (
                <Text style={achStyles.empty}>
                  Complete lessons to earn your first badge!
                </Text>
              )}
            </View>
          </>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>This Week's Top Learners</Text>
            {leaderboard.map((entry, i) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                rank={i + 1}
                isCurrentUser={entry.user_id === profile?.id}
              />
            ))}
            {leaderboard.length === 0 && (
              <View style={lbStyles.empty}>
                <Trophy size={44} color={c.textSecondary} style={{ marginBottom: 12 }} />
                <Text style={lbStyles.emptyText}>
                  Be the first to top the leaderboard this week!
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const getStyles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.round,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  levelBadgeText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
  },
  xpText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
  },
  xpSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: c.primary },
  tabText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
  tabTextActive: { color: c.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  card: {
    backgroundColor: c.surface,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12,
    color: c.textSecondary,
    marginBottom: 14,
  },
})

const getChartStyles = (c: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 8,
    gap: 8,
    minWidth: SCREEN_WIDTH - 64,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
    minWidth: 36,
  },
  barValue: {
    fontSize: 10,
    color: c.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  barTrack: {
    width: 24,
    backgroundColor: c.borderLight || '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  dayLabel: {
    marginTop: 6,
    fontSize: 11,
    color: c.textSecondary,
    fontWeight: '500',
  },
  dayLabelToday: {
    color: c.primary,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.primary,
  },
  legendText: {
    fontSize: 11,
    color: c.textSecondary,
    marginRight: 10,
  },
})

const getSkillStyles = (c: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  icon: { fontSize: 22, width: 28, textAlign: 'center' },
  info: { flex: 1 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  pct: { fontSize: 13, fontWeight: '700', color: c.primary },
  track: {
    height: 8,
    backgroundColor: c.borderLight || '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 4,
  },
})

const getStatStyles = (c: any) => StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  card: {
    width: (SCREEN_WIDTH - 64 - 12) / 2,
    backgroundColor: c.background,
    borderRadius: Radius.md,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  emoji: { fontSize: 26, marginBottom: 6 },
  value: { fontSize: 20, fontWeight: '800', color: c.textPrimary, marginBottom: 2 },
  label: { fontSize: 11, color: c.textSecondary, textAlign: 'center', fontWeight: '500' },
})

const getLbStyles = (c: any) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.background,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  rowHighlight: {
    backgroundColor: c.primaryLight,
    borderColor: c.primary,
    borderWidth: 2,
  },
  rankBox: { width: 30, alignItems: 'center' },
  medal: { fontSize: 22 },
  rankNum: { fontSize: 16, fontWeight: '700', color: c.textSecondary },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '700', color: c.primary },
  nameBox: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  nameHighlight: { color: c.primary },
  xp: { fontSize: 13, fontWeight: '700', color: c.secondary },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyText: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
})

const getAchStyles = (c: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  count: { fontSize: 12, color: c.textSecondary, marginTop: 2 },
  viewAllBtn: {
    backgroundColor: c.primaryLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: c.primary,
  },
  viewAllText: { fontSize: 13, fontWeight: '700', color: c.primary },
  badgeRow: { flexDirection: 'row', gap: 12 },
  badge: {
    alignItems: 'center',
    flex: 1,
  },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: c.surface,
  },
  icon: { fontSize: 26 },
  name: { fontSize: 11, fontWeight: '600', color: c.textPrimary, textAlign: 'center' },
  empty: { fontSize: 13, color: c.textSecondary, textAlign: 'center', paddingVertical: 12 },
})
