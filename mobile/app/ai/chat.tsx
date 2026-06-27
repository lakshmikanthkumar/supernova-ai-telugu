import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSelector } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { RootState } from '../../src/store'
import { supabase } from '../../src/services/supabase'
import { chatWithNova, checkGrammar } from '../../src/services/ai/groqService'
import { speak, stopSpeaking } from '../../src/services/audio/textToSpeech'
import { useTheme } from '../../src/context/ThemeContext'
import {
  startListening, stopListening, initializeSpeechRecognition,
  destroySpeechRecognition, isSpeechRecognitionAvailable,
} from '../../src/services/audio/voiceRecognitionService'
import { toTelugu } from '../../src/services/translation/translationService'
import { roleplayService } from '../../src/services/api'
import type { RoleplayScenario } from '../../src/types'

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

const SCENARIO_ICONS: Record<string, string> = {
  interview: '💼', shopping: '🛒', travel: '✈️',
  office: '🏢', medical: '🏥', social: '👥',
  restaurant: '🍽️', phone_call: '📱', coffee: '☕',
}

export default function ChatScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const styles = getStyles(c)
  const { scenarioId, mode } = useLocalSearchParams<{ scenarioId?: string; mode?: string }>()
  const isRoleplay = mode === 'roleplay' && !!scenarioId

  const user = useSelector((state: RootState) => state.auth.user)
  const [scenario, setScenario] = useState<RoleplayScenario | null>(null)
  const [scenarioLoading, setScenarioLoading] = useState(isRoleplay)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [partialTranscript, setPartialTranscript] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sttAvailable, setSttAvailable] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const micPulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    initializeSpeechRecognition()
    checkSTT()
    loadMuteState()
    return () => {
      destroySpeechRecognition()
      stopSpeaking()
    }
  }, [])

  const sessionInitialized = useRef(false)
  useEffect(() => {
    if (sessionInitialized.current) return

    let id = scenarioId;
    if (!id && Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      id = params.get('scenarioId') || undefined;
    }

    const expectingRoleplay = Platform.OS === 'web'
      ? typeof window !== 'undefined' && window.location.search.includes('scenarioId')
      : isRoleplay

    if (expectingRoleplay) {
      if (id) {
        sessionInitialized.current = true
        loadScenario(id as string)
      }
    } else {
      sessionInitialized.current = true
      initSession(null)
    }
  }, [scenarioId, mode, isRoleplay])

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

  const loadScenario = async (id: string) => {
    try {
      const s = await roleplayService.getScenarioById(id)
      setScenario(s)
      await initSession(s)
    } catch {
      await initSession(null)
    } finally {
      setScenarioLoading(false)
    }
  }

  const loadMuteState = async () => {
    try {
      const val = await AsyncStorage.getItem('chat_muted')
      if (val === 'true') setIsMuted(true)
    } catch {}
  }

  const checkSTT = async () => {
    const available = await isSpeechRecognitionAvailable()
    setSttAvailable(available)
  }

  const initSession = async (sc: RoleplayScenario | null) => {
    const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'

    const welcomeContent = sc
      ? `Hello! I'm ${sc.ai_persona}. ${sc.starter_message || `Let's practice "${sc.title}". You can start the conversation!`}`
      : "Hello! I'm Nova, your English tutor! 😊 నేను మీకు English నేర్పటానికి ఇక్కడ ఉన్నాను. Let's start speaking English together!"

    const welcome: Message = { id: 'welcome', role: 'assistant', content: welcomeContent, timestamp: new Date() }

    if (isGuest || !user) {
      setSessionId('mock-session-' + (sc?.id || 'chat'))
      setMessages([welcome])
      return
    }

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          session_type: sc ? 'roleplay' : 'free_chat',
          scenario_id: sc?.id || null,
          title: sc?.title || null,
          messages_count: 0,
        })
        .select('id')
        .single()

      if (!error && data) {
        setSessionId(data.id)
      } else {
        setSessionId('mock-session-' + (sc?.id || 'chat'))
      }
    } catch {
      setSessionId('mock-session-' + (sc?.id || 'chat'))
    }
    setMessages([welcome])
  }

  const sendMessage = async (text?: string) => {
    const messageText = (text || inputText).trim()
    if (!messageText || !sessionId || sending) return

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
      const systemPrompt = scenario
        ? `You are ${scenario.ai_persona}. Scenario: "${scenario.title}" — ${scenario.description}. Stay in character. Speak naturally in English. Gently correct grammar mistakes. Keep responses concise (2-4 sentences).`
        : undefined
      const response = await chatWithNova(sessionId, messageText, systemPrompt)

      let corrections: Message['corrections'] = []
      if (messageText.length > 5) {
        try {
          const grammarResult = await checkGrammar(messageText)
          if (grammarResult.has_errors) corrections = grammarResult.corrections
        } catch {}
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

  const handleToggleMute = async () => {
    const next = !isMuted
    setIsMuted(next)
    try { await AsyncStorage.setItem('chat_muted', next ? 'true' : 'false') } catch {}
    if (next) {
      await stopSpeaking()
    } else {
      const last = [...messages].reverse().find(m => m.role === 'assistant')
      if (last) speak(last.content, { language: 'en-IN', rate: 'normal' }).catch(() => {})
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
      Alert.alert('Speech Recognition Unavailable', 'Type your message instead.', [{ text: 'OK' }])
      return
    }
    setIsListening(true)
    setPartialTranscript('')
    await startListening({
      language: 'en-IN',
      partialResults: true,
      onPartialResult: (t) => setPartialTranscript(t),
      onFinalResult: async (r) => {
        setIsListening(false)
        setPartialTranscript('')
        if (r.transcript.trim()) await sendMessage(r.transcript)
      },
      onError: (err) => {
        setIsListening(false)
        setPartialTranscript('')
        if (!err.includes('No speech')) Alert.alert('Recognition Error', err)
      },
      onEnd: () => { setIsListening(false); setPartialTranscript('') },
    })
  }

  const handleToggleTranslation = async (msgId: string, content: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (msg?.translation) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, showTranslation: !m.showTranslation } : m))
      return
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, showTranslation: true } : m))
    try {
      const translated = await toTelugu(content)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, translation: translated, showTranslation: true } : m))
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, showTranslation: false } : m))
    }
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowNova]}>
        {!isUser && (
          <View style={[styles.novaAvatar, { backgroundColor: isRoleplay ? c.success : c.primary }]}>
            <Text style={styles.novaAvatarText}>{isRoleplay ? (scenario ? (SCENARIO_ICONS[scenario.scenario_type] || '🎭') : '🎭') : 'N'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleNova,
          isUser && isRoleplay && { backgroundColor: c.success }]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextNova]}>
            {item.content}
          </Text>
          {!isUser && (
            <TouchableOpacity style={styles.translateBtn} onPress={() => handleToggleTranslation(item.id, item.content)}>
              <Text style={styles.translateBtnText}>
                {item.showTranslation ? '🇺🇸 Hide Translation' : '🇮🇳 Telugu లో చూడండి'}
              </Text>
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
              {item.corrections.map((cMsg, i) => (
                <View key={i} style={styles.correctionItem}>
                  <Text style={styles.correctionOriginal}>✗ "{cMsg.original}"</Text>
                  <Text style={styles.correctionFixed}>✓ "{cMsg.corrected}"</Text>
                  <Text style={styles.correctionExplanation}>{cMsg.explanation}</Text>
                  {cMsg.explanation_telugu ? <Text style={styles.correctionTelugu}>{cMsg.explanation_telugu}</Text> : null}
                </View>
              ))}
            </View>
          )}
          {!isUser && (
            <TouchableOpacity style={styles.speakBtn} onPress={() => speak(item.content, { language: 'en-IN' })}>
              <Text style={styles.speakBtnText}>🔊</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const headerColors: [string, string] = isRoleplay ? [c.success, c.success] : [c.primary, c.primaryDark]
  const headerTitle = isRoleplay && scenario ? scenario.title : 'Nova'
  const headerSub = isRoleplay && scenario ? scenario.ai_persona : 'AI English Tutor • Free'

  if (scenarioLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={isRoleplay ? c.success : c.primary} /></View>
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient colors={headerColors} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {isRoleplay && scenario ? (SCENARIO_ICONS[scenario.scenario_type] || '🎭') : 'N'}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{headerSub}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleToggleMute}>
          <Text style={styles.muteBtn}>{isMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {isRoleplay && scenario && (
        <View style={styles.scenarioBanner}>
          <Text style={styles.scenarioBannerText}>
            🎭 {scenario.description}
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {isListening && (
        <View style={styles.partialTranscriptBar}>
          <Text style={styles.partialText}>{partialTranscript || '🎤 Listening... speak now'}</Text>
        </View>
      )}

      {sending && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{isRoleplay && scenario ? `${scenario.ai_persona} is typing...` : 'Nova is typing...'}</Text>
          <ActivityIndicator size="small" color={isRoleplay ? c.success : c.primary} />
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder={isRoleplay ? 'Reply in English...' : 'Type in English or use mic...'}
          placeholderTextColor={c.textSecondary}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
        />
        <Animated.View style={{ transform: [{ scale: micPulse }] }}>
          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={handleToggleListen}
          >
            <Text style={styles.micBtnIcon}>{isListening ? '⏹️' : '🎤'}</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled,
            isRoleplay && { backgroundColor: c.success }]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="white" />
            : <Text style={styles.sendBtnIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const getStyles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 20, paddingBottom: 16, paddingHorizontal: 16,
  },
  backBtn: { color: 'white', fontSize: 24 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 12 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: 'white', fontSize: 20 },
  headerName: { color: 'white', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  muteBtn: { fontSize: 22 },
  scenarioBanner: {
    backgroundColor: c.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  scenarioBannerText: { color: c.success, fontSize: 13, lineHeight: 18 },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 16, maxWidth: '85%' },
  messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  messageRowNova: { alignSelf: 'flex-start' },
  novaAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, alignSelf: 'flex-end',
  },
  novaAvatarText: { color: 'white', fontSize: 18, fontWeight: '800' },
  bubble: { borderRadius: 20, padding: 14, maxWidth: '100%' },
  bubbleUser: { backgroundColor: c.primary, borderBottomRightRadius: 4 },
  bubbleNova: { backgroundColor: c.surface, borderBottomLeftRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: 'white' },
  bubbleTextNova: { color: c.textPrimary },
  translateBtn: { marginTop: 8 },
  translateBtnText: { fontSize: 12, color: c.textSecondary, fontWeight: '600' },
  translationText: {
    fontSize: 13, color: c.primary, marginTop: 6,
    borderTopWidth: 1, borderTopColor: c.border, paddingTop: 6, lineHeight: 20,
  },
  corrections: {
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10,
  },
  correctionItem: { marginBottom: 6 },
  correctionOriginal: { color: '#FCA5A5', fontSize: 12, fontStyle: 'italic' },
  correctionFixed: { color: '#86EFAC', fontSize: 12, fontWeight: '600' },
  correctionExplanation: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  correctionTelugu: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  speakBtn: { alignSelf: 'flex-end', marginTop: 6 },
  speakBtnText: { fontSize: 16 },
  partialTranscriptBar: {
    backgroundColor: c.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  partialText: { color: c.success, fontSize: 14, fontStyle: 'italic' },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  typingText: { color: c.textSecondary, fontSize: 13, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border,
  },
  textInput: {
    flex: 1, backgroundColor: c.background, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: c.textPrimary,
    maxHeight: 100,
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { backgroundColor: '#EF4444' },
  micBtnIcon: { fontSize: 20 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: c.primaryLight },
  sendBtnIcon: { color: 'white', fontSize: 16 },
})
