import { supabase } from '../supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getRandomUnseenContent, smartSortFlashcards, randomizeQuizQuestions,
  getPronunciationQueue, markContentSeen, seededShuffle, getDailyChallenges,
  ContentItem, SmartFlashcard,
} from '../randomization/contentEngine'

// ─── DYNAMIC FLASHCARDS ───────────────────────────────────────────────────

export async function getDynamicFlashcards(
  userId: string,
  options: { mode?: 'smart' | 'shuffle' | 'weak_first' | 'new_only'; limit?: number } = {}
): Promise<any[]> {
  const { mode = 'smart', limit = 20 } = options

  // Fetch all flashcards with user progress
  const { data: flashcards } = await supabase
    .from('flashcards')
    .select(`
      id, english_word, telugu_meaning, pronunciation_guide,
      example_sentence, difficulty, category_id,
      user_flashcard_progress!left(
        review_count, correct_count, ease_factor, interval_days, next_review_at
      )
    `)
    .limit(200)

  if (!flashcards?.length) return []

  // Flatten the join
  const enriched: SmartFlashcard[] = flashcards.map((f: any) => {
    const progress = f.user_flashcard_progress?.[0] ?? {}
    return {
      id: f.id,
      type: 'flashcard',
      english_word: f.english_word,
      telugu_meaning: f.telugu_meaning,
      pronunciation_guide: f.pronunciation_guide,
      example_sentence: f.example_sentence,
      difficulty: f.difficulty,
      category: f.category_id,
      ease_factor: progress.ease_factor ?? 2.5,
      interval_days: progress.interval_days ?? 1,
      next_review_at: progress.next_review_at,
      correct_count: progress.correct_count ?? 0,
      review_count: progress.review_count ?? 0,
    }
  })

  let result: SmartFlashcard[]

  switch (mode) {
    case 'smart':
      result = smartSortFlashcards(enriched, userId).slice(0, limit)
      break
    case 'shuffle':
      result = await getRandomUnseenContent(userId, enriched, { maxItems: limit, avoidRecentHours: 12 })
      break
    case 'weak_first':
      result = enriched
        .filter(f => f.review_count && (f.correct_count ?? 0) / f.review_count < 0.6)
        .sort((a, b) => (a.correct_count ?? 0) / (a.review_count || 1) - (b.correct_count ?? 0) / (b.review_count || 1))
        .slice(0, limit)
      if (result.length < limit) {
        const extra = await getRandomUnseenContent(userId, enriched.filter(f => !result.find(r => r.id === f.id)), { maxItems: limit - result.length })
        result = [...result, ...extra]
      }
      break
    case 'new_only':
      result = enriched.filter(f => !f.review_count || f.review_count === 0).slice(0, limit)
      break
    default:
      result = smartSortFlashcards(enriched, userId).slice(0, limit)
  }

  return result
}

// ─── DYNAMIC QUIZ QUESTIONS ───────────────────────────────────────────────

export async function getDynamicQuizQuestions(
  userId: string,
  options: { lessonId?: string; topic?: string; difficulty?: number; count?: number } = {}
): Promise<any[]> {
  const { lessonId, topic, difficulty, count = 10 } = options

  let query = supabase.from('quiz_questions').select('*')
  if (lessonId) query = query.eq('lesson_id', lessonId)
  if (difficulty) query = query.eq('difficulty_level', difficulty)

  const { data: questions } = await query.limit(100)
  if (!questions?.length) return []

  const items: ContentItem[] = questions.map((q: any) => ({
    id: q.id,
    type: 'quiz_question',
    difficulty: q.difficulty_level,
    category: q.question_type,
    ...q,
  }))

  // Get unseen questions first
  const unseen = await getRandomUnseenContent(userId, items, {
    avoidRecentHours: 48,
    maxItems: count,
    preferDifficulty: difficulty,
  })

  // Randomize question order and shuffle answer options
  return randomizeQuizQuestions(unseen, userId, count)
}

// ─── DYNAMIC PRONUNCIATION PHRASES ───────────────────────────────────────

export async function getDynamicPronunciationPhrases(
  userId: string,
  options: { category?: string; difficulty?: number; count?: number } = {}
): Promise<any[]> {
  const { category, difficulty, count = 10 } = options

  let query = supabase.from('pronunciation_phrases').select('*')
  if (category) query = query.eq('category', category)
  if (difficulty) query = query.lte('difficulty', difficulty)

  const { data: phrases } = await query.limit(100)
  if (!phrases?.length) return []

  const items: ContentItem[] = phrases.map((p: any) => ({
    id: p.id,
    type: 'pronunciation_phrase',
    difficulty: p.difficulty,
    category: p.category,
    ...p,
  }))

  return getPronunciationQueue(userId, items, count)
}

// ─── DYNAMIC OFFICE SCENARIOS ─────────────────────────────────────────────

export async function getDynamicOfficeScenarios(
  userId: string,
  count = 5
): Promise<any[]> {
  const { data: scenarios } = await supabase
    .from('office_scenarios')
    .select('*')
    .limit(50)

  if (!scenarios?.length) return []

  const items: ContentItem[] = scenarios.map((s: any) => ({
    id: s.id,
    type: 'office_scenario',
    difficulty: s.difficulty,
    category: s.category,
    ...s,
  }))

  return getRandomUnseenContent(userId, items, {
    avoidRecentHours: 72,
    maxItems: count,
  })
}

// ─── DYNAMIC INTERVIEW QUESTIONS ─────────────────────────────────────────

