# EnglishMitraAI

> **AI‑powered English communication platform for Telugu‑medium students** – 100 % Free Stack, premium glassmorphism UI.

---

## 🌟 Project Overview
EnglishMitraAI ("English Friend AI") empowers students in Andhra Pradesh and Telangana to gain real‑world English confidence through **13 interactive communication modules**. A resilient **multi‑model AI orchestration layer** guarantees uninterrupted service, while a sleek **glassmorphism design** delivers a premium, modern experience.

---

## 📚 Core Modules
| Module | Description |
|--------|-------------|
| **AI Tutor Nova** | Conversational practice with live grammar correction |
| **Daily Greetings** | Randomized situational greetings, fresh each session |
| **Self‑Introduction Builder** | Craft and rehearse professional introductions |
| **Office Conversations** | Real‑world workplace dialogues |
| **Email Writing Assistant** | Generate, improve, and simplify professional emails |
| **Phone Conversation Simulator** | Practice customer‑service and appointment calls |
| **Interview Training** | AI‑coached mock interviews with scored feedback |
| **Public Speaking** | Filler‑word detection, WPM tracking, fluency scoring |
| **Grammar Engine** | Real‑time corrections with Telugu explanations |
| **Pronunciation Lab** | Record → score → AI feedback (offline Levenshtein) |
| **Flashcards & Quizzes** | SM‑2 spaced‑repetition, never repeats within a session |
| **Daily Challenges** | Personalized daily content that rotates each day |
| **Learn Hub** | Unified access to all modules with progress tracking |

---

## 🚀 Recent Enhancements
- **Continuous Speech Recognition** – Web & Android now support uninterrupted dictation (`continuous: true`).
- **Non‑blocking Dialogs** – Replaced blocking `Alert.alert` with `window.confirm` on the web to keep the UI thread responsive.
- **Dynamic Theme System** – Central `useTheme()` hook provides seamless light/dark mode and custom electric‑blue/indigo/violet palette.
- **Telugu Guidance UI** – Optimised colour contrast for accessibility and readability.
- **AI Orchestration Fail‑over** – Four‑model fallback chain with circuit‑breaker and rate‑limiter guarantees uptime.

---

## ⚡ Quick Start
```bash
# Clone & install
git clone https://github.com/your-org/EnglishMitraAI
cd EnglishMitraAI/mobile
npm install

# Configure environment (copy example & add keys)
cp .env.example .env
# Edit .env with your Supabase & Groq credentials

# Run the app (Expo)
npx expo start
```
- Press `a` for Android emulator, `i` for iOS simulator, or scan the QR code with **Expo Go**.
- Open `http://localhost:8081` in a browser to test the web build.

---

## 📖 Documentation
- **Setup** – Development environment details – `docs/SETUP.md`
- **Architecture** – System design, AI fail‑over, content engine – `docs/architecture.md`
- **Deployment** – Production build, hosting, CI/CD – `docs/deployment.md`

---

## 🛡️ License
MIT
