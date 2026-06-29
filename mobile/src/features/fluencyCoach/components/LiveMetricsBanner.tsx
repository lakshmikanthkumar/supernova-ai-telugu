// ============================================================
// Fluency Coach — Live Metrics Banner
// Shows WPM, accuracy, pauses in real time during reading.
// ============================================================

import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSelector } from 'react-redux'
import type { RootState } from '../../../store'
import { selectLiveStats } from '../redux/fluencyCoachSlice'
import { WPM_GOOD_MIN, WPM_GOOD_MAX, WPM_TOO_SLOW } from '../constants'

function wpmColor(wpm: number): string {
  if (wpm === 0)               return '#9CA3AF'
  if (wpm < WPM_TOO_SLOW)     return '#F44336'
  if (wpm <= WPM_GOOD_MAX)    return '#4CAF50'
  return '#FF9800'
}

function accuracyColor(acc: number): string {
  if (acc >= 90) return '#4CAF50'
  if (acc >= 70) return '#FF9800'
  return '#F44336'
}

interface MetricPillProps {
  label: string
  value: string
  color: string
  accessibilityLabel: string
}

const MetricPill = memo(({ label, value, color, accessibilityLabel }: MetricPillProps) => (
  <View style={styles.pill} accessibilityLabel={accessibilityLabel} accessible>
    <Text style={[styles.pillValue, { color }]}>{value}</Text>
    <Text style={styles.pillLabel}>{label}</Text>
  </View>
))
MetricPill.displayName = 'MetricPill'

export const LiveMetricsBanner = memo(() => {
  const { wpm, accuracy, pauses } = useSelector(selectLiveStats)

  return (
    <View style={styles.container} accessibilityRole="none" testID="live-metrics-banner">
      <MetricPill
        label="WPM"
        value={wpm > 0 ? String(wpm) : '--'}
        color={wpmColor(wpm)}
        accessibilityLabel={`Reading speed: ${wpm > 0 ? `${wpm} words per minute` : 'not measured yet'}`}
      />
      <View style={styles.divider} />
      <MetricPill
        label="Accuracy"
        value={accuracy > 0 ? `${accuracy}%` : '--'}
        color={accuracyColor(accuracy)}
        accessibilityLabel={`Accuracy: ${accuracy > 0 ? `${accuracy} percent` : 'not measured yet'}`}
      />
      <View style={styles.divider} />
      <MetricPill
        label="Pauses"
        value={String(pauses)}
        color={pauses > 3 ? '#FF9800' : '#4CAF50'}
        accessibilityLabel={`Pauses detected: ${pauses}`}
      />
    </View>
  )
})
LiveMetricsBanner.displayName = 'LiveMetricsBanner'

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  pill: {
    alignItems: 'center',
    minWidth: 56,
  },
  pillValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
})
