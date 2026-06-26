// uatScenarios.ts — User Acceptance Test scenario definitions

export interface UATStep {
  action: string;
  expected: string;
  screenshotId?: string;
}

export interface UATScenario {
  id: string;
  name: string;
  description: string;
  steps: UATStep[];
  priority: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
}

// ─── Onboarding Scenarios ─────────────────────────────────────────────────────

export const ONBOARDING_SCENARIOS: UATScenario[] = [
  {
    id: 'UAT-ONB-001',
    name: 'New User Full Onboarding',
    description: 'A new user installs the app and completes the full onboarding flow including account creation and level selection',
    priority: 'high',
    estimatedMinutes: 10,
    steps: [
      {
        action: 'Launch the app for the first time',
        expected: 'Splash screen displays with EnglishMitraAI logo and loading animation',
        screenshotId: 'onb-001-splash',
      },
      {
        action: 'Wait for splash to complete',
        expected: 'Onboarding carousel appears showing slide 1 of 3',
        screenshotId: 'onb-001-carousel-1',
      },
      {
        action: 'Swipe left to advance to slide 2',
        expected: 'Second onboarding slide is visible with feature highlights',
        screenshotId: 'onb-001-carousel-2',
      },
      {
        action: 'Swipe left to advance to slide 3',
        expected: 'Third slide is visible with "Get Started" button',
        screenshotId: 'onb-001-carousel-3',
      },
      {
        action: 'Tap "Get Started" button',
        expected: 'Signup form screen appears with name, email, and password fields',
        screenshotId: 'onb-001-signup',
      },
      {
        action: 'Enter name "Ravi Kumar", email "ravi@test.com", password "TestPass123!"',
        expected: 'All fields are filled correctly with no validation errors',
      },
      {
        action: 'Tap "Create Account" button',
        expected: 'Level selection screen appears with Beginner, Intermediate, Advanced options',
        screenshotId: 'onb-001-level',
      },
      {
        action: 'Select "Beginner" level and tap Continue',
        expected: 'Home dashboard appears with personalized content for beginner level',
        screenshotId: 'onb-001-home',
      },
    ],
  },
  {
    id: 'UAT-ONB-002',
    name: 'Onboarding Skip to Login',
    description: 'Returning user skips onboarding and goes directly to login screen',
    priority: 'high',
    estimatedMinutes: 3,
    steps: [
      {
        action: 'Launch the app',
        expected: 'Onboarding screen is visible with a Skip button',
        screenshotId: 'onb-002-start',
      },
      {
        action: 'Tap the "Skip" button',
        expected: 'Login screen appears with email and password fields',
        screenshotId: 'onb-002-login',
      },
      {
        action: 'Enter valid credentials and tap Sign In',
        expected: 'Home dashboard loads with user data restored',
        screenshotId: 'onb-002-home',
      },
    ],
  },
  {
    id: 'UAT-ONB-003',
    name: 'Onboarding Form Validation',
    description: 'Verify that the signup form validates inputs before submitting',
    priority: 'medium',
    estimatedMinutes: 5,
    steps: [
      {
        action: 'Navigate to signup form',
        expected: 'Signup form is visible',
      },
      {
        action: 'Tap "Create Account" without filling any fields',
        expected: 'Validation error messages appear for all required fields',
        screenshotId: 'onb-003-validation',
      },
      {
        action: 'Enter invalid email format (e.g. "notanemail")',
        expected: 'Email field shows "Invalid email address" error',
      },
      {
        action: 'Enter password shorter than 8 characters',
        expected: 'Password field shows minimum length error',
      },
      {
        action: 'Fill all fields correctly and submit',
        expected: 'Form submits successfully and navigates to level selection',
      },
    ],
  },
];

// ─── Lesson Scenarios ─────────────────────────────────────────────────────────

