import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import * as Speech from 'expo-speech'
import type { ChatMessage, GrammarCorrection } from '../../types'

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
              <Text style={styles.correctionBadgeText}>
                ✏️ {message.grammar_corrections.length} correction{message.grammar_corrections.length > 1 ? 's' : ''}
              </Text>
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
        <Text style={styles.novaAvatarText}>🤖</Text>
      </View>
      <View style={styles.assistantContent}>
        <View style={styles.assistantBubble}>
          <Text style={styles.assistantText}>{message.content}</Text>
          <TouchableOpacity onPress={speakMessage} style={styles.speakBtn}>
            <Text style={styles.speakBtnText}>🔊</Text>
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
      <Text style={styles.correctionOriginal}>❌ "{correction.original}"</Text>
      <Text style={styles.correctionArrow}>→</Text>
      <Text style={styles.correctionFixed}>✅ "{correction.corrected}"</Text>
      <Text style={styles.correctionExplanation}>{correction.explanation}</Text>
      <Text style={styles.correctionTelugu}>{correction.explanation_telugu}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  userContainer: { alignItems: 'flex-end', marginBottom: 12 },
  userBubble: {
    backgroundColor: '#4F46E5', maxWidth: '78%',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderBottomRightRadius: 4,
  },
  userText: { color: 'white', fontSize: 15, lineHeight: 22 },
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
  correctionOriginal: { fontSize: 13, color: '#EF4444', marginBottom: 2 },
  correctionArrow: { fontSize: 13, color: '#6B7280' },
  correctionFixed: { fontSize: 13, color: '#059669', fontWeight: '600', marginBottom: 2 },
  correctionExplanation: { fontSize: 12, color: '#374151', marginTop: 2, lineHeight: 18 },
  correctionTelugu: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  assistantContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, gap: 8 },
  novaAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center',
  },
  novaAvatarText: { fontSize: 16 },
  assistantContent: { flex: 1 },
  assistantBubble: {
    backgroundColor: 'white', maxWidth: '85%',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderBottomLeftRadius: 4,
    elevation: 2,
  },
  assistantText: { color: '#111827', fontSize: 15, lineHeight: 22 },
  speakBtn: { alignSelf: 'flex-end', marginTop: 6 },
  speakBtnText: { fontSize: 16 },
  translationBubble: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 10,
    marginTop: 6, maxWidth: '85%',
  },
  translationLabel: { fontSize: 11, color: '#4F46E5', fontWeight: '700', marginBottom: 2 },
  translationText: { fontSize: 13, color: '#374151' },
  timestamp: { fontSize: 11, color: '#9CA3AF', marginTop: 4, marginLeft: 4 },
})
