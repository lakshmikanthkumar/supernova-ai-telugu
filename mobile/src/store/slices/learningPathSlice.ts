import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface LearningModule {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  estimatedMinutes: number;
  completed: boolean;
  order: number;
}

interface LearningPath {
  id: string;
  userId: string;
  currentLevel: string;
  modules: LearningModule[];
  createdAt: number;
  updatedAt: number;
}

interface Recommendation {
  module: string;
  reason: string;
  priority: number;
}

interface WeeklyGoal {
  target: number;
  completed: number;
  type: string;
}

interface LearningPathState {
  path: LearningPath | null;
  recommendations: Recommendation[];
  weeklyGoal: WeeklyGoal;
  loading: boolean;
  generating: boolean;
  error: string | null;
}

const initialState: LearningPathState = {
  path: null,
  recommendations: [],
  weeklyGoal: {
    target: 5,
    completed: 0,
    type: 'lessons',
  },
  loading: false,
  generating: false,
  error: null,
};

export const fetchUserLearningPath = createAsyncThunk(
  'learningPath/fetchUserPath',
  async (userId: string, { rejectWithValue }) => {
    try {
      return null as LearningPath | null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch learning path');
    }
  }
);

export const generatePersonalizedPath = createAsyncThunk(
  'learningPath/generatePath',
  async (userId: string, { rejectWithValue }) => {
    try {
      const path: LearningPath = {
        id: `path_${Date.now()}`,
        userId,
        currentLevel: 'intermediate',
        modules: [
          {
            id: 'mod_1',
            title: 'Business Communication',
            type: 'speaking',
            difficulty: 'intermediate',
            estimatedMinutes: 15,
            completed: false,
            order: 1,
          },
          {
            id: 'mod_2',
            title: 'Grammar Fundamentals',
            type: 'grammar',
            difficulty: 'beginner',
            estimatedMinutes: 10,
            completed: false,
            order: 2,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const recommendations: Recommendation[] = [
        { module: 'Business Communication', reason: 'High demand skill for your career', priority: 1 },
        { module: 'Grammar Fundamentals', reason: 'Strengthen your foundation', priority: 2 },
      ];
      return { path, recommendations };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to generate learning path');
    }
  }
);

export const updateLearningPath = createAsyncThunk(
  'learningPath/updatePath',
  async (
    { userId, updates }: { userId: string; updates: Partial<LearningPath> },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { learningPath: LearningPathState };
      if (!state.learningPath.path) {
        return rejectWithValue('No learning path to update');
      }
      const updatedPath: LearningPath = {
        ...state.learningPath.path,
        ...updates,
        updatedAt: Date.now(),
      };
      return updatedPath;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update learning path');
    }
  }
);

const learningPathSlice = createSlice({
  name: 'learningPath',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserLearningPath.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserLearningPath.fulfilled, (state, action) => {
        state.loading = false;
        state.path = action.payload;
      })
      .addCase(fetchUserLearningPath.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(generatePersonalizedPath.pending, (state) => {
        state.generating = true;
        state.error = null;
      })
      .addCase(generatePersonalizedPath.fulfilled, (state, action) => {
        state.generating = false;
        state.path = action.payload.path;
        state.recommendations = action.payload.recommendations;
      })
      .addCase(generatePersonalizedPath.rejected, (state, action) => {
        state.generating = false;
        state.error = action.payload as string;
      })
      .addCase(updateLearningPath.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLearningPath.fulfilled, (state, action) => {
        state.loading = false;
        state.path = action.payload;
      })
      .addCase(updateLearningPath.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default learningPathSlice.reducer;
