# EnglishMitraAI — Setup Guide

## Free Stack Overview

| Service | Provider | Cost |
|---------|----------|------|
| AI (primary) | Groq `llama-3.3-70b-versatile` | FREE — 14,400 req/day |
| AI (fallback) | Groq `llama-3.1-8b-instant`, `gemma2-9b-it`, `mistral-saba-24b` | FREE — same limits each |
| Database | Supabase Free Tier | FREE — 500MB |
| Edge Functions | Supabase Deno Runtime | FREE |
| Speech-to-Text | react-native-voice (device native) | FREE |
| Text-to-Speech | expo-speech (device native) | FREE |
| Translation | google-translate-api-x | FREE |
| Offline Storage | AsyncStorage | FREE |

---

## Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo`
- Supabase CLI: `npm install -g supabase`
- Supabase account: https://supabase.com (free)
- Groq account: https://console.groq.com (free)

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/EnglishMitraAI
cd EnglishMitraAI/mobile
npm install
```

---

## 2. Get Your Free API Keys

### Groq API (AI Chat) — FREE

1. Go to https://console.groq.com
2. Sign up for free
3. Click **API Keys → Create API Key**
4. Copy the key (starts with `gsk_...`)

**Free limits per key:**
- 14,400 requests/day
- 500,000 tokens/day
- 30 requests/minute

The app uses 4 models from the same Groq account with automatic failover — one key is enough for development.

### Supabase — FREE

1. Go to https://supabase.com → **New Project**
2. Choose region: **Singapore** or **Mumbai** (closest to India)
3. Copy **Project URL** and **anon key** from Settings → API

---

## 3. Configure Environment Variables

```bash
cp mobile/.env.example mobile/.env
```

Edit `mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_GROQ_API_KEY=gsk_your_groq_key_here
```

---

## 4. Set Up Supabase Database

### Run migrations in order

In **Supabase Dashboard → SQL Editor**, run each file:

```
1. backend/supabase/migrations/001_initial_schema.sql
2. backend/supabase/migrations/002_rls_policies.sql
3. backend/supabase/migrations/003_seed_data.sql
4. backend/supabase/migrations/004_new_features.sql
5. backend/supabase/migrations/005_rls_new_features.sql
6. backend/supabase/migrations/006_seed_new_features.sql
7. backend/supabase/migrations/007_dynamic_content.sql
8. backend/supabase/migrations/008_ai_analytics.sql
```

When prompted about RLS policies, click **"Enable RLS"**.

Or using Supabase CLI:

```bash
cd backend
supabase link --project-ref your-project-ref
supabase db push
```

### Deploy Edge Functions

```bash
cd backend/supabase

supabase functions deploy tutor-chat --project-ref your-project-ref
supabase functions deploy interview-coach --project-ref your-project-ref
supabase functions deploy email-assistant --project-ref your-project-ref
supabase functions deploy grammar-engine --project-ref your-project-ref
supabase functions deploy public-speaking-coach --project-ref your-project-ref
supabase functions deploy ai-content-generator --project-ref your-project-ref
supabase functions deploy update-progress --project-ref your-project-ref
```

### Set Edge Function Secrets

```bash
supabase secrets set GROQ_API_KEY=gsk_your_groq_key_here --project-ref your-project-ref
```

---

## 5. Run the App

```bash
cd mobile
npx expo start
```

- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with **Expo Go** on a physical device

---

## 6. Authentication Setup

### Email/Password (default — works immediately)

No extra setup needed. Users register with email and password.

### Phone OTP (optional)

In **Supabase Dashboard → Authentication → Providers → Phone**:
1. Enable Phone provider
2. For development: enable test phone numbers
3. For production: configure Twilio (has free trial)

---

## 7. Android Microphone Permission

In `android/app/src/main/AndroidManifest.xml` (if ejected from Expo):

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

Expo managed workflow adds this automatically from `app.json`.

---

## Device Speech Recognition Notes

### Android
- Uses Google Speech Recognition (built into Android)
- Requires internet for recognition
- Language set to `en-IN` for Indian English accent
- No setup required

### iOS
- Uses Apple's Speech framework (Siri)
- Works offline for short phrases
- Expo handles `Info.plist` microphone permission automatically

---

## Free Tier Limits & What We Do About Them

| Limit | How the app handles it |
|-------|----------------------|
| Groq 30 req/min | Per-provider sliding window rate limiter with 95% safety buffer |
| Groq 14,400 req/day | Daily usage tracked in AsyncStorage; soft cap at 13,680 |
| Groq provider downtime | Circuit breaker + 3 fallback models (llama-8b, gemma2-9b, mistral-saba) |
| Repeated AI responses | Response cache (grammar=30m, words=24h, chat=never) |
| Content repetition | Seeded shuffle + seen-history tracking per user |
| Supabase pauses (free tier) | Keep active or ping daily; upgrade to Pro ($25/mo) once you have users |

---

## Troubleshooting

### "Speech recognition not available"
- Android: Ensure Google app is installed and updated
- Check `android.permission.RECORD_AUDIO` in manifest

### "AI not responding"
- All 4 Groq models are tried automatically before giving up
- If all fail, the app shows offline fallback responses (no crash)
- Check `EXPO_PUBLIC_GROQ_API_KEY` is set in `.env`
- Open dev tools and check for `[Orchestrator]` or `[Provider]` log lines

### "Groq rate limit hit"
- The rate limiter will automatically route to a fallback model
- If all models are rate-limited simultaneously, wait 60 seconds
- Consider adding a second Groq API key for production

### "Content repeating"
- Content history is stored in AsyncStorage per user
- Clear with: `AsyncStorage.clear()` in dev tools, or reinstall the app
- History resets automatically when the full pool is exhausted

### Supabase connection issues
- Verify `.env` has correct URL and anon key
- Check if the project is paused: supabase.com → your project → Settings → General → Unpause
- Free tier pauses after 1 week of inactivity

### "Migration error on 006_seed_new_features.sql"
- If you see a `daily_greetings_category_check` constraint error, run this first:
  ```sql
  ALTER TABLE daily_greetings DROP CONSTRAINT IF EXISTS daily_greetings_category_check;
  ALTER TABLE daily_greetings ADD CONSTRAINT daily_greetings_category_check
    CHECK (category IN ('morning','afternoon','evening','festival','professional','casual','customer'));
  ```
- Then re-run 006_seed_new_features.sql
