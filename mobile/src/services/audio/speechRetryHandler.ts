// ============================================================
// EnglishMitraAi - Speech Retry Handler
// Handles exponential backoff and recovery when the speech 
// engine is busy or crashes.
// ============================================================

import { SpeechRecognitionOptions } from './voiceRecognitionService'

export class SpeechRetryHandler {
  private maxRetries: number = 3
  private baseDelayMs: number = 1000

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: SpeechRecognitionOptions
  ): Promise<T> {
    let attempt = 0

    while (attempt < this.maxRetries) {
      try {
        return await operation()
      } catch (error: any) {
        attempt++
        const errMsg = String(error?.message || error || 'unknown').toLowerCase()

        // Check if error is recoverable (busy, timeout, etc)
        const isRecoverable =
          errMsg.includes('8') ||
          errMsg.includes('11') ||
          errMsg.includes('busy') ||
          errMsg.includes('too_many_requests') ||
          errMsg.includes('timeout') ||
          errMsg.includes('already started')

        if (isRecoverable && attempt < this.maxRetries) {
          const delay = this.baseDelayMs * Math.pow(2, attempt - 1) // 1s, 2s, 4s...
          console.log(`[SpeechRetryHandler] Recoverable error (${errMsg}). Retrying in ${delay}ms... (Attempt ${attempt}/${this.maxRetries})`)
          
          // Friendly feedback
          if (attempt === 1) {
             options?.onError?.('Listening again...')
          } else {
             options?.onError?.('Preparing microphone...')
          }

          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        // Not recoverable or max retries reached
        console.error(`[SpeechRetryHandler] Max retries reached or unrecoverable error: ${errMsg}`)
        throw error
      }
    }

    throw new Error('Max retries exceeded')
  }
}

export const speechRetry = new SpeechRetryHandler()
