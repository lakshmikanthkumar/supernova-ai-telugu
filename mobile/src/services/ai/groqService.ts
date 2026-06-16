// ============================================================
// EnglishMitraAi - Groq AI Service (FREE replacement for OpenAI)
// Model: llama-3.3-70b-versatile (Groq free tier)
// Free tier: 14,400 req/day, 500,000 tokens/day
// ============================================================

import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY

// Cache key prefix for conversation history
const CONV_CACHE_PREFIX = 'groq:conv:'
// Limit conversation history to save tokens
const MAX_HISTORY_MESSAGES = 10
// Max tokens per request to stay within free tier
const MAX_TOKENS = 512

// ============================================================
// Types
// ============================================================

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqResponse {
  message: string
  corrections: GrammarCorrection[]
  tokensUsed: number
}

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

// ============================================================
// Core Groq API caller
// ============================================================

async function callGroq(
  messages: GroqMessage[],
  maxTokens: number = MAX_TOKENS,
  temperature: number = 0.7,
  jsonMode: boolean = false
): Promise<{ content: string; tokens: number }> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Get a free key at console.groq.com')
  }

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  )

  return {
    content: response.data.choices[0].message.content || '',
    tokens: response.data.usage?.total_tokens || 0,
  }
}

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const NOVA_SYSTEM_PROMPT = `You are Nova, a friendly English tutor for Telugu-medium students in Andhra Pradesh and Telangana, India.

Your personality:
- Warm, encouraging, patient like a best friend
- Use simple, clear English (avoid complex vocabulary)
- Celebrate small wins ("Great sentence!", "Perfect!")
- Reference Indian context naturally (chai, auto-rickshaw, JNTU, etc.)

Your teaching rules:
1. ALWAYS respond in simple English (2-4 sentences max)
2. Gently correct grammar mistakes inline: "You said 'I am go' — try 'I am going' instead!"
3. Occasionally use a Telugu word to explain hard concepts
4. Always ask a follow-up question to keep conversation going
5. If student types in Telugu, reply in English but acknowledge their message
6. Focus on spoken English patterns, not written grammar
7. Encourage, never embarrass

Example of your style:
Student: "I am go to market yesterday"
Nova: "Great effort! We say 'I went to the market yesterday' — 'went' is past tense of 'go'. What did you buy at the market? 😊"`

const GRAMMAR_CHECK_PROMPT = `You are a grammar checker for Telugu-medium English learners. Your job is to find errors and explain them simply.

Analyze the given English sentence. Return ONLY valid JSON in this exact format:
{
  "has_errors": true/false,
  "corrections": [
    {
      "original": "the wrong phrase",
      "corrected": "the correct phrase",
      "explanation": "Simple English explanation (1 sentence)",
      "explanation_telugu": "Telugu explanation (1 sentence)"
    }
  ],
  "improved_sentence": "The full corrected sentence"
}

Rules:
- Only flag real grammar errors, not style differences
- Keep explanations very simple (for beginners)
- Telugu explanation must be in Telugu script
- If no errors, return {"has_errors": false, "corrections": [], "improved_sentence": "<original>"}`

// ============================================================
// CONVERSATION HISTORY MANAGER
// Limits history to save free-tier tokens
// ============================================================

async function getConversationHistory(sessionId: string): Promise<GroqMessage[]> {
  try {
    const cached = await AsyncStorage.getItem(`${CONV_CACHE_PREFIX}${sessionId}`)
    if (cached) {
      const history: GroqMessage[] = JSON.parse(cached)
      // Return only last N messages to limit token usage
      return history.slice(-MAX_HISTORY_MESSAGES)
    }
  } catch { /* ignore cache errors */ }
  return []
}

async function saveConversationHistory(sessionId: string, messages: GroqMessage[]): Promise<void> {
  try {
    // Keep only last 20 messages in storage (10 pairs)
    const trimmed = messages.slice(-20)
    await AsyncStorage.setItem(`${CONV_CACHE_PREFIX}${sessionId}`, JSON.stringify(trimmed))
  } catch { /* ignore */ }
}

async function clearConversationHistory(sessionId: string): Promise<void> {
  await AsyncStorage.removeItem(`${CONV_CACHE_PREFIX}${sessionId}`)
}

// ============================================================
// NOVA CHAT — Main AI tutor conversation
// ============================================================

