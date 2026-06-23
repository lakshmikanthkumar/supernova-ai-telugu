// Public AI API — import from here, not from individual files
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

export { aiResponseCache, withCache } from './aiResponseCache'
export { aiHealthMonitor } from './aiHealthMonitor'
export { aiRateLimiter } from './aiRateLimiter'
export { selectModel, getAvailableModels } from './modelRouter'
export type { TaskType, ModelConfig } from './modelRouter'
export type { AIMessage, AIResponse } from './aiProviderAdapter'
