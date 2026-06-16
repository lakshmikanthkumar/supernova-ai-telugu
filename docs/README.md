# EnglishMitraAi 🎓

> AI-powered Spoken English learning app for Telugu medium students — **100% Free Stack**

## What is EnglishMitraAi?

EnglishMitraAi ("English Friend AI") is a React Native mobile app that helps Telugu-medium students in Andhra Pradesh and Telangana build spoken English confidence through:

- **AI Tutor "Nova"** — Conversational practice powered by Groq (free)
- **Pronunciation Lab** — Record and get scored on your pronunciation
- **10 Lesson Categories** — Daily life, greetings, shopping, interviews, and more
- **Flashcards & Quizzes** — SM-2 spaced repetition for vocabulary
- **Roleplay Scenarios** — Practice real conversations (job interview, doctor visit, shopping)
- **Gamification** — XP, streaks, achievements, weekly leaderboard
- **100% Telugu UI** — All instructions and feedback in Telugu

## Free Stack (Zero Cost)

| What | Technology | Why |
|------|-----------|-----|
| AI Chat | Groq llama-3.3-70b-versatile | 14,400 req/day free |
| Database | Supabase PostgreSQL | 500MB free |
| Speech Input | react-native-voice | Device-native, free |
| Voice Output | expo-speech | Device-native, free |
| Translation | google-translate-api-x | Unofficial Google Translate, free |
| Offline | AsyncStorage | Device storage, free |

## Tech Stack

- **Frontend**: React Native + Expo + TypeScript
- **Routing**: Expo Router (file-based)
- **State**: Redux Toolkit
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Auth**: Supabase Phone OTP

## Quick Start

```bash
cd mobile && npm install && npx expo start
```

See [SETUP.md](SETUP.md) for full instructions including API key setup.

## Project Structure

```
EnglishMitraAi/
├── mobile/                    # React Native Expo app
│   ├── app/                   # Expo Router screens
│   │   ├── (auth)/            # Login, OTP, Onboarding
│   │   ├── (main)/            # Home, Nova Chat, Progress
│   │   ├── lessons/           # Lesson, Quiz, Flashcards, Pronunciation
│   │   └── ai/                # Roleplay
│   └── src/
│       ├── services/
│       │   ├── ai/            # groqService.ts (Groq API)
│       │   ├── audio/         # textToSpeech.ts, speechRecognition.ts
│       │   ├── pronunciation/ # pronunciationScorer.ts (offline)
│       │   └── translation/   # translationService.ts
│       ├── store/             # Redux slices
│       ├── screens/           # Screen components
│       └── components/        # Reusable components
└── backend/
    └── supabase/
        ├── migrations/        # SQL schema + seed data
        └── functions/         # Edge Functions (Deno)
            ├── tutor-chat/    # Groq AI chat
            ├── speech-to-text/ # Pronunciation feedback
            └── update-progress/ # XP + achievements
```

## License

MIT
