// ============================================================
// VoiceSelector — bottom-sheet voice picker for TTS
// Lists device voices, filters for Indian English,
// lets user preview each voice before selecting.
// ============================================================

import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ExpoSpeech from 'expo-speech'
import { ttsService } from '../../services/audio/ttsService'

interface VoiceSelectorProps {
  onVoiceSelected?: (voiceId: string) => void
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({ onVoiceSelected }) => {
  const [voices, setVoices] = useState<ExpoSpeech.Voice[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVoices()
  }, [])

  const loadVoices = async () => {
    setLoading(true)
    try {
      const all = await ttsService.getAllVoices()
      // Prefer Indian English voices, fall back to all English voices
      const indian = all.filter(v => v.language === 'en-IN' || (v.identifier ?? '').includes('IN'))
      const english = all.filter(v => (v.language ?? '').startsWith('en'))
      const list = indian.length > 0 ? indian : english
      setVoices(list)
      if (list.length > 0) {
        const init = list[0].identifier
        setSelected(init)
        ttsService.setVoice(init)
      }
    } catch {}
    setLoading(false)
  }

  const handleSelect = (voiceId: string) => {
    setSelected(voiceId)
    ttsService.setVoice(voiceId)
    setModalVisible(false)
    onVoiceSelected?.(voiceId)
    // Preview the selected voice
    ttsService.speak('Hello, this is your English Mitra.', {
      voice: voiceId, language: 'en-IN',
    })
  }

  const selectedName = voices.find(v => v.identifier === selected)?.name ?? 'Select Voice'

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.trigger} onPress={() => setModalVisible(true)}>
        <Ionicons name="volume-high-outline" size={20} color="#0047AB" />
        <Text style={styles.triggerText}>{selectedName}</Text>
        <Ionicons name="chevron-down" size={18} color="#0047AB" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select TTS Voice</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2D3436" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator style={{ marginVertical: 32 }} />
            ) : (
              <FlatList
                data={voices}
                keyExtractor={item => item.identifier}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.row, selected === item.identifier && styles.rowSelected]}
                    onPress={() => handleSelect(item.identifier)}
                  >
                    <Ionicons
                      name={selected === item.identifier ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selected === item.identifier ? '#FF6B35' : '#999'}
                    />
                    <View style={styles.rowInfo}>
                      <Text style={styles.voiceName}>{item.name ?? item.identifier}</Text>
                      <Text style={styles.voiceLang}>{item.language}</Text>
                    </View>
                    {(item.language === 'en-IN') && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>🇮🇳 Indian</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={(
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>No English voices found on this device.</Text>
                    <Text style={styles.emptyHint}>Install a TTS engine from device settings.</Text>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.testBtn}
              onPress={() => selected && ttsService.speak('Testing Indian English pronunciation.', { voice: selected, language: 'en-IN', rate: 'slow' })}
            >
              <Text style={styles.testBtnText}>🔊 Test Voice</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 8 },
  trigger: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: '#F0F4FF', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,71,171,0.15)',
  },
  triggerText: { flex: 1, marginLeft: 8, fontSize: 14, color: '#2D3436' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E8ECF1',
  },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: '#2D3436' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#F5F6F8',
  },
  rowSelected: { backgroundColor: '#FFF5F0' },
  rowInfo: { flex: 1, marginLeft: 12 },
  voiceName: { fontSize: 15, color: '#2D3436' },
  voiceLang: { fontSize: 12, color: '#999', marginTop: 2 },
  badge: { backgroundColor: 'rgba(255,107,53,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 11, color: '#FF6B35' },
  empty: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#2D3436', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 8 },
  testBtn: { marginTop: 16, padding: 14, backgroundColor: '#FF6B35', borderRadius: 12, alignItems: 'center' },
  testBtnText: { color: 'white', fontSize: 16, fontWeight: '600' },
})
