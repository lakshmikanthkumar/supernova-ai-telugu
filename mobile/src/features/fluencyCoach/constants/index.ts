// ============================================================
// Fluency Coach — Constants & Static Data
// ============================================================

import type { CategoryMeta, Story, DifficultyLevel } from '../types'

export const CATEGORY_META: CategoryMeta[] = [
  { id: 'beginner',              label: 'Beginner',            labelTelugu: 'ప్రారంభకులు',      icon: '🌱', color: '#4CAF50', description: 'Simple everyday sentences' },
  { id: 'daily_conversations',   label: 'Daily Conversations', labelTelugu: 'రోజువారీ సంభాషణ',  icon: '💬', color: '#2196F3', description: 'Real-life talks' },
  { id: 'office_communication',  label: 'Office Talk',         labelTelugu: 'కార్యాలయ మాటలు',  icon: '💼', color: '#9C27B0', description: 'Professional English' },
  { id: 'interviews',            label: 'Interviews',          labelTelugu: 'ఇంటర్వ్యూ',        icon: '🎯', color: '#FF9800', description: 'Job interview prep' },
  { id: 'public_speaking',       label: 'Public Speaking',     labelTelugu: 'ప్రసంగం',          icon: '🎤', color: '#F44336', description: 'Confidence speaking' },
  { id: 'motivational',          label: 'Motivational',        labelTelugu: 'స్ఫూర్తిదాయక',    icon: '🌟', color: '#FF5722', description: 'Inspiring stories' },
  { id: 'news_reading',          label: 'News Reading',        labelTelugu: 'వార్తలు చదవడం',   icon: '📰', color: '#607D8B', description: 'Current affairs' },
  { id: 'pronunciation_practice',label: 'Pronunciation',       labelTelugu: 'ఉచ్చారణ సాధన',    icon: '🔊', color: '#00BCD4', description: 'Sound like a native' },
]

export const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  easy:   '#4CAF50',
  medium: '#FF9800',
  hard:   '#F44336',
}

export const DIFFICULTY_LABELS: Record<DifficultyLevel, { en: string; te: string }> = {
  easy:   { en: 'Easy',   te: 'సులభం'  },
  medium: { en: 'Medium', te: 'మధ్యమ'  },
  hard:   { en: 'Hard',   te: 'కష్టం'  },
}

// WPM thresholds
export const WPM_TOO_SLOW  = 60
export const WPM_GOOD_MIN  = 80
export const WPM_GOOD_MAX  = 140
export const WPM_TOO_FAST  = 160

// Pause detection
export const PAUSE_THRESHOLD_MS    = 2500   // silence > 2.5s = pause
export const PAUSE_HINT_THRESHOLD  = 5000   // show hint after 5s silence
export const AUTO_SCROLL_PAUSE_RESUME = 7000  // auto-scroll resumes after 7s

// Sentence accuracy thresholds
export const ACCURACY_EXCELLENT = 90
export const ACCURACY_GOOD      = 70
export const ACCURACY_POOR      = 50

// Cache TTL (24h for stories since they change infrequently)
export const STORIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000
export const CACHE_KEY_STORIES    = 'fc:stories:v1'
export const CACHE_KEY_PROGRESS   = (storyId: string) => `fc:progress:${storyId}`
export const CACHE_KEY_SESSION    = 'fc:active_session:v1'

// Auto-scroll pixels per second at 1x speed (calibrated for ~100 WPM reader)
export const BASE_SCROLL_PPS = 28

export const LIVE_FEEDBACK_MESSAGES: Record<string, { en: string; te: string }> = {
  pace_good:           { en: '✅ Great pace! Keep going!',          te: '✅ అద్భుతమైన వేగం!' },
  too_fast:            { en: '⚡ Slow down a little',               te: '⚡ కొంచెం నెమ్మదిగా చదవండి' },
  too_slow:            { en: '🐢 Pick up the pace!',                te: '🐢 వేగంగా చదవండి!' },
  pause_detected:      { en: '⏸ Pause detected — continue reading', te: '⏸ ఆగిపోయారు — కొనసాగించండి' },
  great_pronunciation: { en: '🎯 Excellent pronunciation!',         te: '🎯 అద్భుతమైన ఉచ్చారణ!' },
  speak_louder:        { en: '🔊 Speak a bit louder',               te: '🔊 కొంచెం జోరుగా మాట్లాడండి' },
  almost_done:         { en: '🏁 Almost there! Final stretch!',     te: '🏁 దాదాపు పూర్తయింది!' },
  sentence_complete:   { en: '⭐ Sentence complete!',               te: '⭐ వాక్యం పూర్తయింది!' },
}

// XP rewards
export const XP_PER_SENTENCE    = 2
export const XP_COMPLETION_BASE = 20
export const XP_ACCURACY_BONUS  = (accuracy: number) => Math.floor(accuracy / 10) * 2
export const XP_SPEED_BONUS     = (wpm: number) =>
  wpm >= WPM_GOOD_MIN && wpm <= WPM_GOOD_MAX ? 10 : 0

