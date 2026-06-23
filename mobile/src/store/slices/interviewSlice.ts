import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface InterviewSession {
  id: string;
  jobRole: string;
  experienceLevel: string;
  sessionType: string;
  startedAt: number;
  endedAt?: number;
  totalScore?: number;
  questionsAnswered?: number;
}

interface ConversationEntry {
  role: 'ai' | 'user';
  content: string;
  feedback?: any;
}

interface LatestFeedback {
  feedback: string;
  improved_answer: string;
  score: number;
  follow_up_question: string;
  telugu_guidance: string;
  grammar_issues: any[];
}

interface InterviewState {
  currentSession: InterviewSession | null;
  currentQuestion: string | null;
  conversationHistory: ConversationEntry[];
  sessionList: InterviewSession[];
  isAiThinking: boolean;
  latestFeedback: LatestFeedback | null;
  loading: boolean;
  error: string | null;
}

const initialState: InterviewState = {
  currentSession: null,
  currentQuestion: null,
  conversationHistory: [],
  sessionList: [],
  isAiThinking: false,
  latestFeedback: null,
  loading: false,
  error: null,
};

export const startInterviewSession = createAsyncThunk(
  'interview/startSession',
  async (
    {
      jobRole,
      experienceLevel,
      sessionType,
    }: { jobRole: string; experienceLevel: string; sessionType: string },
    { rejectWithValue }
  ) => {
    try {
      const session: InterviewSession = {
        id: `interview_${Date.now()}`,
        jobRole,
        experienceLevel,
        sessionType,
        startedAt: Date.now(),
      };
      const firstQuestion = `Tell me about yourself and your experience as a ${jobRole}.`;
      return { session, firstQuestion };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to start interview session');
    }
  }
);

export const submitInterviewAnswer = createAsyncThunk(
  'interview/submitAnswer',
  async (
    { question, answer }: { question: string; answer: string },
    { rejectWithValue }
  ) => {
    try {
      const feedback: LatestFeedback = {
        feedback: 'Good answer. You demonstrated understanding of the topic.',
        improved_answer: `${answer} Additionally, you could mention specific examples from your past experience.`,
        score: Math.floor(Math.random() * 30) + 70,
        follow_up_question: 'Can you give a specific example of a challenge you faced and how you resolved it?',
        telugu_guidance: 'మీ సమాధానం బాగుంది. మరింత నిర్దిష్టమైన ఉదాహరణలు చెప్పండి.',
        grammar_issues: [],
      };
      return { question, answer, feedback };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to submit answer');
    }
  }
);

export const endInterviewSession = createAsyncThunk(
  'interview/endSession',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { interview: InterviewState };
      const currentSession = state.interview.currentSession;
      if (!currentSession) {
        return rejectWithValue('No active session');
      }
      return {
        sessionId: currentSession.id,
        endedAt: Date.now(),
        totalScore: Math.floor(Math.random() * 20) + 75,
        questionsAnswered: state.interview.conversationHistory.filter(
          (e) => e.role === 'user'
        ).length,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to end session');
    }
  }
);

export const loadUserSessions = createAsyncThunk(
  'interview/loadUserSessions',
  async (_, { rejectWithValue }) => {
    try {
      return [] as InterviewSession[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load sessions');
    }
  }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(startInterviewSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startInterviewSession.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSession = action.payload.session;
        state.currentQuestion = action.payload.firstQuestion;
        state.conversationHistory = [
          { role: 'ai', content: action.payload.firstQuestion },
        ];
        state.latestFeedback = null;
      })
      .addCase(startInterviewSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(submitInterviewAnswer.pending, (state) => {
        state.isAiThinking = true;
        state.error = null;
      })
      .addCase(submitInterviewAnswer.fulfilled, (state, action) => {
        state.isAiThinking = false;
        state.conversationHistory.push({
          role: 'user',
          content: action.payload.answer,
        });
        state.conversationHistory.push({
          role: 'ai',
          content: action.payload.feedback.follow_up_question,
          feedback: action.payload.feedback,
        });
        state.latestFeedback = action.payload.feedback;
        state.currentQuestion = action.payload.feedback.follow_up_question;
      })
      .addCase(submitInterviewAnswer.rejected, (state, action) => {
        state.isAiThinking = false;
        state.error = action.payload as string;
      })
      .addCase(endInterviewSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(endInterviewSession.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentSession) {
          const completedSession: InterviewSession = {
            ...state.currentSession,
            endedAt: action.payload.endedAt,
            totalScore: action.payload.totalScore,
            questionsAnswered: action.payload.questionsAnswered,
          };
          state.sessionList.unshift(completedSession);
        }
        state.currentSession = null;
        state.currentQuestion = null;
        state.conversationHistory = [];
        state.latestFeedback = null;
      })
      .addCase(endInterviewSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(loadUserSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUserSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessionList = action.payload;
      })
      .addCase(loadUserSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default interviewSlice.reducer;
