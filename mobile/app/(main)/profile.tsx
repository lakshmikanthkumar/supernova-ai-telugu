import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, Switch, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useAppDispatch, useAppSelector } from '../../src/hooks/useStore'
import { updateProfile } from '../../src/store/slices/authSlice'
import { authService } from '../../src/services/api'
import { clearAuth } from '../../src/store/slices/authSlice'

import AsyncStorage from '@react-native-async-storage/async-storage'

export default function ProfileScreen() {
  const dispatch = useAppDispatch()
  const { user, profile } = useAppSelector(s => s.auth)
  const { showTeluguTranslations } = useAppSelector(s => s.ui)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [dailyGoal, setDailyGoal] = useState(profile?.daily_goal_minutes?.toString() || '15')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  React.useEffect(() => {
    if (profile) {
      setName(profile.full_name || '')
      setDailyGoal(profile.daily_goal_minutes?.toString() || '15')
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile) return
    try {
      const resultAction = await dispatch(updateProfile({
        userId: profile.id,
        updates: { full_name: name, daily_goal_minutes: parseInt(dailyGoal) || 15 },
      }))

      if (updateProfile.fulfilled.match(resultAction)) {
        setEditing(false)
        if (Platform.OS === 'web') {
          alert('Profile updated successfully.')
        } else {
          Alert.alert('Saved!', 'Profile updated successfully.')
        }
      } else {
        const errorMsg = resultAction.error?.message || 'Failed to update profile.'
        if (Platform.OS === 'web') {
          alert('Error: ' + errorMsg)
        } else {
          Alert.alert('Error', errorMsg)
        }
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        alert('Error: ' + err.message)
      } else {
        Alert.alert('Error', err.message)
      }
    }
  }

  const performSignOut = async () => {
    await AsyncStorage.removeItem('is_guest_mode')
    await AsyncStorage.removeItem('@englishmitra:profile_v2')
    await authService.signOut()
    dispatch(clearAuth())
    router.replace('/login')
  }

  const handleSignOut = () => {
    setShowConfirmModal(true)
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() || '👤'}</Text>
          </View>
          <Text style={styles.profileName}>{profile?.full_name || 'English Learner'}</Text>
          <Text style={styles.profilePhone}>{user?.email || profile?.phone_number || ''}</Text>
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

      {showConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>👋</Text>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalText}>Are you sure you want to sign out of your account?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setShowConfirmModal(false)
                  performSignOut()
                }}
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  modalCancelText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 15,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
})
