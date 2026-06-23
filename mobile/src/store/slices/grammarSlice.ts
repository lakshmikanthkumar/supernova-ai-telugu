import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface GrammarExercise {
  id: string;
  topic: string;
  difficulty: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
}

interface GrammarCheckResult {
  errors: any[];
  overall_score: number;
  suggestions: string[];
}

interface CurrentQuiz {
  questions: any[];
  currentIndex: number;
  answers: number[];
}

interface GrammarState {
  exercises: GrammarExercise[];
  userProgress: Record<string, { mastery_score: number; exercises_completed: number }>;
  currentExercise: GrammarExercise | null;
  currentQuiz: CurrentQuiz | null;
  grammarCheckResult: GrammarCheckResult | null;
  loadingExercises: boolean;
  checkingGrammar: boolean;
  error: string | null;
}

const initialState: GrammarState = {
  exercises: [],
  userProgress: {},
  currentExercise: null,
  currentQuiz: null,
  grammarCheckResult: null,
  loadingExercises: false,
  checkingGrammar: false,
  error: null,
};

export const fetchGrammarExercises = createAsyncThunk(
  'grammar/fetchExercises',
  async (_, { rejectWithValue }) => {
    try {
      return [] as GrammarExercise[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch grammar exercises');
    }
  }
);

export const fetchUserGrammarProgress = createAsyncThunk(
  'grammar/fetchUserProgress',
  async (userId: string, { rejectWithValue }) => {
    try {
      return {} as Record<string, { mastery_score: number; exercises_completed: number }>;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user grammar progress');
    }
  }
);

export const checkGrammarText = createAsyncThunk(
  'grammar/checkText',
  async (text: string, { rejectWithValue }) => {
    try {
      const result: GrammarCheckResult = {
        errors: [],
        overall_score: 88,
        suggestions: ['Consider using active voice for clarity.', 'Great sentence structure overall.'],
      };
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to check grammar');
    }
  }
);

export const generateGrammarQuiz = createAsyncThunk(
  'grammar/generateQuiz',
  async (
    { topic, difficulty }: { topic: string; difficulty: string },
    { rejectWithValue }
  ) => {
    try {
      const quiz: CurrentQuiz = {
        questions: [
          {
            id: `q_${Date.now()}`,
            question: `Which sentence correctly uses the ${topic} grammar rule?`,
            options: [
              'She go to school every day.',
              'She goes to school every day.',
              'She going to school every day.',
              'She gone to school every day.',
            ],
            correctAnswer: 1,
            explanation: 'Third person singular present tense requires -s/-es suffix.',
          },
        ],
        currentIndex: 0,
        answers: [],
      };
      return quiz;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to generate grammar quiz');
    }
  }
);

export const submitQuizAnswer = createAsyncThunk(
  'grammar/submitQuizAnswer',
  async (
    { questionIndex, answer }: { questionIndex: number; answer: number },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { grammar: GrammarState };
      const quiz = state.grammar.currentQuiz;
      if (!quiz) {
        return rejectWithValue('No active quiz');
      }
      const updatedAnswers = [...quiz.answers];
      updatedAnswers[questionIndex] = answer;
      const nextIndex = questionIndex + 1;
      return { answers: updatedAnswers, nextIndex };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to submit quiz answer');
    }
  }
);

const grammarSlice = createSlice({
  name: 'grammar',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGrammarExercises.pending, (state) => {
        state.loadingExercises = true;
        state.error = null;
      })
      .addCase(fetchGrammarExercises.fulfilled, (state, action) => {
        state.loadingExercises = false;
        state.exercises = action.payload;
      })
      .addCase(fetchGrammarExercises.rejected, (state, action) => {
        state.loadingExercises = false;
        state.error = action.payload as string;
      })
      .addCase(fetchUserGrammarProgress.pending, (state) => {
        state.loadingExercises = true;
        state.error = null;
      })
      .addCase(fetchUserGrammarProgress.fulfilled, (state, action) => {
        state.loadingExercises = false;
        state.userProgress = action.payload;
      })
      .addCase(fetchUserGrammarProgress.rejected, (state, action) => {
        state.loadingExercises = false;
        state.error = action.payload as string;
      })
      .addCase(checkGrammarText.pending, (state) => {
        state.checkingGrammar = true;
        state.error = null;
      })
      .addCase(checkGrammarText.fulfilled, (state, action) => {
        state.checkingGrammar = false;
        state.grammarCheckResult = action.payload;
      })
      .addCase(checkGrammarText.rejected, (state, action) => {
        state.checkingGrammar = false;
        state.error = action.payload as string;
      })
      .addCase(generateGrammarQuiz.pending, (state) => {
        state.loadingExercises = true;
        state.error = null;
      })
      .addCase(generateGrammarQuiz.fulfilled, (state, action) => {
        state.loadingExercises = false;
        state.currentQuiz = action.payload;
      })
      .addCase(generateGrammarQuiz.rejected, (state, action) => {
        state.loadingExercises = false;
        state.error = action.payload as string;
      })
      .addCase(submitQuizAnswer.pending, (state) => {
        state.error = null;
      })
      .addCase(submitQuizAnswer.fulfilled, (state, action) => {
        if (state.currentQuiz) {
          state.currentQuiz.answers = action.payload.answers;
          state.currentQuiz.currentIndex = action.payload.nextIndex;
        }
      })
      .addCase(submitQuizAnswer.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export default grammarSlice.reducer;
