// ============================================================
// EnglishMitraAi - Voice Analytics & Health Monitor
// Tracks speech errors, retry counts, session duration, and
// device-specific failures.
// ============================================================

interface SpeechLogEvent {
  timestamp: string;
  type: 'start' | 'stop' | 'error' | 'retry' | 'success';
  sessionId?: string;
  message?: string;
  durationMs?: number;
  errorStr?: string;
}

class VoiceAnalyticsMonitor {
  private logs: SpeechLogEvent[] = [];
  private metrics = {
    totalSessions: 0,
    successfulSessions: 0,
    failedSessions: 0,
    totalRetries: 0,
  };

  public logEvent(event: Omit<SpeechLogEvent, 'timestamp'>) {
    const fullEvent: SpeechLogEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    this.logs.push(fullEvent);
    
    // Keep only last 100 logs to prevent memory leaks
    if (this.logs.length > 100) {
      this.logs.shift();
    }

    if (event.type === 'start') this.metrics.totalSessions++;
    if (event.type === 'success') this.metrics.successfulSessions++;
    if (event.type === 'error') this.metrics.failedSessions++;
    if (event.type === 'retry') this.metrics.totalRetries++;

    console.log(`[VoiceHealthMonitor] ${event.type.toUpperCase()}:`, event.message || event.errorStr || '');
  }

  public getMetrics() {
    const successRate = this.metrics.totalSessions > 0 
      ? ((this.metrics.successfulSessions / this.metrics.totalSessions) * 100).toFixed(2) + '%' 
      : '0%';

    return {
      ...this.metrics,
      successRate,
      recentLogs: this.logs.slice(-10)
    };
  }

  public printHealthReport() {
    console.log('[VoiceHealthMonitor] Speech Recognition Metrics:', JSON.stringify(this.getMetrics(), null, 2));
  }
}

export const voiceAnalytics = new VoiceAnalyticsMonitor();
