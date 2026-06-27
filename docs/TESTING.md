# EnglishMitraAI – Comprehensive Test Suite

---

## 🎯 Scope Overview
| Area | Goal | Primary Tools |
|------|------|---------------|
| **End‑to‑End (E2E) Journeys** | Validate complete user flows across all 13 modules from launch to completion. | Detox (iOS/Android), Playwright (Web), Cypress (Web) |
| **AI Integration** | Verify each of the 4 Groq models, fail‑over routing, circuit‑breaker and rate‑limiting behaviours. | Jest + nock, integration test harness, mock server, custom AI‑mock library |
| **Offline / Online Sync** | Ensure queueing, replay and conflict‑resolution work under flaky connectivity. | Detox offline simulation, jest‑offline‑mock, Supabase offline manager tests |
| **Performance** | Measure app start‑up, screen transition latency, AI response times, memory footprint. | Android Studio Profiler, Xcode Instruments, Web Lighthouse, custom benchmark scripts |
| **Security** | Confirm Row‑Level Security (RLS), authentication flows, data‑privacy handling. | Supabase security test suite, OWASP Mobile Security Checklist, postman security scripts |
| **Accessibility** | Verify WCAG‑AA compliance for visual/hearing impairments (screen‑reader, colour contrast, captions). | axe‑core (Web), Detox‑accessibility, RN‑accessibility‑engine, TalkBack/VoiceOver testing |
| **Localization** | English & Telugu UI strings, right‑to‑left handling, date/number formats. | i18n‑test‑library, localization CI job, manual spot‑checks on device |
| **Edge Cases & Error Handling** | Simulate network loss, API errors (500, 429, malformed payload), invalid user input. | Network‑link‑shaper, mock server fault injection, Detox error‑scenario scripts |
| **Device Compatibility** | Test across screen sizes, Android API levels (21‑33), iOS versions (13‑17), Web browsers. | Firebase Test Lab, BrowserStack, native emulator matrix, responsive design checks |
| **User Acceptance (UAT)** | Real‑world scenarios with target students, usability, language clarity, motivational feedback. | Remote testing with recruited users, survey + analytics, session recordings |

---

## 1️⃣ End‑to‑End (E2E) Testing – Complete User Journeys
### 1.1 General Approach
- Use **Detox** for native mobile (Android & iOS) and **Playwright** for the web build.
- Each test boots the app from a clean state (`npm run reset`) to guarantee isolation.
- Screenshots & video recordings are saved on failure for quick triage.

### 1.2 Module‑by‑Module Journeys
| Module | Core Flow Steps |
|--------|-----------------|
| **AI Tutor Nova** | 1. Launch → Open *Tutor* tab 2. Start conversation 3. Speak/ type → receive real‑time grammar correction 4. End session, verify XP awarded |
| **Daily Greetings** | Open *Greetings* → Swipe to next → Verify new random greeting each day (seeded per user) |
| **Self‑Introduction Builder** | Open builder → Fill fields → Record audio → Submit → Confirm generated intro appears in *Learn Hub* |
| **Office Conversations** | Select scenario → Role‑play with AI → Validate context‑aware replies |
| **Email Writing Assistant** | Draft email → Tap *Improve* → Verify rewritten email contains original intent |
| **Phone Conversation Simulator** | Initiate call simulation → Speak → Receive AI feedback (fillers, WPM) |
| **Interview Training** | Choose interview type → Answer questions → Receive scored feedback & suggestions |
| **Public Speaking** | Start session → Record → Get filler detection, fluency score, WPM metrics |
| **Grammar Engine** | Input sentence → Get correction with Telugu explanation |
| **Pronunciation Lab** | Record phrase → Receive Levenshtein distance score & suggestions |
| **Flashcards & Quizzes** | Open *Flashcards* → Review card → Answer quiz → Verify SM‑2 algorithm updates next due date |
| **Daily Challenges** | Open *Challenges* → Complete task → Verify XP and streak increment |
| **Learn Hub** | Navigate to hub → Check progress bars, module unlocks, summary data |

