import AsyncStorage from '@react-native-async-storage/async-storage'

// ─── CIRCUIT BREAKER STATES ───────────────────────────────────────────────
export type CircuitState = 'closed' | 'open' | 'half-open'
// closed = healthy, requests flow through
// open = unhealthy, requests blocked
// half-open = testing recovery, one probe request allowed

// ─── CONFIG ──────────────────────────────────────────────────────────────
const CIRCUIT_CONFIG = {
  failureThreshold: 3,          // open circuit after N consecutive failures
  successThreshold: 2,          // close circuit after N consecutive successes in half-open
  openDurationMs: 60_000,       // keep open for 60s before trying half-open
  slowThresholdMs: 10_000,      // requests > 10s count as "slow"
  slowCallRateThreshold: 0.5,   // open if >50% calls are slow
  sampleWindowMs: 120_000,      // measure over last 2 minutes
} as const

// ─── TYPES ────────────────────────────────────────────────────────────────
interface RequestRecord {
  timestamp: number
  latencyMs: number
  success: boolean
  errorType?: '429' | 'timeout' | 'network' | 'invalid_response' | 'unknown'
}

interface ProviderHealth {
  providerId: string
  state: CircuitState
  consecutiveFailures: number
  consecutiveSuccesses: number
  openedAt: number | null
  lastCheckedAt: number
  records: RequestRecord[]
}

const HEALTH_STORAGE_KEY = (id: string) => `ai:health:${id}`

// ─── HEALTH MONITOR ───────────────────────────────────────────────────────

class AIHealthMonitor {
  private health: Record<string, ProviderHealth> = {}

  private getHealth(providerId: string): ProviderHealth {
    if (!this.health[providerId]) {
      this.health[providerId] = {
        providerId,
        state: 'closed',
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        openedAt: null,
        lastCheckedAt: Date.now(),
        records: [],
      }
    }
    return this.health[providerId]
  }

  // ── CIRCUIT BREAKER: can we send to this provider? ──────────────────────

  isAvailable(providerId: string): boolean {
    const h = this.getHealth(providerId)
    const now = Date.now()

    if (h.state === 'closed') return true

    if (h.state === 'open') {
      // Check if cooldown period passed → transition to half-open
      if (h.openedAt && now - h.openedAt >= CIRCUIT_CONFIG.openDurationMs) {
        h.state = 'half-open'
        h.consecutiveSuccesses = 0
        console.log(`[AIHealth] Circuit half-open for ${providerId}`)
        return true  // Allow one probe request
      }
      return false
    }

    if (h.state === 'half-open') {
      return true  // Allow probe request
    }

    return true
  }

  // ── RECORD OUTCOME ───────────────────────────────────────────────────────

  recordSuccess(providerId: string, latencyMs: number) {
    const h = this.getHealth(providerId)
    const now = Date.now()

    // Purge old records outside window
    h.records = h.records.filter(r => now - r.timestamp < CIRCUIT_CONFIG.sampleWindowMs)
    h.records.push({ timestamp: now, latencyMs, success: true })

    h.consecutiveFailures = 0
    h.lastCheckedAt = now

    if (h.state === 'half-open') {
      h.consecutiveSuccesses++
      if (h.consecutiveSuccesses >= CIRCUIT_CONFIG.successThreshold) {
        h.state = 'closed'
        h.openedAt = null
        console.log(`[AIHealth] Circuit closed (recovered): ${providerId}`)
      }
    }

    this.persist(providerId)
  }

