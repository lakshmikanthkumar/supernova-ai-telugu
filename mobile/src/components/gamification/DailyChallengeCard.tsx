import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { Target, Check, ArrowRight, Zap } from 'lucide-react-native'
import type { DailyChallenge } from '../../types'

interface Props { challenge: DailyChallenge }

export default function DailyChallengeCard({ challenge }: Props) {
  return (
    <TouchableOpacity onPress={() => router.push('/daily-challenge')} activeOpacity={0.85}>
      <LinearGradient
        colors={challenge.completed ? ['#6B7280', '#4B5563'] : ['#7C3AED', '#7B61FF']}
        style={styles.card}
      >
        <View style={styles.left}>
          <Target size={32} color='white' style={{marginRight: 14}} />
          <View>
            <Text style={styles.title}>{challenge.title}</Text>
            <Text style={styles.titleTelugu}>{challenge.title_telugu}</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Text style={styles.type}>{challenge.challenge_type} • </Text>
              <Zap size={12} color='rgba(255,255,255,0.7)' />
              <Text style={styles.type}> {challenge.xp_reward} XP</Text>
            </View>
          </View>
        </View>
        <View style={styles.right}>
          {challenge.completed ? (
            <View style={styles.completedBadge}>
              <Check size={14} color='white' style={{marginRight: 4}} />
              <Text style={styles.completedText}>Done!</Text>
            </View>
          ) : (
            <View style={styles.startBadge}>
              <Text style={styles.startText}>Start</Text>
              <ArrowRight size={14} color='#7B61FF' style={{marginLeft: 4}} />
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 6 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  emoji: { fontSize: 32 },
  title: { fontSize: 16, fontWeight: '700', color: 'white' },
  titleTelugu: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  type: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  right: {},
  completedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  completedText: { color: 'white', fontWeight: '700', fontSize: 13 },
  startBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  startText: { color: '#7B61FF', fontWeight: '700', fontSize: 13 },
})
