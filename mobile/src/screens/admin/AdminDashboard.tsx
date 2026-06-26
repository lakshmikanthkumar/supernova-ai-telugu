import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { adminService } from '../../services/api'
import { useAppSelector } from '../../hooks/useStore'
import type { Profile, Lesson } from '../../types'

interface Stats { totalUsers: number; totalLessons: number; totalChatSessions: number }

export default function AdminDashboard() {
  const { profile } = useAppSelector(s => s.auth)
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'lessons'>('stats')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.is_admin) {
      router.replace('/home')
      return
    }
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, usersData] = await Promise.all([
        adminService.getStats(),
        adminService.getAllUsers(20),
      ])
      setStats(statsData)
      setUsers(usersData)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLesson = (lessonId: string) => {
    Alert.alert('Delete Lesson', 'Are you sure you want to deactivate this lesson?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await adminService.deleteLesson(lessonId)
          setLessons(l => l.filter(lesson => lesson.id !== lessonId))
        },
      },
    ])
  }

  if (!profile?.is_admin) return null

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1F2937', '#374151']} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>EnglishMitraAI Management</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['stats', 'users', 'lessons'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'stats' ? '📊 Stats' : tab === 'users' ? '👥 Users' : '📚 Lessons'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'stats' && stats && (
            <View style={styles.tabContent}>
              <View style={styles.statsGrid}>
                <AdminStatCard label="Total Users" value={stats.totalUsers} emoji="👥" color="#7B61FF" />
                <AdminStatCard label="Total Lessons" value={stats.totalLessons} emoji="📚" color="#00D26A" />
                <AdminStatCard label="Chat Sessions" value={stats.totalChatSessions} emoji="💬" color="#D97706" />
                <AdminStatCard label="Active Today" value={0} emoji="⚡" color="#00D26A" />
              </View>

              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsList}>
                <AdminActionButton emoji="➕" title="Add New Lesson" onPress={() => router.push('/admin/add-lesson')} />
                <AdminActionButton emoji="🎯" title="Create Daily Challenge" onPress={() => {}} />
                <AdminActionButton emoji="📊" title="Export User Data" onPress={() => {}} />
                <AdminActionButton emoji="🔔" title="Send Push Notification" onPress={() => {}} />
              </View>
            </View>
          )}

          {activeTab === 'users' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Recent Users ({users.length})</Text>
              {users.map(user => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{user.full_name?.charAt(0) || '?'}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.full_name || 'Unknown User'}</Text>
                    <Text style={styles.userPhone}>{user.phone_number}</Text>
                    <Text style={styles.userStats}>
                      Lv.{user.current_level} • ⚡{user.xp_total} XP • 🔥{user.streak_current}d
                    </Text>
                  </View>
                  {user.is_admin && (
                    <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Admin</Text></View>
                  )}
                </View>
              ))}
            </View>
          )}

          {activeTab === 'lessons' && (
            <View style={styles.tabContent}>
              <View style={styles.addLessonRow}>
                <Text style={styles.sectionTitle}>Manage Lessons</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/admin/add-lesson')}>
                  <Text style={styles.addBtnText}>+ Add Lesson</Text>
                </TouchableOpacity>
              </View>
              {lessons.map(lesson => (
                <View key={lesson.id} style={styles.lessonAdminCard}>
                  <View style={styles.lessonAdminInfo}>
                    <Text style={styles.lessonAdminTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonAdminMeta}>
                      ⭐{lesson.difficulty_level} • ⚡{lesson.xp_reward} XP • {lesson.estimated_minutes}min
                    </Text>
                  </View>
                  <View style={styles.lessonAdminActions}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => router.push({ pathname: '/admin/add-lesson', params: { id: lesson.id } })}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteLesson(lesson.id)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  )
}

function AdminStatCard({ label, value, emoji, color }: { label: string; value: number; emoji: string; color: string }) {
  return (
    <View style={[styles.adminStat, { borderLeftColor: color }]}>
      <Text style={styles.adminStatEmoji}>{emoji}</Text>
      <Text style={[styles.adminStatValue, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.adminStatLabel}>{label}</Text>
    </View>
  )
}

function AdminActionButton({ emoji, title, onPress }: { emoji: string; title: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonEmoji}>{emoji}</Text>
      <Text style={styles.actionButtonText}>{title}</Text>
      <Text style={styles.actionButtonArrow}>→</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
  backBtn: { color: 'white', fontSize: 24, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  tabRow: { flexDirection: 'row', backgroundColor: 'white', elevation: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#7B61FF' },
  tabText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#7B61FF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  adminStat: { width: '47%', backgroundColor: 'white', borderRadius: 14, padding: 16, borderLeftWidth: 4, elevation: 3 },
  adminStatEmoji: { fontSize: 24, marginBottom: 8 },
  adminStatValue: { fontSize: 28, fontWeight: '900' },
  adminStatLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  actionsList: { gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 16, gap: 12, elevation: 2 },
  actionButtonEmoji: { fontSize: 22 },
  actionButtonText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  actionButtonArrow: { fontSize: 18, color: '#9CA3AF' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, elevation: 2 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 20, fontWeight: '700', color: '#7B61FF' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  userPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  userStats: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  adminBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  adminBadgeText: { fontSize: 11, color: '#7B61FF', fontWeight: '700' },
  addLessonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addBtn: { backgroundColor: '#7B61FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  lessonAdminCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, elevation: 2 },
  lessonAdminInfo: { flex: 1 },
  lessonAdminTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  lessonAdminMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  lessonAdminActions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#7B61FF', fontWeight: '600', fontSize: 12 },
  deleteBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { color: '#EF4444', fontWeight: '600', fontSize: 12 },
})