### 1.3 Cross‑Module Scenarios
- **Progress Persistence** – Complete a flashcard, switch to *Daily Challenge*, then return to flashcards and verify state is retained.
- **Theme Switch** – Toggle light/dark mode mid‑session; ensure UI updates without crash.
- **Logout / Guest Mode** – Perform a full journey, logout, login again, and confirm data continuity.

---

## 2️⃣ AI Integration Testing – Model Failover & Rate Limiting
### 2.1 Test Matrix
| Task Type | Expected Primary Model | Fallback Order |
|-----------|------------------------|----------------|
| Chat / Roleplay / Interview / Email | `llama‑3.3‑70b‑versatile` | `mistral‑saba‑24b` → `gemma2‑9b‑it` → `llama‑3.1‑8b‑instant` |
| Grammar / Quiz / Word Explanation | `llama‑3.1‑8b‑instant` | `gemma2‑9b‑it` → `llama‑3.3‑70b‑versatile` → `mistral‑saba‑24b` |

### 2.2 Scenarios
1. **Happy Path** – Mock successful response from primary model, assert latency < 2 s.
2. **Primary Model Rate‑Limit** – Simulate 429 on primary, ensure request automatically retries with next model; validate circuit‑breaker stays closed.
3. **Primary Model Timeout** – Force >10 s response, trigger circuit‑breaker, verify fallback model is used.
4. **All Models Fail** – Return 500 from every provider, assert user sees friendly error dialog (non‑blocking) and appropriate telemetry logged.
5. **Rate‑Limiter Enforcement** – Fire 35 requests/min; expect limiter to throttle after 30, verify `429` returned and UI shows rate‑limit toast.

### 2.3 Tools
- **Jest** with **nock** to intercept HTTP calls to Groq endpoints.
- **aiMockServer** (custom lightweight Express server) that can switch behaviour per test.
- **supabase‑client** mocks to verify cache‑hit path.

---

## 3️⃣ Offline / Online Synchronisation
### 3.1 Queue Management
- Perform actions (e.g., flashcard review, XP update) while device is offline (detox `network.disable`).
- Verify entries are stored in `AsyncStorage` queue.
- Re‑enable network, ensure `offlineManager` replays actions in FIFO order, and server reflects the updates.

### 3.2 Conflict Resolution
- Simulate concurrent edit: offline device updates a lesson note, another device updates same note via API.
- On sync, ensure **last‑write‑wins** policy with timestamp, and UI shows a conflict‑resolution banner.

---

## 4️⃣ Performance Testing
| Metric | Acceptance Criteria |
|--------|--------------------|
| App Cold Start (mobile) | < 2 s on Android API 23, iOS 13 |
| Screen Transition (any module) | < 300 ms average, 95 th percentile < 500 ms |
| AI Response Time (primary model) | ≤ 2 s for < 150 tokens, ≤ 4 s for > 150 tokens |
| Memory Footprint (peak) | < 200 MB on Android low‑end device |
| Web Lighthouse Performance | > 90 score on mobile emulation |

### Tools
- **Android Studio Profiler**, **Xcode Instruments** for native.
- **WebPageTest** & **Lighthouse** for web.
- Custom benchmark script (`npm run perf`) that measures AI latency using real API keys in a sandbox environment.

---

## 5️⃣ Security Testing
### 5.1 RLS Policies
- Attempt to read another user’s `profiles` table via Supabase client – expect `403`.
- Write attempts to `user_achievements` of another user – expect rejection.

### 5.2 Authentication
- Verify email‑password sign‑up flow with strong password enforcement.
- Test OTP flow for phone login – ensure OTP expires after 5 min.
- Attempt token replay attack – ensure server rejects reused JWT.

### 5.3 Data Privacy
- Inspect network traffic (Charles/Fiddler) – confirm no PII transmitted over plain HTTP.
- Validate that audio recordings are stored only locally until AI processing; no raw audio blobs sent to Supabase.
- Run OWASP Mobile Security Checklist automated scan.

---

