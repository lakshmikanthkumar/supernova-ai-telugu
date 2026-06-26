# EnglishMitraAI — Architecture

## System Overview

```
Mobile App (React Native + Expo 52)
        │
        ├── Device Services (FREE, no API calls)
        │   ├── react-native-voice     → Speech-to-Text (device STT)
        │   ├── expo-speech            → Text-to-Speech (device TTS)
        │   └── AsyncStorage           → Offline cache, queued actions, AI cache
        │
        ├── AI Orchestration Layer (multi-model failover)
        │   ├── aiOrchestrator.ts      → Entry point, 4-model fallback chain
        │   ├── modelRouter.ts         → Picks best model per task type
        │   ├── aiProviderAdapter.ts   → Unified Groq caller, error classification
        │   ├── aiHealthMonitor.ts     → Circuit breaker (closed/open/half-open)
        │   ├── aiRateLimiter.ts       → Per-provider sliding window (req + tokens)
        │   └── aiResponseCache.ts     → Memory + AsyncStorage two-layer cache
        │
        ├── Content Engine (dynamic, never repeats)
        │   ├── contentEngine.ts       → SM-2 spaced repetition, seeded shuffle
        │   ├── personalizationEngine.ts → Daily feed generator
        │   └── contentRotationService.ts → Per-module dynamic content
        │
        └── Supabase Backend
            ├── PostgreSQL             → User data, lessons, progress, analytics
            ├── Auth                   → Email/Password + Phone OTP
            ├── Storage                → Lesson assets, avatars
            └── Edge Functions (Deno)
                ├── tutor-chat             → AI chat + XP rewards (4-model fallback)
                ├── interview-coach        → Structured interview feedback
                ├── email-assistant        → Email generation/improvement
                ├── grammar-engine         → Grammar check + quiz generation
                ├── public-speaking-coach  → Filler detection, WPM, fluency
                ├── ai-content-generator   → Daily content + 7-day Supabase cache
                └── update-progress        → XP + achievement unlocks
```

---

## Multi-Model AI Architecture

The app uses **4 Groq models in a failover chain**. If the primary model is rate-limited or down, the next one is tried automatically — the user never sees a broken state.

### Model Priority by Task

| Task Type | Priority Order |
|-----------|---------------|
| Chat / Roleplay / Interview / Email | `llama-3.3-70b-versatile` → `mistral-saba-24b` → `gemma2-9b-it` → `llama-3.1-8b-instant` |
| Grammar / Quiz / Word Explanation | `llama-3.1-8b-instant` → `gemma2-9b-it` → `llama-3.3-70b-versatile` → `mistral-saba-24b` |

Light tasks prefer the 8B model for speed; heavy reasoning tasks prefer 70B for quality. The router falls back down the chain transparently.

### Circuit Breaker States

```
closed  ──── 3 consecutive failures ──→  open  (60s cooldown)
                                           │
                                           └── 60s elapsed ──→  half-open
                                                                    │
                                          2 consecutive successes ──┘──→ closed
                                          1 failure ──────────────────→ open
```

Additionally, if >50% of requests in the last 60s exceed 10s latency, the circuit opens regardless of error count.

### Response Cache TTLs

| Content Type | TTL |
|-------------|-----|
| Grammar check | 30 minutes |
| Word explanation | 24 hours |
| Vocabulary challenge | 24 hours (daily) |
| Quiz generation | 4 hours |
| Email templates | 12 hours |
| Interview feedback | 5 minutes |
| Nova chat | Never cached |

Cache uses two layers: in-memory Map (fast, up to 100 entries, LRU eviction) + AsyncStorage (persistent across restarts).

### Rate Limiter Limits (per provider)

| Limit | Value | Safety Buffer |
|-------|-------|--------------|
| Requests/minute | 30 | 95% (28.5 effective) |
| Requests/day | 14,400 | 95% (13,680 effective) |
| Tokens/minute | Varies by model | 90% |
| Tokens/day | 500,000 | 95% |

---

## AI Chat Architecture

```
User types / speaks
    ↓
NovaChatScreen
    ↓ chatWithNova(sessionId, message)
aiOrchestrator.ts
    ↓ selectModel('chat') → best available model
    ↓ callProvider(model, messages)
    ├── llama-3.3-70b-versatile  (primary)
    ├── mistral-saba-24b          (fallback 1)
    ├── gemma2-9b-it              (fallback 2)
    └── llama-3.1-8b-instant      (fallback 3)
    ↓ response text
checkGrammar(message) → parallel, non-blocking
    ↓ { corrections }
Display response + expo-speech TTS
    ↓ Save history to AsyncStorage (last 10 messages)
```

---

## Dynamic Content Architecture

All daily content uses **seeded randomization** — consistent for the same user on the same day, but different every day and across users.

```
getDailySeed(userId)  =  hash(userId + YYYY-MM-DD)
    ↓
seededShuffle(contentPool, seed)
    ↓
getRandomUnseenContent(userId, items, { type })
    ├── Load "seen" history from AsyncStorage
    ├── Filter out already-seen items
    ├── Reset when pool exhausted (never gets stuck)
    └── Return N items
```

### SM-2 Spaced Repetition (Flashcards)

Cards are sorted by urgency score:
- `dueDate` in the past → highest priority
- `easeFactor` < 2.0 → struggling, show more
- `interval` = 0 → new card, show first
- New cards mixed with due cards (ratio 30/70)

---

## Pronunciation Architecture

```
User speaks
    ↓
react-native-voice (device Google/Apple STT) → transcript: string
    ↓
pronunciationScorer.ts (offline Levenshtein)
    ↓ { overall_score, accuracy, fluency, words_analysis }
speech-to-text Edge Function (optional Groq feedback)
    ↓ { feedback_telugu, encouragement, specific_tips }
PronunciationLab screen
```

