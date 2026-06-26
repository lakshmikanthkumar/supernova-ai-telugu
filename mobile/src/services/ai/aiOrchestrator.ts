import AsyncStorage from '@react-native-async-storage/async-storage'
import { selectModel, TaskType, getFallbackChain, MODELS } from './modelRouter'
import { callProvider, AIMessage, AIRequestOptions, AIResponse, parseJSON } from './aiProviderAdapter'
import { aiHealthMonitor } from './aiHealthMonitor'
import { aiRateLimiter } from './aiRateLimiter'
import { aiResponseCache, withCache } from './aiResponseCache'
// Types defined here (source of truth) — groqService.ts re-exports these
export interface GrammarCorrection {
  original: string
  corrected: string
  explanation: string
  explanation_telugu: string
}

export interface GrammarCheckResult {
  has_errors: boolean
  corrections: GrammarCorrection[]
  improved_sentence: string
}

// ─── CONFIG ───────────────────────────────────────────────────────────────

const MAX_RETRIES = 4  // try up to 4 models before giving up

// ─── SYSTEM PROMPTS ──────────────────────────────────────────────────────

const NOVA_SYSTEM_PROMPT = `You are Nova, a friendly English tutor for Telugu-medium students in Andhra Pradesh and Telangana, India.
Your personality: Warm, encouraging, patient. Use simple, clear English (2-4 sentences max). Celebrate small wins. Reference Indian context naturally (chai, JNTU, IT industry, Hyderabad).
Rules: Gently correct grammar mistakes inline. Occasionally use Telugu to explain hard concepts. Always ask a follow-up question. If student types Telugu, reply in English but acknowledge. Focus on spoken English patterns.`

const GRAMMAR_PROMPT = `You are a grammar checker for Telugu-medium English learners. Return ONLY valid JSON:
{"has_errors":bool,"corrections":[{"original":"wrong","corrected":"right","explanation":"simple English","explanation_telugu":"Telugu script"}],"improved_sentence":"full corrected sentence"}
Only flag real grammar errors, not style. Keep explanations very simple.`

// ─── CORE ORCHESTRATED CALL ──────────────────────────────────────────────

export interface OrchestratedResponse extends AIResponse {
  fallbacksUsed: number
  totalAttempts: number
  fromCache: boolean
}

export async function orchestrateAICall(
  task: TaskType,
  messages: AIMessage[],
  options: AIRequestOptions & { skipCache?: boolean } = {}
): Promise<OrchestratedResponse> {
  const { skipCache = false, ...reqOptions } = options

  // Check if ALL providers are down → use cache/fallback immediately
  const anyAvailable = MODELS.some(m =>
    aiHealthMonitor.isAvailable(m.id) && aiRateLimiter.canMakeRequest(m.id)
  )
  if (!anyAvailable) {
    console.warn('[Orchestrator] All providers unavailable, will use fallback')
    throw { type: 'all_providers_failed' }
  }

  const fallbackChain = getFallbackChain(task)
  let attempt = 0
  let fallbacksUsed = 0
  let lastError: unknown

  for (const modelId of fallbackChain) {
    if (attempt >= MAX_RETRIES) break
    attempt++

    if (!aiHealthMonitor.isAvailable(modelId)) continue
    if (!aiRateLimiter.canMakeRequest(modelId)) continue

    const model = MODELS.find(m => m.id === modelId)
    if (!model) continue

    try {
      const result = await callProvider(model, messages, { ...reqOptions, timeoutMs: 15_000 })
      return {
        ...result,
        fallbacksUsed,
        totalAttempts: attempt,
        fromCache: false,
      }
    } catch (err: any) {
      lastError = err
      fallbacksUsed++
      console.warn(`[Orchestrator] ${modelId} failed (${err?.type}), trying next model...`)

      // If rate limited, add a tiny delay before trying next
      if (err?.type === 'rate_limit') {
        await new Promise(r => setTimeout(r, 500))
      }
    }
  }

  throw lastError ?? { type: 'all_providers_failed' }
}

// ─── USER-FACING API ─────────────────────────────────────────────────────
// These functions are what screens and services call.
// They include: caching, graceful fallbacks, guest mode support.

function hasAnyApiKey() {
  return !!(process.env.EXPO_PUBLIC_GROQ_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY)
}

// ── NOVA CHAT ────────────────────────────────────────────────────────────

const CONV_CACHE_PREFIX = 'groq:conv:'
const MAX_HISTORY = 10

async function getHistory(sessionId: string): Promise<AIMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(CONV_CACHE_PREFIX + sessionId)
    return raw ? (JSON.parse(raw) as AIMessage[]).slice(-MAX_HISTORY) : []
  } catch { return [] }
}
async function saveHistory(sessionId: string, msgs: AIMessage[]) {
  try { await AsyncStorage.setItem(CONV_CACHE_PREFIX + sessionId, JSON.stringify(msgs.slice(-20))) } catch {}
}
export async function clearHistory(sessionId: string) {
  await AsyncStorage.removeItem(CONV_CACHE_PREFIX + sessionId).catch(() => {})
}

