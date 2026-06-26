import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ContentItem {
  id: string
  type: string
  difficulty?: number
  category?: string
  lastSeen?: number
  timesShown?: number
  userScore?: number
}

export interface SelectionOptions {
  avoidRecentHours?: number    // don't show items seen within N hours (default 24)
  maxItems?: number            // how many to return
  preferDifficulty?: number    // target difficulty level
  preferCategories?: string[]  // prefer these categories
  shuffleResult?: boolean      // shuffle final result
}

// ─── STORAGE KEYS ──────────────────────────────────────────────────────────

const HISTORY_KEY = (userId: string, type: string) => `content:history:${userId}:${type}`
const DAILY_SEED_KEY = (userId: string) => `content:daily_seed:${userId}`
const SESSION_SEEN_KEY = `content:session_seen`

// ─── SEEDED DAILY RANDOM ───────────────────────────────────────────────────
// Same user gets same "random" order per day, different each day

function getDailySeed(userId: string): number {
  // Return a random seed every time to ensure all challenges, tasks, and recommendations
  // are dynamically randomized whenever the app or screen is loaded.
  return Math.floor(Math.random() * 1000000)
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000
  return x - Math.floor(x)
}

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed, i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── WEIGHTED RANDOM ──────────────────────────────────────────────────────

export function weightedRandom<T extends { weight?: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight ?? 1), 0)
  let random = Math.random() * totalWeight
  for (const item of items) {
    random -= (item.weight ?? 1)
    if (random <= 0) return item
  }
  return items[items.length - 1]
}

// ─── CONTENT HISTORY TRACKING ─────────────────────────────────────────────

export async function markContentSeen(
  userId: string,
  type: string,
  contentId: string,
  score?: number
): Promise<void> {
  try {
    const key = HISTORY_KEY(userId, type)
    const raw = await AsyncStorage.getItem(key)
    const history: Record<string, { seenAt: number; timesShown: number; score?: number }> =
      raw ? JSON.parse(raw) : {}

    history[contentId] = {
      seenAt: Date.now(),
      timesShown: (history[contentId]?.timesShown ?? 0) + 1,
      score,
    }

    // Keep only last 200 entries per type to prevent bloat
    const entries = Object.entries(history)
    if (entries.length > 200) {
      const sorted = entries.sort((a, b) => b[1].seenAt - a[1].seenAt).slice(0, 150)
      await AsyncStorage.setItem(key, JSON.stringify(Object.fromEntries(sorted)))
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(history))
    }
  } catch {}
}

export async function getContentHistory(
  userId: string,
  type: string
): Promise<Record<string, { seenAt: number; timesShown: number; score?: number }>> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY(userId, type))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// ─── SMART CONTENT SELECTOR ───────────────────────────────────────────────

export async function getRandomUnseenContent<T extends ContentItem>(
  userId: string,
  items: T[],
  options: SelectionOptions = {}
): Promise<T[]> {
  const {
    avoidRecentHours = 24,
    maxItems = 10,
    preferDifficulty,
    preferCategories = [],
    shuffleResult = true,
  } = options

  const history = await getContentHistory(userId, items[0]?.type ?? 'unknown')
  const now = Date.now()
  const avoidMs = avoidRecentHours * 60 * 60 * 1000

  // Separate into unseen, old-seen, recent-seen
  const unseen: T[] = []
  const oldSeen: T[] = []
  const recentSeen: T[] = []

  for (const item of items) {
    const entry = history[item.id]
    if (!entry) {
      unseen.push(item)
    } else if (now - entry.seenAt > avoidMs) {
      oldSeen.push(item)
    } else {
      recentSeen.push(item)
    }
  }

  // Build candidate pool: unseen first, then old-seen, then recent if needed
  let pool = [...unseen, ...oldSeen]
  if (pool.length < maxItems) pool = [...pool, ...recentSeen]

  // Apply difficulty preference (±1 range)
  if (preferDifficulty !== undefined) {
    const preferred = pool.filter(
      i => Math.abs((i.difficulty ?? 3) - preferDifficulty) <= 1
    )
    if (preferred.length >= maxItems) pool = preferred
  }

  // Apply category preference (boost preferred categories to front)
  if (preferCategories.length > 0) {
    const preferred = pool.filter(i => preferCategories.includes(i.category ?? ''))
    const others = pool.filter(i => !preferCategories.includes(i.category ?? ''))
    pool = [...preferred, ...others]
  }

  // Get daily seed for consistent-per-day shuffle
  const seed = getDailySeed(userId)
  const result = shuffleResult ? seededShuffle(pool, seed) : pool

  return result.slice(0, maxItems)
}

