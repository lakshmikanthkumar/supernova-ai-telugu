// ============================================================
// EnglishMitraAi - Offline Support Manager
// Caches lessons, flashcards using AsyncStorage
// Queues API calls when offline for background sync
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import type { Lesson, Flashcard, LessonCategory } from '../../types'
import { gamificationService, flashcardService } from '../api'


const CACHE_KEYS = {
  CATEGORIES: 'cache:categories',
  LESSONS_BY_CATEGORY: (id: string) => `cache:lessons:${id}`,
  FLASHCARDS: 'cache:flashcards',
  OFFLINE_QUEUE: 'offline:queue',
  CACHE_TIMESTAMP: (key: string) => `cache:ts:${key}`,
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface QueuedAction {
  id: string
  type: 'complete_lesson' | 'update_flashcard' | 'quiz_attempt' | 'chat_message'
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

class OfflineManager {
  private isOnline = true

  constructor() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline
      this.isOnline = state.isConnected ?? true

      if (wasOffline && this.isOnline) {
        this.processQueue()
      }
    })
  }

  // ---- CACHE MANAGEMENT ----

  async cacheCategories(categories: LessonCategory[]) {
    await AsyncStorage.setItem(CACHE_KEYS.CATEGORIES, JSON.stringify(categories))
    await this.setTimestamp(CACHE_KEYS.CATEGORIES)
  }

  async getCachedCategories(): Promise<LessonCategory[] | null> {
    if (!await this.isCacheValid(CACHE_KEYS.CATEGORIES)) return null
    const data = await AsyncStorage.getItem(CACHE_KEYS.CATEGORIES)
    return data ? JSON.parse(data) : null
  }

  async cacheLessons(categoryId: string, lessons: Lesson[]) {
    const key = CACHE_KEYS.LESSONS_BY_CATEGORY(categoryId)
    await AsyncStorage.setItem(key, JSON.stringify(lessons))
    await this.setTimestamp(key)
  }

  async getCachedLessons(categoryId: string): Promise<Lesson[] | null> {
    const key = CACHE_KEYS.LESSONS_BY_CATEGORY(categoryId)
    if (!await this.isCacheValid(key)) return null
    const data = await AsyncStorage.getItem(key)
    return data ? JSON.parse(data) : null
  }

  async cacheFlashcards(flashcards: Flashcard[]) {
    await AsyncStorage.setItem(CACHE_KEYS.FLASHCARDS, JSON.stringify(flashcards))
    await this.setTimestamp(CACHE_KEYS.FLASHCARDS)
  }

  async getCachedFlashcards(): Promise<Flashcard[] | null> {
    if (!await this.isCacheValid(CACHE_KEYS.FLASHCARDS)) return null
    const data = await AsyncStorage.getItem(CACHE_KEYS.FLASHCARDS)
    return data ? JSON.parse(data) : null
  }

  // ---- OFFLINE QUEUE ----

  async enqueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) {
    const queue = await this.getQueue()
    const newAction: QueuedAction = {
      ...action,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      retries: 0,
    }
    queue.push(newAction)
    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue))
    console.log(`[Offline] Queued action: ${action.type}`)
  }

  async processQueue() {
    const queue = await this.getQueue()
    if (queue.length === 0) return

    console.log(`[Offline] Processing ${queue.length} queued actions`)
    const remaining: QueuedAction[] = []

    for (const action of queue) {
      try {
        await this.executeAction(action)
        console.log(`[Offline] Successfully processed: ${action.type}`)
      } catch (err) {
        if (action.retries < 3) {
          remaining.push({ ...action, retries: action.retries + 1 })
        } else {
          console.error(`[Offline] Dropped action after 3 retries: ${action.type}`)
        }
      }
    }

    await AsyncStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(remaining))
  }

  private async executeAction(action: QueuedAction) {
    const { type, payload } = action

    switch (type) {
      case 'complete_lesson':
        await gamificationService.updateProgress('complete_lesson', payload.lessonId as string)
        break
      case 'update_flashcard':
        await flashcardService.updateFlashcardProgress(payload.flashcardId as string, payload.correct as boolean)
        break
    }
  }

  private async getQueue(): Promise<QueuedAction[]> {
    const data = await AsyncStorage.getItem(CACHE_KEYS.OFFLINE_QUEUE)
    return data ? JSON.parse(data) : []
  }

  private async setTimestamp(key: string) {
    await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP(key), Date.now().toString())
  }

  private async isCacheValid(key: string): Promise<boolean> {
    const ts = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP(key))
    if (!ts) return false
    return Date.now() - parseInt(ts) < CACHE_TTL_MS
  }

  getIsOnline() { return this.isOnline }
}

export const offlineManager = new OfflineManager()
