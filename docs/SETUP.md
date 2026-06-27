# EnglishMitraAI — Setup Guide

---

## ⚙️ Free Stack Overview
| Service | Provider | Cost |
|--------|----------|------|
| **AI (primary)** | Groq `llama-3.3-70b-versatile` | **FREE** – 14,400 requests/day |
| **AI (fallback)** | Groq `llama-3.1-8b-instant`, `gemma2-9b-it`, `mistral-saba-24b` | **FREE** – same limits |
| **Database** | Supabase Free Tier | **FREE** – 500 MB |
| **Edge Functions** | Supabase Deno Runtime | **FREE** |
| **Speech‑to‑Text** | `react-native-voice` (native) | **FREE** |
| **Text‑to‑Speech** | `expo-speech` (native) | **FREE** |
| **Translation** | `google-translate-api-x` | **FREE** |
| **Offline Storage** | AsyncStorage | **FREE** |

---

## 📋 Prerequisites
- **Node.js** ≥ 18
- **Expo CLI** – `npm install -g expo`
- **Supabase CLI** – `npm install -g supabase`
- **Supabase account** – <https://supabase.com>
- **Groq account** – <https://console.groq.com>

---

## 1️⃣ Clone & Install
```bash
git clone https://github.com/your-org/EnglishMitraAI
cd EnglishMitraAI/mobile
npm install
```

---

## 2️⃣ Environment Configuration
```bash
cp .env.example .env
```
Edit `mobile/.env` with your credentials:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your‑anon‑key>
EXPO_PUBLIC_GROQ_API_KEY=gsk_<your‑groq‑key>
```
### Platform‑specific notes
- **Web** – Continuous speech recognition enabled by default (`continuous: true`).
- **Android** – `android/app/src/main/AndroidManifest.xml` already includes `RECORD_AUDIO` permission.
- **iOS** – Expo adds microphone permission automatically.

---

## 3️⃣ Running the App
```bash
npx expo start
```
- Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with **Expo Go**.
- Open <http://localhost:8081> in a browser to test the web build (non‑blocking dialogs enabled).

---

## 4️⃣ Development Tips
- **Hot Reload** – Changes in `mobile/src` are reflected instantly.
- **Speech Debugging** – Look for `[VoiceService]` logs in the dev console.
- **Theme Customisation** – Edit `mobile/src/hooks/useThemeColors.ts` to tweak the electric‑blue/indigo/violet palette.
- **Linting** – Run `npm run lint` before committing.

---

## 5️⃣ Testing on Web
- Grant microphone access when prompted.
- Continuous mode works out‑of‑the‑box; errors appear via `window.confirm` dialogs to keep UI responsive.

---

## 🤝 Contributing
- Follow the **Airbnb JavaScript Style Guide**.
- Update documentation whenever you modify a module or add a feature.
- Submit PRs with clear descriptions and screenshots of UI changes.

---

## 📄 License
MIT
