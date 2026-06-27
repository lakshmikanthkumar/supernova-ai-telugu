// ============================================================
// EnglishMitraAI - Notification Service
// Handles: push token registration, local scheduling,
// smart reminders, in-app history, and deep-link routing.
// ============================================================

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'

// ── Handler (must be called before any notification fires) ────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ── Types ─────────────────────────────────────────────────────

export interface NotificationPayload {
  id: string
  title: string
  body: string
  data?: Record<string, any>
  sound?: string
  priority?: 'high' | 'default' | 'low'
  category?: 'reminder' | 'achievement' | 'streak' | 'daily' | 'weekly'
}

export interface ReminderSettings {
  enabled: boolean
  time: string          // "HH:MM" 24h
  days: string[]        // ['mon','tue',...]
  frequency: 'daily' | 'weekdays' | 'custom'
}

export interface NotificationHistoryItem {
  id: string
  title: string
  body: string
  category?: string
  timestamp: string
  read: boolean
}

// ── Storage keys ──────────────────────────────────────────────

const KEYS = {
  PUSH_TOKEN:      '@englishmitra:push_token',
  REMINDER:        '@englishmitra:reminder_settings',
  REMINDER_ID:     '@englishmitra:daily_reminder_id',
  HISTORY:         '@englishmitra:notification_history',
  NAV_PENDING:     '@englishmitra:pending_navigation',
}

// ── Default reminder ──────────────────────────────────────────

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '09:00',
  days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  frequency: 'daily',
}

// ── Android channels ─────────────────────────────────────────

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return
  await Promise.all([
    Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7B61FF',
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync('achievements', {
      name: 'Achievements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 500],
      lightColor: '#F7931E',
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    }),
  ])
}

// ── NotificationService ───────────────────────────────────────

class NotificationService {
  private _pushToken: string | null = null
  private _notifListener: Notifications.EventSubscription | null = null
  private _responseListener: Notifications.EventSubscription | null = null
  private _initialized = false

  // ── Init ─────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this._initialized) return
    this._initialized = true

