# EnglishMitraAI — Deployment Guide

## Free Hosting Summary

| Component | Host | Cost |
|-----------|------|------|
| Mobile app | Expo EAS (build) + Play Store / App Store | EAS free tier + $25 Play Store one-time |
| Database | Supabase free tier | Free (500MB) |
| Edge Functions | Supabase free tier | Free (500K invocations/month) |
| AI (all models) | Groq free tier | Free (14,400 req/day per key) |

---

## 1. Supabase Production Setup

### Create Production Project

1. Go to https://supabase.com → **New Project**
2. Region: **Singapore** or **Mumbai** (lowest latency for India)
3. Set a strong database password and save it

### Run All Migrations

In **Supabase Dashboard → SQL Editor**, run each file in order:

```
001_initial_schema.sql
002_rls_policies.sql
003_seed_data.sql
004_new_features.sql
005_rls_new_features.sql
006_seed_new_features.sql
007_dynamic_content.sql
008_ai_analytics.sql
```

Or via CLI:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### Deploy All Edge Functions

```bash
cd backend/supabase

PROJECT=your-project-ref

supabase functions deploy tutor-chat             --project-ref $PROJECT
supabase functions deploy interview-coach        --project-ref $PROJECT
supabase functions deploy email-assistant        --project-ref $PROJECT
supabase functions deploy grammar-engine         --project-ref $PROJECT
supabase functions deploy public-speaking-coach  --project-ref $PROJECT
supabase functions deploy ai-content-generator   --project-ref $PROJECT
supabase functions deploy update-progress        --project-ref $PROJECT
```

### Set Production Secrets

```bash
supabase secrets set GROQ_API_KEY=gsk_your_production_key --project-ref your-project-ref
```

All 7 edge functions share one secret. They all use the same 4-model failover chain internally.

---

## 2. Build Mobile App with Expo EAS

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Configure EAS

```bash
cd mobile
eas build:configure
```

Update `eas.json`:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Set EAS Environment Variables

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value https://your-project-ref.supabase.co

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value your_anon_key

eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY \
  --value gsk_your_production_key
```

### Build APK (Android)

```bash
# Test APK (direct install, no Play Store)
eas build --platform android --profile preview

# Production AAB for Play Store
eas build --platform android --profile production
```

### Build for iOS

```bash
eas build --platform ios --profile production
```

---

## 3. Play Store Submission

### Requirements

- Google Play Developer account ($25 one-time fee)
- App signing key (EAS manages this automatically)
- Screenshots (minimum 2 per device type)
- Privacy policy URL (required — app uses mic + phone number)

### Submit via EAS

```bash
eas submit --platform android
```

### Privacy Policy Requirements

The app uses:
- **Microphone** (`RECORD_AUDIO`) — for speech recognition in Pronunciation Lab
- **Internet** — for AI calls and Supabase sync

Host a privacy policy free at GitHub Pages or Notion and add the URL to your Play Store listing.

---

## 4. Keeping Supabase Free Tier Active

The free tier **pauses projects after 1 week of inactivity**.

### Option A: Daily ping (cron job)

```bash
# Add to cron — runs daily at 8am
0 8 * * * curl https://your-project-ref.supabase.co/rest/v1/ \
  -H "apikey: your_anon_key" -s -o /dev/null
```

### Option B: GitHub Actions scheduled workflow

```yaml
name: Keep Supabase Active
on:
  schedule:
    - cron: '0 8 * * *'
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: curl ${{ secrets.SUPABASE_URL }}/rest/v1/ -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
```

### Option C: Upgrade to Pro ($25/month)

Once you have real users, Pro removes the pause limit and gives 8GB storage.

---

## 5. Production Checklist

### Before First Release

- [ ] All 8 migrations applied successfully (001 → 008)
- [ ] All 7 edge functions deployed
- [ ] `GROQ_API_KEY` secret set on Supabase
- [ ] EAS secrets set for Supabase URL, anon key, Groq key
- [ ] RLS verified (all tables have Row Level Security enabled)
- [ ] Auth provider configured (email/password at minimum)
- [ ] Privacy policy URL published and added to Play Store listing
- [ ] App tested on physical Android device with Indian English STT
- [ ] Offline mode tested (airplane mode → complete lesson → reconnect → check XP synced)
- [ ] Guest mode tested (skip login → features work with offline fallback)

### AI System Verification

- [ ] Nova chat responds and grammar corrections appear
- [ ] Grammar Engine returns Telugu explanations
- [ ] Interview coaching returns structured JSON feedback
- [ ] Email assistant generates appropriate emails
- [ ] All features show offline fallback content (not errors) when no internet
- [ ] Check Supabase logs: Functions → tutor-chat → Logs — verify model fallback messages appear

### Content System Verification

- [ ] Daily Challenges show different content each day
- [ ] Flashcards use SM-2 ordering (due cards appear first)
- [ ] Pronunciation Lab records and scores
- [ ] Seen content doesn't repeat within a session

---

## 6. Scaling Beyond Free Tier

| Bottleneck | When | Solution | Cost |
|------------|------|----------|------|
| Groq 14,400 req/day | >144 active users/day | Multiple Groq API keys (rotate per user session) | $0 |
| Groq rate limits | Burst traffic | Already handled by 4-model failover + response cache | $0 |
| Supabase 500MB | ~50K users with history | Upgrade to Supabase Pro | $25/month |
| Edge Function 500K invocations/month | Heavy usage | Upgrade to Supabase Pro | Included |
| Translation API throttling | >1000 req/day | Self-host LibreTranslate | ~$5/month VPS |

### Multiple Groq API Keys Strategy

When user base grows, distribute load across multiple free Groq accounts:

```typescript
// In aiProviderAdapter.ts — rotate key by user session
const GROQ_KEYS = [
  process.env.EXPO_PUBLIC_GROQ_API_KEY_1,
  process.env.EXPO_PUBLIC_GROQ_API_KEY_2,
  process.env.EXPO_PUBLIC_GROQ_API_KEY_3,
]
const keyIndex = parseInt(userId.slice(-1), 16) % GROQ_KEYS.length
const apiKey = GROQ_KEYS[keyIndex]
```

This gives 43,200 req/day across 3 keys with consistent routing per user.

---

## 7. Monitoring

### Supabase Dashboard
- **Database**: Table Editor → Check row counts in `ai_usage_logs`
- **Functions**: Functions → Select function → Logs (real-time)
- **Auth**: Authentication → Users (user count, sign-in rates)

### AI Health (in-app)
Call `getAISystemHealth()` from `mobile/src/services/ai/index.ts` to get:
- Circuit breaker state per model (closed/open/half-open)
- Success rate and average latency last 2 minutes
- Requests used today vs daily limit
- Cache hit count

### AI Analytics Tables
Query `ai_usage_logs` to see model usage, error rates, and latency trends:

```sql
-- Model success rate last 7 days
SELECT provider_id, model_id,
  COUNT(*) as total,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
  AVG(latency_ms) as avg_latency_ms
FROM ai_usage_logs
WHERE created_at > now() - interval '7 days'
GROUP BY provider_id, model_id
ORDER BY total DESC;
```
