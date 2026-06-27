// ============================================================
// EnglishMitraAI - Background Fetch Service
// Runs a lightweight check every ~15 min (OS-scheduled).
// Sends personalized reminder if user hasn't practiced today.
// Must be registered before the first render (e.g. in _layout).
// ============================================================

import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'
import { notificationService } from './notificationService'

export const BG_TASK_NAME = 'ENGLISHMITRA_BG_REMINDER'

// ── Task definition (must be at module top level) ─────────────

TaskManager.defineTask(BG_TASK_NAME, async () => {
  try {
    const enabled = await AsyncStorage.getItem('@englishmitra:bg_notifications_enabled')
    if (enabled !== 'true') return BackgroundFetch.BackgroundFetchResult.NoData

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return BackgroundFetch.BackgroundFetchResult.NoData

    const payload = await notificationService.getPersonalizedNotification(user.id)
    if (!payload) return BackgroundFetch.BackgroundFetchResult.NoData

    await notificationService.sendLocalNotification(payload)
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch (err) {
    console.error('[BG] Task error:', err)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

// ── Service class ─────────────────────────────────────────────

class BackgroundNotificationService {
  private _registered = false

  async register(): Promise<void> {
    if (this._registered) return
    try {
      const status = await BackgroundFetch.getStatusAsync()
      if (
        status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
        status === BackgroundFetch.BackgroundFetchStatus.Denied
      ) {
        console.warn('[BG] Background fetch is restricted/denied on this device')
        return
      }

      await BackgroundFetch.registerTaskAsync(BG_TASK_NAME, {
        minimumInterval: 15 * 60,  // 15 minutes (OS may delay further)
        stopOnTerminate: false,
        startOnBoot: true,
      })

      this._registered = true
      await AsyncStorage.setItem('@englishmitra:bg_notifications_enabled', 'true')
      console.log('[BG] Background task registered')
    } catch (err) {
      // Task may already be registered — not a critical error
      console.warn('[BG] Register warning:', err)
      this._registered = true
    }
  }

  async unregister(): Promise<void> {
    try {
      await BackgroundFetch.unregisterTaskAsync(BG_TASK_NAME)
      this._registered = false
      await AsyncStorage.setItem('@englishmitra:bg_notifications_enabled', 'false')
    } catch {}
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem('@englishmitra:bg_notifications_enabled', enabled ? 'true' : 'false')
  }

  async getStatus(): Promise<{
    registered: boolean
    status: BackgroundFetch.BackgroundFetchStatus | null
    enabled: boolean
  }> {
    try {
      const [status, isRegistered, enabledRaw] = await Promise.all([
        BackgroundFetch.getStatusAsync(),
        TaskManager.isTaskRegisteredAsync(BG_TASK_NAME),
        AsyncStorage.getItem('@englishmitra:bg_notifications_enabled'),
      ])
      return { registered: isRegistered, status, enabled: enabledRaw === 'true' }
    } catch {
      return { registered: false, status: null, enabled: false }
    }
  }
}

export const backgroundService = new BackgroundNotificationService()
