-- ============================================================
-- EnglishMitraAi - Initial Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS & PROFILES
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  native_language TEXT NOT NULL DEFAULT 'Telugu',
  current_level INTEGER NOT NULL DEFAULT 1,
  xp_total INTEGER NOT NULL DEFAULT 0,
  xp_today INTEGER NOT NULL DEFAULT 0,
  streak_current INTEGER NOT NULL DEFAULT 0,
  streak_longest INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  daily_goal_minutes INTEGER NOT NULL DEFAULT 15,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LESSON CATEGORIES
-- ============================================================

CREATE TABLE public.lesson_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_telugu TEXT NOT NULL,
  description TEXT,
  description_telugu TEXT,
  icon_name TEXT NOT NULL DEFAULT 'book',
  color_hex TEXT NOT NULL DEFAULT '#4F46E5',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LESSONS
-- ============================================================

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES lesson_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_telugu TEXT NOT NULL,
  description TEXT,
  description_telugu TEXT,
  content JSONB NOT NULL DEFAULT '{}',
  difficulty_level INTEGER NOT NULL DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
  xp_reward INTEGER NOT NULL DEFAULT 10,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  thumbnail_url TEXT,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FLASHCARDS
-- ============================================================

CREATE TABLE public.flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  category_id UUID REFERENCES lesson_categories(id) ON DELETE CASCADE,
  english_word TEXT NOT NULL,
  telugu_meaning TEXT NOT NULL,
  pronunciation_guide TEXT,
  example_sentence TEXT,
  example_sentence_telugu TEXT,
  audio_url TEXT,
  image_url TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_text_telugu TEXT,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice','fill_blank','pronunciation','matching','sentence_order')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  explanation_telugu TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRONUNCIATION PHRASES
-- ============================================================

CREATE TABLE public.pronunciation_phrases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phrase TEXT NOT NULL,
  phonetic TEXT,
  telugu_meaning TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'general',
  audio_url TEXT,
  tips JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROLEPLAY SCENARIOS
-- ============================================================

CREATE TABLE public.roleplay_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_telugu TEXT NOT NULL,
  description TEXT NOT NULL,
  description_telugu TEXT,
  scenario_type TEXT NOT NULL CHECK (scenario_type IN ('interview','shopping','travel','office','medical','social','restaurant','phone_call')),
  ai_persona TEXT NOT NULL DEFAULT 'Nova',
  ai_persona_description TEXT,
  system_prompt TEXT NOT NULL,
  starter_message TEXT NOT NULL,
  difficulty_level INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 20,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER PROGRESS
-- ============================================================

CREATE TABLE public.user_lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  score INTEGER DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE public.user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  time_taken_seconds INTEGER,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  review_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  ease_factor FLOAT NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, flashcard_id)
);

-- ============================================================
-- AI CHAT SESSIONS
-- ============================================================

CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('free_chat','roleplay','interview','pronunciation')),
  scenario_id UUID REFERENCES roleplay_scenarios(id),
  title TEXT,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  messages_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  audio_url TEXT,
  grammar_corrections JSONB DEFAULT '[]',
  pronunciation_score INTEGER,
  translations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GAMIFICATION
-- ============================================================

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_telugu TEXT NOT NULL,
  description TEXT NOT NULL,
  description_telugu TEXT,
  icon_name TEXT NOT NULL,
  badge_color TEXT NOT NULL DEFAULT '#FFD700',
  requirement_type TEXT NOT NULL CHECK (requirement_type IN ('xp','streak','lessons_completed','quizzes_passed','chat_sessions','pronunciation_score','days_active')),
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  title_telugu TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('vocabulary','pronunciation','grammar','conversation','listening')),
  content JSONB NOT NULL DEFAULT '{}',
  xp_reward INTEGER NOT NULL DEFAULT 30,
  valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE public.user_daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, challenge_id)
);

CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('lesson','quiz','flashcard','chat','achievement','daily_challenge','streak_bonus')),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEADERBOARD (materialized view updated periodically)
-- ============================================================

CREATE TABLE public.leaderboard_weekly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_lessons_category ON lessons(category_id);
CREATE INDEX idx_lessons_difficulty ON lessons(difficulty_level);
CREATE INDEX idx_flashcards_lesson ON flashcards(lesson_id);
CREATE INDEX idx_quiz_questions_lesson ON quiz_questions(lesson_id);
CREATE INDEX idx_user_lesson_progress_user ON user_lesson_progress(user_id);
CREATE INDEX idx_user_lesson_progress_lesson ON user_lesson_progress(lesson_id);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX idx_xp_transactions_user ON xp_transactions(user_id, created_at DESC);
CREATE INDEX idx_leaderboard_weekly ON leaderboard_weekly(week_start, xp_earned DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, full_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
