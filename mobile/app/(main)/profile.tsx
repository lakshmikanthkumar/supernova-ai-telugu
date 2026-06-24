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
import { Theme } from '../../src/theme'
import { User, Edit2, Check, Flame, Trophy, Star, Zap, Settings, LogOut, ShieldAlert } from 'lucide-react-native'

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
      <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {profile?.full_name ? (
              <Text style={styles.avatarText}>{profile.full_name.charAt(0).toUpperCase()}</Text>
            ) : (
              <User size={40} color={Theme.colors.text} strokeWidth={2} />
            )}
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
            <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} style={styles.editBtnRow}>
              {editing ? (
                <>
                  <Text style={styles.editBtn}>Save</Text>
                  <Check size={16} color={Theme.colors.secondary} style={{ marginLeft: 4 }} />
                </>
              ) : (
                <>
                  <Text style={styles.editBtn}>Edit</Text>
                  <Edit2 size={16} color={Theme.colors.secondary} style={{ marginLeft: 4 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {editing ? (
              <TextInput style={styles.fieldInput} value={name} onChangeText={setName} placeholderTextColor={Theme.colors.textSecondary} />
            ) : (
              <Text style={styles.fieldValue}>{profile?.full_name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Daily Goal (minutes)</Text>
            {editing ? (
              <TextInput style={styles.fieldInput} value={dailyGoal} onChangeText={setDailyGoal} keyboardType="numeric" placeholderTextColor={Theme.colors.textSecondary} />
            ) : (
              <Text style={styles.fieldValue}>{profile?.daily_goal_minutes} minutes/day</Text>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Stats</Text>
          <View style={styles.statsGrid}>
            <StatItem label="Streak" value={`${profile?.streak_current || 0}d`} Icon={Flame} color="#FF5722" />
            <StatItem label="Longest" value={`${profile?.streak_longest || 0}d`} Icon={Trophy} color="#FFD700" />
            <StatItem label="Level" value={`${profile?.current_level || 1}`} Icon={Star} color="#00C2FF" />
            <StatItem label="XP Total" value={`${profile?.xp_total || 0}`} Icon={Zap} color={Theme.colors.accent} />
          </View>
        </View>

        {/* Admin */}
        {profile?.is_admin && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
              <Settings size={20} color={Theme.colors.text} style={{ marginRight: 8 }} />
              <Text style={styles.adminBtnText}>Admin Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut size={20} color={Theme.colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.version}>EnglishMitraAI v1.0.0 • by TechDoQuest</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {showConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ShieldAlert size={48} color={Theme.colors.error} style={{ marginBottom: 16 }} />
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

function StatItem({ label, value, Icon, color }: { label: string; value: string; Icon: any; color: string }) {
  return (
    <View style={styles.statItem}>
      <Icon size={24} color={color} strokeWidth={2} style={{ marginBottom: 6 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: { paddingTop: 52, paddingBottom: 32, alignItems: 'center' },
  avatarContainer: { alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: Theme.colors.secondary, shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 5 },
  avatarText: { fontSize: 36, fontWeight: '800', color: Theme.colors.text },
  profileName: { fontSize: 22, fontWeight: '800', color: Theme.colors.text },
  profilePhone: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 4 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  levelBadgeText: { color: Theme.colors.text, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  content: { flex: 1, marginTop: -20 },
  section: { margin: 16, marginBottom: 8, backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 20, elevation: 3, borderWidth: 1, borderColor: Theme.colors.border },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, textTransform: 'uppercase', letterSpacing: 1 },
  editBtnRow: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { color: Theme.colors.secondary, fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },
  field: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  fieldLabel: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  fieldValue: { fontSize: 16, color: Theme.colors.text, fontWeight: '600' },
  fieldInput: { fontSize: 16, color: Theme.colors.text, borderBottomWidth: 2, borderBottomColor: Theme.colors.secondary, paddingVertical: 6 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Theme.colors.border },
  statValue: { fontSize: 18, fontWeight: '800', color: Theme.colors.text },
  statLabel: { fontSize: 11, color: Theme.colors.textSecondary, marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  adminBtn: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Theme.colors.border },
  adminBtnText: { color: Theme.colors.text, fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  signOutBtn: { backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  signOutBtnText: { color: Theme.colors.error, fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
  version: { textAlign: 'center', color: Theme.colors.textSecondary, fontSize: 12, marginTop: 16, fontStyle: 'italic' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Theme.colors.surface, borderRadius: 24, padding: 28, width: '85%', maxWidth: 400, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Theme.colors.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  modalText: { fontSize: 15, color: Theme.colors.textSecondary, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', gap: 14, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Theme.colors.border, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  modalCancelText: { color: Theme.colors.text, fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Theme.colors.error, alignItems: 'center' },
  modalConfirmText: { color: '#000', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },
})
