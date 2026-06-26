import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import * as Speech from 'expo-speech'
import type { ChatMessage, GrammarCorrection } from '../../types'
import { Bot, Volume2, Pencil, XCircle, ArrowRight, CheckCircle2 } from 'lucide-react-native'

interface Props {
  message: ChatMessage
  showTranslation: boolean
  showCorrections: boolean
}

export default function ChatBubble({ message, showTranslation, showCorrections }: Props) {
  const [showCorrectionDetails, setShowCorrectionDetails] = useState(false)
  const isUser = message.role === 'user'
  const hasCorrections = message.grammar_corrections?.length > 0
  const hasTranslation = message.translations?.telugu

  const speakMessage = () => {
    Speech.speak(message.content, { language: 'en-IN', rate: 0.85 })
  }

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
          {/* Grammar corrections indicator */}
          {showCorrections && hasCorrections && (
            <TouchableOpacity
              onPress={() => setShowCorrectionDetails(!showCorrectionDetails)}
              style={styles.correctionBadge}
            >
              <View style={styles.badgeRow}>
                <Pencil size={12} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.correctionBadgeText}>
                  {message.grammar_corrections.length} correction{message.grammar_corrections.length > 1 ? 's' : ''}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Correction Details */}
        {showCorrectionDetails && hasCorrections && (
          <View style={styles.correctionsPanel}>
            {message.grammar_corrections.map((c, i) => (
              <CorrectionItem key={i} correction={c} />
            ))}
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.assistantContainer}>
      <View style={styles.novaAvatar}>
        <Bot size={18} color="#4F46E5" />
      </View>
      <View style={styles.assistantContent}>
        <View style={styles.assistantBubble}>
          <Text style={styles.assistantText}>{message.content}</Text>
          <TouchableOpacity onPress={speakMessage} style={styles.speakBtn}>
            <Volume2 size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
        {showTranslation && hasTranslation && (
          <View style={styles.translationBubble}>
            <Text style={styles.translationLabel}>తెలుగు:</Text>
            <Text style={styles.translationText}>{message.translations.telugu}</Text>
          </View>
        )}
        <Text style={styles.timestamp}>
          {new Date(message.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  )
}

function CorrectionItem({ correction }: { correction: GrammarCorrection }) {
  return (
    <View style={styles.correctionItem}>
      <View style={styles.correctionRow}>
        <XCircle size={14} color="#EF4444" style={{ marginRight: 6, marginTop: 2 }} />
        <Text style={styles.correctionOriginal}>"{correction.original}"</Text>
      </View>
      <View style={styles.arrowRow}>
        <ArrowRight size={14} color="#6B7280" />
      </View>
      <View style={styles.correctionRow}>
        <CheckCircle2 size={14} color="#059669" style={{ marginRight: 6, marginTop: 2 }} />
        <Text style={styles.correctionFixed}>"{correction.corrected}"</Text>
      </View>
      <Text style={styles.correctionExplanation}>{correction.explanation}</Text>
      <Text style={styles.correctionTelugu}>{correction.explanation_telugu}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  userContainer: { alignItems: 'flex-end', marginBottom: 12 },
  userBubble: {
    backgroundColor: '#7B61FF', maxWidth: '78%',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderBottomRightRadius: 4,
  },
  userText: { color: 'white', fontSize: 15, lineHeight: 22 },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  correctionBadge: {
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-end',
  },
  correctionBadgeText: { color: 'white', fontSize: 12 },
  correctionsPanel: {
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14,
    marginTop: 6, maxWidth: '85%',
  },
  correctionItem: { marginBottom: 10 },
  correctionRow: { flexDirection: 'row', alignItems: 'center' },
  arrowRow: { paddingLeft: 20, marginVertical: 2 },
  correctionOriginal: { fontSize: 13, color: '#EF4444', marginBottom: 2 },
  correctionArrow: { fontSize: 13, color: '#6B7280' },
  correctionFixed: { fontSize: 13, color: '#00D26A', fontWeight: '600', marginBottom: 2 },
  correctionExplanation: { fontSize: 12, color: '#374151', marginTop: 2, lineHeight: 18 },
  correctionTelugu: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  assistantContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
  novaAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  assistantContent: { flex: 1 },
  assistantBubble: {
    backgroundColor: 'white', maxWidth: '85%',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderBottomLeftRadius: 4,
    elevation: 2,
  },
  assistantText: { color: '#111827', fontSize: 15, lineHeight: 22 },
  speakBtn: { alignSelf: 'flex-end', marginTop: 8, padding: 4 },
  translationBubble: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 10,
    marginTop: 6, maxWidth: '85%',
  },
  translationLabel: { fontSize: 11, color: '#7B61FF', fontWeight: '700', marginBottom: 2 },
  translationText: { fontSize: 13, color: '#374151' },
  timestamp: { fontSize: 11, color: '#9CA3AF', marginTop: 4, marginLeft: 4 },
})
