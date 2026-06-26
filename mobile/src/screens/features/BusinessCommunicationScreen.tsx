import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Colors } from '../../constants/theme'

const PRIMARY = Colors.primary

interface Topic {
  id: string
  title: string
  icon: string
  description: string
  vocabulary: string[]
}

const TOPICS: Topic[] = [
  {
    id: 'meetings',
    title: 'Business Meetings',
    icon: '📅',
    description: 'Run and participate in professional meetings with confidence.',
    vocabulary: ['agenda', 'minutes', 'consensus', 'action items', 'follow-up'],
  },
  {
    id: 'negotiation',
    title: 'Negotiation',
    icon: '🤝',
    description: 'Negotiate deals and reach agreements effectively.',
    vocabulary: ['leverage', 'concession', 'counterofffer', 'win-win', 'deadline'],
  },
  {
    id: 'presentations',
    title: 'Presentations',
    icon: '📊',
    description: 'Deliver compelling presentations that persuade and inform.',
    vocabulary: ['overview', 'key takeaway', 'data-driven', 'Q&A', 'slide deck'],
  },
  {
    id: 'sales',
    title: 'Sales',
    icon: '💼',
    description: 'Pitch products, handle objections, and close deals.',
    vocabulary: ['prospect', 'pitch', 'objection', 'pipeline', 'close'],
  },
  {
    id: 'networking',
    title: 'Networking',
    icon: '🌐',
    description: 'Build professional relationships and expand your network.',
    vocabulary: ['elevator pitch', 'connect', 'referral', 'follow up', 'LinkedIn'],
  },
  {
    id: 'leadership',
    title: 'Leadership',
    icon: '🎯',
    description: 'Communicate as a leader — motivate, delegate, and inspire.',
    vocabulary: ['delegate', 'vision', 'empower', 'accountability', 'feedback'],
  },
]

export default function BusinessCommunicationScreen() {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggle = (id: string) => setExpanded(prev => (prev === id ? null : id))

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Business Communication</Text>
          <Text style={styles.headerSub}>Corporate English mastery</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Topics grid */}
        <View style={styles.grid}>
          {TOPICS.map(topic => {
            const open = expanded === topic.id
            return (
              <View key={topic.id} style={[styles.card, open && styles.cardOpen]}>
                <TouchableOpacity onPress={() => toggle(topic.id)} style={styles.cardHeader}>
                  <Text style={styles.cardIcon}>{topic.icon}</Text>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.cardTitle}>{topic.title}</Text>
                    <Text style={styles.cardDesc} numberOfLines={open ? undefined : 2}>
                      {topic.description}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {open && (
                  <View style={styles.cardBody}>
                    <Text style={styles.vocabLabel}>Key Vocabulary</Text>
                    <View style={styles.vocabRow}>
                      {topic.vocabulary.map(word => (
                        <View key={word} style={styles.chip}>
                          <Text style={styles.chipText}>{word}</Text>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={styles.practiceBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/ai/chat',
                          params: { context: `business_${topic.id}` },
                        })
                      }
                    >
                      <Text style={styles.practiceBtnText}>Practice This Topic</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* AI Business Mentor CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.mentorBtn}
          onPress={() =>
            router.push({
              pathname: '/ai/chat',
              params: { context: 'business_mentor' },
            })
          }
        >
          <Text style={styles.mentorIcon}>🤖</Text>
          <Text style={styles.mentorBtnText}>AI Business Mentor</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  scroll: {
    padding: 16,
    paddingBottom: 100,
  },
  grid: {
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardOpen: {
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  cardIcon: {
    fontSize: 26,
    marginTop: 2,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  chevron: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  vocabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 8,
  },
  vocabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#FFF0E8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    color: PRIMARY,
    fontSize: 12,
    fontWeight: '500',
  },
  practiceBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  practiceBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  mentorBtn: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mentorIcon: {
    fontSize: 20,
  },
  mentorBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})