export const LESSON_SCENARIOS: UATScenario[] = [
  {
    id: 'UAT-LES-001',
    name: 'Complete a Beginner Lesson',
    description: 'User browses the lesson list, opens a beginner lesson, completes all activities, and earns XP',
    priority: 'high',
    estimatedMinutes: 15,
    steps: [
      {
        action: 'Login and navigate to home dashboard',
        expected: 'Home dashboard shows lesson cards',
        screenshotId: 'les-001-home',
      },
      {
        action: 'Scroll through the lesson list',
        expected: 'Multiple lesson categories are visible (Greetings, Office, Daily Life, etc.)',
        screenshotId: 'les-001-list',
      },
      {
        action: 'Tap on "Basic Greetings" lesson',
        expected: 'Lesson screen opens with lesson title and description',
        screenshotId: 'les-001-lesson',
      },
      {
        action: 'Complete the flashcard review section',
        expected: 'All flashcards reviewed, progress bar updates to 50%',
        screenshotId: 'les-001-flashcards',
      },
      {
        action: 'Complete the quiz section with 4/5 correct answers',
        expected: 'Quiz results screen shows 80% score',
        screenshotId: 'les-001-quiz',
      },
      {
        action: 'Tap "Finish Lesson" button',
        expected: 'XP earned notification appears, home dashboard shows updated XP',
        screenshotId: 'les-001-complete',
      },
    ],
  },
  {
    id: 'UAT-LES-002',
    name: 'Flashcard Review Session',
    description: 'User reviews flashcards with spaced repetition, marking cards as known or unknown',
    priority: 'medium',
    estimatedMinutes: 10,
    steps: [
      {
        action: 'Open a lesson and navigate to the Flashcards tab',
        expected: 'First flashcard shows Telugu text on front',
        screenshotId: 'les-002-flashcard-front',
      },
      {
        action: 'Tap or swipe to reveal the back of the flashcard',
        expected: 'English translation, phonetic pronunciation, and example sentence are shown',
        screenshotId: 'les-002-flashcard-back',
      },
      {
        action: 'Mark the card as "Know it"',
        expected: 'Card is marked, next card appears, progress counter increments',
      },
      {
        action: 'Mark a card as "Review again"',
        expected: 'Card is queued for re-review at the end of the session',
      },
      {
        action: 'Complete all 10 flashcards',
        expected: 'Session summary shows cards known and cards to review',
        screenshotId: 'les-002-summary',
      },
    ],
  },
  {
    id: 'UAT-LES-003',
    name: 'Offline Lesson Access',
    description: 'User accesses previously downloaded lesson content while offline',
    priority: 'medium',
    estimatedMinutes: 8,
    steps: [
      {
        action: 'Login and open a lesson while online',
        expected: 'Lesson loads from server',
      },
      {
        action: 'Turn off device network connection',
        expected: 'Offline indicator appears in the app',
        screenshotId: 'les-003-offline',
      },
      {
        action: 'Navigate to lesson list',
        expected: 'Cached lessons are displayed (may be limited)',
      },
      {
        action: 'Open a cached lesson',
        expected: 'Lesson content loads from cache without network',
        screenshotId: 'les-003-cached-lesson',
      },
      {
        action: 'Restore network connection',
        expected: 'Offline indicator disappears, progress syncs to server',
        screenshotId: 'les-003-sync',
      },
    ],
  },
];

// ─── Chat Scenarios ───────────────────────────────────────────────────────────

