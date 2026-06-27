// ============================================================
// ReminderSettingsScreen
// ============================================================

import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, Switch, TouchableOpacity,
  ScrollView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '../../store'
import {
  loadReminderSettings,
  saveReminderSettings,
} from '../../store/slices/notificationSlice'
import { notificationService, type ReminderSettings } from '../../services/notifications/notificationService'

const DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
]

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const ReminderSettingsScreen: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { reminderSettings, loading } = useSelector((s: RootState) => s.notifications)

  const [settings, setSettings] = useState<ReminderSettings>(reminderSettings)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    dispatch(loadReminderSettings())
  }, [])

  useEffect(() => {
    setSettings(reminderSettings)
  }, [reminderSettings])

  const save = async (next: ReminderSettings) => {
    setSettings(next)
    try {
      await dispatch(saveReminderSettings(next)).unwrap()
      Alert.alert('Saved', 'Your reminder settings have been updated.')
    } catch {
      Alert.alert('Error', 'Could not save reminder settings. Please try again.')
    }
  }

  const toggleEnabled = (v: boolean) => save({ ...settings, enabled: v })

  const onTimeChange = (_: any, selected?: Date) => {
    setShowTimePicker(false)
    if (!selected) return
    const h = selected.getHours().toString().padStart(2, '0')
    const m = selected.getMinutes().toString().padStart(2, '0')
    save({ ...settings, time: `${h}:${m}` })
  }

  const toggleDay = (id: string) => {
    const days = settings.days.includes(id)
      ? settings.days.filter(d => d !== id)
      : [...settings.days, id].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    save({ ...settings, days })
  }

  const setFrequency = (f: ReminderSettings['frequency']) => save({ ...settings, frequency: f })

  const sendTest = async () => {
    setSending(true)
    await notificationService.sendLocalNotification({
      id: `test_${Date.now()}`,
      title: '🔔 Test Reminder',
      body: 'EnglishMitraAI is ready to help you practice English!',
      category: 'reminder',
      priority: 'high',
    })
    setSending(false)
    Alert.alert('Sent!', 'Check your notification tray.')
  }

  const fmt12h = (time: string) => {
    const [hh, mm] = time.split(':').map(Number)
    const ampm = hh >= 12 ? 'PM' : 'AM'
    return `${hh % 12 || 12}:${mm.toString().padStart(2, '0')} ${ampm}`
  }

  const timeDate = (() => {
    const d = new Date()
    const [h, m] = settings.time.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d
  })()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Reminder Settings</Text>
      <Text style={styles.subheading}>Stay consistent with daily learning reminders</Text>

      {/* Enable toggle */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="alarm-outline" size={24} color="#7B61FF" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.rowTitle}>Daily Reminders</Text>
              <Text style={styles.rowSub}>Get notified to practice English each day</Text>
            </View>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: '#D1D5DB', true: '#7B61FF' }}
            thumbColor="white"
            disabled={loading}
          />
        </View>
      </View>

      {settings.enabled && (
        <>
          {/* Time */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Reminder Time</Text>
            <TouchableOpacity style={styles.timePicker} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={22} color="#7B61FF" />
              <Text style={styles.timeText}>{fmt12h(settings.time)}</Text>
              <Ionicons name="chevron-down" size={18} color="#999" />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
              />
            )}
          </View>

          {/* Days */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Repeat On</Text>
            <View style={styles.daysRow}>
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.dayBtn, settings.days.includes(d.id) && styles.dayBtnOn]}
                  onPress={() => toggleDay(d.id)}
                >
                  <Text style={[styles.dayText, settings.days.includes(d.id) && styles.dayTextOn]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {(['daily', 'weekdays', 'custom'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqBtn, settings.frequency === f && styles.freqBtnOn]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.freqText, settings.frequency === f && styles.freqTextOn]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Test */}
          <TouchableOpacity style={styles.testBtn} onPress={sendTest} disabled={sending}>
            {sending
              ? <ActivityIndicator color="white" />
              : <>
                  <Ionicons name="megaphone-outline" size={18} color="white" />
                  <Text style={styles.testBtnText}>Send Test Notification</Text>
                </>
            }
          </TouchableOpacity>
        </>
      )}

      <View style={styles.tip}>
        <Text style={styles.tipText}>
          💡 Tip: Consistent daily practice — even just 5 minutes — leads to rapid improvement.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: 20, paddingBottom: 48 },
  heading: { fontSize: 26, fontWeight: '700', color: '#2D3436' },
  subheading: { fontSize: 15, color: '#636E72', marginTop: 4, marginBottom: 24 },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  cardLabel: { fontSize: 14, fontWeight: '600', color: '#636E72', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '500', color: '#2D3436' },
  rowSub: { fontSize: 13, color: '#999', marginTop: 2 },
  timePicker: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F0FF', padding: 14, borderRadius: 12,
  },
  timeText: { flex: 1, fontSize: 20, color: '#2D3436', marginLeft: 10, fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: '#F5F6F8', borderRadius: 20,
  },
  dayBtnOn: { backgroundColor: '#7B61FF' },
  dayText: { fontSize: 13, color: '#636E72' },
  dayTextOn: { color: 'white', fontWeight: '600' },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqBtn: {
    flex: 1, paddingVertical: 10, backgroundColor: '#F5F6F8',
    borderRadius: 12, alignItems: 'center',
  },
  freqBtnOn: { backgroundColor: '#7B61FF' },
  freqText: { fontSize: 13, color: '#636E72', fontWeight: '500' },
  freqTextOn: { color: 'white' },
  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FF6B35', padding: 16, borderRadius: 14, marginTop: 8,
  },
  testBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  tip: { marginTop: 24, padding: 16, backgroundColor: '#FFF5F0', borderRadius: 12 },
  tipText: { fontSize: 14, color: '#636E72', lineHeight: 22, textAlign: 'center' },
})
