import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../supabase'
import { getDailyChallenges, getVocabularyOfTheDay, getGrammarTipOfTheDay, getMotivationalQuote, getInterviewQuestionOfTheDay } from '../randomization/contentEngine'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface UserInsights {
  level: number
  streak: number
  weakTopics: string[]
  strongTopics: string[]
  recentActivity: string[]
  avgGrammarScore: number
  avgSpeakingScore: number
  avgPronunciationScore: number
  preferredCategory: string
  learningPace: 'slow' | 'medium' | 'fast'
}

export interface DailyFeed {
  greeting: string
  vocabularyOfDay: { word: string; meaning_telugu: string; example: string; category: string }
  grammarTip: { topic: string; tip: string; example_correct: string; example_wrong: string; telugu: string }
  interviewQuestion: { question: string; category: string; tips: string[]; telugu: string }
  motivationalQuote: { quote: string; author: string; telugu: string }
  dailyChallenges: any[]
  recommendedModules: Array<{ module: string; reason: string; route: string; icon: string }>
  pronunciationFocus: string
  speakingPrompt: string
}

const FEED_CACHE_KEY = (userId: string, date: string) => `daily_feed:${userId}:${date}`
const INSIGHTS_CACHE_KEY = (userId: string) => `user_insights:${userId}`

// ─── USER INSIGHTS ────────────────────────────────────────────────────────

export async function getUserInsights(userId: string): Promise<UserInsights> {
  // Try cache first (valid for 1 hour)
  try {
    const cached = await AsyncStorage.getItem(INSIGHTS_CACHE_KEY(userId))
    if (cached) {
      const { data, ts } = JSON.parse(cached)
      if (Date.now() - ts < 60 * 60 * 1000) return data
    }
  } catch {}

  // Fetch from Supabase in parallel
  const [profileRes, grammarRes, speakingRes, challengeRes] = await Promise.allSettled([
    supabase.from('profiles').select('current_level,streak_current,xp_total').eq('id', userId).single(),
    supabase.from('user_grammar_progress').select('topic,mastery_score').eq('user_id', userId),
    supabase.from('speaking_sessions').select('speaking_score,grammar_score,confidence_score').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
    supabase.from('challenge_history').select('challenge_type').eq('user_id', userId).order('completed_at', { ascending: false }).limit(20),
  ])

  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null
  const grammarProgress = grammarRes.status === 'fulfilled' ? (grammarRes.value.data ?? []) : []
  const speakingSessions = speakingRes.status === 'fulfilled' ? (speakingRes.value.data ?? []) : []
  const recentChallenges = challengeRes.status === 'fulfilled' ? (challengeRes.value.data ?? []) : []

  // Calculate weak/strong topics
  const weakTopics = grammarProgress
    .filter((g: any) => g.mastery_score < 50)
    .map((g: any) => g.topic)
    .slice(0, 3)
  const strongTopics = grammarProgress
    .filter((g: any) => g.mastery_score >= 80)
    .map((g: any) => g.topic)
    .slice(0, 3)

  // Calculate average scores
  const avgGrammarScore = speakingSessions.length
    ? speakingSessions.reduce((s: number, r: any) => s + (r.grammar_score ?? 70), 0) / speakingSessions.length
    : 70
  const avgSpeakingScore = speakingSessions.length
    ? speakingSessions.reduce((s: number, r: any) => s + (r.speaking_score ?? 70), 0) / speakingSessions.length
    : 70
  const avgPronunciationScore = speakingSessions.length
    ? speakingSessions.reduce((s: number, r: any) => s + (r.confidence_score ?? 70), 0) / speakingSessions.length
    : 70

  // Determine preferred category from recent activity
  const categoryCount: Record<string, number> = {}
  recentChallenges.forEach((c: any) => {
    categoryCount[c.challenge_type] = (categoryCount[c.challenge_type] ?? 0) + 1
  })
  const preferredCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'speaking'

  const insights: UserInsights = {
    level: profile?.current_level ?? 1,
    streak: profile?.streak_current ?? 0,
    weakTopics,
    strongTopics,
    recentActivity: recentChallenges.map((c: any) => c.challenge_type).slice(0, 5),
    avgGrammarScore,
    avgSpeakingScore,
    avgPronunciationScore,
    preferredCategory,
    learningPace: profile?.xp_total > 2000 ? 'fast' : profile?.xp_total > 500 ? 'medium' : 'slow',
  }

  // Cache insights
  try {
    await AsyncStorage.setItem(INSIGHTS_CACHE_KEY(userId), JSON.stringify({ data: insights, ts: Date.now() }))
  } catch {}

  return insights
}

// ─── MODULE RECOMMENDATIONS ───────────────────────────────────────────────