export const CHAT_SCENARIOS: UATScenario[] = [
  {
    id: 'UAT-CHT-001',
    name: 'Nova Chat Conversation',
    description: 'User has a conversation with Nova AI assistant to practice English',
    priority: 'high',
    estimatedMinutes: 10,
    steps: [
      {
        action: 'Navigate to the Chat tab from home',
        expected: 'Nova chat screen opens with a greeting from Nova',
        screenshotId: 'cht-001-open',
      },
      {
        action: 'Type "How do I introduce myself in English?" and send',
        expected: 'Message appears in chat, loading indicator shows while Nova responds',
        screenshotId: 'cht-001-sent',
      },
      {
        action: 'Wait for Nova response',
        expected: 'Nova provides a detailed response with examples within 10 seconds',
        screenshotId: 'cht-001-response',
      },
      {
        action: 'Type a grammatically incorrect sentence: "I goes to school yesterday"',
        expected: 'Nova responds with a correction and explanation',
        screenshotId: 'cht-001-correction',
      },
      {
        action: 'Scroll up to view chat history',
        expected: 'All previous messages are visible and scrollable',
      },
    ],
  },
  {
    id: 'UAT-CHT-002',
    name: 'Grammar Correction Feature',
    description: 'Verify that Nova correctly identifies and explains grammar errors',
    priority: 'high',
    estimatedMinutes: 8,
    steps: [
      {
        action: 'Open Nova chat',
        expected: 'Chat screen is visible',
      },
      {
        action: 'Type "She don\'t like coffee" and send',
        expected: 'Nova identifies the grammar error and provides: "She doesn\'t like coffee"',
        screenshotId: 'cht-002-correction',
      },
      {
        action: 'Tap on the correction highlight',
        expected: 'Detailed explanation of subject-verb agreement appears',
        screenshotId: 'cht-002-explanation',
      },
      {
        action: 'Type a grammatically correct sentence',
        expected: 'Nova confirms the sentence is correct and offers positive feedback',
      },
    ],
  },
  {
    id: 'UAT-CHT-003',
    name: 'Chat Offline Behavior',
    description: 'Verify appropriate behavior and messaging when chat is used offline',
    priority: 'medium',
    estimatedMinutes: 5,
    steps: [
      {
        action: 'Turn off network connection and navigate to chat',
        expected: 'Chat screen shows offline banner or toast',
        screenshotId: 'cht-003-offline',
      },
      {
        action: 'Attempt to send a message',
        expected: 'Error message: "You are offline. Please check your connection." Send is blocked.',
        screenshotId: 'cht-003-error',
      },
      {
        action: 'Restore network connection',
        expected: 'Offline banner disappears, send button becomes active',
        screenshotId: 'cht-003-reconnect',
      },
      {
        action: 'Send a message after reconnecting',
        expected: 'Message is sent and Nova responds normally',
      },
    ],
  },
];

// ─── Interview Scenarios ──────────────────────────────────────────────────────

export const INTERVIEW_SCENARIOS: UATScenario[] = [
  {
    id: 'UAT-INT-001',
    name: 'Mock Interview Session',
    description: 'User completes a full mock interview session with AI feedback',
    priority: 'high',
    estimatedMinutes: 20,
    steps: [
      {
        action: 'Navigate to Interview Training from home or menu',
        expected: 'Interview training screen shows available interview types',
        screenshotId: 'int-001-start',
      },
      {
        action: 'Select "Software Engineer Interview" and tap Start',
        expected: 'Interview begins with first question displayed',
        screenshotId: 'int-001-question',
      },
      {
        action: 'Type or speak an answer to the first question',
        expected: 'Answer is submitted, AI evaluation loading indicator appears',
        screenshotId: 'int-001-answer',
      },
      {
        action: 'Wait for AI feedback',
        expected: 'Feedback appears with score, strengths, and areas to improve',
        screenshotId: 'int-001-feedback',
      },
      {
        action: 'Answer all 5 interview questions',
        expected: 'Session completion screen shows overall score and summary',
        screenshotId: 'int-001-complete',
      },
      {
        action: 'Tap "View Detailed Report"',
        expected: 'Detailed report shows question-by-question breakdown with AI comments',
        screenshotId: 'int-001-report',
      },
    ],
  },
  {
    id: 'UAT-INT-002',
    name: 'Interview History and Progress',
    description: 'User reviews past interview sessions and tracks improvement over time',
    priority: 'medium',
    estimatedMinutes: 7,
    steps: [
      {
        action: 'Complete at least one interview session',
        expected: 'Interview marked as complete in history',
      },
      {
        action: 'Navigate to Progress or Interview History screen',
        expected: 'List of past interview sessions with dates and scores',
        screenshotId: 'int-002-history',
      },
      {
        action: 'Tap on a past interview session',
        expected: 'Full interview report is displayed with all questions and answers',
        screenshotId: 'int-002-detail',
      },
      {
        action: 'Navigate to the Progress chart section',
        expected: 'Chart shows interview score trend over time',
        screenshotId: 'int-002-chart',
      },
    ],
  },
];

// ─── Combined export ──────────────────────────────────────────────────────────

export const ALL_UAT_SCENARIOS: UATScenario[] = [
  ...ONBOARDING_SCENARIOS,
  ...LESSON_SCENARIOS,
  ...CHAT_SCENARIOS,
  ...INTERVIEW_SCENARIOS,
];

export default ALL_UAT_SCENARIOS;