// ── MOCK STORIES (offline / guest fallback) ──────────────────
export const MOCK_STORIES: Story[] = [
  {
    id: 'story-001',
    title: 'My Morning Routine',
    content: `Every morning, I wake up at six o'clock. I brush my teeth and wash my face. Then I drink a glass of water. After that, I do some exercise for fifteen minutes. I prepare a simple breakfast of bread and tea. I check my phone for important messages. I get dressed and pack my bag. I leave the house by eight o'clock. I take the bus to work. I greet my colleagues when I arrive at the office.`,
    category: 'beginner',
    difficulty: 'easy',
    estimated_time: 60,
    language: 'en',
    xp_reward: 25,
    word_count: 82,
    preview: 'Every morning, I wake up at six o\'clock...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
  {
    id: 'story-002',
    title: 'Ordering Coffee',
    content: `Good morning! I would like to order a cup of coffee, please. Can I have a medium latte with oat milk? I also want a blueberry muffin. How much does it cost? Here is my payment. Thank you very much. Could you please give me a receipt? I will sit near the window. I am looking forward to a productive day. Have a wonderful morning!`,
    category: 'daily_conversations',
    difficulty: 'easy',
    estimated_time: 55,
    language: 'en',
    xp_reward: 25,
    word_count: 68,
    preview: 'Good morning! I would like to order a cup of coffee...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
  {
    id: 'story-003',
    title: 'Job Interview Introduction',
    content: `Good morning, sir. My name is Ramesh Kumar and I am very pleased to meet you. I am applying for the position of software engineer at your company. I completed my Bachelor of Technology from JNTU Hyderabad in the year 2021. I have two years of experience working with Java and Python. I am a quick learner and I enjoy solving complex problems. I believe that I would be a great asset to your team. I am very passionate about technology and continuous learning. I am excited about the opportunity to contribute to your organization. Thank you for giving me this chance to introduce myself.`,
    category: 'interviews',
    difficulty: 'medium',
    estimated_time: 75,
    language: 'en',
    xp_reward: 35,
    word_count: 112,
    preview: 'Good morning, sir. My name is Ramesh Kumar...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
  {
    id: 'story-004',
    title: 'Team Meeting Update',
    content: `Good afternoon, everyone. Thank you for joining today's weekly team meeting. Let me begin by sharing the project status update. We have successfully completed the first phase of development. The testing team has identified a few minor bugs which are being resolved. Our target is to deploy the application by the end of this sprint. I would like to appreciate the entire team for their hard work and dedication. We are slightly ahead of schedule which is great news. Are there any questions or concerns before we move on? Please feel free to share your feedback. Let us continue to collaborate and deliver excellent results.`,
    category: 'office_communication',
    difficulty: 'medium',
    estimated_time: 80,
    language: 'en',
    xp_reward: 35,
    word_count: 118,
    preview: 'Good afternoon, everyone. Thank you for joining...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
  {
    id: 'story-005',
    title: 'Never Give Up',
    content: `Success is not final and failure is not fatal. It is the courage to continue that truly counts. Every great achievement in this world began with a single decision to try. When you fall, do not stay down. Rise, dust yourself off, and begin again. The road to success is always under construction. Challenges are not obstacles but opportunities to grow stronger. Believe in your abilities even when no one else does. Your dreams are valid and your efforts will be rewarded. The most successful people in the world failed more times than you have ever tried. Keep going and never stop believing in yourself.`,
    category: 'motivational',
    difficulty: 'medium',
    estimated_time: 70,
    language: 'en',
    xp_reward: 35,
    word_count: 109,
    preview: 'Success is not final and failure is not fatal...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
  {
    id: 'story-006',
    title: 'Technology and Our Lives',
    content: `Artificial intelligence is transforming every aspect of our daily lives. From smartphones that recognize our faces to virtual assistants that answer our questions, technology has become inseparable from modern existence. The healthcare sector is witnessing unprecedented breakthroughs in diagnostics and personalized medicine. Autonomous vehicles are gradually becoming a reality on our roads. However, with these advancements come significant ethical responsibilities. We must ensure that technology remains a tool that empowers humanity rather than one that controls it. Digital literacy has become as essential as reading and writing in today's world. The challenge for our generation is to harness technology responsibly for sustainable development. Every individual must become an active and informed participant in this digital revolution. The future belongs to those who learn, adapt, and lead with purpose and integrity.`,
    category: 'news_reading',
    difficulty: 'hard',
    estimated_time: 90,
    language: 'en',
    xp_reward: 50,
    word_count: 143,
    preview: 'Artificial intelligence is transforming every aspect...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
  {
    id: 'story-007',
    title: 'Confident Public Speaker',
    content: `Distinguished guests, faculty members, and my fellow students, a very warm good morning to all of you. I stand before you today to speak on a topic that is very close to my heart: the power of education. Education is not merely the acquisition of knowledge from textbooks. It is the development of a thinking, questioning, and compassionate mind. Every child in India deserves access to quality education regardless of their social or economic background. We must work together to build a society where education is treated as a fundamental right and not a privilege. I believe that each one of us has the power to create positive change through learning and leadership. Let us pledge today to be lifelong learners and dedicated contributors to our nation's progress. Thank you.`,
    category: 'public_speaking',
    difficulty: 'hard',
    estimated_time: 85,
    language: 'en',
    xp_reward: 50,
    word_count: 132,
    preview: 'Distinguished guests, faculty members, and my fellow students...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
  {
    id: 'story-008',
    title: 'Tongue Twisters & Sounds',
    content: `She sells seashells by the seashore. The shells she sells are surely seashells. Peter Piper picked a peck of pickled peppers. How much wood would a woodchuck chuck if a woodchuck could chuck wood? The sixth sick sheik's sixth sheep is sick. Red lorry, yellow lorry. Unique New York, unique New York, you know you need unique New York. Betty Botter bought some butter but the butter was bitter. So Betty bought some better butter to make the bitter butter better. How can a clam cram in a clean cream can?`,
    category: 'pronunciation_practice',
    difficulty: 'hard',
    estimated_time: 65,
    language: 'en',
    xp_reward: 40,
    word_count: 98,
    preview: 'She sells seashells by the seashore...',
    created_at: new Date().toISOString(),
    is_premium: false,
  },
]
