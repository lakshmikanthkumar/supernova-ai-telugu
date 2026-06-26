import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface DailyGreeting {
  id: string;
  category: string;
  english: string;
  telugu: string;
  transliteration: string;
  audioUrl?: string;
  date?: string;
  usageContext: string;
}

interface GreetingsState {
  todayGreeting: DailyGreeting | null;
  allGreetings: DailyGreeting[];
  selectedCategory: string;
  practiceScore: number | null;
  isPlaying: boolean;
  loading: boolean;
}

const initialState: GreetingsState = {
  todayGreeting: null,
  allGreetings: [],
  selectedCategory: 'all',
  practiceScore: null,
  isPlaying: false,
  loading: false,
};

export const fetchTodayGreeting = createAsyncThunk(
  'greetings/fetchTodayGreeting',
  async (_, { rejectWithValue }) => {
    try {
      const greeting: DailyGreeting = {
        id: `greeting_${Date.now()}`,
        category: 'formal',
        english: 'Good morning! How are you?',
        telugu: 'శుభోదయం! మీరు ఎలా ఉన్నారు?',
        transliteration: 'Shubhodayam! Meeru ela unnaru?',
        usageContext: 'Use this greeting in professional settings in the morning.',
        date: new Date().toISOString().split('T')[0],
      };
      return greeting;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch today greeting');
    }
  }
);

export const fetchAllGreetings = createAsyncThunk(
  'greetings/fetchAllGreetings',
  async (_, { rejectWithValue }) => {
    try {
      return [] as DailyGreeting[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch greetings');
    }
  }
);

export const fetchGreetingsByCategory = createAsyncThunk(
  'greetings/fetchByCategory',
  async (category: string, { rejectWithValue }) => {
    try {
      return [] as DailyGreeting[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch greetings by category');
    }
  }
);

const greetingsSlice = createSlice({
  name: 'greetings',
  initialState,
  reducers: {
    setSelectedCategory(state, action: PayloadAction<string>) {
      state.selectedCategory = action.payload;
    },
    setPracticeScore(state, action: PayloadAction<number | null>) {
      state.practiceScore = action.payload;
    },
    setIsPlaying(state, action: PayloadAction<boolean>) {
      state.isPlaying = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayGreeting.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTodayGreeting.fulfilled, (state, action) => {
        state.loading = false;
        state.todayGreeting = action.payload;
      })
      .addCase(fetchTodayGreeting.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchAllGreetings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllGreetings.fulfilled, (state, action) => {
        state.loading = false;
        state.allGreetings = action.payload;
      })
      .addCase(fetchAllGreetings.rejected, (state) => {
        state.loading = false;
      })
      .addCase(fetchGreetingsByCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGreetingsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.allGreetings = action.payload;
      })
      .addCase(fetchGreetingsByCategory.rejected, (state) => {
        state.loading = false;
      });
  },
});

export const { setSelectedCategory, setPracticeScore, setIsPlaying } = greetingsSlice.actions;
export default greetingsSlice.reducer;