    await ensureAndroidChannels()
    await this._registerForPush()
    this._setupListeners()
    await this._handleLaunchNotification()
  }

  // ── Push registration ─────────────────────────────────────

  private async _registerForPush(): Promise<void> {
    if (!Device.isDevice) {
      console.log('[Notif] Push tokens require a physical device')
      return
    }

    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notif] Push permission denied')
      return
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
      this._pushToken = tokenData.data
      await AsyncStorage.setItem(KEYS.PUSH_TOKEN, this._pushToken)
      await this._savePushTokenToSupabase(this._pushToken)
    } catch (err) {
      console.warn('[Notif] Failed to get push token:', err)
    }
  }

  private async _savePushTokenToSupabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase.from('user_devices').upsert(
        {
          user_id: user.id,
          device_token: token,
          device_type: Platform.OS,
          device_name: Device.deviceName ?? 'Unknown',
          last_active: new Date().toISOString(),
          active: true,
        },
        { onConflict: 'user_id,device_token' }
      )
    } catch (err) {
      console.warn('[Notif] Token save failed:', err)
    }
  }

  // ── Listeners ─────────────────────────────────────────────

  private _setupListeners(): void {
    this._notifListener = Notifications.addNotificationReceivedListener((notif) => {
      const { title, body } = notif.request.content
      this._appendHistory({
        id: notif.request.identifier,
        title: title ?? '',
        body: body ?? '',
        category: (notif.request.content.data?.category as string) ?? 'general',
        timestamp: new Date().toISOString(),
        read: false,
      })
    })

    this._responseListener = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data ?? {}
      this._storePendingNavigation(data.action as string, data)
    })
  }

  private async _handleLaunchNotification(): Promise<void> {
    const last = await Notifications.getLastNotificationResponseAsync()
    if (last) {
      const data = last.notification.request.content.data ?? {}
      this._storePendingNavigation(data.action as string, data)
    }
  }

  // ── Local notification ────────────────────────────────────

  async sendLocalNotification(
    payload: NotificationPayload,
    scheduleAt?: Date
  ): Promise<string | null> {
    try {
      const channelId =
        payload.category === 'achievement' ? 'achievements' :
        payload.category === 'reminder' || payload.category === 'streak' ? 'reminders' :
        'default'

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
          sound: 'default',
        },
        trigger: scheduleAt
          ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: scheduleAt, channelId }
          : null,
      })

      await this._appendHistory({
        id,
        title: payload.title,
        body: payload.body,
        category: payload.category,
        timestamp: new Date().toISOString(),
        read: false,
      })

      return id
    } catch (err) {
      console.error('[Notif] sendLocalNotification error:', err)
      return null
    }
  }

  // ── Daily reminder scheduling ─────────────────────────────

  async setDailyReminder(settings: ReminderSettings): Promise<boolean> {
    try {
      await AsyncStorage.setItem(KEYS.REMINDER, JSON.stringify(settings))
      await this.cancelDailyReminder()

      if (!settings.enabled) return true

      const [h, m] = settings.time.split(':').map(Number)
      const now = new Date()
      const trigger = new Date(now)
      trigger.setHours(h, m, 0, 0)
      if (trigger <= now) trigger.setDate(trigger.getDate() + 1)

      const streak = await this._getStreakCount()

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Time to Practice English!',
          body: streak > 0
            ? `You're on a ${streak}-day streak 🔥 Keep it going!`
            : "Practice a little English today — every minute counts!",
          data: { action: 'daily_challenge', category: 'reminder' },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: h,
          minute: m,
          channelId: 'reminders',
        },
      })

      await AsyncStorage.setItem(KEYS.REMINDER_ID, id)
      return true
    } catch (err) {
      console.error('[Notif] setDailyReminder error:', err)
      return false
    }
  }

  async cancelDailyReminder(): Promise<void> {
    const id = await AsyncStorage.getItem(KEYS.REMINDER_ID)
    if (id) {
      try { await Notifications.cancelScheduledNotificationAsync(id) } catch {}
      await AsyncStorage.removeItem(KEYS.REMINDER_ID)
    }
  }

  async getReminderSettings(): Promise<ReminderSettings> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.REMINDER)
      return raw ? JSON.parse(raw) : DEFAULT_REMINDER
    } catch {
      return DEFAULT_REMINDER
    }
  }

  // ── Smart / personalized notification ────────────────────

  async getPersonalizedNotification(userId: string): Promise<NotificationPayload | null> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak, xp, level')
        .eq('id', userId)
        .single()

      const streak: number = profile?.streak ?? 0
      const xp: number = profile?.xp ?? 0

      // Streak protection (last 4 hours of the day)
      const now = new Date()
      if (now.getHours() >= 20 && streak > 0) {
        return {
          id: `streak_${Date.now()}`,
          title: '🔥 Streak at Risk!',
          body: `Only a few hours left! Practice now to protect your ${streak}-day streak.`,
          category: 'streak',
          priority: 'high',
          data: { action: 'daily_challenge' },
        }
      }

      if (xp < 50) {
        return {
          id: `welcome_${Date.now()}`,
          title: 'Let\'s Get Started! 🌟',
          body: 'Complete your first lesson and earn XP. Your English journey begins today!',
          category: 'daily',
          priority: 'default',
          data: { action: 'open_app' },
        }
      }

      return {
        id: `encourage_${Date.now()}`,
        title: '📚 Daily Practice Time!',
        body: 'A few minutes of English practice every day makes a big difference.',
        category: 'reminder',
        priority: 'default',
        data: { action: 'open_app' },
      }
    } catch {
      return null
    }
  }

  // ── Streak count ──────────────────────────────────────────

  private async _getStreakCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0
      const { data } = await supabase.from('profiles').select('streak').eq('id', user.id).single()
      return data?.streak ?? 0
    } catch {
      return 0
    }
  }

  // ── Notification history ──────────────────────────────────

  private async _appendHistory(item: NotificationHistoryItem): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.HISTORY)
      const list: NotificationHistoryItem[] = raw ? JSON.parse(raw) : []
      list.unshift(item)
      if (list.length > 100) list.splice(100)
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(list))
    } catch {}
  }

  async getNotificationHistory(): Promise<NotificationHistoryItem[]> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.HISTORY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  async markRead(id: string): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.HISTORY)
      if (!raw) return
      const list: NotificationHistoryItem[] = JSON.parse(raw)
      const updated = list.map(n => n.id === id ? { ...n, read: true } : n)
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated))
    } catch {}
  }

  async markAllRead(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.HISTORY)
      if (!raw) return
      const list: NotificationHistoryItem[] = JSON.parse(raw)
      const updated = list.map(n => ({ ...n, read: true }))
      await AsyncStorage.setItem(KEYS.HISTORY, JSON.stringify(updated))
    } catch {}
  }

  async getUnreadCount(): Promise<number> {
    const list = await this.getNotificationHistory()
    return list.filter(n => !n.read).length
  }

  // ── Achievement unlock notification ───────────────────────

  async notifyAchievementUnlocked(name: string, xpReward: number): Promise<void> {
    await this.sendLocalNotification({
      id: `ach_${Date.now()}`,
      title: '🏆 Achievement Unlocked!',
      body: `You earned "${name}" and ${xpReward} XP!`,
      category: 'achievement',
      priority: 'high',
      data: { action: 'view_achievement' },
    })
  }

  // ── Streak milestone notification ─────────────────────────

  async notifyStreakMilestone(streak: number): Promise<void> {
    if (streak % 7 !== 0) return
    await this.sendLocalNotification({
      id: `streak_milestone_${streak}`,
      title: `🔥 ${streak}-Day Streak!`,
      body: `Amazing! You've practiced English for ${streak} days in a row. Keep it up!`,
      category: 'streak',
      priority: 'high',
      data: { action: 'streak' },
    })
  }

  // ── Pending navigation ────────────────────────────────────

  private async _storePendingNavigation(action: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.NAV_PENDING, JSON.stringify({ action: action ?? 'open_app', data }))
    } catch {}
  }

  async consumePendingNavigation(): Promise<{ action: string; data: any } | null> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.NAV_PENDING)
      if (!raw) return null
      await AsyncStorage.removeItem(KEYS.NAV_PENDING)
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  // ── Push token access ─────────────────────────────────────

  getPushToken(): string | null {
    return this._pushToken
  }

  // ── Cleanup ───────────────────────────────────────────────

  cleanup(): void {
    this._notifListener?.remove()
    this._responseListener?.remove()
  }
}

export const notificationService = new NotificationService()
