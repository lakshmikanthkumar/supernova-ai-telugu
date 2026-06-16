# EnglishMitraAi — Deployment Guide

## Free Hosting Summary

| Component | Host | Cost |
|-----------|------|------|
| Mobile app | Expo EAS (build) + Play Store / App Store | EAS free tier |
| Database | Supabase free tier | Free |
| Edge Functions | Supabase free tier | Free |
| AI | Groq free tier | Free |

---

## 1. Supabase Production Setup

### Create Production Project

1. Go to https://supabase.com → New Project
2. Choose a region close to India (Singapore or Mumbai)
3. Set a strong database password

### Run Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push schema
supabase db push
```

### Deploy Edge Functions

```bash
supabase functions deploy tutor-chat --no-verify-jwt false
supabase functions deploy speech-to-text --no-verify-jwt false
supabase functions deploy update-progress --no-verify-jwt false
```

### Set Production Secrets

```bash
supabase secrets set GROQ_API_KEY=gsk_your_production_groq_key
```

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

This creates `eas.json`. Update with:

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
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project.supabase.co
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your_anon_key
eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY --value gsk_your_key
```

### Build APK (Android)

```bash
# Preview/test APK
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

- Google Play Developer account ($25 one-time)
- App signing key (EAS manages this)
- Screenshots (Expo provides simulator screenshots)
- Privacy policy URL (required for apps with mic/phone permissions)

### Submit via EAS

```bash
eas submit --platform android
```

### Privacy Policy Requirements

Since the app uses:
- Microphone permission (`RECORD_AUDIO`) — for speech recognition
- Phone number — for OTP authentication

You must include a privacy policy. Host it free at GitHub Pages or Notion.

---

## 4. Keeping Supabase Free Tier Active

The free tier pauses projects after 1 week of inactivity.

### Option A: Ping script (cron job)

```bash
# Add to cron: run daily
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: your_anon_key"
```

### Option B: Upgrade to Pro ($25/month) once you have users

---

## 5. Scaling Beyond Free Tier

When you outgrow free:

| Bottleneck | Solution | Cost |
|------------|----------|------|
| Groq 14,400 req/day | Multiple Groq API keys (one per user) or upgrade | $0 or ~$0.05/1M tokens |
| Supabase 500MB | Supabase Pro | $25/month |
| Translation API blocks | Self-host LibreTranslate | ~$5/month VPS |

---

## 6. Production Checklist

- [ ] Supabase RLS policies verified (run `002_rls_policies.sql`)
- [ ] All Edge Function secrets set
- [ ] Phone OTP provider configured (Supabase + Twilio)
- [ ] `.env` vars set in EAS secrets (not in source code)
- [ ] Privacy policy URL added to Play Store listing
- [ ] App reviewed on physical Android device (Indian English STT)
- [ ] Groq API key rate limits tested
- [ ] Offline mode tested (airplane mode)