export async function chatWithNova(
  sessionId: string,
  userMessage: string,
  systemPromptOverride?: string
): Promise<{ message: string; corrections: GrammarCorrection[]; tokensUsed: number; modelUsed: string }> {
  const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'
  if (isGuest || !hasAnyApiKey()) {
    await new Promise(r => setTimeout(r, 600))
    return {
      message: getMockNovaReply(userMessage),
      corrections: [],
      tokensUsed: 0,
      modelUsed: 'mock',
    }
  }

  const history = await getHistory(sessionId)
  const messages: AIMessage[] = [
    { role: 'system', content: systemPromptOverride ?? NOVA_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ]

  try {
    const result = await orchestrateAICall('chat', messages, { maxTokens: 512, temperature: 0.8 })
    await saveHistory(sessionId, [...history, { role: 'user', content: userMessage }, { role: 'assistant', content: result.content }])

    // Grammar check in parallel (non-blocking)
    let corrections: GrammarCorrection[] = []
    checkGrammar(userMessage).then(r => { corrections = r.corrections }).catch(() => {})

    return { message: result.content, corrections, tokensUsed: result.tokensUsed, modelUsed: result.modelUsed }
  } catch {
    return { message: "I'm thinking... please try again in a moment! 😊", corrections: [], tokensUsed: 0, modelUsed: 'fallback' }
  }
}

function getMockNovaReply(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('hello') || lower.includes('hi')) return "Hello! I am Nova, your English tutor! How can I help you today? 😊"
  if (lower.includes('how are you')) return "I am doing great, thank you! Ready to practice English? Let us start!"
  if (lower.includes('name')) return "My name is Nova! What is your name? Try saying: 'My name is...'"
  return "That is interesting! Tell me more about it in English. I am here to help! 💪"
}

// ── GRAMMAR CHECK ─────────────────────────────────────────────────────────

export async function checkGrammar(sentence: string): Promise<GrammarCheckResult> {
  if (sentence.trim().length < 4) return { has_errors: false, corrections: [], improved_sentence: sentence }
  const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'
  if (isGuest || !hasAnyApiKey()) {
    return { has_errors: false, corrections: [], improved_sentence: sentence }
  }

  const fallback: GrammarCheckResult = { has_errors: false, corrections: [], improved_sentence: sentence }

  return withCache('grammar_check', sentence, async () => {
    const messages: AIMessage[] = [
      { role: 'system', content: GRAMMAR_PROMPT },
      { role: 'user', content: `Check: "${sentence}"` },
    ]
    try {
      const result = await orchestrateAICall('grammar_check', messages, { maxTokens: 350, temperature: 0.1, jsonMode: true })
      return parseJSON<GrammarCheckResult>(result.content, fallback)
    } catch {
      return fallback
    }
  })
}

// ── WORD EXPLANATION ──────────────────────────────────────────────────────

export async function explainWord(word: string, context?: string) {
  const fallback = {
    meaning_english: `"${word}" is an English word.`,
    meaning_telugu: word,
    example_sentences: [`Use ${word} in a sentence today.`],
    pronunciation_tip: word,
    usage_tips: ['Practice using this word daily'],
  }
  const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'
  if (isGuest || !hasAnyApiKey()) return fallback

  return withCache('word_explanation', word + (context ?? ''), async () => {
    const prompt = `Explain "${word}"${context ? ` in: "${context}"` : ''} for Telugu-medium students. Return JSON: {"meaning_english":"...","meaning_telugu":"Telugu script","example_sentences":["...","...","..."],"pronunciation_tip":"...","usage_tips":["...","..."]}`
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a Telugu-English dictionary. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ]
    try {
      const result = await orchestrateAICall('word_explanation', messages, { maxTokens: 400, temperature: 0.3, jsonMode: true })
      return parseJSON(result.content, fallback)
    } catch { return fallback }
  })
}

// ── ROLEPLAY ─────────────────────────────────────────────────────────────