// ─── SESSION-LEVEL DEDUP ──────────────────────────────────────────────────
// Avoid showing same item twice in current app session

let sessionSeenIds = new Set<string>()

export function markSeenThisSession(id: string) {
  sessionSeenIds.add(id)
}

export function filterSessionSeen<T extends { id: string }>(items: T[]): T[] {
  return items.filter(item => !sessionSeenIds.has(item.id))
}

export function clearSessionHistory() {
  sessionSeenIds = new Set()
}

// ─── QUIZ QUESTION RANDOMIZER ─────────────────────────────────────────────

export function randomizeQuizQuestions<T extends { id: string; options?: string[] | null }>(
  questions: T[],
  userId: string,
  count = 10
): T[] {
  const seed = getDailySeed(userId)
  const shuffled = seededShuffle(questions, seed)
  const selected = shuffled.slice(0, Math.min(count, shuffled.length))

  // Also shuffle the options within each question
  return selected.map((q, i) => ({
    ...q,
    options: q.options
      ? seededShuffle([...q.options], seed + i + 1)
      : q.options,
  }))
}

// ─── FLASHCARD SMART SORT ─────────────────────────────────────────────────
// SM-2 inspired: surface due cards first, then weak cards, then random

export interface SmartFlashcard extends ContentItem {
  ease_factor?: number
  interval_days?: number
  next_review_at?: string
  correct_count?: number
  review_count?: number
}

export function smartSortFlashcards<T extends SmartFlashcard>(
  cards: T[],
  userId: string
): T[] {
  const now = new Date()
  const seed = getDailySeed(userId)

  const due: T[] = []
  const weak: T[] = []
  const normal: T[] = []

  for (const card of cards) {
    const nextReview = card.next_review_at ? new Date(card.next_review_at) : null
    const isDue = !nextReview || nextReview <= now
    const accuracy = card.review_count
      ? (card.correct_count ?? 0) / card.review_count
      : 1
    const isWeak = accuracy < 0.6 && (card.review_count ?? 0) > 2

    if (isDue && isWeak) due.push(card)
    else if (isWeak) weak.push(card)
    else normal.push(card)
  }

  // Due first, then weak, then shuffle the rest
  return [
    ...seededShuffle(due, seed),
    ...seededShuffle(weak, seed + 1),
    ...seededShuffle(normal, seed + 2),
  ]
}

// ─── DAILY CHALLENGE GENERATOR ────────────────────────────────────────────

