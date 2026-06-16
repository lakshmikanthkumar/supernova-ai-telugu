import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { chatService } from '../../services/api'
import type { ChatMessage, GrammarCorrection } from '../../types'

interface ChatState {
  sessionId: string | null
  messages: ChatMessage[]
  isTyping: boolean
  loading: boolean
  error: string | null
  showTranslation: boolean
  showCorrections: boolean
  pendingCorrections: GrammarCorrection[]
}

const initialState: ChatState = {
  sessionId: null,
  messages: [],
  isTyping: false,
  loading: false,
  error: null,
  showTranslation: false,
  showCorrections: true,
  pendingCorrections: [],
}

export const startChatSession = createAsyncThunk(
  'chat/startSession',
  async ({ type, scenarioId, title }: { type: ChatMessage['role']; scenarioId?: string; title?: string }) => {
    const sessionId = await chatService.createSession(type as any, scenarioId, title)
    return sessionId
  }
)

export const loadSessionMessages = createAsyncThunk(
  'chat/loadMessages',
  async (sessionId: string) => chatService.getSessionMessages(sessionId)
)

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({
    sessionId, message, sessionType, scenarioId,
    includeCorrection, includeTranslation,
  }: {
    sessionId: string
    message: string
    sessionType: string
    scenarioId?: string
    includeCorrection?: boolean
    includeTranslation?: boolean
  }) => {
    return chatService.sendMessage(sessionId, message, sessionType, scenarioId, {
      includeCorrection, includeTranslation,
    })
  }
)

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSessionId(state, action: PayloadAction<string | null>) {
      state.sessionId = action.payload
    },
    addUserMessage(state, action: PayloadAction<{ content: string }>) {
      const msg: ChatMessage = {
        id: Date.now().toString(),
        session_id: state.sessionId || '',
        role: 'user',
        content: action.payload.content,
        audio_url: null,
        grammar_corrections: [],
        pronunciation_score: null,
        translations: {},
        created_at: new Date().toISOString(),
      }
      state.messages.push(msg)
    },
    setTyping(state, action: PayloadAction<boolean>) {
      state.isTyping = action.payload
    },
    toggleTranslation(state) {
      state.showTranslation = !state.showTranslation
    },
    toggleCorrections(state) {
      state.showCorrections = !state.showCorrections
    },
    clearChat(state) {
      state.messages = []
      state.sessionId = null
      state.error = null
      state.pendingCorrections = []
    },
    setPendingCorrections(state, action: PayloadAction<GrammarCorrection[]>) {
      state.pendingCorrections = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startChatSession.fulfilled, (state, action) => {
        state.sessionId = action.payload
        state.messages = []
      })
      .addCase(loadSessionMessages.fulfilled, (state, action) => {
        state.messages = action.payload
      })
      .addCase(sendMessage.pending, (state) => {
        state.isTyping = true
        state.error = null
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isTyping = false
        // Add assistant message
        const assistantMsg: ChatMessage = {
          id: Date.now().toString(),
          session_id: state.sessionId || '',
          role: 'assistant',
          content: action.payload.message,
          audio_url: null,
          grammar_corrections: [],
          pronunciation_score: null,
          translations: action.payload.translation
            ? { telugu: action.payload.translation }
            : {},
          created_at: new Date().toISOString(),
        }
        state.messages.push(assistantMsg)
        // Update user message with corrections if any
        if (action.payload.corrections?.length > 0) {
          const lastUserMsg = [...state.messages].reverse().find(m => m.role === 'user')
          if (lastUserMsg) {
            lastUserMsg.grammar_corrections = action.payload.corrections
          }
          state.pendingCorrections = action.payload.corrections
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isTyping = false
        state.error = action.error.message || 'Failed to send message'
      })
  },
})

export const {
  setSessionId, addUserMessage, setTyping, toggleTranslation,
  toggleCorrections, clearChat, setPendingCorrections,
} = chatSlice.actions

export default chatSlice.reducer
