import React, { useRef, useEffect } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'

const XP_LEVELS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000]

interface Props { xpTotal: number; level: number }

export default function XPCard({ xpTotal, level }: Props) {
  const progressAnim = useRef(new Animated.Value(0)).current

  const currentLevelXP = XP_LEVELS[level - 1] || 0
  const nextLevelXP = XP_LEVELS[level] || XP_LEVELS[XP_LEVELS.length - 1]
  const progress = Math.min((xpTotal - currentLevelXP) / (nextLevelXP - currentLevelXP), 1)
  const xpNeeded = nextLevelXP - xpTotal

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: progress, duration: 800, useNativeDriver: false }).start()
  }, [progress])

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.levelBadge}>Lv.{level}</Text>
        <Text style={styles.xpText}>⚡ {xpTotal.toLocaleString()} XP</Text>
        <Text style={styles.nextLevel}>{xpNeeded > 0 ? `${xpNeeded} to Lv.${level + 1}` : 'Max Level!'}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, fontSize: 12, fontWeight: '700' },
  xpText: { color: 'white', fontWeight: '700', fontSize: 14 },
  nextLevel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  track: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: '#FCD34D', borderRadius: 4 },
})
