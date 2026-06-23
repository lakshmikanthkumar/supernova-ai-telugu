import axios, { AxiosError } from 'axios'
import { ModelConfig } from './modelRouter'
import { aiHealthMonitor } from './aiHealthMonitor'
import { aiRateLimiter } from './aiRateLimiter'

// ─── TYPES ────────────────────────────────────────────────────────────────

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIRequestOptions {
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
  timeoutMs?: number
}

export interface AIResponse {
  content: string
  tokensUsed: number
  modelUsed: string
  latencyMs: number
  cached: boolean
}

export type AIError =
  | { type: 'rate_limit'; retryAfterMs: number }
  | { type: 'timeout'; latencyMs: number }
  | { type: 'network'; message: string }
  | { type: 'invalid_response'; message: string }
  | { type: 'all_providers_failed' }

// ─── GROQ ADAPTER ────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? ''

async function callGroqModel(
  model: ModelConfig,
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<AIResponse> {
  const {
    maxTokens = model.maxTokens,
    temperature = 0.7,
    jsonMode = false,
    timeoutMs = 15_000,
  } = options

  const startTime = Date.now()

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: model.apiModel,
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
      timeout: timeoutMs,
    }
  )

  const latencyMs = Date.now() - startTime
  const content = response.data.choices[0]?.message?.content ?? ''
  const tokensUsed = response.data.usage?.total_tokens ?? 0

  return {
    content,
    tokensUsed,
    modelUsed: model.apiModel,
    latencyMs,
    cached: false,
  }
}

// ─── UNIFIED CALL WITH ERROR CLASSIFICATION ──────────────────────────────

export async function callProvider(
  model: ModelConfig,
  messages: AIMessage[],
  options: AIRequestOptions = {}
): Promise<AIResponse> {
  const startTime = Date.now()

  try {
    const result = await callGroqModel(model, messages, options)
    aiHealthMonitor.recordSuccess(model.id, result.latencyMs)
    aiRateLimiter.recordRequest(model.id, result.tokensUsed)
    return result
  } catch (err) {
    const latencyMs = Date.now() - startTime
    const axiosErr = err as AxiosError

    let errorType: 'rate_limit' | 'timeout' | 'network' | 'invalid_response' | 'unknown' = 'unknown'
    let retryAfterMs = 60_000

    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
      errorType = 'timeout'
      console.warn(`[Provider] Timeout on ${model.id} after ${latencyMs}ms`)
    } else if (axiosErr.response?.status === 429) {
      errorType = 'rate_limit'
      const retryAfter = axiosErr.response.headers?.['retry-after']
      retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60_000
      console.warn(`[Provider] Rate limited on ${model.id}, retry after ${retryAfterMs}ms`)
    } else if (!axiosErr.response) {
      errorType = 'network'
      console.warn(`[Provider] Network error on ${model.id}: ${axiosErr.message}`)
    } else if (axiosErr.response?.status && axiosErr.response.status >= 500) {
      errorType = 'unknown'
      console.warn(`[Provider] Server error ${axiosErr.response.status} on ${model.id}`)
    }

    aiHealthMonitor.recordFailure(model.id, latencyMs, errorType)
    aiRateLimiter.recordRequest(model.id, 0)

    throw { type: errorType, latencyMs, retryAfterMs, originalError: err }
  }
}

// ─── VALIDATE JSON RESPONSE ──────────────────────────────────────────────

export function parseJSON<T>(content: string, fallback: T): T {
  try {
    return JSON.parse(content) as T
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/)
    if (match) {
      try { return JSON.parse(match[1]) as T } catch {}
    }
    // Try to find JSON object in text
    const objMatch = content.match(/\{[\s\S]*\}/)
    if (objMatch) {
      try { return JSON.parse(objMatch[0]) as T } catch {}
    }
    return fallback
  }
}
