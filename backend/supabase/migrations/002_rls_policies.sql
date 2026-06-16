-- ============================================================
-- EnglishMitraAi - Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pronunciation_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_weekly ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================
-- PUBLIC READ - Lesson content visible to all authenticated users
-- ============================================================

CREATE POLICY "Authenticated users can read categories" ON lesson_categories
  FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Admins can manage categories" ON lesson_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Authenticated users can read lessons" ON lessons
  FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Admins can manage lessons" ON lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Authenticated users can read flashcards" ON flashcards
  FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Admins can manage flashcards" ON flashcards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Authenticated users can read quiz questions" ON quiz_questions
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Admins can manage quiz questions" ON quiz_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Authenticated users can read pronunciation phrases" ON pronunciation_phrases
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read roleplay scenarios" ON roleplay_scenarios
  FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Authenticated users can read achievements" ON achievements
  FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Authenticated users can read daily challenges" ON daily_challenges
  FOR SELECT TO authenticated USING (is_active = TRUE);

-- ============================================================
-- USER-OWNED DATA
-- ============================================================

CREATE POLICY "Users manage own lesson progress" ON user_lesson_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own quiz attempts" ON user_quiz_attempts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own flashcard progress" ON user_flashcard_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own chat sessions" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own chat messages" ON chat_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM chat_sessions WHERE id = session_id AND user_id = auth.uid())
  );

CREATE POLICY "Users view own achievements" ON user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements" ON user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own daily challenges" ON user_daily_challenges
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users view own XP transactions" ON xp_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert XP transactions" ON xp_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- LEADERBOARD - read-only for all authenticated users
-- ============================================================

CREATE POLICY "Authenticated users can read leaderboard" ON leaderboard_weekly
  FOR SELECT TO authenticated USING (TRUE);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('audio-recordings', 'audio-recordings', FALSE),
  ('lesson-assets', 'lesson-assets', TRUE),
  ('avatars', 'avatars', TRUE);

CREATE POLICY "Users can upload own audio" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Users can read own audio" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-recordings' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Lesson assets public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'lesson-assets');

CREATE POLICY "Admins can upload lesson assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'lesson-assets' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "Avatars are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