const CHALLENGE_POOL = [
  { id: 'ch_speak_hometown', type: 'speaking', title: 'Speak about your hometown', description: 'Record a 2-minute talk about your city or village in English', xp: 50, duration: 2, category: 'public_speaking' },
  { id: 'ch_office_leave', type: 'email', title: 'Write a leave request email', description: 'Write a professional leave request email to your manager', xp: 40, duration: 5, category: 'email' },
  { id: 'ch_intro_fresher', type: 'speaking', title: 'Practice fresher introduction', description: 'Record your 60-second self-introduction as a fresher', xp: 45, duration: 3, category: 'interview' },
  { id: 'ch_greet_5', type: 'vocabulary', title: 'Learn 5 office greetings', description: 'Practice 5 professional greetings and use them correctly', xp: 30, duration: 5, category: 'greetings' },
  { id: 'ch_interview_strength', type: 'speaking', title: 'Answer: "What are your strengths?"', description: 'Give a confident 90-second answer to this common HR question', xp: 50, duration: 3, category: 'interview' },
  { id: 'ch_grammar_tenses', type: 'grammar', title: 'Master 3 tense forms', description: 'Complete the tenses exercise and score above 80%', xp: 35, duration: 5, category: 'grammar' },
  { id: 'ch_phone_customer', type: 'speaking', title: 'Practice customer support call', description: 'Complete a customer support phone simulation', xp: 45, duration: 5, category: 'phone' },
  { id: 'ch_vocab_10', type: 'vocabulary', title: 'Learn 10 business words', description: 'Complete the business vocabulary flashcard session', xp: 40, duration: 8, category: 'vocabulary' },
  { id: 'ch_pronounce_5', type: 'pronunciation', title: 'Pronounce 5 office phrases', description: 'Practice pronunciation of 5 common office phrases', xp: 35, duration: 5, category: 'pronunciation' },
  { id: 'ch_standup', type: 'speaking', title: 'Give your daily standup', description: 'Simulate a 2-minute standup update for your team', xp: 40, duration: 3, category: 'office' },
  { id: 'ch_email_apology', type: 'email', title: 'Write a professional apology email', description: 'Write an apology email for a missed deadline', xp: 40, duration: 5, category: 'email' },
  { id: 'ch_business_meeting', type: 'speaking', title: 'Participate in a business meeting', description: 'Complete the office conversations — team meeting scenario', xp: 55, duration: 8, category: 'office' },
  { id: 'ch_quiz_grammar', type: 'quiz', title: 'Grammar challenge quiz', description: 'Score 80%+ on a 10-question grammar quiz', xp: 45, duration: 10, category: 'grammar' },
  { id: 'ch_speak_dream', type: 'speaking', title: 'Speak about your dream career', description: '3-minute talk about where you see yourself in 5 years', xp: 50, duration: 5, category: 'public_speaking' },
  { id: 'ch_weekend_special', type: 'speaking', title: 'Weekend confidence boost', description: 'Complete a full mock interview session', xp: 100, duration: 15, category: 'interview' },
]

export async function getDailyChallenges(
  userId: string,
  count = 3
): Promise<typeof CHALLENGE_POOL> {
  const seed = getDailySeed(userId)
  const history = await getContentHistory(userId, 'daily_challenge')
  const now = Date.now()
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000

  // Filter out challenges on cooldown
  const available = CHALLENGE_POOL.filter(ch => {
    const entry = history[ch.id]
    if (!entry) return true
    return now - entry.seenAt > threeDaysMs
  })

  const pool = available.length >= count ? available : CHALLENGE_POOL
  return seededShuffle(pool, seed).slice(0, count)
}

// ─── PRONUNCIATION ROTATION ───────────────────────────────────────────────

export async function getPronunciationQueue<T extends ContentItem>(
  userId: string,
  phrases: T[],
  count = 10
): Promise<T[]> {
  return getRandomUnseenContent(userId, phrases, {
    avoidRecentHours: 48,
    maxItems: count,
    shuffleResult: true,
  })
}

// ─── GREETING ROTATOR ────────────────────────────────────────────────────

export function getTodayGreeting<T extends { category: string }>(
  greetings: T[],
  userId: string
): T | null {
  if (!greetings.length) return null
  const seed = getDailySeed(userId)
  const shuffled = seededShuffle(greetings, seed)
  return shuffled[0] ?? null
}

// ─── VOCABULARY OF THE DAY ────────────────────────────────────────────────

const DAILY_VOCAB = [
  { word: 'Proactive', meaning_telugu: 'ముందుగా చర్య తీసుకునే', example: 'Be proactive in your work to impress your manager.', category: 'professional' },
  { word: 'Collaborate', meaning_telugu: 'కలిసి పని చేయడం', example: 'We need to collaborate with the design team on this project.', category: 'office' },
  { word: 'Initiative', meaning_telugu: 'స్వచ్ఛందంగా ముందడుగు వేయడం', example: 'She took the initiative to organize the team meeting.', category: 'professional' },
  { word: 'Articulate', meaning_telugu: 'స్పష్టంగా మాట్లాడగలిగే', example: 'He is very articulate and expresses his ideas clearly.', category: 'communication' },
  { word: 'Deadline', meaning_telugu: 'చివరి తేదీ', example: 'Please submit the report before the deadline.', category: 'office' },
  { word: 'Follow up', meaning_telugu: 'తదుపరి సంప్రదించడం', example: 'I will follow up with the client tomorrow.', category: 'professional' },
  { word: 'Escalate', meaning_telugu: 'పై స్థాయికి తెలియజేయడం', example: 'If the issue persists, we need to escalate it to management.', category: 'office' },
  { word: 'Synergy', meaning_telugu: 'కలిసి పని చేయడం వల్ల ఫలితం', example: 'Our team has great synergy and achieves targets easily.', category: 'business' },
  { word: 'Leverage', meaning_telugu: 'సమర్థంగా వాడుకోవడం', example: 'Leverage your skills to advance your career.', category: 'professional' },
  { word: 'Accountability', meaning_telugu: 'బాధ్యత', example: 'Accountability is a key trait of successful professionals.', category: 'professional' },
  { word: 'Concise', meaning_telugu: 'సంక్షిప్తంగా', example: 'Keep your email concise and to the point.', category: 'communication' },
  { word: 'Clarify', meaning_telugu: 'స్పష్టం చేయడం', example: 'Please clarify your doubts before starting the task.', category: 'communication' },
  { word: 'Navigate', meaning_telugu: 'నిర్వహించడం/దారి వెతకడం', example: 'She knows how to navigate difficult office situations.', category: 'professional' },
  { word: 'Consensus', meaning_telugu: 'అందరి అంగీకారం', example: 'We reached a consensus on the project plan.', category: 'office' },
  { word: 'Benchmark', meaning_telugu: 'ప్రమాణం', example: 'Set a benchmark for your performance this quarter.', category: 'business' },
]