export async function chatWithNova(
  sessionId: string,
  userMessage: string,
  systemPromptOverride?: string
): Promise<GroqResponse> {
  const history = await getConversationHistory(sessionId)

  const systemPrompt = systemPromptOverride || NOVA_SYSTEM_PROMPT

  const messages: GroqMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ]

  const { content, tokens } = await callGroq(messages, MAX_TOKENS, 0.8)

  // Save updated history
  const newHistory: GroqMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
    { role: 'assistant', content },
  ]
  await saveConversationHistory(sessionId, newHistory)

  // Run grammar check in parallel (non-blocking, best effort)
  let corrections: GrammarCorrection[] = []
  try {
    const grammarResult = await checkGrammar(userMessage)
    corrections = grammarResult.corrections
  } catch { /* grammar check failure is non-fatal */ }

  return { message: content, corrections, tokensUsed: tokens }
}

// ============================================================
// GRAMMAR CORRECTION
// ============================================================

export async function checkGrammar(sentence: string): Promise<GrammarCheckResult> {
  if (sentence.trim().length < 4) {
    return { has_errors: false, corrections: [], improved_sentence: sentence }
  }

  const messages: GroqMessage[] = [
    { role: 'system', content: GRAMMAR_CHECK_PROMPT },
    { role: 'user', content: `Check this sentence: "${sentence}"` },
  ]

  const { content } = await callGroq(messages, 350, 0.1, true)

  try {
    const parsed: GrammarCheckResult = JSON.parse(content)
    return {
      has_errors: parsed.has_errors || false,
      corrections: parsed.corrections || [],
      improved_sentence: parsed.improved_sentence || sentence,
    }
  } catch {
    return { has_errors: false, corrections: [], improved_sentence: sentence }
  }
}

// ============================================================
// ROLEPLAY — AI takes on a persona (interviewer, shopkeeper, etc.)
// ============================================================

