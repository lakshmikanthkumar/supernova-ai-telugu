# EnglishMitraAI

> AI-powered real-world English communication platform for Telugu-medium students — **100% Free Stack**

## What is EnglishMitraAI?

EnglishMitraAI ("English Friend AI") helps Telugu-medium students in Andhra Pradesh and Telangana build real-world English confidence through 13 communication modules, powered by a multi-model AI system that never goes down.

### Modules

| Module | What it does |
|--------|-------------|
| **AI Tutor Nova** | Conversational practice with grammar correction |
| **Daily Greetings** | Randomized situational greetings, fresh every session |
| **Self Introduction Builder** | Build and practice professional introductions |
| **Office Conversations** | Real workplace dialogue scenarios |
| **Email Writing Assistant** | Generate, improve, and simplify professional emails |
| **Phone Conversation Simulator** | Practice calls (customer service, appointments) |
| **Interview Training** | AI-coached mock interviews with scored feedback |
| **Public Speaking** | Filler-word detection, WPM tracking, fluency score |
| **Grammar Engine** | Real-time corrections with Telugu explanations |
| **Pronunciation Lab** | Record → score → AI feedback |
| **Flashcards & Quizzes** | SM-2 spaced repetition, never repeats within session |
| **Daily Challenges** | Personalized daily content that rotates each day |
| **Learn Hub** | Unified access to all modules with progress tracking |

## Free Stack

| What | Technology | Cost |
|------|-----------|------|
| AI (primary) | Groq `llama-3.3-70b-versatile` | Free — 14,400 req/day |
| AI (fallback 1) | Groq `llama-3.1-8b-instant` | Free — same limits |
| AI (fallback 2) | Groq `gemma2-9b-it` | Free — same limits |
| AI (fallback 3) | Groq `mistral-saba-24b` | Free — same limits |
| Database | Supabase PostgreSQL | Free — 500MB |
| Edge Functions | Supabase Deno Runtime | Free |
| Speech Input | react-native-voice (device STT) | Free |
| Voice Output | expo-speech (device TTS) | Free |
| Translation | google-translate-api-x | Free |
| Offline Cache | AsyncStorage | Free |

## Tech Stack

- **Frontend**: React Native 0.76.9 + Expo 52 + TypeScript
- **Routing**: Expo Router 4 (file-based)
- **State**: Redux Toolkit (11 slices)
- **Backend**: Supabase (PostgreSQL + Edge Functions/Deno)
- **Auth**: Supabase Email/Password + Phone OTP
- **AI Orchestration**: 4-model failover with circuit breaker, response cache, rate limiter

## Quick Start

```bash
cd mobile && npm install && npx expo start
```

See [SETUP.md](SETUP.md) for full environment setup including API keys.

## Project Structure

```
EnglishMitraAI/
├── mobile/                          # React Native Expo app
│   ├── app/                         # Expo Router screens
│   │   ├── (auth)/                  # Login, Signup, Splash
│   │   ├── (main)/                  # Home, Progress, Daily Challenge, Learn Hub
│   │   ├── lessons/                 # Lesson, Quiz, Flashcards, Pronunciation
│   │   ├── ai/                      # Nova Chat, Roleplay
│   │   └── features/                # 9 communication module screens
│   └── src/
│       ├── services/
│       │   ├── ai/                  # Multi-model AI orchestration layer
│       │   │   ├── index.ts         # Public API (import from here)
│       │   │   ├── aiOrchestrator.ts       # Main entry — 4-model failover
│       │   │   ├── modelRouter.ts          # Task → model selector
│       │   │   ├── aiProviderAdapter.ts    # Unified Groq caller
│       │   │   ├── aiHealthMonitor.ts      # Circuit breaker per provider
│       │   │   ├── aiRateLimiter.ts        # Per-provider sliding window
│       │   │   ├── aiResponseCache.ts      # Memory + disk cache
│       │   │   └── groqService.ts          # Legacy re-export shim
│       │   ├── audio/               # textToSpeech.ts, speechRecognition.ts
│       │   ├── randomization/       # contentEngine.ts — SM-2, seeded shuffle
│       │   ├── personalization/     # Daily feed, content rotation
│       │   ├── pronunciation/       # Offline Levenshtein scorer
│       │   └── translation/         # 3-tier cache (static → storage → API)
│       ├── store/                   # Redux slices (11 total)
│       ├── screens/                 # Screen components
│       └── components/              # Reusable UI components
└── backend/
    └── supabase/
        ├── migrations/              # 008 SQL migrations (run in order)
        └── functions/               # Edge Functions (Deno)
            ├── tutor-chat/          # AI chat + XP rewards
            ├── interview-coach/     # Structured interview feedback
            ├── email-assistant/     # Email generation/improvement
            ├── grammar-engine/      # Grammar check + quiz generation
            ├── public-speaking-coach/ # Filler detection, WPM, fluency
            ├── ai-content-generator/  # Daily content generation + 7-day cache
            └── update-progress/     # XP + achievements
```

## License

MIT