export function getVocabularyOfTheDay(userId: string) {
  const seed = getDailySeed(userId)
  const dayIndex = seed % DAILY_VOCAB.length
  return DAILY_VOCAB[dayIndex]
}

// ─── GRAMMAR TIP OF THE DAY ──────────────────────────────────────────────

const GRAMMAR_TIPS = [
  { topic: 'Articles', tip: 'Use "an" before vowel sounds, not just vowel letters', example_correct: 'an honest man', example_wrong: 'a honest man', telugu: '"honest" అనే పదం vowel sound తో మొదలవుతుంది కాబట్టి "an" వాడాలి' },
  { topic: 'Tenses', tip: 'Use Present Perfect for experiences, not specific past times', example_correct: 'I have visited Chennai', example_wrong: 'I have visited Chennai yesterday', telugu: 'నిర్దిష్ట సమయం చెప్తే Simple Past వాడాలి' },
  { topic: 'Prepositions', tip: 'Use "on" for days, "in" for months/years, "at" for exact times', example_correct: 'on Monday, in January, at 5 PM', example_wrong: 'in Monday, on January', telugu: 'రోజుల కోసం "on", నెలలు/సంవత్సరాల కోసం "in", నిర్దిష్ట సమయానికి "at"' },
  { topic: 'Subject-Verb Agreement', tip: 'Singular subjects take singular verbs', example_correct: 'The team is working hard', example_wrong: 'The team are working hard', telugu: '"Team" ఒకే యూనిట్‌గా ఉంటే singular verb వాడాలి' },
  { topic: 'Reported Speech', tip: 'In reported speech, present tense shifts to past tense', example_correct: 'He said he was tired', example_wrong: 'He said he is tired', telugu: 'reported speech లో "is" → "was" గా మారుతుంది' },
  { topic: 'Active vs Passive', tip: 'Use active voice for direct, confident communication', example_correct: 'I completed the report', example_wrong: 'The report was completed by me', telugu: 'Professional communication లో active voice ఎక్కువ effective గా ఉంటుంది' },
  { topic: 'Conditionals', tip: 'Use "would" not "will" in the result clause of second conditional', example_correct: 'If I had time, I would help you', example_wrong: 'If I had time, I will help you', telugu: 'hypothetical situations కోసం "would" వాడాలి, "will" కాదు' },
]

export function getGrammarTipOfTheDay(userId: string) {
  const seed = getDailySeed(userId)
  return GRAMMAR_TIPS[seed % GRAMMAR_TIPS.length]
}

// ─── MOTIVATIONAL QUOTES ─────────────────────────────────────────────────

