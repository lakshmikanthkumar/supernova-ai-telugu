import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import type { LessonCategory } from '../../types'


const ICON_MAP: Record<string, string> = {
  chat: '💬', briefcase: '💼', 'shopping-cart': '🛒', airplane: '✈️',
  heart: '❤️', 'book-open': '📖', utensils: '🍽️', smartphone: '📱',
  users: '👨‍👩‍👧', 'pen-tool': '✏️',
}

interface Props {
  category: LessonCategory
  onPress: () => void
}

export default function LessonCard({ category, onPress }: Props) {
  const icon = ICON_MAP[category.icon_name] || '📚'
  const colorDark = category.color_hex + 'DD'

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrapper}>
      <LinearGradient colors={[category.color_hex, colorDark]} style={styles.card}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.nameTelugu}>{category.name_telugu}</Text>
        {category.lesson_count != null && (
          <Text style={styles.count}>{category.lesson_count} lessons</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrapper: { width: '47%', borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
  card: { padding: 18, minHeight: 120, justifyContent: 'space-between' },
  icon: { fontSize: 32, marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '700', color: 'white', lineHeight: 20 },
  nameTelugu: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  count: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
})
