import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface Props { streak: number }

export default function StreakBadge({ streak }: Props) {
  const getFlameColor = () => {
    if (streak >= 30) return ['#FF6B35', '#FF4500']
    if (streak >= 7) return ['#FCD34D', '#F59E0B']
    return ['#FDE68A', '#D97706']
  }

  return (
    <View style={[styles.container, streak > 0 ? styles.active : styles.inactive]}>
      <Text style={styles.flame}>{streak >= 7 ? '🔥' : '🕯️'}</Text>
      <Text style={[styles.count, streak > 0 ? styles.countActive : styles.countInactive]}>
        {streak}
      </Text>
      <Text style={styles.label}>Day Streak</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  active: { backgroundColor: '#FFF7ED', borderTopWidth: 3, borderTopColor: '#F59E0B' },
  inactive: { backgroundColor: 'white', borderTopWidth: 3, borderTopColor: '#E5E7EB' },
  flame: { fontSize: 20, marginBottom: 4 },
  count: { fontSize: 20, fontWeight: '800' },
  countActive: { color: '#F59E0B' },
  countInactive: { color: '#9CA3AF' },
  label: { fontSize: 11, color: '#6B7280', marginTop: 2 },
})
