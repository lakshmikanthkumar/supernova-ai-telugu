import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── CACHE CONFIG ─────────────────────────────────────────────────────────

const CACHE_TTL: Record<string, number> = {
  grammar_check:        30 * 60 * 1000,    // 30 min — grammar is deterministic
  word_explanation:     24 * 60 * 60 * 1000, // 24h — word meanings don't change
  quiz_generation:       4 * 60 * 60 * 1000, // 4h — rotate quizzes through day
  email_template:       12 * 60 * 60 * 1000, // 12h
  interview_feedback:    5 * 60 * 1000,    // 5 min — feedback is context-specific
  vocabulary_challenge: 24 * 60 * 60 * 1000, // 24h
  greeting_generation:  24 * 60 * 60 * 1000, // 24h
  pronunciation_tips:   48 * 60 * 60 * 1000, // 48h
  motivational_quote:   24 * 60 * 60 * 1000, // 24h
  nova_chat:             0,                // never cache — conversations are dynamic
}

const MAX_MEMORY_ENTRIES = 100
const CACHE_KEY_PREFIX = 'ai:cache:'
const CACHE_INDEX_KEY = 'ai:cache:index'

interface CacheEntry {
  key: string
  data: unknown
  createdAt: number
  expiresAt: number
  hitCount: number
  type: string
}

// ─── HASH UTILITY ────────────────────────────────────────────────────────
// Stable key from prompt content — same prompt always gets same cache key

function hashPrompt(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

// ─── CACHE CLASS ─────────────────────────────────────────────────────────

class AIResponseCache {
  private memoryCache = new Map<string, CacheEntry>()
  private cacheIndex: string[] = []

  buildKey(type: string, prompt: string): string {
    return `${type}:${hashPrompt(prompt.substring(0, 500))}`
  }

  async get<T>(key: string): Promise<T | null> {
    // 1. Check memory cache first (fastest)
    const memEntry = this.memoryCache.get(key)
    if (memEntry) {
      if (Date.now() < memEntry.expiresAt) {
        memEntry.hitCount++
        return memEntry.data as T
      }
      this.memoryCache.delete(key)
    }

    // 2. Check AsyncStorage
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + key)
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw)
        if (Date.now() < entry.expiresAt) {
          // Promote to memory cache
          this.memoryCache.set(key, { ...entry, hitCount: entry.hitCount + 1 })
          return entry.data as T
        }
        // Expired — clean up
        await AsyncStorage.removeItem(CACHE_KEY_PREFIX + key)
      }
    } catch {}

    return null
  }

  async set(key: string, data: unknown, type: string): Promise<void> {
    const ttl = CACHE_TTL[type] ?? 30 * 60 * 1000
    if (ttl === 0) return  // type explicitly not cached

    const entry: CacheEntry = {
      key,
      data,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      hitCount: 0,
      type,
    }

    // Store in memory
    if (this.memoryCache.size >= MAX_MEMORY_ENTRIES) {
      // Evict LRU entry
      const lruKey = [...this.memoryCache.entries()]
        .sort((a, b) => a[1].hitCount - b[1].hitCount)[0]?.[0]
      if (lruKey) this.memoryCache.delete(lruKey)
    }
    this.memoryCache.set(key, entry)

    // Persist to AsyncStorage (fire and forget)
    AsyncStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(entry)).catch(() => {})

    // Update index
    if (!this.cacheIndex.includes(key)) {
      this.cacheIndex.push(key)
      if (this.cacheIndex.length > 500) this.cacheIndex = this.cacheIndex.slice(-400)
      AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(this.cacheIndex)).catch(() => {})
    }
  }

  async invalidate(type: string) {
    const keysToDelete = this.cacheIndex.filter(k => k.startsWith(type + ':'))
    for (const key of keysToDelete) {
      this.memoryCache.delete(key)
      await AsyncStorage.removeItem(CACHE_KEY_PREFIX + key).catch(() => {})
    }
    this.cacheIndex = this.cacheIndex.filter(k => !k.startsWith(type + ':'))
  }

  async clearAll() {
    this.memoryCache.clear()
    const keys = await AsyncStorage.getAllKeys()
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX))
    await AsyncStorage.multiRemove(cacheKeys)
    this.cacheIndex = []
  }

  getStats() {
    const memory = this.memoryCache.size
    const totalHits = [...this.memoryCache.values()].reduce((s, e) => s + e.hitCount, 0)
    return { memoryEntries: memory, persistedEntries: this.cacheIndex.length, totalHits }
  }
}

export const aiResponseCache = new AIResponseCache()

// ─── CACHE WRAPPER ────────────────────────────────────────────────────────
// Convenience: wrap any async function with caching

export async function withCache<T>(
  type: string,
  prompt: string,
  fn: () => Promise<T>
): Promise<T> {
  const key = aiResponseCache.buildKey(type, prompt)
  const cached = await aiResponseCache.get<T>(key)
  if (cached !== null) return cached
  const result = await fn()
  await aiResponseCache.set(key, result, type)
  return result
}