The Levenshtein comparison runs 100% offline — no API call needed for the score itself.

---

## Translation Cache Architecture

```
translateText("Good morning", "te")
    ↓
1. Static map lookup      → instant, offline (~500 entries)
    ↓ miss
2. AsyncStorage lookup    → fast, offline
    ↓ miss
3. google-translate-api-x → network, ~200ms
    ↓ cache result in AsyncStorage (max 500 entries, LRU)
return translated string
```

---

## Offline Architecture

```
Action (e.g., complete lesson, XP award)
    ↓
offlineManager.ts
    ↓ network available?
    ├── YES → POST to Supabase Edge Function directly
    └── NO  → Save to AsyncStorage queue
                    ↓ (when network returns)
               processQueue() → retry all queued actions in order
```

---

## Redux Store (11 Slices)

| Slice | Key State |
|-------|-----------|
| `auth` | user, session, isGuest, loading |
| `lessons` | categories, currentLesson, progress |
| `chat` | sessions, messages, sending |
| `gamification` | xp, level, streak, achievements |
| `ui` | theme, language, toasts |
| `speaking` | sessions, scores, feedback |
| `interview` | sessions, questions, coaching |
| `email` | drafts, generated, improved |
| `grammar` | exercises, progress, corrections |
| `learningPath` | pathData, milestones, recommendations |
| `dynamicFeed` | dailyFeed, challenges, loading |

---

## Database Schema

### Core Tables (001_initial_schema.sql)
```
profiles                  — User profile, XP, level, streak, learning goal
lesson_categories         — 10 categories with icons and colors
lessons                   — Content with JSONB (vocabulary, dialogues, tips)
flashcards                — SM-2 fields: interval, ease_factor, due_date
quiz_questions            — Multiple choice with Telugu explanations
pronunciation_phrases     — Target phrases with phonetic tips
roleplay_scenarios        — System prompts for AI personas
user_lesson_progress      — Completion, score, time spent per lesson
user_flashcard_progress   — SM-2 progress per card per user
chat_sessions             — Session metadata
chat_messages             — History with grammar corrections stored
achievements              — Definitions with unlock conditions (JSON)
user_achievements         — User ↔ achievement mapping with unlock date
xp_transactions           — Full XP audit trail
leaderboard_weekly        — Materialized weekly rankings
```

### New Feature Tables (004_new_features.sql)
```
daily_greetings           — Greetings pool (7 categories)
self_introduction_templates — 6 templates (student/fresher/experienced etc.)
office_scenarios          — 10 workplace conversation scenarios
email_templates           — 7 email types (formal/apology/request etc.)
interview_sessions        — Session history with JSON transcript
public_speech_sessions    — WPM, filler count, fluency score
speaking_sessions         — General speaking practice history
ai_feedback               — AI coaching feedback store
phone_call_scenarios      — 7 simulated call types
vocabulary_mastery        — Per-user per-word mastery tracking
user_learning_path        — AI-generated learning path per user
pronunciation_history     — Score history for progress charts
grammar_exercises         — Exercise pool (7 grammar topics)
user_grammar_progress     — Per-user per-exercise progress
```

### Dynamic Content Tables (007_dynamic_content.sql)
```
user_content_history      — What each user has seen (prevents repeats)
daily_content_feed        — Cached daily feed per user (refreshed daily)
ai_generated_content      — AI content with 7-day Supabase cache
challenge_history         — Daily challenge completion tracking
flashcard_sessions        — SM-2 session data
pronunciation_sessions    — Extended pronunciation session data
```

### AI Analytics Tables (008_ai_analytics.sql)
```
ai_usage_logs             — Every AI request (model, tokens, latency, success)
ai_provider_health        — Hourly health snapshots per provider
ai_request_metrics        — Aggregated hourly metrics per provider
```

All tables have Row Level Security (RLS) — users can only read/write their own data.

---

## Edge Function: Multi-Model Fallback

Every edge function uses this failover pattern:

```typescript
const MODEL_CHAIN = [
  'llama-3.3-70b-versatile',  // primary
  'llama-3.1-8b-instant',     // fallback 1 (fastest)
  'gemma2-9b-it',             // fallback 2
  'mistral-saba-24b',         // fallback 3
]

async function callGroqWithFallback(messages, options) {
  for (const model of MODEL_CHAIN) {
    try {
      const res = await fetch(GROQ_URL, { body: JSON.stringify({ model, ...options }) })
      if (res.status === 429) continue  // rate limited → try next
      if (!res.ok) continue            // server error → try next
      const data = await res.json()
      if (!data.choices?.[0]?.message?.content) continue  // empty → try next
      return { content: data.choices[0].message.content, model }
    } catch { continue }               // timeout/network → try next
  }
  throw new Error('All models failed')
}
```

---

## Token Budget (Groq Free Tier)

- `MAX_TOKENS = 512` per response
- Conversation history trimmed to last 10 messages
- Grammar check skipped for messages under 4 characters
- Response cache prevents duplicate API calls for identical prompts
- Rate limiter enforces 95% of daily limit as safety ceiling

**Daily capacity estimate:**

| Scenario | Groq calls/day | Users supported (1 key) |
|----------|---------------|------------------------|
| Casual (5 msgs/session) | ~10 calls/user | ~1,440 users |
| Active (20 msgs/session) | ~40 calls/user | ~360 users |
| Power user (50 msgs/session) | ~100 calls/user | ~144 users |

With 4 API keys (one per model type), capacity scales 4×.
