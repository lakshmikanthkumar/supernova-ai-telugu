// ⚠️  DEPRECATED: This file is kept for backward compatibility.
// New code should import from './aiOrchestrator' directly.
// All functions here now delegate to aiOrchestrator.

// Legacy types — re-export from orchestrator (source of truth)
export type { GrammarCorrection, GrammarCheckResult } from './aiOrchestrator'

// GroqMessage and GroqResponse kept for any legacy callers
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqResponse {
  message: string
  tokensUsed: number
}

// ============================================================
// Re-export everything from the new orchestrator
// ============================================================

export {
  chatWithNova,
  checkGrammar,
  explainWord,
  generateDailyVocabularyChallenge,
  coachInterviewAnswer,
  chatRoleplay,
  clearConversationHistory,
  getAISystemHealth,
} from './aiOrchestrator'

// Legacy rate limit check — now uses the full orchestrator
import { getAISystemHealth as _getAISystemHealth } from './aiOrchestrator'

export function checkRateLimit(): boolean {
  const { models } = _getAISystemHealth()
  return models.some((m: { isAvailable: boolean }) => m.isAvailable)
}
