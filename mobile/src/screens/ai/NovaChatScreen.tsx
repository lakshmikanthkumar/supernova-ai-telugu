import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert,
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
import { Theme } from '../../theme'
import { 
  Bot, Volume2, VolumeX, Mic, Square, ArrowLeft, Send, Globe, XCircle, CheckCircle2 
} from 'lucide-react-native'

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
  const flatListRef = useRef<FlatList>(null)
  const micPulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    initSession()
    initializeSpeechRecognition()
    checkSTT()
    loadMuteState()
    return () => {
      destroySpeechRecognition()
      stopSpeaking()
    }
  }, [])

  const loadMuteState = async () => {
    try {
      const val = await AsyncStorage.getItem('chat_muted')
      if (val === 'true') {
        setIsMuted(true)
      }
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
      const response = await chatWithNova(sessionId, messageText)

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
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'System error. Communication link unstable. నెట్‌వర్క్ సమస్య ఉంది.',
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
            <Bot size={20} color={Theme.colors.secondary} strokeWidth={2} />
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
              <Globe size={14} color={Theme.colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.translateBtnText}>
                {item.showTranslation ? 'Hide Translation' : 'Telugu లో చూడండి'}
              </Text>
            </TouchableOpacity>
          )}

          {item.showTranslation && item.translation && (
            <Text style={styles.translationText}>{item.translation}</Text>
          )}
          {item.showTranslation && !item.translation && (
            <ActivityIndicator size="small" color={Theme.colors.secondary} style={{ marginTop: 8 }} />
          )}

          {isUser && item.corrections && item.corrections.length > 0 && (
            <View style={styles.corrections}>
              <Text style={styles.correctionsHeader}>Syntax Diagnostics:</Text>
              {item.corrections.map((c, i) => (
                <View key={i} style={styles.correctionItem}>
                  <View style={styles.correctionRow}>
                    <XCircle size={14} color={Theme.colors.error} style={{ marginRight: 4 }} />
                    <Text style={styles.correctionOriginal}>"{c.original}"</Text>
                  </View>
                  <View style={styles.correctionRow}>
                    <CheckCircle2 size={14} color="#00E676" style={{ marginRight: 4 }} />
                    <Text style={styles.correctionFixed}>"{c.corrected}"</Text>
                  </View>
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
              <Volume2 size={18} color={Theme.colors.secondary} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}>
          <ArrowLeft size={24} color={Theme.colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Bot size={24} color={Theme.colors.secondary} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.headerName}>Nova AI</Text>
            <Text style={styles.headerSubtitle}>System Interface Active</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleToggleMute} style={styles.muteBtnWrap}>
          {isMuted ? (
            <VolumeX size={20} color={Theme.colors.textSecondary} strokeWidth={2.5} />
          ) : (
            <Volume2 size={20} color={Theme.colors.text} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </LinearGradient>

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
          <Text style={styles.partialText}>
            {partialTranscript || 'Receiving audio signal...'}
          </Text>
        </View>
      )}

      {sending && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>Processing query...</Text>
          <ActivityIndicator size="small" color={Theme.colors.secondary} />
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Input query or initialize mic..."
          placeholderTextColor={Theme.colors.textSecondary}
          multiline
          maxLength={500}
        />
        <Animated.View style={{ transform: [{ scale: micPulse }] }}>
          <TouchableOpacity
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={handleToggleListen}
          >
            {isListening ? (
              <Square size={20} color={Theme.colors.error} fill={Theme.colors.error} />
            ) : (
              <Mic size={22} color={Theme.colors.text} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#000" />
            : <Send size={20} color="#000" strokeWidth={2.5} style={{ marginLeft: -2 }} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: Theme.colors.border,
    shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginLeft: 16 },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,194,255,0.15)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Theme.colors.secondary,
  },
  headerName: { color: Theme.colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  headerSubtitle: { color: Theme.colors.secondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  muteBtnWrap: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  messagesList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 20, maxWidth: '85%' },
  messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  messageRowNova: { alignSelf: 'flex-start' },
  novaAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,194,255,0.15)', alignItems: 'center', justifyContent: 'center',
    marginRight: 10, alignSelf: 'flex-end', borderWidth: 1, borderColor: Theme.colors.secondary,
  },
  bubble: { borderRadius: 20, padding: 16, maxWidth: '100%', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  bubbleUser: { backgroundColor: Theme.colors.surface, borderColor: Theme.colors.border, borderBottomRightRadius: 4 },
  bubbleNova: { backgroundColor: 'rgba(0,194,255,0.05)', borderColor: Theme.colors.secondary, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 16, lineHeight: 24, letterSpacing: 0.3 },
  bubbleTextUser: { color: Theme.colors.text },
  bubbleTextNova: { color: Theme.colors.text, fontWeight: '500' },
  translateBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Theme.colors.border },
  translateBtnText: { fontSize: 12, color: Theme.colors.textSecondary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  translationText: {
    fontSize: 14, color: Theme.colors.secondary, marginTop: 10,
    borderTopWidth: 1, borderTopColor: Theme.colors.border, paddingTop: 10, lineHeight: 22, fontWeight: '600',
  },
  corrections: {
    marginTop: 12, backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Theme.colors.border,
  },
  correctionsHeader: { color: Theme.colors.accent, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  correctionItem: { marginBottom: 10 },
  correctionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  correctionOriginal: { color: Theme.colors.error, fontSize: 13, fontStyle: 'italic', fontWeight: '600' },
  correctionFixed: { color: '#00E676', fontSize: 13, fontWeight: '800' },
  correctionExplanation: { color: Theme.colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
  correctionTelugu: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  speakBtn: { alignSelf: 'flex-end', marginTop: 8, backgroundColor: 'rgba(0,194,255,0.1)', padding: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,194,255,0.3)' },
  partialTranscriptBar: {
    backgroundColor: Theme.colors.surface, paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Theme.colors.secondary,
  },
  partialText: { color: Theme.colors.secondary, fontSize: 15, fontStyle: 'italic', fontWeight: '600' },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: Theme.colors.background,
  },
  typingText: { color: Theme.colors.secondary, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: Theme.colors.background, borderTopWidth: 1, borderTopColor: Theme.colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: Theme.colors.surface, borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 14, fontSize: 15, color: Theme.colors.text,
    maxHeight: 120, borderWidth: 1, borderColor: Theme.colors.border,
  },
  micBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Theme.colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Theme.colors.secondary, shadowColor: Theme.colors.secondary, shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 5,
  },
  micBtnActive: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: Theme.colors.error, shadowColor: Theme.colors.error },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Theme.colors.secondary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Theme.colors.secondary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5,
  },
  sendBtnDisabled: { backgroundColor: Theme.colors.surface, borderColor: Theme.colors.border, borderWidth: 1, shadowOpacity: 0, elevation: 0 },
})
