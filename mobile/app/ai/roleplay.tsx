import React, { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { roleplayService } from '../../src/services/api'
import type { RoleplayScenario } from '../../src/types'

const SCENARIO_ICONS: Record<string, string> = {
  interview: '💼', shopping: '🛒', travel: '✈️',
  office: '🏢', medical: '🏥', social: '👥',
  restaurant: '🍽️', phone_call: '📱',
}

export default function RoleplayScreen() {
  const [scenarios, setScenarios] = useState<RoleplayScenario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    roleplayService.getScenarios().then(s => { setScenarios(s); setLoading(false) })
  }, [])

  const handleScenario = (scenario: RoleplayScenario) => {
    router.push({ pathname: '/ai/chat', params: { scenarioId: scenario.id, mode: 'roleplay' } })
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#0891B2" /></View>

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891B2', '#0E7490']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎭 AI Roleplay</Text>
        <Text style={styles.headerSubtitle}>రియల్ సీన్ అభ్యాసం చేయండి</Text>
        <Text style={styles.headerDesc}>Practice real-life English scenarios with AI</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Choose a Scenario</Text>

        {scenarios.map(scenario => (
          <TouchableOpacity key={scenario.id} onPress={() => handleScenario(scenario)} activeOpacity={0.85}>
            <View style={styles.scenarioCard}>
              <View style={styles.scenarioLeft}>
                <View style={[styles.iconCircle, { backgroundColor: getColor(scenario.scenario_type) + '20' }]}>
                  <Text style={styles.icon}>{SCENARIO_ICONS[scenario.scenario_type] || '🎭'}</Text>
                </View>
                <View style={styles.scenarioInfo}>
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                  <Text style={styles.scenarioTitleTelugu}>{scenario.title_telugu}</Text>
                  <Text style={styles.scenarioDesc} numberOfLines={2}>{scenario.description}</Text>
                  <View style={styles.scenarioMeta}>
                    <Text style={styles.metaChip}>👤 {scenario.ai_persona}</Text>
                    <Text style={styles.metaChip}>⭐{''.repeat(scenario.difficulty_level)}{scenario.difficulty_level}</Text>
                    <Text style={styles.metaChip}>⚡ {scenario.xp_reward} XP</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.arrow}>→</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function getColor(type: string) {
  const colors: Record<string, string> = {
    interview: '#4F46E5', shopping: '#059669', travel: '#DC2626',
    office: '#0891B2', medical: '#DB2777', restaurant: '#D97706',
  }
  return colors[type] || '#6B7280'
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
  backBtn: { color: 'white', fontSize: 24, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  headerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  content: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', padding: 16, paddingBottom: 8 },
  scenarioCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08,
  },
  scenarioLeft: { flex: 1, flexDirection: 'row', gap: 14 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon: { fontSize: 26 },
  scenarioInfo: { flex: 1 },
  scenarioTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  scenarioTitleTelugu: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  scenarioDesc: { fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 18 },
  scenarioMeta: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  metaChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 11, color: '#6B7280' },
  arrow: { fontSize: 20, color: '#9CA3AF', marginLeft: 8 },
})
