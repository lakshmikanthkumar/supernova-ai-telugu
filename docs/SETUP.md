# EnglishMitraAi — Setup Guide

## Free Stack Overview

| Service | Provider | Cost |
|---------|----------|------|
| AI Chat | Groq API (llama-3.3-70b-versatile) | FREE — 14,400 req/day |
| Database | Supabase Free Tier | FREE — 500MB |
| Speech-to-Text | react-native-voice (device native) | FREE |
| Text-to-Speech | expo-speech (device native) | FREE |
| Translation | google-translate-api-x | FREE |
| Offline Storage | AsyncStorage / SQLite | FREE |

---

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo`
- Supabase account: https://supabase.com (free)
- Groq account: https://console.groq.com (free)

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/EnglishMitraAi
cd EnglishMitraAi/mobile
npm install
```

### Install free service packages

```bash
npm install @react-native-voice/voice@^3.2.4
npm install expo-speech@^12.0.2
npm install google-translate-api-x@^10.7.1
npm install axios@^1.7.7
```

### Android: Add microphone permission

In `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

---

## 2. Get Your Free API Keys

### Groq API (AI Chat) — FREE

1. Go to https://console.groq.com
2. Sign up for free account
3. Click "API Keys" → "Create API Key"
4. Copy the key (starts with `gsk_...`)

Free limits:
- 14,400 requests/day
- 500,000 tokens/day
- Model: `llama-3.3-70b-versatile`

### Supabase — FREE

1. Go to https://supabase.com
2. Create new project
3. Copy Project URL and anon key from Settings → API

Free limits:
- 500MB database
- 1GB storage
- 50,000 monthly active users

---

## 3. Configure Environment Variables

```bash
cp mobile/.env.example mobile/.env
```

Edit `mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_groq_key_here
```

---

## 4. Set Up Supabase Database

### Run migrations in order

In Supabase Dashboard → SQL Editor:

```sql
-- Run each file in order:
-- 1. backend/supabase/migrations/001_initial_schema.sql
-- 2. backend/supabase/migrations/002_rls_policies.sql
-- 3. backend/supabase/migrations/003_seed_data.sql
```

Or using Supabase CLI:
```bash
cd backend
supabase db push
```

### Deploy Edge Functions

```bash
cd backend
supabase functions deploy tutor-chat
supabase functions deploy speech-to-text
supabase functions deploy update-progress
```

### Set Edge Function Secrets

```bash
supabase secrets set GROQ_API_KEY=gsk_your_groq_key_here
```

---

## 5. Run the App

```bash
cd mobile
npx expo start
```

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go for physical device

---

## 6. Phone Authentication Setup

In Supabase Dashboard → Authentication → Providers → Phone:
1. Enable Phone provider
2. For development: enable "Phone OTP" with test numbers
3. For production: configure Twilio (has free trial)

---

## Device Speech Recognition Notes

### Android
- Uses Google Speech Recognition (built into Android)
- Requires internet connection for recognition
- Language: `en-IN` for Indian English
- No setup required — works out of the box

### iOS
- Uses Apple's Speech framework (Siri)
- Works offline for short phrases
- Requires microphone permission in Info.plist (Expo handles this)

---

## Free Tier Limits & Optimization

The app is built to stay within free limits:

- **Groq**: MAX_TOKENS=512 per request, history trimmed to 10 messages
- **Translation**: 3-tier cache (static → AsyncStorage → API) minimizes API calls
- **Pronunciation**: Levenshtein distance runs 100% offline
- **TTS**: expo-speech uses device voices — zero API calls
- **STT**: react-native-voice uses device recognition — zero API calls

---

## Troubleshooting

### "Speech recognition not available"
- Android: Ensure Google app is installed and updated
- Check `android.permission.RECORD_AUDIO` in manifest

### "Groq rate limit"
- Free tier: 25 req/min, 14,400 req/day
- App has built-in rate limiter and retry logic
- Wait 60 seconds and retry

### Translation not working
- google-translate-api-x requires internet
- App falls back to static translations offline
- Clear cache: Settings → Clear Cache in the app

### Supabase connection issues
- Verify `.env` has correct URL and anon key
- Check Supabase project is not paused (free tier pauses after 1 week of inactivity)
- Unpause at: supabase.com → your project → Settings → General