export async function chatRoleplay(
  sessionId: string,
  userMessage: string,
  personaSystemPrompt: string,
  personaName: string
): Promise<{ message: string; corrections: GrammarCorrection[]; tokensUsed: number; modelUsed: string }> {
  const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'
  if (isGuest || !hasAnyApiKey()) {
    await new Promise(r => setTimeout(r, 600))
    return { message: `As ${personaName}: How can I help you today?`, corrections: [], tokensUsed: 0, modelUsed: 'mock' }
  }

  const history = await getHistory(sessionId)
  const fullPrompt = `${personaSystemPrompt}
Keep responses SHORT (2-4 sentences). Add grammar tip at end if student makes error: "[💡 Grammar tip: say '...' instead of '...']"`
  const messages: AIMessage[] = [
    { role: 'system', content: fullPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ]

  try {
    const result = await orchestrateAICall('roleplay', messages, { maxTokens: 512, temperature: 0.75 })
    await saveHistory(sessionId, [...history, { role: 'user', content: userMessage }, { role: 'assistant', content: result.content }])

    const corrections: GrammarCorrection[] = []
    const tipMatch = result.content.match(/[💡 Grammar tip: say ['"](.+?)['"] instead of ['"](.+?)['"]]/i)
    if (tipMatch) {
      corrections.push({ original: tipMatch[2], corrected: tipMatch[1], explanation: `Use "${tipMatch[1]}" instead of "${tipMatch[2]}"`, explanation_telugu: `"${tipMatch[2]}" కాదు, "${tipMatch[1]}" అని చెప్పండి` })
    }
    return { message: result.content, corrections, tokensUsed: result.tokensUsed, modelUsed: result.modelUsed }
  } catch {
    return { message: "Let me think about that... Could you rephrase your question? 🤔", corrections: [], tokensUsed: 0, modelUsed: 'fallback' }
  }
}

// ── INTERVIEW COACHING ────────────────────────────────────────────────────

export async function coachInterviewAnswer(question: string, answer: string) {
  const fallback = { overall_feedback: 'Good attempt! Keep practicing.', grammar_feedback: 'Review your grammar.', vocabulary_suggestions: ['Use more formal words'], improved_answer: answer, score: 5, telugu_tip: 'రోజూ అభ్యాసం చేయండి!' }
  const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'
  if (isGuest || !hasAnyApiKey()) return fallback

  const prompt = `Interview Q: "${question}"
Student answer: "${answer}"
Return JSON: {"overall_feedback":"2-3 sentences","grammar_feedback":"issues or none","vocabulary_suggestions":["better phrase 1","better phrase 2"],"improved_answer":"model answer 3-4 sentences","score":<1-10>,"telugu_tip":"Telugu script tip"}`
  const messages: AIMessage[] = [
    { role: 'system', content: 'You are an Indian job interview coach. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ]
  try {
    const result = await orchestrateAICall('interview_coaching', messages, { maxTokens: 500, temperature: 0.5, jsonMode: true })
    return parseJSON(result.content, fallback)
  } catch { return fallback }
}

// ── VOCAB CHALLENGE ───────────────────────────────────────────────────────

export async function generateDailyVocabularyChallenge() {
  const fallback = {
    words: [
      { word: 'Proactive', telugu: 'ముందుగా చర్య తీసుకునే', sentence: 'Be proactive in your work.' },
      { word: 'Confident', telugu: 'నమ్మకంగా', sentence: 'Speak confident English every day.' },
      { word: 'Collaborate', telugu: 'కలిసి పని చేయడం', sentence: 'We need to collaborate on this.' },
      { word: 'Initiative', telugu: 'స్వచ్ఛందంగా ముందడుగు', sentence: 'She took the initiative to help.' },
      { word: 'Deadline', telugu: 'చివరి తేదీ', sentence: 'Submit the report before the deadline.' },
    ],
    quiz: [{ question: "What does 'Proactive' mean?", options: ['ముందుగా చర్య తీసుకునే', 'సమస్య', 'పని', 'నీరు'], answer: 'ముందుగా చర్య తీసుకునే' }],
  }
  const isGuest = await AsyncStorage.getItem('is_guest_mode') === 'true'
  if (isGuest || !hasAnyApiKey()) return fallback

  return withCache('vocabulary_challenge', new Date().toISOString().split('T')[0], async () => {
    const prompt = `Generate 5 English words for Telugu-medium learners (office/daily life). JSON: {"words":[{"word":"...","telugu":"తెలుగు","sentence":"..."}],"quiz":[{"question":"What does '...' mean?","options":["correct Telugu","wrong1","wrong2","wrong3"],"answer":"correct Telugu"}]}`
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a Telugu-English vocabulary teacher. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ]
    try {
      const result = await orchestrateAICall('quiz_generation', messages, { maxTokens: 600, temperature: 0.9, jsonMode: true })
      return parseJSON(result.content, fallback)
    } catch { return fallback }
  })
}

// ── HEALTH DASHBOARD ──────────────────────────────────────────────────────

export function getAISystemHealth() {
  const models = MODELS.map(m => ({
    id: m.id,
    name: m.name,
    ...aiHealthMonitor.getMetrics(m.id),
    ...aiRateLimiter.getUsageStats(m.id),
  }))
  const cacheStats = aiResponseCache.getStats()
  const anyAvailable = models.some(m => m.isAvailable)
  return { models, cacheStats, anyAvailable, timestamp: new Date().toISOString() }
}

// Re-export for backward compatibility
export { clearHistory as clearConversationHistory }
