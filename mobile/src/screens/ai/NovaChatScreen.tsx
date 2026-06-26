import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSelector } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { RootState } from '../../store'
import { supabase } from '../../services/supabase'
import { chatWithNova, checkGrammar } from '../../services/ai/groqService'
import { speak, stopSpeaking } from '../../services/audio/textToSpeech'
import {
  startListening, stopListening, initializeSpeechRecognition,
  destroySpeechRecognition, isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition'
import { toTelugu } from '../../services/translation/translationService'
import { Colors } from '../../constants/theme'
import { GraduationCap, Volume2, VolumeX, ArrowLeft, Mic, Square, Send, Languages, Globe } from 'lucide-react-native'
import XPToast from '../../components/gamification/XPToast'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  translation?: string
  corrections?: Array<{
    original: string
    corrected: string
    explanation: string
    explanation_telugu: string
  }>
  showTranslation?: boolean
  timestamp: Date
}

const SUGGESTED_PROMPTS = [
  'Tell me about yourself in English',
  'Describe your daily routine',
  'Talk about your job',
  'Practice a greeting',
]

export default function NovaChatScreen() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sttAvailable, setSttAvailable] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [grammarMode, setGrammarMode] = useState(false)
  const [xpToastVisible, setXpToastVisible] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const micPulse = useRef(new Animated.Value(1)).current

  // True when chat has only the welcome message (or is empty)
  const showSuggestedPrompts = messages.length <= 1

  useEffect(() => {
    initSession()
    initializeSpeechRecognition()
    checkSTT()
    loadMuteState()
    loadGrammarMode()
    return () => {
      destroySpeechRecognition()
      stopSpeaking()
    }
  }, [])

  const loadMuteState = async () => {
    try {
      const val = await AsyncStorage.getItem('chat_muted')
      if (val === 'true') setIsMuted(true)
    } catch {}
  }

  const loadGrammarMode = async () => {
    try {
      const val = await AsyncStorage.getItem('chat_grammar_mode')
      if (val === 'true') setGrammarMode(true)
    } catch {}
  }

  const handleToggleMute = async () => {
    const nextMute = !isMuted
    setIsMuted(nextMute)
    try {
      await AsyncStorage.setItem('chat_muted', nextMute ? 'true' : 'false')
    } catch {}
    if (nextMute) {
      await stopSpeaking()
    } else {
      const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
      if (lastAssistantMsg) {
        speak(lastAssistantMsg.content, { language: 'en-IN', rate: 'normal' }).catch(() => {})
      }
    }
  }

  const handleToggleGrammarMode = async () => {
    const next = !grammarMode
    setGrammarMode(next)
    try {
      await AsyncStorage.setItem('chat_grammar_mode', next ? 'true' : 'false')
    } catch {}
  }

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      ).start()
    } else {
      micPulse.stopAnimation()
      micPulse.setValue(1)
    }
  }, [isListening])

  const checkSTT = async () => {
    const available = await isSpeechRecognitionAvailable()
    setSttAvailable(available)
  }

  const initSession = async () => {
    const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'
    if (isGuest || !user) {
      setSessionId('mock-session-id-1234')
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm Nova, your English tutor! నేను మీకు English నేర్పటానికి ఇక్కడ ఉన్నాను. Let's start speaking English together!",
        timestamp: new Date(),
      }])
      return
    }

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: user.id, session_type: 'free_chat', messages_count: 0 })
        .select('id')
        .single()

      if (!error && data) {
        setSessionId(data.id)
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "Hello! I'm Nova, your English tutor! నేను మీకు English నేర్పటానికి ఇక్కడ ఉన్నాను. Let's start speaking English together!",
          timestamp: new Date(),
        }])
      } else {
        throw error || new Error('Failed to create session')
      }
    } catch {
      setSessionId('mock-session-id-1234')
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm Nova, your English tutor! నేను మీకు English నేర్పటానికి ఇక్కడ ఉన్నాను. Let's start speaking English together!",
        timestamp: new Date(),
      }])
    }
  }

  const sendMessage = async (text?: string) => {
    const messageText = (text || inputText).trim()
    if (!messageText || !sessionId || sending) return

    // If Grammar Mode is on, append a grammar-correction request suffix
    const promptText = grammarMode
      ? `${messageText}\n\n[Please also correct any grammar mistakes in my message above and explain them.]`
      : messageText

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setSending(true)

    try {
      const response = await chatWithNova(sessionId, promptText)

      let corrections: Message['corrections'] = []
      if (messageText.length > 5) {
        try {
          const grammarResult = await checkGrammar(messageText)
          if (grammarResult.has_errors) corrections = grammarResult.corrections
        } catch { /* non-fatal */ }
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        corrections,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMsg])
      if (!isMuted) {
        speak(response.message, { language: 'en-IN', rate: 'normal' }).catch(() => {})
      }

      // Award 5 XP per successful message exchange and show toast
      setXpEarned(5)
      setXpToastVisible(true)
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble responding. Please check your connection and try again. నెట్‌వర్క్ సమస్య ఉంది.',
        timestamp: new Date(),
      }])
    } finally {
      setSending(false)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  const handleToggleListen = async () => {
    if (isListening) {
      await stopListening()
      setIsListening(false)
      setPartialTranscript('')
      return
    }

    if (!sttAvailable) {
      Alert.alert(
        'Speech Recognition Unavailable',
        'Speech recognition is not supported on this device. Type your message instead.',
        [{ text: 'OK' }]
      )
      return
    }

    setIsListening(true)
    setPartialTranscript('')

    await startListening({
      language: 'en-IN',
      partialResults: true,
      onPartialResult: (text) => setPartialTranscript(text),
      onFinalResult: async (result) => {
        setIsListening(false)
        setPartialTranscript('')
        if (result.transcript.trim()) {
          await sendMessage(result.transcript)
        }
      },
      onError: (errorMessage) => {
        setIsListening(false)
        setPartialTranscript('')
        if (!errorMessage.includes('No speech')) {
          Alert.alert('Recognition Error', errorMessage)
        }
      },
      onEnd: () => {
        setIsListening(false)
        setPartialTranscript('')
      },
    })
  }

  const handleToggleTranslation = async (msgId: string, content: string) => {
    const msg = messages.find(m => m.id === msgId)

    if (msg?.translation) {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, showTranslation: !m.showTranslation } : m
      ))
      return
    }

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, showTranslation: true } : m
    ))

    try {
      const translated = await toTelugu(content)
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, translation: translated, showTranslation: true } : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, showTranslation: false } : m
      ))
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowNova]}>
        {!isUser && (
          <View style={styles.novaAvatar}>
            <Text style={styles.novaAvatarText}>N</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleNova]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextNova]}>
            {item.content}
          </Text>

          {!isUser && (
            <TouchableOpacity
              style={styles.translateBtn}
              onPress={() => handleToggleTranslation(item.id, item.content)}
            >
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Globe size={14} color='#6B7280' style={{marginRight: 4}} /><Text style={styles.translateBtnText}>{item.showTranslation ? 'Hide Translation' : 'Telugu లో చూడండి'}</Text></View>
            </TouchableOpacity>
          )}

          {item.showTranslation && item.translation && (
            <Text style={styles.translationText}>{item.translation}</Text>
          )}
          {item.showTranslation && !item.translation && (
            <ActivityIndicator size="small" color="#6B7280" style={{ marginTop: 6 }} />
          )}

          {isUser && item.corrections && item.corrections.length > 0 && (
            <View style={styles.corrections}>
              {item.corrections.map((c, i) => (
                <View key={i} style={styles.correctionItem}>
                  <Text style={styles.correctionOriginal}>✗ "{c.original}"</Text>
                  <Text style={styles.correctionFixed}>✓ "{c.corrected}"</Text>
                  <Text style={styles.correctionExplanation}>{c.explanation}</Text>
                  {c.explanation_telugu ? (
                    <Text style={styles.correctionTelugu}>{c.explanation_telugu}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {!isUser && (
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={() => speak(item.content, { language: 'en-IN' })}
            >
              <Volume2 size={16} color='#9CA3AF' />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const renderSuggestedPrompts = () => (
    <View style={styles.suggestedContainer}>
      <Text style={styles.suggestedLabel}>Quick start — tap a prompt:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedRow}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            style={styles.suggestedChip}
            onPress={() => sendMessage(prompt)}
            disabled={sending}
          >
            <Text style={styles.suggestedChipText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <ArrowLeft size={24} color='white' />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>N</Text>
          </View>
          <View>
            <Text style={styles.headerName}>Nova</Text>
            <Text style={styles.headerSubtitle}>AI English Tutor • Free</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {/* Grammar Mode toggle */}
          <TouchableOpacity
            style={[styles.grammarModeBtn, grammarMode && styles.grammarModeBtnActive]}
            onPress={handleToggleGrammarMode}
          >
            <GraduationCap size={18} color='white' />
            {grammarMode && <Text style={styles.grammarModeBtnLabel}>ON</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleMute}>
            {isMuted ? <VolumeX size={22} color='white' /> : <Volume2 size={22} color='white' />}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Grammar mode indicator bar */}
      {grammarMode && (
        <View style={styles.grammarModeBanner}>
          <Text style={styles.grammarModeBannerText}>Grammar Mode ON — Nova will correct every message</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={showSuggestedPrompts ? renderSuggestedPrompts : null}
      />

      {isListening && (
        <View style={styles.partialTranscriptBar}>
          <Text style={styles.partialText}>
            {partialTranscript || 'Listening... speak now'}
          </Text>
        </View>
      )}

      {sending && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>Nova is typing...</Text>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type in English or use mic..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
        />
        <Animated.View style={{ transform: [{ scale: micPulse }] }}>
          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={handleToggleListen}
          >
            {isListening ? <Square size={20} color='white' fill='white' /> : <Mic size={20} color='#7B61FF' />}
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="white" />
            : <Send size={18} color='white' />
          }
        </TouchableOpacity>
      </View>

      <XPToast
        xp={xpEarned}
        visible={xpToastVisible}
        onHide={() => setXpToastVisible(false)}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
  },
  backBtn: { color: 'white', fontSize: 24 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 12 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: 'white', fontSize: 18, fontWeight: '800' },
  headerName: { color: 'white', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grammarModeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  grammarModeBtnActive: { backgroundColor: 'rgba(255,255,255,0.4)' },
  grammarModeBtnIcon: { fontSize: 18 },
  grammarModeBtnLabel: { color: 'white', fontSize: 10, fontWeight: '800' },
  muteBtn: { fontSize: 22 },
  grammarModeBanner: {
    backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 7,
    borderBottomWidth: 1, borderBottomColor: '#FFD0A8',
  },
  grammarModeBannerText: { color: Colors.primaryDark, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 16, maxWidth: '85%' },
  messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  messageRowNova: { alignSelf: 'flex-start' },
  novaAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center',
    marginRight: 8, alignSelf: 'flex-end',
  },
  novaAvatarText: { color: 'white', fontSize: 16, fontWeight: '800' },
  bubble: { borderRadius: 20, padding: 14, maxWidth: '100%' },
  bubbleUser: { backgroundColor: '#7B61FF', borderBottomRightRadius: 4 },
  bubbleNova: { backgroundColor: 'white', borderBottomLeftRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: 'white' },
  bubbleTextNova: { color: '#111827' },
  translateBtn: { marginTop: 8 },
  translateBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  translationText: {
    fontSize: 13, color: Colors.primary, marginTop: 6,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6, lineHeight: 20,
  },
  corrections: {
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, padding: 10,
  },
  correctionItem: { marginBottom: 6 },
  correctionOriginal: { color: '#FCA5A5', fontSize: 12, fontStyle: 'italic' },
  correctionFixed: { color: '#86EFAC', fontSize: 12, fontWeight: '600' },
  correctionExplanation: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  correctionTelugu: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  speakBtn: { alignSelf: 'flex-end', marginTop: 6 },
  speakBtnText: { fontSize: 16 },
  // Suggested prompts
  suggestedContainer: { marginTop: 12, marginBottom: 8 },
  suggestedLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 8, paddingHorizontal: 4 },
  suggestedRow: { gap: 8, paddingRight: 8 },
  suggestedChip: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    elevation: 1,
  },
  suggestedChipText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  // Partial transcript bar
  partialTranscriptBar: {
    backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#FFD0A8',
  },
  partialText: { color: '#7B61FF', fontSize: 14, fontStyle: 'italic' },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  typingText: { color: '#6B7280', fontSize: 13, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1, backgroundColor: '#F3F4F6', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#111827',
    maxHeight: 100,
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: Colors.error },
  micBtnIcon: { fontSize: 20 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#FFB899' },
  sendBtnIcon: { color: 'white', fontSize: 16 },
})
