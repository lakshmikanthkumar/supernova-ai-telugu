# EnglishMitraAi — Architecture

## System Overview

```
Mobile App (React Native Expo)
        │
        ├── Device Services (FREE, no API calls)
        │   ├── react-native-voice  → Speech-to-Text
        │   ├── expo-speech         → Text-to-Speech
        │   └── AsyncStorage        → Offline cache + queue
        │
        ├── Free APIs (internet required)
        │   ├── Groq API            → AI chat (llama-3.3-70b)
        │   └── google-translate    → EN ↔ TE translation
        │
        └── Supabase Backend
            ├── PostgreSQL          → User data, lessons, progress
            ├── Auth                → Phone OTP authentication
            ├── Storage             → Lesson assets, avatars
            └── Edge Functions (Deno)
                ├── tutor-chat      → Groq AI responses
                ├── speech-to-text  → Pronunciation AI feedback
                └── update-progress → XP, streaks, achievements
```

## Pronunciation Architecture

Old (paid): Audio → Whisper API → score
New (free): Device mic → react-native-voice → transcript string → Levenshtein scorer (offline) → optional Groq feedback

```
User speaks
    ↓
react-native-voice (device Google/Apple STT)
    ↓ transcript: string
pronunciationScorer.ts (offline Levenshtein)
    ↓ { overall_score, accuracy, fluency, words_analysis }
speech-to-text Edge Function (optional, Groq)
    ↓ { feedback_telugu, encouragement, specific_tips }
PronunciationLab screen
```

## AI Chat Architecture

```
User types / speaks
    ↓ (voice: react-native-voice)
NovaChatScreen
    ↓ chatWithNova(sessionId, message)
groqService.ts → POST https://api.groq.com/openai/v1/chat/completions
    ↓ response text
checkGrammar(message) → Groq JSON mode
    ↓ { corrections }
Display response + auto-speak (expo-speech)
    ↓ Save to Supabase via tutor-chat edge function
```

## Translation Cache Architecture

```
translateText("Good morning", "te")
    ↓
1. Static map lookup     → instant, offline
    ↓ miss
2. AsyncStorage lookup   → fast, offline
    ↓ miss
3. google-translate-api-x → network, ~200ms
    ↓ cache result in AsyncStorage
return translated string
```

Max cache: 500 entries. Evicts oldest on overflow.

## Offline Architecture

```
Action (e.g., complete lesson)
    ↓
offlineManager.ts
    ↓ network available?
    ├── YES → POST to Supabase Edge Function
    └── NO  → Save to AsyncStorage queue
                    ↓ (when network returns)
               processQueue() → retry all queued actions
```

## Redux Store Slices

| Slice | State |
|-------|-------|
| auth | user, session, loading |
| lessons | categories, currentLesson, progress |
| chat | sessions, messages, sending |
| gamification | xp, level, streak, achievements |
| ui | theme, language, toasts |

## Database Schema (Key Tables)

```
profiles              — User profile, XP, level, streak
lesson_categories     — 10 categories
lessons               — Content with JSONB (vocabulary, dialogues)
flashcards            — SM-2 fields (interval, ease_factor)
quiz_questions        — Multiple choice with Telugu explanations
pronunciation_phrases — Target phrases with tips
roleplay_scenarios    — System prompts for AI personas
user_lesson_progress  — Completion status per lesson
user_flashcard_progress — SM-2 progress per card
chat_sessions         — Session metadata
chat_messages         — History with grammar corrections
achievements          — Unlock conditions
user_achievements     — User ↔ achievement mapping
xp_transactions       — Full XP audit trail
leaderboard_weekly    — Weekly rankings
```

All tables have Row Level Security (RLS) — users can only access their own data.

## Token Optimization (Groq Free Tier)

- MAX_TOKENS = 512 per response
- MAX_HISTORY_MESSAGES = 10 (trim old context)
- Grammar check only on messages > 5 chars
- Translation done client-side (not via AI)
- Rate limiter: 25 req/min threshold with exponential backoff

Daily budget estimate:
- Active user: ~50 chat messages = ~100 Groq calls
- Free limit: 14,400 calls/day
- Supports ~144 active users/day per API key
