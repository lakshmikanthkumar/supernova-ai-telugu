// ============================================================
// NotificationHistoryScreen
// ============================================================

import React, { useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { useFocusEffect } from '@react-navigation/native'
import { AppDispatch, RootState } from '../../store'
import {
  loadNotificationHistory,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../store/slices/notificationSlice'
import type { NotificationHistoryItem } from '../../services/notifications/notificationService'

const CATEGORY_ICON: Record<string, string> = {
  reminder:    'alarm-outline',
  achievement: 'trophy-outline',
  streak:      'flame-outline',
  daily:       'calendar-outline',
  weekly:      'calendar-outline',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export const NotificationHistoryScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { history, unreadCount, loading } = useSelector((s: RootState) => s.notifications)

  useFocusEffect(
    useCallback(() => {
      dispatch(loadNotificationHistory())
    }, [dispatch])
  )

  const onRefresh = () => dispatch(loadNotificationHistory())
  const markRead = (id: string) => dispatch(markNotificationRead(id))
  const markAll = () => dispatch(markAllNotificationsRead())

  const renderItem = ({ item }: { item: NotificationHistoryItem }) => {
    const icon = CATEGORY_ICON[item.category ?? ''] ?? 'notifications-outline'
    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.itemUnread]}
        onPress={() => markRead(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, !item.read && styles.iconBoxUnread]}>
          <Ionicons name={icon as any} size={22} color={item.read ? '#7B61FF' : '#7B61FF'} />
        </View>
        <View style={styles.itemBody}>
          <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>{item.title}</Text>
          <Text style={styles.itemText} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.itemTime}>{timeAgo(item.timestamp)}</Text>
        </View>
        {!item.read && <View style={styles.dot} />}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAll}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount} unread</Text>
        </View>
      )}

      <FlatList
        data={history}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={history.length === 0 ? styles.empty : styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        ListEmptyComponent={(
          <View style={styles.emptyBox}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              Reminders, achievements, and streak alerts will appear here.
            </Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#2D3436' },
  markAll: { color: '#7B61FF', fontSize: 14, fontWeight: '600' },
  badge: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#F5F0FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  badgeText: { color: '#7B61FF', fontSize: 13, fontWeight: '600' },
  list: { padding: 16 },
  empty: { flex: 1 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    marginBottom: 10, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  itemUnread: { borderLeftWidth: 4, borderLeftColor: '#7B61FF', backgroundColor: '#FAFAFE' },
  iconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#F5F0FF', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxUnread: { backgroundColor: '#EDE9FF' },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 15, color: '#2D3436', marginBottom: 2 },
  itemTitleUnread: { fontWeight: '700' },
  itemText: { fontSize: 13, color: '#636E72', lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#B2BEC3', marginTop: 4 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#7B61FF', marginLeft: 8,
  },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, marginTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#2D3436', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8, lineHeight: 22 },
})
