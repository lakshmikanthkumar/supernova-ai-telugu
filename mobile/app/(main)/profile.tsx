import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch, Platform, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppDispatch, useAppSelector } from '../../src/hooks/useStore'
import { updateProfile, clearAuth } from '../../src/store/slices/authSlice'
import { toggleTranslations } from '../../src/store/slices/uiSlice'
import { authService } from '../../src/services/api'
import { Colors, Shadow, Radius } from '../../src/constants/theme'
import { Footprints, Flame, Gem, Book, Type, Edit3, Briefcase, Trophy, Mail, MailOpen, Mic, Star, Sparkles, Target, Award, Bot, Volume2, Crown, Zap, BookOpen, MessageSquare, Settings, Check, Hand, Lock, Sun, Bell, Clock, ChevronRight } from 'lucide-react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// ─── Achievement definitions ───────────────────────────────────────────────
interface AchievementDef {
  id: string
  icon: any
  name: string
  condition: string
  xpThreshold?: number
  streakThreshold?: number
  levelThreshold?: number
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_step',    icon: Footprints, name: 'First Step',       condition: 'Complete first lesson',           xpThreshold: 10 },
  { id: 'week_streak',   icon: Flame, name: '7-Day Streak',     condition: '7 day streak',                    streakThreshold: 7 },
  { id: 'month_streak',  icon: Gem, name: '30-Day Streak',    condition: '30 day streak',                   streakThreshold: 30 },
  { id: 'vocab_50',      icon: Book, name: 'Word Collector',   condition: 'Learn 50 words',                  xpThreshold: 500 },
  { id: 'vocab_100',     icon: Type, name: 'Vocab Master',     condition: 'Learn 100 words',                 xpThreshold: 1000 },
  { id: 'grammar_start', icon: Edit3, name: 'Grammar Starter',  condition: 'Check 5 sentences',               xpThreshold: 50 },
  { id: 'interview_1',   icon: Briefcase, name: 'Interview Ready',  condition: 'Complete 1 mock interview',       xpThreshold: 100 },
  { id: 'interview_5',   icon: Trophy, name: 'Interview Pro',    condition: 'Complete 5 interviews',           xpThreshold: 500 },
  { id: 'email_1',       icon: Mail, name: 'Email Writer',     condition: 'Write first email',               xpThreshold: 50 },
  { id: 'email_10',      icon: MailOpen, name: 'Email Pro',        condition: 'Write 10 emails',                 xpThreshold: 500 },
  { id: 'speaking_1',    icon: Mic, name: 'First Speech',     condition: 'Complete first speech',           xpThreshold: 100 },
  { id: 'speaking_5',    icon: Mic, name: 'Public Speaker',  condition: 'Complete 5 speeches',             xpThreshold: 500 },
  { id: 'level_5',       icon: Star, name: 'Rising Star',      condition: 'Reach level 5',                   levelThreshold: 5 },
  { id: 'level_10',      icon: Sparkles, name: 'Star Learner',     condition: 'Reach level 10',                  levelThreshold: 10 },
  { id: 'level_20',      icon: Star, name: 'Language Master',  condition: 'Reach level 20',                  levelThreshold: 20 },
  { id: 'daily_7',       icon: Target, name: 'Week Champion',    condition: 'Complete 7 daily challenges',     xpThreshold: 350 },
  { id: 'daily_30',      icon: Award, name: 'Monthly Champion', condition: 'Complete 30 challenges',          xpThreshold: 1500 },
  { id: 'nova_chat',     icon: Bot, name: 'AI Student',       condition: 'Chat with Nova 5 times',          xpThreshold: 250 },
  { id: 'pronunciation', icon: Volume2, name: 'Clear Speaker',    condition: 'Score 80%+ in pronunciation',     xpThreshold: 200 },
  { id: 'all_modules',   icon: Crown, name: 'Module Master',    condition: 'Try all 13 modules',              xpThreshold: 1300 },
]

function isUnlocked(
  def: AchievementDef,
  xp: number,
  streak: number,
  level: number,
): boolean {
  if (def.xpThreshold    !== undefined && xp     >= def.xpThreshold)    return true
  if (def.streakThreshold !== undefined && streak >= def.streakThreshold) return true
  if (def.levelThreshold  !== undefined && level  >= def.levelThreshold)  return true
  return false
}