export async function chatRoleplay(
  sessionId: string,
  userMessage: string,
  personaSystemPrompt: string,
  personaName: string
): Promise<GroqResponse> {
  const history = await getConversationHistory(sessionId)

  // Add roleplay-specific instruction to keep responses short
  const fullSystemPrompt = `${personaSystemPrompt}

IMPORTANT: Keep your responses SHORT (2-4 sentences max). After your response, if the student makes an English mistake, add a brief gentle correction at the end like: "[💡 Grammar tip: say '...' instead of '...']". Be encouraging.`

  const messages: GroqMessage[] = [
    { role: 'system', content: fullSystemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ]

  const { content, tokens } = await callGroq(messages, MAX_TOKENS, 0.75)

  const newHistory: GroqMessage[] = [
    ...history,
    { role: 'user', content: userMessage },
    { role: 'assistant', content },
  ]
  await saveConversationHistory(sessionId, newHistory)

  // Extract inline correction if present
  const corrections: GrammarCorrection[] = []
  const tipMatch = content.match(/\[💡 Grammar tip: say ['"](.+?)['"] instead of ['"](.+?)['"]\]/i)
  if (tipMatch) {
    corrections.push({
      original: tipMatch[2],
      corrected: tipMatch[1],
      explanation: `Use "${tipMatch[1]}" instead of "${tipMatch[2]}"`,
      explanation_telugu: `"${tipMatch[2]}" కాదు, "${tipMatch[1]}" అని చెప్పండి`,
    })
  }

  return { message: content, corrections, tokensUsed: tokens }
}

// ============================================================
// VOCABULARY EXPLANATION
// Explains a word with Telugu meaning + example sentences
// ============================================================

export async function explainWord(
  word: string,
  context?: string
): Promise<{
  meaning_english: string
  meaning_telugu: string
  example_sentences: string[]
  pronunciation_tip: string
  usage_tips: string[]
}> {
  const prompt = `Explain the English word "${word}"${context ? ` used in: "${context}"` : ''} for a Telugu-medium student.

Return ONLY valid JSON:
{
  "meaning_english": "Simple English meaning (1 sentence)",
  "meaning_telugu": "Telugu meaning in Telugu script",
  "example_sentences": ["Simple example 1", "Simple example 2", "Simple example 3"],
  "pronunciation_tip": "How to pronounce it (phonetic)",
  "usage_tips": ["When to use tip 1", "When to use tip 2"]
}`

  const messages: GroqMessage[] = [
    { role: 'system', content: 'You are a Telugu-English dictionary assistant. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ]

  const { content } = await callGroq(messages, 400, 0.3, true)

  try {
    return JSON.parse(content)
  } catch {
    return {
      meaning_english: `"${word}" is an English word.`,
      meaning_telugu: word,
      example_sentences: [`Please use ${word} in a sentence.`],
      pronunciation_tip: word,
      usage_tips: ['Practice using this word daily'],
    }
  }
}

// ============================================================
// DAILY CHALLENGE GENERATOR
// Generates a fresh challenge using Groq
// ============================================================

export async function generateDailyVocabularyChallenge(): Promise<{
  words: Array<{ word: string; telugu: string; sentence: string }>
  quiz: Array<{ question: string; options: string[]; answer: string }>
}> {
  const prompt = `Generate a daily vocabulary challenge for Telugu-medium English learners.

Return ONLY valid JSON with 5 English words that are commonly used in daily/office life:
{
  "words": [
    {"word": "English word", "telugu": "తెలుగు అర్థం", "sentence": "Simple example sentence using the word"}
  ],
  "quiz": [
    {"question": "What does '...' mean?", "options": ["correct Telugu", "wrong1", "wrong2", "wrong3"], "answer": "correct Telugu"}
  ]
}

Make it practical and useful for job seekers and students in Hyderabad/Andhra.`

  const messages: GroqMessage[] = [
    { role: 'system', content: 'You are a Telugu-English vocabulary teacher. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ]

  const { content } = await callGroq(messages, 600, 0.9, true)

  try {
    return JSON.parse(content)
  } catch {
    return {
      words: [
        { word: 'Opportunity', telugu: 'అవకాశం', sentence: 'This is a great opportunity for you.' },
        { word: 'Confident', telugu: 'నమ్మకంగా', sentence: 'Speak confident English every day.' },
        { word: 'Practice', telugu: 'అభ్యాసం', sentence: 'Practice makes perfect.' },
        { word: 'Improve', telugu: 'మెరుగుపరచు', sentence: 'I want to improve my English.' },
        { word: 'Fluent', telugu: 'అనర్గళంగా', sentence: 'She speaks fluent English.' },
      ],
      quiz: [
        { question: "What does 'Opportunity' mean?", options: ['అవకాశం', 'సమస్య', 'పని', 'నీరు'], answer: 'అవకాశం' },
      ],
    }
  }
}

// ============================================================
// INTERVIEW COACHING
// Gives feedback on an interview answer
// ============================================================

export async function coachInterviewAnswer(
  question: string,
  answer: string
): Promise<{
  overall_feedback: string
  grammar_feedback: string
  vocabulary_suggestions: string[]
  improved_answer: string
  score: number
  telugu_tip: string
}> {
  const prompt = `You are an interview coach for Telugu-medium students applying for jobs in India.

Interview Question: "${question}"
Student's Answer: "${answer}"

Evaluate this answer and return ONLY valid JSON:
{
  "overall_feedback": "2-3 sentences of honest but encouraging feedback",
  "grammar_feedback": "Specific grammar issues found, or 'No major grammar issues!'",
  "vocabulary_suggestions": ["Better word/phrase 1", "Better word/phrase 2"],
  "improved_answer": "A model answer they can learn from (3-4 sentences)",
  "score": <1-10>,
  "telugu_tip": "One encouraging tip in Telugu script"
}`

  const messages: GroqMessage[] = [
    { role: 'system', content: 'You are an Indian job interview coach. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ]

  const { content } = await callGroq(messages, 500, 0.5, true)

  try {
    return JSON.parse(content)
  } catch {
    return {
      overall_feedback: 'Good attempt! Keep practicing.',
      grammar_feedback: 'Please review your grammar.',
      vocabulary_suggestions: ['Consider using more formal words'],
      improved_answer: answer,
      score: 5,
      telugu_tip: 'రోజూ అభ్యాసం చేయండి!',
    }
  }
}

// ============================================================
// RATE LIMITER — Prevents hitting Groq free tier limits
// Free tier: ~30 req/min, 14,400 req/day
// ============================================================

const requestTimestamps: number[] = []
const RATE_LIMIT_PER_MINUTE = 25 // Keep under 30/min limit

export function checkRateLimit(): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60000

  // Remove timestamps older than 1 minute
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift()
  }

  if (requestTimestamps.length >= RATE_LIMIT_PER_MINUTE) {
    return false // Rate limited
  }

  requestTimestamps.push(now)
  return true
}

export { clearConversationHistory, getConversationHistory }