const MODULE_MAP: Record<string, { route: string; icon: string }> = {
  grammar: { route: '/features/grammar-engine', icon: 'book-open' },
  speaking: { route: '/features/public-speaking', icon: 'mic' },
  interview: { route: '/features/interview-training', icon: 'briefcase' },
  pronunciation: { route: '/lessons/pronunciation', icon: 'volume-2' },
  vocabulary: { route: '/lessons/flashcards', icon: 'layers' },
  email: { route: '/features/email-writing', icon: 'mail' },
  office: { route: '/features/office-conversations', icon: 'building' },
  greetings: { route: '/features/daily-greetings', icon: 'message-square' },
  phone: { route: '/features/phone-simulator', icon: 'phone' },
  quiz: { route: '/lessons/quiz', icon: 'check-square' },
}

function getRecommendedModules(insights: UserInsights): Array<{ module: string; reason: string; route: string; icon: string }> {
  const recs: Array<{ module: string; reason: string; route: string; icon: string; priority: number }> = []

  if (insights.weakTopics.length > 0) {
    recs.push({ module: 'grammar', reason: `Improve weak area: ${insights.weakTopics[0]}`, ...MODULE_MAP.grammar, priority: 10 })
  }
  if (insights.avgSpeakingScore < 70) {
    recs.push({ module: 'speaking', reason: 'Build speaking confidence', ...MODULE_MAP.speaking, priority: 9 })
  }
  if (insights.avgPronunciationScore < 70) {
    recs.push({ module: 'pronunciation', reason: 'Practice pronunciation', ...MODULE_MAP.pronunciation, priority: 8 })
  }
  if (insights.streak === 0) {
    recs.push({ module: 'greetings', reason: 'Start your daily streak', ...MODULE_MAP.greetings, priority: 7 })
  }
  if (insights.level < 3) {
    recs.push({ module: 'vocabulary', reason: 'Build core vocabulary', ...MODULE_MAP.vocabulary, priority: 6 })
  } else {
    recs.push({ module: 'interview', reason: 'Ready for advanced practice', ...MODULE_MAP.interview, priority: 5 })
  }
  // Fill remaining slots
  const allModules = ['email', 'office', 'phone', 'quiz']
  const usedModules = recs.map(r => r.module)
  allModules.filter(m => !usedModules.includes(m)).slice(0, 3 - recs.length).forEach(m => {
    if (MODULE_MAP[m]) recs.push({ module: m, reason: 'Explore new skill', ...MODULE_MAP[m], priority: 1 })
  })

  return recs.sort((a, b) => b.priority - a.priority).slice(0, 4).map(({ priority, ...rest }) => rest)
}

// ─── DAILY FEED GENERATOR ────────────────────────────────────────────────

export async function generateDailyFeed(userId: string): Promise<DailyFeed> {
  const insights = await getUserInsights(userId)
  const challenges = await getDailyChallenges(userId, 3)

  const hour = new Date().getHours()
  const greetingsList = hour < 12
    ? ['Good morning! Ready to learn?', 'Morning! Let\'s boost your English today.', 'Rise and shine! Time for some English practice.']
    : hour < 17
    ? ['Good afternoon! Let\'s practice!', 'Afternoon! Keep up the great momentum.', 'Hello! Ready for a quick learning session?']
    : ['Good evening! Evening learning is powerful!', 'Evening! Let\'s wind down with some English.', 'Great to see you tonight. Let\'s practice!']
    
  const greeting = greetingsList[Math.floor(Math.random() * greetingsList.length)]

  const pronunciationFocusOptions = ['office phrases', 'greeting expressions', 'interview vocabulary', 'phone conversation phrases', 'business terms']
  const seed = userId.charCodeAt(0) + new Date().getDate()
  const pronunciationFocus = pronunciationFocusOptions[seed % pronunciationFocusOptions.length]

  const speakingPrompts = [
    'Describe your typical Monday morning routine at work.',
    'Talk about a skill you are currently learning and why.',
    'Explain what you would do if you got a promotion today.',
    'Describe your ideal workplace environment.',
    'Talk about a professional challenge you overcame recently.',
    'Explain how technology has changed your work.',
    'Describe your communication style in 3 sentences.',
  ]
  const speakingPrompt = speakingPrompts[seed % speakingPrompts.length]

  const feed: DailyFeed = {
    greeting,
    vocabularyOfDay: getVocabularyOfTheDay(userId),
    grammarTip: getGrammarTipOfTheDay(userId),
    interviewQuestion: getInterviewQuestionOfTheDay(userId),
    motivationalQuote: getMotivationalQuote(userId),
    dailyChallenges: challenges,
    recommendedModules: getRecommendedModules(insights),
    pronunciationFocus,
    speakingPrompt,
  }


  return feed
}

// ─── FEED REFRESH ──────────────────────────────────────────────────────────

export async function invalidateDailyFeed(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  try {
    await AsyncStorage.removeItem(FEED_CACHE_KEY(userId, today))
    await AsyncStorage.removeItem(INSIGHTS_CACHE_KEY(userId))
  } catch {}
}
