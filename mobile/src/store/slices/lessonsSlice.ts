import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { lessonService, flashcardService } from '../../services/api'
import type { Lesson, LessonCategory, Flashcard } from '../../types'

interface LessonsState {
  categories: LessonCategory[]
  lessonsByCategory: Record<string, Lesson[]>
  currentLesson: Lesson | null
  flashcards: Flashcard[]
  loading: boolean
  error: string | null
  searchResults: Lesson[]
}

const initialState: LessonsState = {
  categories: [],
  lessonsByCategory: {},
  currentLesson: null,
  flashcards: [],
  loading: false,
  error: null,
  searchResults: [],
}

export const fetchCategories = createAsyncThunk(
  'lessons/fetchCategories',
  async () => lessonService.getCategories()
)

export const fetchLessonsByCategory = createAsyncThunk(
  'lessons/fetchByCategory',
  async (categoryId: string) => {
    const lessons = await lessonService.getLessonsByCategory(categoryId)
    return { categoryId, lessons }
  }
)

export const fetchLesson = createAsyncThunk(
  'lessons/fetchLesson',
  async (lessonId: string) => lessonService.getLessonById(lessonId)
)

export const fetchFlashcards = createAsyncThunk(
  'lessons/fetchFlashcards',
  async ({ lessonId, categoryId }: { lessonId?: string; categoryId?: string }) =>
    flashcardService.getFlashcards(lessonId, categoryId)
)

export const searchLessons = createAsyncThunk(
  'lessons/search',
  async (query: string) => lessonService.searchLessons(query)
)

const lessonsSlice = createSlice({
  name: 'lessons',
  initialState,
  reducers: {
    clearCurrentLesson(state) {
      state.currentLesson = null
    },
    clearSearchResults(state) {
      state.searchResults = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => { state.loading = true })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload
        state.loading = false
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch categories'
        state.loading = false
      })
      .addCase(fetchLessonsByCategory.fulfilled, (state, action) => {
        state.lessonsByCategory[action.payload.categoryId] = action.payload.lessons
      })
      .addCase(fetchLesson.fulfilled, (state, action) => {
        state.currentLesson = action.payload
      })
      .addCase(fetchFlashcards.pending, (state) => { state.loading = true })
      .addCase(fetchFlashcards.fulfilled, (state, action) => {
        state.flashcards = action.payload
        state.loading = false
      })
      .addCase(fetchFlashcards.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch flashcards'
        state.loading = false
      })
      .addCase(searchLessons.fulfilled, (state, action) => {
        state.searchResults = action.payload
      })
  },
})

export const { clearCurrentLesson, clearSearchResults } = lessonsSlice.actions
export default lessonsSlice.reducer
