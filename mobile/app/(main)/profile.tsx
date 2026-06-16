import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useAppDispatch, useAppSelector } from '../../src/hooks/useStore'
import { updateProfile } from '../../src/store/slices/authSlice'
import { authService } from '../../src/services/api'
import { clearAuth } from '../../src/store/slices/authSlice'

export default function ProfileScreen() {
  const dispatch = useAppDispatch()
  const { profile } = useAppSelector(s => s.auth)
  const { showTeluguTranslations } = useAppSelector(s => s.ui)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [dailyGoal, setDailyGoal] = useState(profile?.daily_goal_minutes?.toString() || '15')

  const handleSave = async () => {
    if (!profile) return
    await dispatch(updateProfile({
      userId: profile.id,
      updates: { full_name: name, daily_goal_minutes: parseInt(dailyGoal) },
    }))
    setEditing(false)
    Alert.alert('Saved!', 'Profile updated successfully.')
  }

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await authService.signOut()
          dispatch(clearAuth())
          router.replace('/auth/login')
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() || '👤'}</Text>
          </View>
          <Text style={styles.profileName}>{profile?.full_name || 'English Learner'}</Text>
          <Text style={styles.profilePhone}>{profile?.phone_number}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Level {profile?.current_level} • {profile?.xp_total} XP</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Edit Profile */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Settings</Text>
            <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
              <Text style={styles.editBtn}>{editing ? 'Save ✓' : 'Edit ✏️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editing ? (
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} />
            ) : (
              <Text style={styles.fieldValue}>{profile?.full_name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Daily Goal (minutes)</Text>
            {editing ? (
              <TextInput style={styles.fieldInput} value={dailyGoal} onChangeText={setDailyGoal} keyboardType="numeric" />
            ) : (
              <Text style={styles.fieldValue}>{profile?.daily_goal_minutes} minutes/day</Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Stats</Text>
          <View style={styles.statsGrid}>
            <StatItem label="Streak" value={`${profile?.streak_current || 0}d`} emoji="🔥" />
            <StatItem label="Longest" value={`${profile?.streak_longest || 0}d`} emoji="🏆" />
            <StatItem label="Level" value={`${profile?.current_level || 1}`} emoji="⭐" />
            <StatItem label="XP Total" value={`${profile?.xp_total || 0}`} emoji="⚡" />
          </View>
        </View>

        {/* Admin */}
        {profile?.is_admin && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
              <Text style={styles.adminBtnText}>⚙️ Admin Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutBtnText}>Sign Out 👋</Text>
          </TouchableOpacity>
          <Text style={styles.version}>EnglishMitraAI v1.0.0 • by TechDoQuest</Text>
        </View>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 52, paddingBottom: 32, alignItems: 'center' },
  avatarContainer: { alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'white' },
  avatarText: { fontSize: 36, fontWeight: '800', color: 'white' },
  profileName: { fontSize: 22, fontWeight: '800', color: 'white' },
  profilePhone: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  levelBadgeText: { color: 'white', fontWeight: '700', fontSize: 13 },
  content: { flex: 1 },
  section: { margin: 16, backgroundColor: 'white', borderRadius: 16, padding: 16, elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  editBtn: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  field: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  fieldLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  fieldValue: { fontSize: 16, color: '#111827' },
  fieldInput: { fontSize: 16, color: '#111827', borderBottomWidth: 2, borderBottomColor: '#4F46E5', paddingVertical: 4 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12 },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  adminBtn: { backgroundColor: '#1F2937', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  adminBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  signOutBtn: { backgroundColor: '#FEE2E2', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  signOutBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 16 },
  version: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 12 },
})