// ─── Level label helper ────────────────────────────────────────────────────
function getLevelLabel(level: number): string {
  if (level  <  3) return 'Beginner'
  if (level  <  7) return 'Elementary'
  if (level  < 12) return 'Intermediate'
  if (level  < 18) return 'Upper-Intermediate'
  if (level  < 25) return 'Advanced'
  return 'Master'
}

// ─── Skill percentages derived from XP ────────────────────────────────────
function deriveSkills(xp: number, level: number) {
  const base = Math.min(xp, 2000)
  return [
    { label: 'Speaking',    color: Colors.primary,   pct: Math.min(100, Math.round(base * 0.35 / 7)) },
    { label: 'Grammar',     color: Colors.secondary, pct: Math.min(100, Math.round(base * 0.40 / 8)) },
    { label: 'Vocabulary',  color: '#2ECC71',         pct: Math.min(100, Math.round(base * 0.50 / 10)) },
    { label: 'Writing',     color: '#5A42F5',         pct: Math.min(100, Math.round(base * 0.28 / 5.6)) },
    { label: 'Listening',   color: '#9B59B6',         pct: Math.min(100, Math.round(base * 0.32 / 6.4)) },
  ]
}

// ─── Stat card numbers ─────────────────────────────────────────────────────
function estimateLessonsCompleted(xp: number): number {
  return Math.floor(xp / 50)
}
function estimateWordsLearned(xp: number): number {
  return Math.floor(xp / 10)
}

// ─── Avatar gradient based on first letter ─────────────────────────────────
function avatarColors(name: string): [string, string] {
  const gradients: [string, string][] = [
    ['#7B61FF', '#5A42F5'],
    ['#00D26A', '#34D399'],
    ['#9B59B6', '#8E44AD'],
    ['#2ECC71', '#27AE60'],
    ['#E74C3C', '#C0392B'],
    ['#1ABC9C', '#16A085'],
    ['#F39C12', '#E67E22'],
    ['#3498DB', '#2980B9'],
  ]
  const code = (name.charCodeAt(0) || 65) % gradients.length
  return gradients[code]
}

