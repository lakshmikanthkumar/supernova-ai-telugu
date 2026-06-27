import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { notificationService, type ReminderSettings, type NotificationHistoryItem } from '../../services/notifications/notificationService'

// ── State ─────────────────────────────────────────────────────

export interface NotificationState {
  pushToken: string | null
  reminderSettings: ReminderSettings
  history: NotificationHistoryItem[]
  unreadCount: number
  loading: boolean
  error: string | null
}

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  time: '09:00',
  days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  frequency: 'daily',
}

const initialState: NotificationState = {
  pushToken: null,
  reminderSettings: DEFAULT_REMINDER,
  history: [],
  unreadCount: 0,
  loading: false,
  error: null,
}

// ── Async thunks ──────────────────────────────────────────────

export const loadReminderSettings = createAsyncThunk(
  'notifications/loadSettings',
  () => notificationService.getReminderSettings()
)

export const saveReminderSettings = createAsyncThunk(
  'notifications/saveSettings',
  async (settings: ReminderSettings) => {
    const ok = await notificationService.setDailyReminder(settings)
    if (!ok) throw new Error('Failed to schedule reminder')
    return settings
  }
)

export const loadNotificationHistory = createAsyncThunk(
  'notifications/loadHistory',
  () => notificationService.getNotificationHistory()
)

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id: string) => {
    await notificationService.markRead(id)
    return id
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async () => {
    await notificationService.markAllRead()
  }
)

// ── Slice ─────────────────────────────────────────────────────

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setPushToken(state, action: PayloadAction<string | null>) {
      state.pushToken = action.payload
    },
    addHistoryItem(state, action: PayloadAction<NotificationHistoryItem>) {
      state.history.unshift(action.payload)
      if (!action.payload.read) state.unreadCount += 1
    },
    clearHistory(state) {
      state.history = []
      state.unreadCount = 0
    },
  },
  extraReducers: (builder) => {
    builder
      // Load settings
      .addCase(loadReminderSettings.fulfilled, (state, action) => {
        state.reminderSettings = action.payload
      })
      // Save settings
      .addCase(saveReminderSettings.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveReminderSettings.fulfilled, (state, action) => {
        state.loading = false
        state.reminderSettings = action.payload
      })
      .addCase(saveReminderSettings.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to save'
      })
      // History
      .addCase(loadNotificationHistory.fulfilled, (state, action) => {
        state.history = action.payload
        state.unreadCount = action.payload.filter(n => !n.read).length
      })
      // Mark read
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.history.find(n => n.id === action.payload)
        if (item && !item.read) {
          item.read = true
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      // Mark all read
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.history.forEach(n => { n.read = true })
        state.unreadCount = 0
      })
  },
})

export const { setPushToken, addHistoryItem, clearHistory } = notificationSlice.actions
export default notificationSlice.reducer