const MOTIVATIONAL_QUOTES = [
  { quote: 'The limits of my language mean the limits of my world.', author: 'Ludwig Wittgenstein', telugu: 'నా భాష యొక్క పరిమితులు నా ప్రపంచం యొక్క పరిమితులు.' },
  { quote: 'To have another language is to possess a second soul.', author: 'Charlemagne', telugu: 'మరొక భాష తెలుసుకోవడం అంటే రెండో ఆత్మను కలిగి ఉండడం.' },
  { quote: 'A different language is a different vision of life.', author: 'Federico Fellini', telugu: 'వేరే భాష అంటే జీవితం గురించి వేరే దృష్టి.' },
  { quote: 'The more languages you know, the more person you are.', author: 'Czech Proverb', telugu: 'మీకు ఎన్ని భాషలు తెలిసినా, మీరు అంత పెద్ద వ్యక్తి అవుతారు.' },
  { quote: 'One language sets you in a corridor for life. Two languages open every door along the way.', author: 'Frank Smith', telugu: 'ఒక భాష మీకు ఒక మార్గాన్ని ఇస్తుంది. రెండు భాషలు అన్ని తలుపులనూ తెరుస్తాయి.' },
  { quote: 'Speak English every day and you will see the difference in 30 days.', author: 'Language Coach', telugu: 'ప్రతిరోజు ఇంగ్లీష్ మాట్లాడండి, 30 రోజుల్లో తేడా మీరే చూస్తారు.' },
  { quote: 'Don\'t be afraid to make mistakes. Every mistake is a lesson.', author: 'EnglishMitra', telugu: 'తప్పులు చేయడానికి భయపడకండి. ప్రతి తప్పు ఒక పాఠం.' },
  { quote: 'Fluency comes from practice, not perfection.', author: 'EnglishMitra', telugu: 'అనర్గళత అభ్యాసం వల్ల వస్తుంది, పరిపూర్ణత వల్ల కాదు.' },
  { quote: 'Your accent is not your enemy. Your silence is.', author: 'Language Coach', telugu: 'మీ యాస మీ శత్రువు కాదు. మీ మౌనమే.' },
  { quote: 'Start speaking today. You are ready enough.', author: 'EnglishMitra', telugu: 'ఈరోజే మాట్లాడటం ప్రారంభించండి. మీరు సిద్ధంగా ఉన్నారు.' },
]

export function getMotivationalQuote(userId: string) {
  const seed = getDailySeed(userId)
  const today = new Date().getDate()
  return MOTIVATIONAL_QUOTES[(seed + today) % MOTIVATIONAL_QUOTES.length]
}

// ─── INTERVIEW QUESTION OF THE DAY ───────────────────────────────────────

const INTERVIEW_QUESTIONS = [
  { question: 'Tell me about yourself.', category: 'HR', tips: ['Use PAT method: Present-Past-Future', 'Keep it under 2 minutes', 'Focus on professional background'], telugu: 'Present → Past → Future order లో మీ గురించి చెప్పండి' },
  { question: 'What are your greatest strengths?', category: 'HR', tips: ['Give 2-3 strengths with examples', 'Relate to the job role', 'Be specific, not generic'], telugu: '2-3 strengths చెప్పి, ప్రతి దానికి ఒక example ఇవ్వండి' },
  { question: 'Where do you see yourself in 5 years?', category: 'HR', tips: ['Show ambition but be realistic', 'Align with company growth', 'Mention skill development'], telugu: 'Company తో పాటు grow అవ్వాలనే ఆసక్తిని చూపించండి' },
  { question: 'Why do you want to join our company?', category: 'HR', tips: ['Research the company before', 'Mention specific products/values', 'Show genuine interest'], telugu: 'Company గురించి ముందే research చేసి, specific కారణాలు చెప్పండి' },
  { question: 'Describe a challenging situation and how you handled it.', category: 'Behavioral', tips: ['Use STAR method', 'Focus on YOUR actions', 'End with positive outcome'], telugu: 'STAR method: Situation, Task, Action, Result అనే order లో చెప్పండి' },
  { question: 'What is your greatest weakness?', category: 'HR', tips: ['Choose a real weakness', 'Show how you are improving', 'Don\'t say "I work too hard"'], telugu: 'నిజమైన weakness చెప్పి, దాన్ని overcome చేస్తున్నారని చూపించండి' },
  { question: 'Why are you leaving your current job?', category: 'HR', tips: ['Never speak negatively about current employer', 'Focus on growth opportunities', 'Be honest but professional'], telugu: 'Current company గురించి negative గా మాట్లాడకండి' },
]

export function getInterviewQuestionOfTheDay(userId: string) {
  const seed = getDailySeed(userId)
  const today = new Date().getDate()
  return INTERVIEW_QUESTIONS[(seed + today) % INTERVIEW_QUESTIONS.length]
}
