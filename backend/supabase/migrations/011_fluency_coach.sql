-- ================================================================
-- Migration 011 — Fluency Coach
-- Tables: stories, story_sentences, user_story_progress,
--         reading_sessions
-- ================================================================

-- ── STORIES ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT        NOT NULL,
  content          TEXT        NOT NULL,
  preview          TEXT        NOT NULL,
  category         TEXT        NOT NULL
    CHECK (category IN (
      'beginner','daily_conversations','office_communication',
      'interviews','public_speaking','motivational',
      'news_reading','pronunciation_practice'
    )),
  difficulty       TEXT        NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  language         TEXT        NOT NULL DEFAULT 'en',
  estimated_time   INT         NOT NULL, -- seconds
  word_count       INT         NOT NULL,
  xp_reward        INT         NOT NULL DEFAULT 20,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stories_category   ON stories (category);
CREATE INDEX idx_stories_difficulty ON stories (difficulty);
CREATE INDEX idx_stories_active     ON stories (is_active) WHERE is_active;

-- ── STORY SENTENCES ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS story_sentences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     UUID        NOT NULL REFERENCES stories (id) ON DELETE CASCADE,
  index        INT         NOT NULL,          -- 0-based position in story
  text         TEXT        NOT NULL,
  word_count   INT         NOT NULL,
  key_words    TEXT[]      DEFAULT '{}',      -- words that must be spoken correctly
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_story_sentences_story ON story_sentences (story_id, index);

-- ── USER STORY PROGRESS ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_story_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  story_id            UUID        NOT NULL REFERENCES stories (id)    ON DELETE CASCADE,
  completion_percent  INT         NOT NULL DEFAULT 0,
  best_fluency_score  INT         NOT NULL DEFAULT 0,
  sessions_count      INT         NOT NULL DEFAULT 0,
  last_read_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, story_id)
);

CREATE INDEX idx_user_story_progress_user    ON user_story_progress (user_id);
CREATE INDEX idx_user_story_progress_story   ON user_story_progress (story_id);

-- ── READING SESSIONS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reading_sessions (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  story_id             UUID        NOT NULL REFERENCES stories (id)    ON DELETE CASCADE,
  started_at           TIMESTAMPTZ NOT NULL,
  ended_at             TIMESTAMPTZ NOT NULL,
  duration_seconds     INT         NOT NULL,
  fluency_score        INT,
  pronunciation_score  INT,
  confidence_score     INT,
  reading_speed_wpm    INT,
  words_spoken         INT         NOT NULL DEFAULT 0,
  total_words          INT         NOT NULL DEFAULT 0,
  pause_count          INT         NOT NULL DEFAULT 0,
  missed_sentences     INT         NOT NULL DEFAULT 0,
  correct_sentences    INT         NOT NULL DEFAULT 0,
  xp_earned            INT         NOT NULL DEFAULT 0,
  difficult_words      JSONB       DEFAULT '[]',
  ai_feedback          JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reading_sessions_user  ON reading_sessions (user_id, created_at DESC);
CREATE INDEX idx_reading_sessions_story ON reading_sessions (story_id);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────

ALTER TABLE stories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sentences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions     ENABLE ROW LEVEL SECURITY;

-- Stories: readable by all authenticated users; writable by service role only
CREATE POLICY stories_read ON stories
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active);

-- Story sentences: same as stories
CREATE POLICY story_sentences_read ON story_sentences
  FOR SELECT USING (auth.role() = 'authenticated');

-- Progress: users own their rows
CREATE POLICY user_story_progress_select ON user_story_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_story_progress_insert ON user_story_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_story_progress_update ON user_story_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Reading sessions: users own their rows
CREATE POLICY reading_sessions_select ON reading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY reading_sessions_insert ON reading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── AUTO-UPDATE updated_at ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stories_updated_at
  BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED: 3 SAMPLE STORIES ────────────────────────────────────────

INSERT INTO stories (title, content, preview, category, difficulty, estimated_time, word_count, xp_reward)
VALUES
  (
    'A Cup of Morning Tea',
    'Every morning I wake up early. I go to the kitchen and boil water. I pour the hot water into my cup. I add tea leaves and wait. The tea turns golden brown. I add a little milk and sugar. I sit near the window and drink slowly. The tea makes me feel warm and happy. It is a simple pleasure. I enjoy every sip.',
    'A simple daily routine told in short, clear sentences. Perfect for beginners.',
    'beginner', 'easy', 120, 72, 15
  ),
  (
    'Introducing Yourself at Work',
    'My name is Priya and I recently joined this company. I am from Hyderabad. I have five years of experience in software development. I enjoy working in teams and solving complex problems. In my previous role, I led a team of four developers. We built a mobile application used by over one lakh customers. I am excited to bring my skills to this organisation. I look forward to learning from all of you. Please feel free to reach out to me anytime. I am happy to help.',
    'A professional self-introduction for office settings and team meetings.',
    'office_communication', 'medium', 180, 98, 25
  ),
  (
    'Never Stop Learning',
    'Learning is a lifelong journey. Every day we have the opportunity to grow and improve. Some of the most successful people in the world never stopped being students. They read books, asked questions, and remained curious. Failure is not the end — it is a lesson in disguise. When you fall, you learn what not to do next time. The most important step is the one you take after failure. Believe in yourself. Set small goals. Celebrate small wins. Progress, no matter how small, is still progress. Today is the best day to start.',
    'An inspirational passage about continuous learning and perseverance.',
    'motivational', 'medium', 210, 112, 30
  );
