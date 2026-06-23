-- ============================================================
-- Migration: 005_rls_new_features.sql
-- RLS policies for EnglishMitraAI upgrade tables
-- ============================================================

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE daily_greetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_introduction_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_call_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_exercises ENABLE ROW LEVEL SECURITY;

ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_speech_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_path ENABLE ROW LEVEL SECURITY;
ALTER TABLE pronunciation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_grammar_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC READ TABLES: Authenticated users can SELECT
-- Admins can INSERT, UPDATE, DELETE
-- ============================================================

-- daily_greetings
CREATE POLICY "Authenticated users can view daily_greetings"
  ON daily_greetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert daily_greetings"
  ON daily_greetings FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update daily_greetings"
  ON daily_greetings FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete daily_greetings"
  ON daily_greetings FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- self_introduction_templates
CREATE POLICY "Authenticated users can view self_introduction_templates"
  ON self_introduction_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert self_introduction_templates"
  ON self_introduction_templates FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update self_introduction_templates"
  ON self_introduction_templates FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete self_introduction_templates"
  ON self_introduction_templates FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- office_scenarios
CREATE POLICY "Authenticated users can view office_scenarios"
  ON office_scenarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert office_scenarios"
  ON office_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update office_scenarios"
  ON office_scenarios FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete office_scenarios"
  ON office_scenarios FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- email_templates
CREATE POLICY "Authenticated users can view email_templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert email_templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update email_templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete email_templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- phone_call_scenarios
CREATE POLICY "Authenticated users can view phone_call_scenarios"
  ON phone_call_scenarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert phone_call_scenarios"
  ON phone_call_scenarios FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update phone_call_scenarios"
  ON phone_call_scenarios FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete phone_call_scenarios"
  ON phone_call_scenarios FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- grammar_exercises
CREATE POLICY "Authenticated users can view grammar_exercises"
  ON grammar_exercises FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert grammar_exercises"
  ON grammar_exercises FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update grammar_exercises"
  ON grammar_exercises FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete grammar_exercises"
  ON grammar_exercises FOR DELETE
  TO authenticated
  USING (is_admin_user());

-- ============================================================
-- USER-OWNED TABLES: Users see/modify only their own rows
-- ============================================================

-- interview_sessions
CREATE POLICY "Users can view own interview_sessions"
  ON interview_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own interview_sessions"
  ON interview_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own interview_sessions"
  ON interview_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own interview_sessions"
  ON interview_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- public_speech_sessions
CREATE POLICY "Users can view own public_speech_sessions"
  ON public_speech_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own public_speech_sessions"
  ON public_speech_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own public_speech_sessions"
  ON public_speech_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own public_speech_sessions"
  ON public_speech_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- speaking_sessions
CREATE POLICY "Users can view own speaking_sessions"
  ON speaking_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own speaking_sessions"
  ON speaking_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own speaking_sessions"
  ON speaking_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own speaking_sessions"
  ON speaking_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ai_feedback
CREATE POLICY "Users can view own ai_feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ai_feedback"
  ON ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ai_feedback"
  ON ai_feedback FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ai_feedback"
  ON ai_feedback FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- vocabulary_mastery
CREATE POLICY "Users can view own vocabulary_mastery"
  ON vocabulary_mastery FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vocabulary_mastery"
  ON vocabulary_mastery FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vocabulary_mastery"
  ON vocabulary_mastery FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own vocabulary_mastery"
  ON vocabulary_mastery FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- user_learning_path
CREATE POLICY "Users can view own user_learning_path"
  ON user_learning_path FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own user_learning_path"
  ON user_learning_path FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own user_learning_path"
  ON user_learning_path FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own user_learning_path"
  ON user_learning_path FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- pronunciation_history
CREATE POLICY "Users can view own pronunciation_history"
  ON pronunciation_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pronunciation_history"
  ON pronunciation_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pronunciation_history"
  ON pronunciation_history FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own pronunciation_history"
  ON pronunciation_history FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- user_grammar_progress
CREATE POLICY "Users can view own user_grammar_progress"
  ON user_grammar_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own user_grammar_progress"
  ON user_grammar_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own user_grammar_progress"
  ON user_grammar_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own user_grammar_progress"
  ON user_grammar_progress FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