## 6️⃣ Accessibility Testing
| Aspect | Test Method |
|--------|------------|
| Colour Contrast | Run **axe‑core** (web) and **detox‑accessibility** (mobile) – minimum 4.5:1 AA |
| Screen Reader Navigation | Use TalkBack (Android) & VoiceOver (iOS) – ensure all interactive elements have accessible labels |
| Captions & Transcripts | Verify spoken feedback has optional text captions in UI |
| Touch Target Size | Ensure minimum 48 dp tap area for all buttons |
| Keyboard Navigation (web) | Tab order logical, focus visible |

---

## 7️⃣ Localization Testing
- **English** – Default strings, date format `MM/DD/YYYY`.
- **Telugu** – Verify all UI strings translated, right‑to‑left layout not required (LTR), but ensure font supports Telugu glyphs.
- Test language switch at runtime – app reloads resources without crash.
- Validate that AI explanations appear in Telugu where applicable (grammar engine).
- Use **i18n‑test‑library** to compare JSON locale files for missing keys.

---

## 8️⃣ Edge Cases & Error Handling
| Scenario | Expected Behaviour |
|----------|-------------------|
| Network disconnect mid‑AI call | Abort request, show non‑blocking toast, queue for retry when online |
| API returns 503 Service Unavailable | Retry with exponential back‑off (max 3 attempts), then fallback model if still failing |
| Invalid user input (empty text) | UI disables submit, shows inline validation error |
| Corrupted local storage data | Detect on start‑up, purge queue, inform user via modal, sync fresh state |
| Supabase quota exceeded | Display polite limit‑reached message, disable further writes, schedule background retry |

---

## 9️⃣ Device Compatibility Matrix
| Platform | Versions / Screen Sizes |
|----------|--------------------------|
| Android | API 21‑33, phones 4.7"‑6.9", tablets 7"‑10.5" |
| iOS | 13‑17, iPhone SE → iPhone 15 Pro Max, iPad (9.7"‑12.9") |
| Web | Chrome, Firefox, Safari (mobile & desktop), Edge – latest 2 major versions |

**Testing Approach**
- Use **Firebase Test Lab** for Android matrix.
- Use **Xcode Simulators** for iOS matrix.
- Use **BrowserStack** for cross‑browser checks.
- Verify responsive layout via CSS media queries and React Native `useWindowDimensions`.

---

## 🔟 User Acceptance Testing (UAT)
1. **Recruit Target Users** – 15‑20 Telugu‑medium high‑school students.
2. **Scenario Pack** – Provide scripted real‑world tasks (e.g., prepare a job interview, send an email to a teacher, practice a phone call). 
3. **Metrics Collected** – Task completion time, SUS (System Usability Scale) score, qualitative feedback on UI clarity and AI usefulness.
4. **Session Recording** – Capture screen + microphone (with consent) to analyse interaction patterns.
5. **Iterative Feedback Loop** – After each round, triage issues, update backlog, and re‑run critical tests.

---

## 📂 Repository Structure (Test Artifacts)
```
/tests
│   jest.config.js          # unit & integration tests
│   detox.config.js        # mobile E2E config
│   playwright.config.ts   # web E2E config
│   performance/
│   │   startup.benchmark.js
│   │   ai-response.benchmark.js
│   security/
│   │   rls.test.ts
│   │   auth.test.ts
│   accessibility/
│   │   axe-report.json
│   localization/
│   │   en.json, te.json
│   uat/
│       plan.md
│       results/
│
└── scripts/
    │   run_all.sh   # orchestrates full suite in CI
```

---

## ✅ Acceptance Checklist
- [ ] All 13 module E2E flows pass on Android (API 23+, 6.0") and iOS (13+, iPhone 8).
- [ ] AI model fail‑over logic verified with mock server.
- [ ] Offline queue replay works on simulated network loss.
- [ ] Performance metrics meet defined thresholds.
- [ ] Security tests confirm RLS enforcement and no PII leakage.
- [ ] Accessibility audit score ≥ AA.
- [ ] Telugu localisation complete with zero missing keys.
- [ ] Edge‑case error handling verified for network/API failures.
- [ ] Device matrix coverage ≥ 90 % of target devices.
- [ ] UAT feedback collected and incorporated.

---

*Document generated by Senior QA Engineer (10+ years mobile testing experience) to serve as the master test plan for the EnglishMitraAI project.*
