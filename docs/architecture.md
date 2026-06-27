# EnglishMitraAI — Architecture Guide

---

## 🌐 System Overview
```text
Mobile App (React Native + Expo) – 52 screens
│
├─ Device Services (offline‑first)
│   ├─ `react-native-voice` – native Speech‑to‑Text
│   ├─ `expo-speech` – native Text‑to‑Speech
│   └─ `AsyncStorage` – offline cache & queued actions
│
├─ **AI Orchestration Layer** (multi‑model fail‑over)
│   ├─ `aiOrchestrator.ts` – entry point, 4‑model chain
│   ├─ `modelRouter.ts` – selects optimal model per task
│   ├─ `aiProviderAdapter.ts` – unified Groq caller & error classification
│   ├─ `aiHealthMonitor.ts` – circuit‑breaker (closed/open/half‑open)
│   ├─ `aiRateLimiter.ts` – sliding‑window per‑provider limits
│   └─ `aiResponseCache.ts` – in‑memory + AsyncStorage two‑tier cache
│
├─ **Content Engine** (dynamic, non‑repeating)
│   ├─ `contentEngine.ts` – SM‑2 spaced‑repetition, seeded shuffle
│   ├─ `personalizationEngine.ts` – daily feed generation
│   └─ `contentRotationService.ts` – per‑module selection logic
│
├─ **Speech Service Enhancements**
│   ├─ `voiceService.ts` – unified wrapper
│   ├─ `voiceRecognitionService.ts`
│   │   ├─ Web: `continuous: true`, `interimResults: true`
│   │   └─ Android: `continuous: true`
│   ├─ `voiceState.ts` – global listening state
│   └─ `voiceQueue.ts` – serialized start/stop actions
│
└─ **Supabase Backend**
    ├─ PostgreSQL – user data, lessons, progress, analytics
    ├─ Auth – Email/Password + Phone OTP
    ├─ Storage – lesson assets, avatars
    └─ Edge Functions (Deno)
        ├─ `tutor-chat`
        ├─ `interview-coach`
        ├─ `email‑assistant`
        ├─ `grammar-engine`
        ├─ `public‑speaking‑coach`
        ├─ `ai‑content‑generator`
        └─ `update‑progress`
```
---

## 🤖 Multi‑Model AI Architecture
- **Primary**: `llama-3.3-70b‑versatile`
- **Fallback Chain**: `mistral-saba-24b` → `gemma2-9b‑it` → `llama-3.1-8b‑instant`
- **Task‑based priority** (see table) ensures the most capable model handles complex tasks while cheaper models serve lightweight workloads.

| Task Type | Priority Order |
|-----------|----------------|
| Chat / Roleplay / Interview / Email | `llama-3.3-70b` → `mistral-saba-24b` → `gemma2-9b‑it` → `llama-3.1-8b` |
| Grammar / Quiz / Word Explanation | `llama-3.1-8b` → `gemma2-9b‑it` → `llama-3.3-70b` → `mistral-saba-24b` |

- **Circuit Breaker** opens after **3 consecutive failures** or if **>50 %** of requests in the last 60 s exceed **10 s** latency.
- **Rate Limiter** enforces **30 req/min** (≈ 95 % safety buffer) and **14 400 req/day** per Groq key.
---

## 🎙️ Speech Service Details
- **Web** – native Web Speech API (`continuous: true`, `interimResults: true`). Errors shown via non‑blocking `window.confirm`.
- **Android** – Google Speech Recognition with continuous mode.
- **iOS** – Apple Speech framework (offline for short phrases). No continuous mode needed.
- All platforms share a unified `VoiceService` emitting `start`, `partial`, `result`, `error`, `stop`, `cancel` events consumed via `useVoice` hook.
---

## 📦 Redux Store (11 Slices)
| Slice | Purpose |
|------|---------|
| `auth` | User session, guest mode |
| `lessons` | Lesson navigation, progress |
| `chat` | Nova chat history, sending state |
| `gamification` | XP, level, streak, achievements |
| `ui` | Theme (light/dark), language, toasts |
| `speaking` | Public speaking sessions, scores |
| `interview` | Interview coaching flow |
| `email` | Drafts, generated emails |
| `grammar` | Exercises, corrections |
| `learningPath` | AI‑generated roadmap |
| `dynamicFeed` | Daily challenges, content feed |
---

## 🗄️ Database Schema (high‑level)
- Core tables: `profiles`, `lessons`, `flashcards`, `quiz_questions`, `pronunciation_phrases`, `roleplay_scenarios`, `user_lesson_progress`, `user_flashcard_progress`, `chat_sessions`, `chat_messages`, `achievements`, `user_achievements`, `xp_transactions`.
- Feature‑specific tables added via migrations 004‑008 (e.g., `daily_greetings`, `self_intro_templates`).
- **Row Level Security** restricts each user to their own rows.
---

## 📶 Offline & Queued Actions
- `offlineManager.ts` buffers actions in AsyncStorage when network is unavailable and replays them on reconnection.
- Speech recognition & TTS remain fully offline; AI calls require connectivity.
---

## 📈 Monitoring & Analytics
- `ai_usage_logs` captures model, token count, latency, success.
- `ai_provider_health` stores periodic health snapshots used by the circuit breaker.
- In‑app health view (`getAISystemHealth()`) shows model state, request counts, cache hit ratio.
---

## 🛡️ License
MIT