// ══════════════════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const dispatch    = useAppDispatch()
  const { user, profile }          = useAppSelector(s => s.auth)
  const { showTeluguTranslations } = useAppSelector(s => s.ui)

  const [editing,            setEditing]            = useState(false)
  const [name,               setName]               = useState(profile?.full_name || '')
  const [dailyGoal,          setDailyGoal]          = useState(profile?.daily_goal_minutes?.toString() || '15')
  const [showConfirmModal,   setShowConfirmModal]   = useState(false)
  const [dailyReminder,      setDailyReminder]      = useState(false)

  // Load daily-reminder preference from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('@englishmitra:daily_reminder').then(val => {
      setDailyReminder(val === 'true')
    })
  }, [])

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setDailyGoal(profile.daily_goal_minutes?.toString() || '15')
    }
  }, [profile])

  // ── derived values ────────────────────────────────────────────────────────
  const xp     = profile?.xp_total       ?? 0
  const streak = profile?.streak_current ?? 0
  const level  = profile?.current_level  ?? 1
  const skills = deriveSkills(xp, level)
  const lessonsDone  = estimateLessonsCompleted(xp)
  const wordsLearned = estimateWordsLearned(xp)

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently joined'

  const firstLetter = (profile?.full_name || 'E').charAt(0).toUpperCase()
  const [avatarGrad1, avatarGrad2] = avatarColors(profile?.full_name || 'E')

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!profile) return
    try {
      const resultAction = await dispatch(updateProfile({
        userId: profile.id,
        updates: { full_name: name, daily_goal_minutes: parseInt(dailyGoal) || 15 },
      }))
      if (updateProfile.fulfilled.match(resultAction)) {
        setEditing(false)
        Platform.OS === 'web'
          ? alert('Profile updated successfully.')
          : Alert.alert('Saved!', 'Profile updated successfully.')
      } else {
        const msg = resultAction.error?.message || 'Failed to update profile.'
        Platform.OS === 'web' ? alert('Error: ' + msg) : Alert.alert('Error', msg)
      }
    } catch (err: any) {
      Platform.OS === 'web' ? alert('Error: ' + err.message) : Alert.alert('Error', err.message)
    }
  }

  const performSignOut = async () => {
    await AsyncStorage.removeItem('is_guest_mode')
    await AsyncStorage.removeItem('@englishmitra:profile_v2')
    await authService.signOut()
    dispatch(clearAuth())
    router.replace('/login')
  }

  const handleTeluguToggle = (val: boolean) => {
    dispatch(toggleTranslations())
    AsyncStorage.setItem('@englishmitra:telugu_translations', String(val))
  }

  const handleReminderToggle = (val: boolean) => {
    setDailyReminder(val)
    AsyncStorage.setItem('@englishmitra:daily_reminder', String(val))
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.header}>
        <View style={styles.avatarInner}>
          <Text style={styles.avatarText}>{firstLetter}</Text>
        </View>
        <Text style={styles.profileName}>{profile?.full_name || 'English Learner'}</Text>
        <Text style={styles.profileSub}>@{(profile?.full_name || 'learner').toLowerCase().replace(/\s+/g, '_')}</Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>

        <View style={styles.rowContainer}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              Level {level}  •  {getLevelLabel(level)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => setEditing(e => !e)}
          >
            <View style={{flexDirection: 'row', alignItems: 'center'}}>{editing ? <Check size={16} color='white' style={{marginRight: 6}}/> : <Edit3 size={16} color='white' style={{marginRight: 6}}/>}<Text style={styles.editProfileBtnText}>{editing ? 'Done Editing' : 'Edit Profile'}</Text></View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── EDIT FIELDS (visible when editing) ───────────────────────── */}
        {editing && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Edit Profile</Text>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Daily Goal (minutes)</Text>
              <TextInput
                style={styles.fieldInput}
                value={dailyGoal}
                onChangeText={setDailyGoal}
                keyboardType="numeric"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STATS ROW ────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard icon={Zap} value={`${xp}`}          label="Total XP"      color={Colors.accent} />
          <StatCard icon={Flame} value={`${streak}`}       label="Day Streak"    color={Colors.primary} />
          <StatCard icon={BookOpen} value={`${lessonsDone}`}  label="Lessons"       color={Colors.secondary} />
          <StatCard icon={MessageSquare} value={`${wordsLearned}`} label="Words"         color="#2ECC71" />
        </View>

        {/* ── SKILL PROGRESS ───────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skill Progress</Text>
          {skills.map(s => (
            <View key={s.label} style={styles.skillRow}>
              <Text style={styles.skillLabel}>{s.label}</Text>
              <View style={styles.skillBarBg}>
                <View style={[styles.skillBarFill, { width: `${s.pct}%`, backgroundColor: s.color }]} />
              </View>
              <Text style={[styles.skillPct, { color: s.color }]}>{s.pct}%</Text>
            </View>
          ))}
        </View>

        {/* ── ACHIEVEMENT GALLERY ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Achievements</Text>
          <Text style={styles.cardSubtitle}>
            {ACHIEVEMENTS.filter(a => isUnlocked(a, xp, streak, level)).length} / {ACHIEVEMENTS.length} earned
          </Text>
          <View style={styles.achievementGrid}>
            {ACHIEVEMENTS.map(a => {
              const unlocked = isUnlocked(a, xp, streak, level)
              return (
                <View
                  key={a.id}
                  style={[styles.achievementBadge, unlocked ? styles.achievementUnlocked : styles.achievementLocked]}
                >
                  {unlocked ? <a.icon size={28} color={Colors.text} style={{marginBottom: 6}} /> : <Lock size={28} color={Colors.textLight} style={{marginBottom: 6}} />}
                  <Text
                    style={[styles.achievementName, !unlocked && styles.achievementNameLocked]}
                    numberOfLines={2}
                  >
                    {a.name}
                  </Text>
                  {!unlocked && (
                    <Text style={styles.achievementCondition} numberOfLines={2}>
                      {a.condition}
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* ── SETTINGS ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>

          {/* Navigable sub-sections */}
          <SettingsNavRow
            icon={Bell}
            iconColor={Colors.primary}
            label="Notifications"
            desc="View your notification history"
            onPress={() => router.push('/(main)/notifications')}
          />
          <SettingsNavRow
            icon={Clock}
            iconColor={Colors.secondary}
            label="Reminder Settings"
            desc="Set daily practice reminders"
            onPress={() => router.push('/(main)/reminder-settings')}
          />
          <SettingsNavRow
            icon={Sun}
            iconColor="#F59E0B"
            label="Appearance"
            desc="Light, dark, or system theme"
            onPress={() => router.push('/(main)/theme-settings')}
          />

          {/* Toggle rows */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Telugu Translations</Text>
              <Text style={styles.settingDesc}>Show Telugu below English text</Text>
            </View>
            <Switch
              value={showTeluguTranslations}
              onValueChange={handleTeluguToggle}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={showTeluguTranslations ? Colors.primaryDark : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Reminder</Text>
              <Text style={styles.settingDesc}>Get notified to practice daily</Text>
            </View>
            <Switch
              value={dailyReminder}
              onValueChange={handleReminderToggle}
              trackColor={{ false: Colors.border, true: Colors.secondary }}
              thumbColor={dailyReminder ? Colors.secondaryLight : '#f4f3f4'}
            />
          </View>
        </View>

        {/* ── ADMIN ────────────────────────────────────────────────────── */}
        {profile?.is_admin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}><Settings size={18} color='white' style={{marginRight: 8}}/><Text style={styles.adminBtnText}>Admin Dashboard</Text></View>
          </TouchableOpacity>
        )}

        {/* ── LOGOUT ───────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowConfirmModal(true)}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>EnglishMitraAI v1.0.0  •  by Maansvi</Text>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── SIGN-OUT CONFIRM MODAL ────────────────────────────────────── */}
      {showConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Hand size={48} color={Colors.primary} style={{marginBottom: 16}} />
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalText}>Are you sure you want to sign out of your account?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConfirmModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => { setShowConfirmModal(false); performSignOut() }}
              >
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function SettingsNavRow({
  icon: IconComp, iconColor, label, desc, onPress,
}: { icon: any; iconColor: string; label: string; desc: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.navIconBox, { backgroundColor: iconColor + '18' }]}>
        <IconComp size={18} color={iconColor} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
      <ChevronRight size={18} color={Colors.textLight} />
    </TouchableOpacity>
  )
}

