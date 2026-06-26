import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── PROVIDER RATE LIMITS (free tier) ────────────────────────────────────
export const PROVIDER_LIMITS = {
  'groq-llama-70b': {
    requestsPerMinute: 30,
    requestsPerDay: 14400,
    tokensPerMinute: 6000,
    tokensPerDay: 500000,
  },
  'groq-llama-8b': {
    requestsPerMinute: 30,
    requestsPerDay: 14400,
    tokensPerMinute: 20000,
    tokensPerDay: 500000,
  },
  'groq-gemma2-9b': {
    requestsPerMinute: 30,
    requestsPerDay: 14400,
    tokensPerMinute: 15000,
    tokensPerDay: 500000,
  },
  'groq-mistral-saba': {
    requestsPerMinute: 30,
    requestsPerDay: 14400,
    tokensPerMinute: 6000,
    tokensPerDay: 500000,
  },
  'gemini-1.5-flash': {
    requestsPerMinute: 15,
    requestsPerDay: 1500,
    tokensPerMinute: 1000000,
    tokensPerDay: 10000000,
  },
  'openrouter-free': {
    requestsPerMinute: 20,
    requestsPerDay: 200,
    tokensPerMinute: 40000,
    tokensPerDay: 200000,
  },
} as const

export type ProviderId = keyof typeof PROVIDER_LIMITS

// ─── RATE LIMITER CLASS ───────────────────────────────────────────────────

interface ProviderUsage {
  minuteRequests: number[]   // timestamps of requests in current minute window
  dayRequests: number[]      // timestamps of requests in current day window
  minuteTokens: number       // tokens used in current minute
  dayTokens: number          // tokens used in current day
  lastReset: { minute: number; day: number }
}

const STORAGE_KEY = (id: ProviderId) => `ai:rate:${id}`

class AIRateLimiter {
  private usage: Partial<Record<ProviderId, ProviderUsage>> = {}

  private getUsage(providerId: ProviderId): ProviderUsage {
    if (!this.usage[providerId]) {
      const now = Date.now()
      this.usage[providerId] = {
        minuteRequests: [],
        dayRequests: [],
        minuteTokens: 0,
        dayTokens: 0,
        lastReset: { minute: now, day: now },
      }
    }
    return this.usage[providerId]!
  }

  private purgeOld(usage: ProviderUsage) {
    const now = Date.now()
    const oneMinAgo = now - 60_000
    const oneDayAgo = now - 86_400_000
    usage.minuteRequests = usage.minuteRequests.filter(t => t > oneMinAgo)
    usage.dayRequests = usage.dayRequests.filter(t => t > oneDayAgo)
    // Reset token counters if window has passed
    if (now - usage.lastReset.minute > 60_000) {
      usage.minuteTokens = 0
      usage.lastReset.minute = now
    }
    if (now - usage.lastReset.day > 86_400_000) {
      usage.dayTokens = 0
      usage.lastReset.day = now
    }
  }

  canMakeRequest(providerId: ProviderId, estimatedTokens = 500): boolean {
    const limits = PROVIDER_LIMITS[providerId]
    const usage = this.getUsage(providerId)
    this.purgeOld(usage)

    if (usage.minuteRequests.length >= limits.requestsPerMinute) return false
    if (usage.dayRequests.length >= limits.requestsPerDay * 0.95) return false  // 95% safety buffer
    if (usage.minuteTokens + estimatedTokens > limits.tokensPerMinute * 0.9) return false
    if (usage.dayTokens + estimatedTokens > limits.tokensPerDay * 0.95) return false

    return true
  }

  recordRequest(providerId: ProviderId, tokensUsed = 0) {
    const usage = this.getUsage(providerId)
    this.purgeOld(usage)
    const now = Date.now()
    usage.minuteRequests.push(now)
    usage.dayRequests.push(now)
    usage.minuteTokens += tokensUsed
    usage.dayTokens += tokensUsed
    // Persist to AsyncStorage (fire and forget)
    this.persistUsage(providerId)
  }

  getUsageStats(providerId: ProviderId) {
    const limits = PROVIDER_LIMITS[providerId]
    const usage = this.getUsage(providerId)
    this.purgeOld(usage)
    return {
      requestsThisMinute: usage.minuteRequests.length,
      requestsToday: usage.dayRequests.length,
      tokensThisMinute: usage.minuteTokens,
      tokensToday: usage.dayTokens,
      minuteRequestsRemaining: Math.max(0, limits.requestsPerMinute - usage.minuteRequests.length),
      dayRequestsRemaining: Math.max(0, limits.requestsPerDay - usage.dayRequests.length),
      utilizationPct: Math.round((usage.dayRequests.length / limits.requestsPerDay) * 100),
    }
  }

  getSecondsUntilNextSlot(providerId: ProviderId): number {
    const usage = this.getUsage(providerId)
    if (!usage.minuteRequests.length) return 0
    const oldest = Math.min(...usage.minuteRequests)
    const retryAt = oldest + 60_000
    return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))
  }

  private async persistUsage(providerId: ProviderId) {
    try {
      const usage = this.usage[providerId]
      if (usage) await AsyncStorage.setItem(STORAGE_KEY(providerId), JSON.stringify(usage))
    } catch {}
  }

  async loadPersistedUsage() {
    for (const id of Object.keys(PROVIDER_LIMITS) as ProviderId[]) {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY(id))
        if (raw) {
          const stored = JSON.parse(raw) as ProviderUsage
          // Only restore if stored data is from today
          const oneDayAgo = Date.now() - 86_400_000
          if (stored.lastReset.day > oneDayAgo) {
            this.usage[id] = stored
          }
        }
      } catch {}
    }
  }
}

export const aiRateLimiter = new AIRateLimiter()
// Load persisted usage on startup
aiRateLimiter.loadPersistedUsage()
