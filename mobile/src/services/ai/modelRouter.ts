import { aiHealthMonitor } from './aiHealthMonitor'
import { aiRateLimiter, ProviderId } from './aiRateLimiter'

// ─── MODEL DEFINITIONS ────────────────────────────────────────────────────

export interface ModelConfig {
  id: ProviderId
  name: string
  provider: 'groq'
  apiModel: string
  maxTokens: number
  strengths: TaskType[]
  priority: number        // lower = higher priority
  speed: 'fast' | 'medium' | 'slow'
  contextWindow: number
}

export type TaskType =
  | 'chat'
  | 'grammar_check'
  | 'interview_coaching'
  | 'quiz_generation'
  | 'word_explanation'
  | 'roleplay'
  | 'email_generation'
  | 'speech_analysis'
  | 'translation'
  | 'simple_qa'

export const MODELS: ModelConfig[] = [
  {
    id: 'groq-llama-70b',
    name: 'Llama 3.3 70B',
    provider: 'groq',
    apiModel: 'llama-3.3-70b-versatile',
    maxTokens: 512,
    strengths: ['chat', 'interview_coaching', 'roleplay', 'speech_analysis', 'email_generation'],
    priority: 1,
    speed: 'medium',
    contextWindow: 128000,
  },
  {
    id: 'groq-llama-8b',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    apiModel: 'llama-3.1-8b-instant',
    maxTokens: 512,
    strengths: ['grammar_check', 'simple_qa', 'translation', 'quiz_generation'],
    priority: 2,
    speed: 'fast',
    contextWindow: 128000,
  },
  {
    id: 'groq-gemma2-9b',
    name: 'Gemma 2 9B',
    provider: 'groq',
    apiModel: 'gemma2-9b-it',
    maxTokens: 512,
    strengths: ['chat', 'word_explanation', 'grammar_check', 'quiz_generation'],
    priority: 3,
    speed: 'fast',
    contextWindow: 8192,
  },
  {
    id: 'groq-mistral-saba',
    name: 'Mistral Saba 24B',
    provider: 'groq',
    apiModel: 'mistral-saba-24b',
    maxTokens: 512,
    strengths: ['chat', 'interview_coaching', 'roleplay', 'email_generation'],
    priority: 4,
    speed: 'medium',
    contextWindow: 32000,
  },
]

// ─── TASK → MODEL PREFERENCE MAP ─────────────────────────────────────────
// Ordered lists: first available model wins

const TASK_MODEL_PREFERENCE: Record<TaskType, ProviderId[]> = {
  // Heavy tasks → prefer powerful models
  chat:               ['groq-llama-70b', 'groq-mistral-saba', 'groq-gemma2-9b', 'groq-llama-8b'],
  interview_coaching: ['groq-llama-70b', 'groq-mistral-saba', 'groq-gemma2-9b', 'groq-llama-8b'],
  roleplay:           ['groq-llama-70b', 'groq-mistral-saba', 'groq-gemma2-9b', 'groq-llama-8b'],
  email_generation:   ['groq-llama-70b', 'groq-mistral-saba', 'groq-gemma2-9b', 'groq-llama-8b'],
  speech_analysis:    ['groq-llama-70b', 'groq-mistral-saba', 'groq-gemma2-9b', 'groq-llama-8b'],
  // Light tasks → prefer fast models
  grammar_check:      ['groq-llama-8b', 'groq-gemma2-9b', 'groq-llama-70b', 'groq-mistral-saba'],
  quiz_generation:    ['groq-llama-8b', 'groq-gemma2-9b', 'groq-llama-70b', 'groq-mistral-saba'],
  word_explanation:   ['groq-llama-8b', 'groq-gemma2-9b', 'groq-llama-70b', 'groq-mistral-saba'],
  translation:        ['groq-llama-8b', 'groq-gemma2-9b', 'groq-llama-70b', 'groq-mistral-saba'],
  simple_qa:          ['groq-llama-8b', 'groq-gemma2-9b', 'groq-llama-70b', 'groq-mistral-saba'],
}

// ─── MODEL SELECTOR ──────────────────────────────────────────────────────

export function selectModel(task: TaskType, estimatedTokens = 500): ModelConfig | null {
  const preference = TASK_MODEL_PREFERENCE[task]

  for (const modelId of preference) {
    // Check circuit breaker
    if (!aiHealthMonitor.isAvailable(modelId)) {
      console.log(`[ModelRouter] ${modelId} unavailable (circuit open), skipping`)
      continue
    }
    // Check rate limits
    if (!aiRateLimiter.canMakeRequest(modelId, estimatedTokens)) {
      console.log(`[ModelRouter] ${modelId} rate limited, skipping`)
      continue
    }
    const model = MODELS.find(m => m.id === modelId)
    if (model) {
      console.log(`[ModelRouter] Selected ${model.name} for task: ${task}`)
      return model
    }
  }

  console.warn(`[ModelRouter] No available model for task: ${task}`)
  return null
}

export function getAvailableModels(): Array<ModelConfig & { available: boolean; metrics: any }> {
  return MODELS.map(m => ({
    ...m,
    available: aiHealthMonitor.isAvailable(m.id) && aiRateLimiter.canMakeRequest(m.id),
    metrics: aiHealthMonitor.getMetrics(m.id),
  }))
}

export function getFallbackChain(task: TaskType): ProviderId[] {
  return TASK_MODEL_PREFERENCE[task]
}