const DYNAMIC_INTERVIEW_QUESTIONS = [
  { id: 'iq1', type: 'interview_question', category: 'HR', difficulty: 1, question: 'Tell me about yourself.', tips: ['Use PAT method', 'Keep under 2 minutes'], telugu_tip: 'Present-Past-Future order లో చెప్పండి' },
  { id: 'iq2', type: 'interview_question', category: 'HR', difficulty: 1, question: 'What are your strengths?', tips: ['Give 2-3 with examples'], telugu_tip: 'ప్రతి strength కి ఒక example ఇవ్వండి' },
  { id: 'iq3', type: 'interview_question', category: 'Behavioral', difficulty: 2, question: 'Describe a time you handled a difficult situation at work.', tips: ['Use STAR method'], telugu_tip: 'STAR: Situation, Task, Action, Result' },
  { id: 'iq4', type: 'interview_question', category: 'HR', difficulty: 1, question: 'Where do you see yourself in 5 years?', tips: ['Show ambition', 'Align with company'], telugu_tip: 'Company తో పాటు grow అవ్వాలని చూపించండి' },
  { id: 'iq5', type: 'interview_question', category: 'Technical', difficulty: 3, question: 'How do you prioritize tasks when you have multiple deadlines?', tips: ['Mention tools', 'Give example'], telugu_tip: 'Priority matrix గురించి మాట్లాడండి' },
  { id: 'iq6', type: 'interview_question', category: 'Behavioral', difficulty: 2, question: 'Tell me about a time you worked in a team.', tips: ['Focus on collaboration', 'Highlight your role'], telugu_tip: 'మీ specific contribution చెప్పండి' },
  { id: 'iq7', type: 'interview_question', category: 'HR', difficulty: 2, question: 'Why should we hire you?', tips: ['Connect skills to job', 'Be confident'], telugu_tip: 'మీ unique value proposition చెప్పండి' },
  { id: 'iq8', type: 'interview_question', category: 'HR', difficulty: 2, question: 'What is your greatest weakness?', tips: ['Be honest', 'Show improvement plan'], telugu_tip: 'నిజమైన weakness + overcome plan చెప్పండి' },
  { id: 'iq9', type: 'interview_question', category: 'Technical', difficulty: 3, question: 'Describe your problem-solving approach.', tips: ['Use examples', 'Mention specific steps'], telugu_tip: 'Step-by-step approach చెప్పండి' },
  { id: 'iq10', type: 'interview_question', category: 'HR', difficulty: 1, question: 'Do you prefer working alone or in a team?', tips: ['Show flexibility', 'Give examples of both'], telugu_tip: 'రెండింటిలోనూ comfortable అని చూపించండి' },
]

export async function getDynamicInterviewQuestions(userId: string, count = 5): Promise<typeof DYNAMIC_INTERVIEW_QUESTIONS> {
  return getRandomUnseenContent(userId, DYNAMIC_INTERVIEW_QUESTIONS, { avoidRecentHours: 24, maxItems: count }) as any
}

// ─── SPEAKING PROMPTS ─────────────────────────────────────────────────────

const SPEAKING_PROMPTS = [
  { id: 'sp1', type: 'speaking_prompt', category: 'professional', difficulty: 2, prompt: 'Describe your typical workday from morning to evening.', duration_minutes: 3 },
  { id: 'sp2', type: 'speaking_prompt', category: 'public_speaking', difficulty: 3, prompt: 'Give a 2-minute speech on why English is important for your career.', duration_minutes: 2 },
  { id: 'sp3', type: 'speaking_prompt', category: 'interview', difficulty: 2, prompt: 'Introduce yourself as if you are in a job interview.', duration_minutes: 2 },
  { id: 'sp4', type: 'speaking_prompt', category: 'casual', difficulty: 1, prompt: 'Talk about your hometown and what makes it special.', duration_minutes: 2 },
  { id: 'sp5', type: 'speaking_prompt', category: 'professional', difficulty: 3, prompt: 'Present a project update to your team in 2 minutes.', duration_minutes: 2 },
  { id: 'sp6', type: 'speaking_prompt', category: 'debate', difficulty: 4, prompt: 'Argue for or against: "Work from home is better than office work."', duration_minutes: 3 },
  { id: 'sp7', type: 'speaking_prompt', category: 'storytelling', difficulty: 2, prompt: 'Tell a short story about a challenge you overcame.', duration_minutes: 3 },
  { id: 'sp8', type: 'speaking_prompt', category: 'professional', difficulty: 2, prompt: 'Explain your area of expertise to someone who knows nothing about it.', duration_minutes: 2 },
]

export async function getDynamicSpeakingPrompts(userId: string, count = 3): Promise<typeof SPEAKING_PROMPTS> {
  return getRandomUnseenContent(userId, SPEAKING_PROMPTS, { avoidRecentHours: 24, maxItems: count }) as any
}

// ─── MARK CONTENT COMPLETED ───────────────────────────────────────────────

export async function recordContentSeen(userId: string, type: string, contentId: string, score?: number) {
  await markContentSeen(userId, type, contentId, score)

  // Also record in Supabase for cross-device sync (fire and forget)
  supabase.from('user_content_history').upsert({
    user_id: userId,
    content_type: type as any,
    content_id: contentId,
    seen_at: new Date().toISOString(),
    score: score ?? null,
  }, { onConflict: 'user_id,content_type,content_id' }).then(() => {})
}
