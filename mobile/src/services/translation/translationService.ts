// ============================================================
// EnglishMitraAi - Translation Service (FREE)
// Replaces: DeepL / Azure Translate (paid)
// Uses: google-translate-api-x (free, unofficial Google Translate)
// Cache: AsyncStorage (offline translations)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage'

// google-translate-api-x uses fetch internally, compatible with React Native
// Import with require for compatibility
const translate = require('google-translate-api-x')

// ============================================================
// Types
// ============================================================

export type LanguageCode = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'ml'

export interface TranslationResult {
  original: string
  translated: string
  sourceLanguage: string
  targetLanguage: string
  cached: boolean
}

// ============================================================
// CACHE MANAGEMENT
// Stores translations in AsyncStorage to avoid re-translating
// Reduces API calls = stays within free limits
// ============================================================

const CACHE_PREFIX = 'translate:'
const CACHE_MAX_SIZE = 500 // Max translations to store
const CACHE_INDEX_KEY = 'translate:index'

async function getCachedTranslation(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`)
  } catch {
    return null
  }
}

async function setCachedTranslation(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, value)

    // Track cache entries for size management
    const indexRaw = await AsyncStorage.getItem(CACHE_INDEX_KEY)
    const index: string[] = indexRaw ? JSON.parse(indexRaw) : []
    if (!index.includes(key)) {
      index.push(key)
      // Evict oldest entries if over limit
      if (index.length > CACHE_MAX_SIZE) {
        const toRemove = index.splice(0, index.length - CACHE_MAX_SIZE)
        await Promise.all(toRemove.map(k => AsyncStorage.removeItem(`${CACHE_PREFIX}${k}`)))
      }
      await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index))
    }
  } catch { /* ignore cache write errors */ }
}

function makeCacheKey(text: string, from: LanguageCode, to: LanguageCode): string {
  // Use first 60 chars to keep key size manageable
  return `${from}:${to}:${text.slice(0, 60)}`
}

// ============================================================
// STATIC FALLBACK TRANSLATIONS
// Common phrases pre-translated — works offline
// ============================================================

const STATIC_TRANSLATIONS: Record<string, string> = {
  // Common UI
  'en:te:Hello': 'హలో',
  'en:te:Good morning': 'శుభోదయం',
  'en:te:Good evening': 'శుభ సాయంత్రం',
  'en:te:Thank you': 'ధన్యవాదాలు',
  'en:te:Please': 'దయచేసి',
  'en:te:Sorry': 'క్షమించండి',
  'en:te:Yes': 'అవును',
  'en:te:No': 'లేదు',
  'en:te:Help': 'సహాయం',
  'en:te:Practice': 'అభ్యాసం',
  'en:te:Correct': 'సరైనది',
  'en:te:Wrong': 'తప్పు',
  'en:te:Try again': 'మళ్ళీ ప్రయత్నించండి',
  'en:te:Well done': 'శభాష్',
  'en:te:Keep going': 'కొనసాగించండి',
  'en:te:Excellent': 'అద్భుతం',
  'en:te:Good job': 'మంచిది',
  // Common learning phrases
  'en:te:Lesson': 'పాఠం',
  'en:te:Quiz': 'క్విజ్',
  'en:te:Score': 'స్కోరు',
  'en:te:Level': 'స్థాయి',
  'en:te:Streak': 'వరుస రోజులు',
  'en:te:Achievement': 'సాధన',
}

// ============================================================
// TRANSLATE — Main translation function
// English ↔ Telugu (and other languages)
// ============================================================

export async function translateText(
  text: string,
  to: LanguageCode = 'te',
  from: LanguageCode = 'en'
): Promise<TranslationResult> {
  if (!text.trim()) {
    return { original: text, translated: text, sourceLanguage: from, targetLanguage: to, cached: false }
  }

  const cacheKey = makeCacheKey(text, from, to)

  // 1. Check static fallback first (instant, offline)
  const staticKey = `${from}:${to}:${text}`
  if (STATIC_TRANSLATIONS[staticKey]) {
    return {
      original: text,
      translated: STATIC_TRANSLATIONS[staticKey],
      sourceLanguage: from,
      targetLanguage: to,
      cached: true,
    }
  }

  // 2. Check AsyncStorage cache
  const cached = await getCachedTranslation(cacheKey)
  if (cached) {
    return { original: text, translated: cached, sourceLanguage: from, targetLanguage: to, cached: true }
  }

  // 3. Call google-translate-api-x
  try {
    const result = await translate(text, { from, to, forceTo: to })
    const translated = result?.text || text

    // Cache the result
    await setCachedTranslation(cacheKey, translated)

    return { original: text, translated, sourceLanguage: from, targetLanguage: to, cached: false }
  } catch (err) {
    console.warn('[Translation] Failed:', err)
    // Return original text on failure — do not crash the app
    return { original: text, translated: text, sourceLanguage: from, targetLanguage: to, cached: false }
  }
}

// ============================================================
// TRANSLATE ENGLISH TO TELUGU
// Convenience wrapper
// ============================================================

export async function toTelugu(text: string): Promise<string> {
  const result = await translateText(text, 'te', 'en')
  return result.translated
}

// ============================================================
// TRANSLATE TELUGU TO ENGLISH
// ============================================================

export async function toEnglish(text: string): Promise<string> {
  const result = await translateText(text, 'en', 'te')
  return result.translated
}

// ============================================================
// BATCH TRANSLATE
// Translates multiple strings in parallel with concurrency limit
// Saves API calls by batching requests
// ============================================================

export async function batchTranslate(
  texts: string[],
  to: LanguageCode = 'te',
  from: LanguageCode = 'en',
  concurrency: number = 3
): Promise<string[]> {
  const results: string[] = new Array(texts.length).fill('')

  // Process in chunks to avoid overwhelming the API
  for (let i = 0; i < texts.length; i += concurrency) {
    const chunk = texts.slice(i, i + concurrency)
    const chunkResults = await Promise.all(
      chunk.map(text => translateText(text, to, from))
    )
    chunkResults.forEach((result, j) => {
      results[i + j] = result.translated
    })
  }

  return results
}

// ============================================================
// DETECT LANGUAGE
// Detects whether input is English or Telugu
// ============================================================

export function detectLanguage(text: string): 'telugu' | 'english' | 'mixed' | 'unknown' {
  // Telugu Unicode range: ఀ-౿
  const teluguChars = (text.match(/[ఀ-౿]/g) || []).length
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length
  const totalChars = text.replace(/\s/g, '').length

  if (totalChars === 0) return 'unknown'

  const teluguRatio = teluguChars / totalChars
  const englishRatio = englishChars / totalChars

  if (teluguRatio > 0.5) return 'telugu'
  if (englishRatio > 0.5) return 'english'
  if (teluguRatio > 0 && englishRatio > 0) return 'mixed'
  return 'unknown'
}

// ============================================================
// PRE-CACHE COMMON LESSON PHRASES
// Call this on app startup to pre-load common translations
// ============================================================

export async function preCacheCommonPhrases(): Promise<void> {
  const commonPhrases = [
    'Good morning, how are you?',
    'My name is',
    'I am from',
    'Nice to meet you',
    'Can you help me?',
    'I do not understand',
    'Please speak slowly',
    'How much does this cost?',
    'Where is the bus stop?',
    'I would like to order',
    'Excuse me',
    'Thank you very much',
  ]

  // Translate in background, don't block UI
  for (const phrase of commonPhrases) {
    try {
      await translateText(phrase, 'te', 'en')
    } catch { /* ignore individual failures */ }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200))
  }
}

// ============================================================
// CLEAR TRANSLATION CACHE
// ============================================================

export async function clearTranslationCache(): Promise<void> {
  try {
    const indexRaw = await AsyncStorage.getItem(CACHE_INDEX_KEY)
    if (indexRaw) {
      const index: string[] = JSON.parse(indexRaw)
      await Promise.all(index.map(k => AsyncStorage.removeItem(`${CACHE_PREFIX}${k}`)))
    }
    await AsyncStorage.removeItem(CACHE_INDEX_KEY)
  } catch { /* ignore */ }
}
