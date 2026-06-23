-- Migration: 007_dynamic_content.sql
-- Dynamic Content Engine Tables
-- Created: 2026-06-22

-- 1. user_content_history: tracks what content each user has seen to avoid repetition
CREATE TABLE IF NOT EXISTS user_content_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN (
    'flashcard','quiz_question','pronunciation_phrase','daily_challenge',
    'greeting','office_scenario','interview_question','speaking_prompt',
    'grammar_exercise','vocabulary_word','roleplay_scenario'
  )),
  content_id TEXT NOT NULL,
  seen_at TIMESTAMPTZ DEFAULT now(),
  score DECIMAL(5,2),
  UNIQUE(user_id, content_type, content_id)
);
CREATE INDEX idx_content_history_user_type ON user_content_history(user_id, content_type);
CREATE INDEX idx_content_history_seen_at ON user_content_history(user_id, content_type, seen_at DESC);

-- 2. daily_content_feed: per-user daily generated feed (refreshes each day)
CREATE TABLE IF NOT EXISTS daily_content_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  feed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vocabulary_word JSONB,         -- {word, meaning_telugu, example, category}
  grammar_tip JSONB,             -- {topic, tip, example, telugu_explanation}
  interview_question TEXT,
  speaking_prompt TEXT,
  motivational_quote JSONB,      -- {quote, author, telugu}
  recommended_modules JSONB DEFAULT '[]',
  pronunciation_focus TEXT,
  challenge_ids JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feed_date)
);
CREATE INDEX idx_daily_feed_user_date ON daily_content_feed(user_id, feed_date);

-- 3. ai_generated_content: cache AI-generated content to save API calls
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL,
  topic TEXT,
  difficulty INT DEFAULT 1,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  use_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);
CREATE INDEX idx_ai_content_type_topic ON ai_generated_content(content_type, topic);
CREATE INDEX idx_ai_content_expires ON ai_generated_content(expires_at) WHERE is_active = true;

-- 4. challenge_history: tracks challenge completion with cooldown
CREATE TABLE IF NOT EXISTS challenge_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  challenge_title TEXT,
  completed_at TIMESTAMPTZ DEFAULT now(),
  score DECIMAL(5,2),
  xp_earned INT DEFAULT 0,
  cooldown_until TIMESTAMPTZ GENERATED ALWAYS AS (completed_at + INTERVAL '3 days') STORED
);
CREATE INDEX idx_challenge_history_user ON challenge_history(user_id, completed_at DESC);
CREATE INDEX idx_challenge_cooldown ON challenge_history(user_id, challenge_type, cooldown_until);

-- 5. flashcard_sessions: track flashcard session details for smart rotation
CREATE TABLE IF NOT EXISTS flashcard_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  card_ids JSONB DEFAULT '[]',       -- ordered list of card IDs shown
  mode TEXT DEFAULT 'shuffle',        -- shuffle | weak_first | spaced_repetition
  cards_seen INT DEFAULT 0,
  cards_correct INT DEFAULT 0,
  duration_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_flashcard_sessions_user ON flashcard_sessions(user_id, session_date DESC);

-- 6. pronunciation_sessions: track pronunciation practice for smart rotation
CREATE TABLE IF NOT EXISTS pronunciation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  phrase_ids JSONB DEFAULT '[]',     -- phrase IDs practiced
  categories JSONB DEFAULT '[]',     -- categories covered
  avg_score DECIMAL(5,2),
  weak_phonemes JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pronunciation_sessions_user ON pronunciation_sessions(user_id, session_date DESC);

-- 7. Enable Row Level Security
ALTER TABLE user_content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_content_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pronunciation_sessions ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
CREATE POLICY "Users manage own content history" ON user_content_history FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own daily feed" ON daily_content_feed FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Anyone reads ai content" ON ai_generated_content FOR SELECT USING (true);
CREATE POLICY "Users manage own challenge history" ON challenge_history FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own flashcard sessions" ON flashcard_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own pronunciation sessions" ON pronunciation_sessions FOR ALL USING (user_id = auth.uid());
