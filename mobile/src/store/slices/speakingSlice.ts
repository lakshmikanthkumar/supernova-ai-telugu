import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface SpeakingSession {
  id: string;
  type: string;
  startedAt: number;
  endedAt?: number;
  transcript?: string;
  score?: {
    speaking: number;
    grammar: number;
    vocabulary: number;
    confidence: number;
  };
}

interface SpeakingState {
  currentSession: { id: string; type: string; startedAt: number } | null;
  sessionHistory: SpeakingSession[];
  isRecording: boolean;
  transcript: string;
  score: {
    speaking: number;
    grammar: number;
    vocabulary: number;
    confidence: number;
  } | null;
  aiFeedback: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: SpeakingState = {
  currentSession: null,
  sessionHistory: [],
  isRecording: false,
  transcript: '',
  score: null,
  aiFeedback: null,
  loading: false,
  error: null,
};

export const startSpeakingSession = createAsyncThunk(
  'speaking/startSession',
  async ({ type, referenceId }: { type: string; referenceId?: string }, { rejectWithValue }) => {
    try {
      const session = {
        id: `session_${Date.now()}`,
        type,
        startedAt: Date.now(),
        referenceId,
      };
      return session;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to start speaking session');
    }
  }
);

export const stopSpeakingSession = createAsyncThunk(
  'speaking/stopSession',
  async (transcript: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { speaking: SpeakingState };
      const currentSession = state.speaking.currentSession;
      if (!currentSession) {
        return rejectWithValue('No active session');
      }
      return {
        sessionId: currentSession.id,
        transcript,
        endedAt: Date.now(),
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to stop speaking session');
    }
  }
);

export const submitForFeedback = createAsyncThunk(
  'speaking/submitForFeedback',
  async (
    { transcript, sessionType }: { transcript: string; sessionType: string },
    { rejectWithValue }
  ) => {
    try {
      const mockScore = {
        speaking: Math.floor(Math.random() * 30) + 70,
        grammar: Math.floor(Math.random() * 30) + 70,
        vocabulary: Math.floor(Math.random() * 30) + 70,
        confidence: Math.floor(Math.random() * 30) + 70,
      };
      const mockFeedback = `Good attempt on your ${sessionType} session. Focus on pronunciation clarity and sentence structure.`;
      return { score: mockScore, feedback: mockFeedback };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get feedback');
    }
  }
);

const speakingSlice = createSlice({
  name: 'speaking',
  initialState,
  reducers: {
    setRecording(state, action: PayloadAction<boolean>) {
      state.isRecording = action.payload;
    },
    setTranscript(state, action: PayloadAction<string>) {
      state.transcript = action.payload;
    },
    setScore(
      state,
      action: PayloadAction<{
        speaking: number;
        grammar: number;
        vocabulary: number;
        confidence: number;
      }>
    ) {
      state.score = action.payload;
    },
    clearSession(state) {
      state.currentSession = null;
      state.isRecording = false;
      state.transcript = '';
      state.score = null;
      state.aiFeedback = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startSpeakingSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startSpeakingSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = {
          id: action.payload.id,
          type: action.payload.type,
          startedAt: action.payload.startedAt,
        };
        state.isRecording = true;
        state.transcript = '';
        state.score = null;
        state.aiFeedback = null;
      })
      .addCase(startSpeakingSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(stopSpeakingSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(stopSpeakingSession.fulfilled, (state, action) => {
        state.loading = false;
        state.isRecording = false;
        if (state.currentSession) {
          const completedSession: SpeakingSession = {
            ...state.currentSession,
            endedAt: action.payload.endedAt,
            transcript: action.payload.transcript,
          };
          state.sessionHistory.unshift(completedSession);
        }
        state.currentSession = null;
      })
      .addCase(stopSpeakingSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(submitForFeedback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitForFeedback.fulfilled, (state, action) => {
        state.loading = false;
        state.score = action.payload.score;
        state.aiFeedback = action.payload.feedback;
      })
      .addCase(submitForFeedback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setRecording, setTranscript, setScore, clearSession } = speakingSlice.actions;
export default speakingSlice.reducer;
