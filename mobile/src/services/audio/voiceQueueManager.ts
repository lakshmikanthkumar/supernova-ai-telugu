// ============================================================
// EnglishMitraAi - Voice Queue Manager
// Prevents concurrent recognition, debounces rapid taps, and 
// manages the speech request queue.
// ============================================================

import { voiceState } from './voiceStateManager'
import { SpeechRecognitionOptions } from './voiceRecognitionService'

type QueuedTask = () => Promise<void>

class VoiceQueueManager {
  private queue: QueuedTask[] = []
  private isProcessing: boolean = false
  private lastTapTime: number = 0
  private readonly DEBOUNCE_MS = 800 // Prevent rapid taps

  /**
   * Enqueue a new speech recognition request.
   * Blocks rapid repeated taps.
   */
  public async enqueue(task: QueuedTask, options?: SpeechRecognitionOptions): Promise<void> {
    const now = Date.now()
    
    // 1. Debounce rapid taps
    if (now - this.lastTapTime < this.DEBOUNCE_MS) {
      console.log('[VoiceQueueManager] Debounced rapid tap.')
      options?.onError?.('Preparing microphone...') // Friendly debounce message
      return
    }
    this.lastTapTime = now

    // 2. Add to queue
    this.queue.push(task)

    // 3. Process if not already processing
    if (!this.isProcessing) {
      await this.processQueue()
    } else {
      console.log('[VoiceQueueManager] Added to queue. Processing in background.')
    }
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false
      return
    }

    this.isProcessing = true
    const nextTask = this.queue.shift()

    if (nextTask) {
      try {
        await nextTask()
      } catch (error) {
        console.error('[VoiceQueueManager] Task failed:', error)
      }
    }

    // Process next item
    await this.processQueue()
  }

  public clearQueue(): void {
    this.queue = []
    this.isProcessing = false
  }
}

export const voiceQueue = new VoiceQueueManager()