  recordFailure(
    providerId: string,
    latencyMs: number,
    errorType: RequestRecord['errorType'] = 'unknown'
  ) {
    const h = this.getHealth(providerId)
    const now = Date.now()

    h.records = h.records.filter(r => now - r.timestamp < CIRCUIT_CONFIG.sampleWindowMs)
    h.records.push({ timestamp: now, latencyMs, success: false, errorType })

    h.consecutiveFailures++
    h.consecutiveSuccesses = 0
    h.lastCheckedAt = now

    // Open the circuit if threshold exceeded
    if (
      h.state !== 'open' &&
      h.consecutiveFailures >= CIRCUIT_CONFIG.failureThreshold
    ) {
      h.state = 'open'
      h.openedAt = now
      console.warn(`[AIHealth] Circuit OPENED for ${providerId} after ${h.consecutiveFailures} failures`)
    }

    // Also open if half-open probe failed
    if (h.state === 'half-open') {
      h.state = 'open'
      h.openedAt = now
      console.warn(`[AIHealth] Circuit re-opened for ${providerId} (half-open probe failed)`)
    }

    // Check slow call rate
    this.checkSlowCallRate(h, providerId)

    this.persist(providerId)
  }

  private checkSlowCallRate(h: ProviderHealth, providerId: string) {
    const recent = h.records.filter(r => Date.now() - r.timestamp < 60_000)
    if (recent.length < 5) return
    const slowCount = recent.filter(r => r.latencyMs > CIRCUIT_CONFIG.slowThresholdMs).length
    const slowRate = slowCount / recent.length
    if (slowRate > CIRCUIT_CONFIG.slowCallRateThreshold && h.state === 'closed') {
      h.state = 'open'
      h.openedAt = Date.now()
      console.warn(`[AIHealth] Circuit opened for ${providerId} due to high latency (${Math.round(slowRate * 100)}% slow)`)
    }
  }

  // ── METRICS ──────────────────────────────────────────────────────────────

  getMetrics(providerId: string) {
    const h = this.getHealth(providerId)
    const now = Date.now()
    const recent = h.records.filter(r => now - r.timestamp < CIRCUIT_CONFIG.sampleWindowMs)
    const successCount = recent.filter(r => r.success).length
    const avgLatency = recent.length
      ? Math.round(recent.reduce((s, r) => s + r.latencyMs, 0) / recent.length)
      : 0

    return {
      state: h.state,
      successRate: recent.length ? Math.round((successCount / recent.length) * 100) : 100,
      avgLatencyMs: avgLatency,
      recentRequests: recent.length,
      consecutiveFailures: h.consecutiveFailures,
      isAvailable: this.isAvailable(providerId),
      openedAt: h.openedAt,
      msUntilRetry: h.openedAt
        ? Math.max(0, CIRCUIT_CONFIG.openDurationMs - (now - h.openedAt))
        : 0,
    }
  }

  getAllMetrics(): Record<string, ReturnType<AIHealthMonitor['getMetrics']>> {
    const result: Record<string, ReturnType<AIHealthMonitor['getMetrics']>> = {}
    for (const id of Object.keys(this.health)) {
      result[id] = this.getMetrics(id)
    }
    return result
  }

  private async persist(providerId: string) {
    try {
      const h = this.health[providerId]
      if (h) {
        // Only persist the summary, not full records (to save storage)
        const summary = {
          state: h.state,
          consecutiveFailures: h.consecutiveFailures,
          openedAt: h.openedAt,
          lastCheckedAt: h.lastCheckedAt,
        }
        await AsyncStorage.setItem(HEALTH_STORAGE_KEY(providerId), JSON.stringify(summary))
      }
    } catch {}
  }

  async loadPersistedHealth() {
    const providers = ['groq-llama-70b', 'groq-llama-8b', 'groq-gemma2-9b', 'groq-mistral-saba']
    for (const id of providers) {
      try {
        const raw = await AsyncStorage.getItem(HEALTH_STORAGE_KEY(id))
        if (raw) {
          const summary = JSON.parse(raw)
          const h = this.getHealth(id)
          // Only restore open/half-open state if it's recent
          if (summary.openedAt && Date.now() - summary.openedAt < CIRCUIT_CONFIG.openDurationMs) {
            h.state = summary.state
            h.openedAt = summary.openedAt
            h.consecutiveFailures = summary.consecutiveFailures
          }
        }
      } catch {}
    }
  }
}

export const aiHealthMonitor = new AIHealthMonitor()
aiHealthMonitor.loadPersistedHealth()
