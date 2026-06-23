import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface EmailTemplate {
  id: string;
  category: string;
  title: string;
  subject: string;
  body: string;
  formality_level: string;
}

interface GeneratedEmail {
  subject: string;
  body: string;
  formality_score: number;
  telugu_explanation: string;
}

interface EmailState {
  templates: EmailTemplate[];
  selectedCategory: string | null;
  userDraft: string;
  generatedEmail: GeneratedEmail | null;
  isGenerating: boolean;
  loadingTemplates: boolean;
  error: string | null;
}

const initialState: EmailState = {
  templates: [],
  selectedCategory: null,
  userDraft: '',
  generatedEmail: null,
  isGenerating: false,
  loadingTemplates: false,
  error: null,
};

export const fetchEmailTemplates = createAsyncThunk(
  'email/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      return [] as EmailTemplate[];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch email templates');
    }
  }
);

export const generateEmail = createAsyncThunk(
  'email/generateEmail',
  async (
    { category, context }: { category: string; context: string },
    { rejectWithValue }
  ) => {
    try {
      const generated: GeneratedEmail = {
        subject: `Professional Email - ${category}`,
        body: `Dear Sir/Madam,\n\nI am writing to you regarding ${context}.\n\nThank you for your time and consideration.\n\nBest regards`,
        formality_score: 85,
        telugu_explanation: 'ఈ ఇమెయిల్ వృత్తిపరంగా రాయబడింది మరియు సరైన శైలిలో ఉంది.',
      };
      return generated;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to generate email');
    }
  }
);

export const improveEmail = createAsyncThunk(
  'email/improveEmail',
  async (draft: string, { rejectWithValue }) => {
    try {
      const improved: GeneratedEmail = {
        subject: 'Improved Email Subject',
        body: draft + '\n\n[Improved for clarity and professionalism]',
        formality_score: 90,
        telugu_explanation: 'మీ ఇమెయిల్ మెరుగుపరచబడింది. స్పష్టత మరియు వృత్తి నైపుణ్యం పెరిగింది.',
      };
      return improved;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to improve email');
    }
  }
);

export const simplifyEmail = createAsyncThunk(
  'email/simplifyEmail',
  async (draft: string, { rejectWithValue }) => {
    try {
      const simplified: GeneratedEmail = {
        subject: 'Simplified Email',
        body: draft.substring(0, Math.ceil(draft.length * 0.7)) + '\n\n[Simplified version]',
        formality_score: 75,
        telugu_explanation: 'మీ ఇమెయిల్ సరళంగా చేయబడింది. అర్థం చేసుకోవడం సులభం అవుతుంది.',
      };
      return simplified;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to simplify email');
    }
  }
);

const emailSlice = createSlice({
  name: 'email',
  initialState,
  reducers: {
    setDraft(state, action: PayloadAction<string>) {
      state.userDraft = action.payload;
    },
    selectCategory(state, action: PayloadAction<string | null>) {
      state.selectedCategory = action.payload;
    },
    clearGenerated(state) {
      state.generatedEmail = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmailTemplates.pending, (state) => {
        state.loadingTemplates = true;
        state.error = null;
      })
      .addCase(fetchEmailTemplates.fulfilled, (state, action) => {
        state.loadingTemplates = false;
        state.templates = action.payload;
      })
      .addCase(fetchEmailTemplates.rejected, (state, action) => {
        state.loadingTemplates = false;
        state.error = action.payload as string;
      })
      .addCase(generateEmail.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateEmail.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.generatedEmail = action.payload;
      })
      .addCase(generateEmail.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      })
      .addCase(improveEmail.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(improveEmail.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.generatedEmail = action.payload;
      })
      .addCase(improveEmail.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      })
      .addCase(simplifyEmail.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(simplifyEmail.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.generatedEmail = action.payload;
      })
      .addCase(simplifyEmail.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload as string;
      });
  },
});

export const { setDraft, selectCategory, clearGenerated } = emailSlice.actions;
export default emailSlice.reducer;
