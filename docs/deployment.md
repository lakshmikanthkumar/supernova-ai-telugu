# EnglishMitraAI — Deployment Guide

---

## 🌐 Free Hosting Summary
| Component | Host | Cost |
|-----------|------|------|
| Mobile app | Expo EAS (build) + Play Store / App Store | **Free tier** + $25 Play Store one‑time fee |
| Database | Supabase Free Tier | **Free** – 500 MB |
| Edge Functions | Supabase Deno Runtime | **Free** – 500 K invocations/month |
| AI (all models) | Groq Free Tier | **Free** – 14 400 requests/day per key |

---

## 1️⃣ Supabase Production Setup
### Create Production Project
1. Visit https://supabase.com and click **New Project**.
2. Choose a low‑latency region (e.g., **Singapore** or **Mumbai**).
3. Set a strong database password.

### Run All Migrations
In the Supabase dashboard → **SQL editor**, run the migration files in order:
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
supabase link --project-ref <your‑project‑ref>
supabase db push
```

### Deploy Edge Functions
```bash
cd backend/supabase
PROJECT=<your‑project‑ref>

supabase functions deploy tutor-chat             --project-ref $PROJECT
supabase functions deploy interview-coach        --project-ref $PROJECT
supabase functions deploy email-assistant        --project-ref $PROJECT
supabase functions deploy grammar-engine         --project-ref $PROJECT
supabase functions deploy public-speaking-coach  --project-ref $PROJECT
supabase functions deploy ai-content-generator   --project-ref $PROJECT
supabase functions deploy update-progress        --project-ref $PROJECT
```
All functions share a single **GROQ_API_KEY** secret and use the same four‑model fail‑over chain.

### Set Production Secrets
```bash
supabase secrets set GROQ_API_KEY=gsk_<your‑production‑key> --project-ref <your‑project‑ref>
```

---

## 2️⃣ Build Mobile App with Expo EAS
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
Update `eas.json` (excerpt):
```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": { "android": { "buildType": "apk" } },
    "production": {
      "android": { "buildType": "app-bundle" },
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": { "production": {} }
}
```
### Set EAS Secrets (mirrored to Supabase)
```bash
# Supabase URL & anon key

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL \
  --value https://<project‑ref>.supabase.co

eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value <your‑anon‑key>

eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY \
  --value gsk_<your‑production‑key>
```
### Build Packages
```bash
# Test build (APK – direct install)
eas build --platform android --profile preview

# Production build for Play Store (AAB)
eas build --platform android --profile production

# iOS build

eas build --platform ios --profile production
```
---

## 3️⃣ Play Store & App Store Submission
### Play Store
- Google Play Developer account (one‑time $25).
- EAS handles signing keys automatically.
- Provide screenshots (minimum 2 per device), a privacy‑policy URL, and the required **Microphone** and **Internet** permissions.
- Submit via `eas submit --platform android`.

### App Store
- Apple Developer Program membership.
- Configure App Store Connect metadata.
- Submit via `eas submit --platform ios`.

---

## 4️⃣ CI/CD Pipeline (GitHub Actions)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  supabase:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Supabase CLI
        run: npm install -g supabase
      - name: Deploy Edge Functions
        env:
          SUPABASE_PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF }}
          SUPABASE_API_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          supabase login --api-key $SUPABASE_API_KEY
          supabase link --project-ref $SUPABASE_PROJECT_REF
          supabase functions deploy tutor-chat --project-ref $SUPABASE_PROJECT_REF
          # repeat for other functions …
  eas:
    needs: supabase
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install EAS CLI
        run: npm install -g eas-cli
      - name: Build Production APK
        env:
          EAS_BUILD_PROFILE: production
        run: |
          eas login --token ${{ secrets.EAS_TOKEN }}
          eas build --platform android --profile production --non-interactive
```
This pipeline automatically deploys backend functions then triggers a production mobile build on every merge to `main`.

---

## 5️⃣ Post‑Deployment Checklist
- [ ] All migrations (001‑008) applied.
- [ ] All 7 edge functions deployed and healthy.
- [ ] `GROQ_API_KEY` secret set in Supabase.
- [ ] EAS secrets mirrored correctly.
- [ ] Row‑Level Security verified on all tables.
- [ ] Auth providers (email/password at minimum) configured.
- [ ] Privacy‑policy URL published and linked in store listings.
- [ ] Physical device testing on Android & iOS (including offline mode).
- [ ] UI/UX verification of non‑blocking dialogs and theme consistency.

---

## 🛡️ Scaling Beyond Free Tier
| Bottleneck | When | Solution |
|------------|------|----------|
| Groq request limit (14 400 req/day) | > 144 active users/day | Rotate multiple free Groq keys (see `aiProviderAdapter.ts`). |
| Supabase storage (500 MB) | ~ 50 K users with history | Upgrade to Supabase Pro ($25 / month). |
| Edge function invocations (500 K / mo) | Heavy usage | Supabase Pro includes higher limits. |
| Translation API throttling | > 1 000 req/day | Self‑host LibreTranslate (~ $5 / mo). |

---

## 🧭 Monitoring & Analytics
- **Supabase Dashboard** → Database → Table editor → inspect `ai_usage_logs`.
- **Functions** → Logs → real‑time view of each edge function.
- **In‑app health**: `getAISystemHealth()` reports circuit‑breaker state, success rates, request quotas, and cache hit ratio.
- **SQL for model success rate (last 7 days)**:
```sql
SELECT provider_id, model_id,
       COUNT(*) AS total,
       SUM(CASE WHEN success THEN 1 ELSE 0 END) AS successes,
       AVG(latency_ms) AS avg_latency_ms
FROM ai_usage_logs
WHERE created_at > now() - interval '7 days'
GROUP BY provider_id, model_id
ORDER BY total DESC;
```
---

## 🛡️ License
MIT
