// ============================================================
// EnglishMitraAi - Voice State Manager
// Handles global locks, busy states, and current configuration
// ============================================================

import { SpeechRecognitionOptions } from './voiceRecognitionService'

class VoiceStateManager {
  private isListening: boolean = false
  private isStopping: boolean = false
  private isBusy: boolean = false
  private currentOptions: SpeechRecognitionOptions = {}
  private webRecognition: any = null
  private sessionCounter: number = 0
  private currentSessionId: string | null = null

  // ============================================================
  // Locks & State Checkers
  // ============================================================
  
  public getIsListening(): boolean {
    return this.isListening
  }

  public setIsListening(listening: boolean): void {
    this.isListening = listening
  }

  public getIsStopping(): boolean {
    return this.isStopping
  }

  public setIsStopping(stopping: boolean): void {
    this.isStopping = stopping
  }

  public getIsBusy(): boolean {
    return this.isBusy
  }

  public setIsBusy(busy: boolean): void {
    this.isBusy = busy
  }

  // ============================================================
  // Session Management
  // ============================================================

  public startNewSession(): string {
    this.sessionCounter += 1
    this.currentSessionId = `session_${this.sessionCounter}_${Date.now()}`
    return this.currentSessionId
  }

  public getCurrentSessionId(): string | null {
    return this.currentSessionId
  }

  public clearSession(): void {
    this.currentSessionId = null
  }

  // ============================================================
  // Options & Web Recognition
  // ============================================================

  public getCurrentOptions(): SpeechRecognitionOptions {
    return this.currentOptions
  }

  public setCurrentOptions(options: SpeechRecognitionOptions): void {
    this.currentOptions = options
  }

  public getWebRecognition(): any {
    return this.webRecognition
  }

  public setWebRecognition(recognition: any): void {
    this.webRecognition = recognition
  }

  public resetState(): void {
    this.isListening = false
    this.isStopping = false
    this.isBusy = false
    this.currentOptions = {}
    this.clearSession()
  }
}

export const voiceState = new VoiceStateManager()