function StatCard({ icon: IconComp, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <IconComp size={24} color={color} style={{marginBottom: 4}} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────
const CARD_GAP     = 14
const BADGE_SIZE   = (SCREEN_WIDTH - 66 - CARD_GAP * 2) / 3

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingTop: 52,
    paddingBottom: 28,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    ...Shadow.heavy,
  },
  avatarInner: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarText: { fontSize: 40, fontWeight: '900', color: 'white' },
  profileName: { fontSize: 24, fontWeight: '800', color: 'white', textAlign: 'center' },
  profileSub:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  memberSince: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.round,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  levelBadgeText: { color: 'white', fontWeight: '700', fontSize: 13 },
  editProfileBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: Radius.round,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  editProfileBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Scroll
  scroll: { flex: 1 },

  // Card
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.card,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: Colors.textSecondary, marginBottom: 14 },

  // Edit fields
  field: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fieldLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  fieldInput: {
    fontSize: 15, color: Colors.text,
    borderBottomWidth: 2, borderBottomColor: Colors.primary,
    paddingVertical: 4,
  },
  saveBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingVertical: 13,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadow.card,
  },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },

  // Skills
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillLabel: {
    width: 90,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  skillBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  skillPct: {
    width: 36,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Achievements
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginTop: 6,
  },
  achievementBadge: {
    width: BADGE_SIZE,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  achievementUnlocked: {
    backgroundColor: '#FFF8F0',
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  achievementLocked: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  achievementEmoji: { fontSize: 28, marginBottom: 6 },
  achievementEmojiLocked: { opacity: 0.45 },
  achievementName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  achievementNameLocked: { color: Colors.textLight },
  achievementCondition: {
    fontSize: 9,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 12,
  },

  // Settings nav rows
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  settingDesc:  { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  // Admin
  adminBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.text,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  adminBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  // Logout
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#FEE2E2',
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    ...Shadow.card,
  },
  logoutBtnText: { color: Colors.error, fontWeight: '800', fontSize: 16 },

  version: {
    textAlign: 'center',
    color: Colors.textLight,
    fontSize: 12,
    marginTop: 18,
  },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: Radius.xl,
    padding: 28,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    ...Shadow.heavy,
  },
  modalEmoji:   { fontSize: 48, marginBottom: 16 },
  modalTitle:   { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  modalText:    { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', backgroundColor: '#F9FAFB',
  },
  modalCancelText:  { color: Colors.text, fontWeight: '700', fontSize: 15 },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 13,
    borderRadius: Radius.md,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  modalConfirmText: { color: 'white', fontWeight: '700', fontSize: 15 },
})
