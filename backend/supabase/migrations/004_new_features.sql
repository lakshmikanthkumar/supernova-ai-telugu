-- Migration: 004_new_features.sql
-- EnglishMitraAI app upgrade — new feature tables
-- Created: 2026-06-21

-- ---------------------------------------------------------------------------
-- 1. daily_greetings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_greetings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date                DATE UNIQUE,
    category            TEXT NOT NULL CHECK (category IN ('morning','afternoon','evening','festival','professional','casual','customer')),
    greeting_english    TEXT NOT NULL,
    greeting_telugu     TEXT NOT NULL,
    pronunciation_guide TEXT,
    usage_examples      JSONB DEFAULT '[]',
    cultural_note       TEXT,
    difficulty          SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_greetings_date     ON daily_greetings (date);
CREATE INDEX IF NOT EXISTS idx_daily_greetings_category ON daily_greetings (category);

-- ---------------------------------------------------------------------------
-- 2. self_introduction_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS self_introduction_templates (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level             TEXT NOT NULL CHECK (level IN ('student','fresher','experienced','interview','public_speaking','networking')),
    title             TEXT NOT NULL,
    template_english  TEXT NOT NULL,
    template_telugu   TEXT NOT NULL,
    key_phrases       JSONB DEFAULT '[]',
    tips              JSONB DEFAULT '[]',
    example_video_url TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_self_intro_templates_level ON self_introduction_templates (level);

-- ---------------------------------------------------------------------------
-- 3. office_scenarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS office_scenarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           TEXT NOT NULL,
    title_telugu    TEXT,
    category        TEXT NOT NULL CHECK (category IN (
                        'leave_request','work_update','manager_talk','team_meeting',
                        'hr_communication','client_call','project_discussion',
                        'daily_standup','remote_work','small_talk'
                    )),
    difficulty      SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    ai_persona      TEXT,
    system_prompt   TEXT,
    starter_message TEXT,
    key_vocabulary  JSONB DEFAULT '[]',
    cultural_tips   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_office_scenarios_category   ON office_scenarios (category);
CREATE INDEX IF NOT EXISTS idx_office_scenarios_difficulty ON office_scenarios (difficulty);

CREATE TRIGGER trg_office_scenarios_updated_at
    BEFORE UPDATE ON office_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 4. email_templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category          TEXT NOT NULL CHECK (category IN (
                          'leave_request','job_application','followup',
                          'client_communication','hr_email','apology',
                          'meeting_request','interview_thankyou','status_update'
                      )),
    subject           TEXT NOT NULL,
    body              TEXT NOT NULL,
    body_telugu       TEXT,
    formality_level   TEXT NOT NULL CHECK (formality_level IN ('formal','semi_formal','informal')),
    key_phrases       JSONB DEFAULT '[]',
    mistakes_to_avoid JSONB DEFAULT '[]',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category        ON email_templates (category);
CREATE INDEX IF NOT EXISTS idx_email_templates_formality_level ON email_templates (formality_level);

CREATE TRIGGER trg_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 5. interview_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interview_sessions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    job_role          TEXT,
    experience_level  TEXT CHECK (experience_level IN ('fresher','1-3years','3-5years','5plus')),
    session_type      TEXT CHECK (session_type IN ('hr','technical','behavioral','group_discussion','mock')),
    questions_answered INT NOT NULL DEFAULT 0,
    overall_score     DECIMAL(5,2),
    confidence_score  DECIMAL(5,2),
    grammar_score     DECIMAL(5,2),
    fluency_score     DECIMAL(5,2),
    ai_feedback       JSONB,
    duration_seconds  INT,
    completed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id      ON interview_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_session_type ON interview_sessions (session_type);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at   ON interview_sessions (created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. public_speech_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public_speech_sessions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    topic               TEXT,
    speech_type         TEXT CHECK (speech_type IN ('ted_talk','debate','motivational','presentation','storytelling')),
    duration_seconds    INT,
    word_count          INT,
    filler_words_count  INT,
    pace_wpm            DECIMAL(5,2),
    confidence_score    DECIMAL(5,2),
    fluency_score       DECIMAL(5,2),
    ai_feedback         JSONB,
    transcript          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_speech_sessions_user_id    ON public_speech_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_public_speech_sessions_speech_type ON public_speech_sessions (speech_type);
CREATE INDEX IF NOT EXISTS idx_public_speech_sessions_created_at ON public_speech_sessions (created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. speaking_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS speaking_sessions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    session_type     TEXT NOT NULL CHECK (session_type IN (
                         'office_roleplay','phone_simulation','interview_practice',
                         'public_speaking','pronunciation','self_introduction','daily_greeting'
                     )),
    reference_id     UUID,
    duration_seconds INT,
    speaking_score   DECIMAL(5,2),
    grammar_score    DECIMAL(5,2),
    vocabulary_score DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    ai_feedback      TEXT,
    transcript       TEXT,
    xp_earned        INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speaking_sessions_user_id      ON speaking_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_speaking_sessions_session_type ON speaking_sessions (session_type);
CREATE INDEX IF NOT EXISTS idx_speaking_sessions_created_at   ON speaking_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speaking_sessions_reference_id ON speaking_sessions (reference_id);

-- ---------------------------------------------------------------------------
-- 8. ai_feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_feedback (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    session_type     TEXT NOT NULL,
    session_id       UUID,
    feedback_type    TEXT NOT NULL CHECK (feedback_type IN ('grammar','pronunciation','vocabulary','fluency','overall')),
    feedback_content JSONB,
    score            DECIMAL(5,2),
    suggestions      JSONB DEFAULT '[]',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id      ON ai_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_session_id   ON ai_feedback (session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_session_type ON ai_feedback (session_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at   ON ai_feedback (created_at DESC);

-- ---------------------------------------------------------------------------
-- 9. phone_call_scenarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS phone_call_scenarios (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               TEXT NOT NULL,
    title_telugu        TEXT,
    category            TEXT NOT NULL CHECK (category IN (
                            'customer_support','interview_call','client_conversation',
                            'appointment','office_call','banking','daily_english'
                        )),
    difficulty          SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    ai_persona          TEXT,
    persona_voice_style TEXT,
    system_prompt       TEXT,
    starter_message     TEXT,
    key_phrases         JSONB DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_call_scenarios_category   ON phone_call_scenarios (category);
CREATE INDEX IF NOT EXISTS idx_phone_call_scenarios_difficulty ON phone_call_scenarios (difficulty);

CREATE TRIGGER trg_phone_call_scenarios_updated_at
    BEFORE UPDATE ON phone_call_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 10. vocabulary_mastery
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vocabulary_mastery (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    word            TEXT NOT NULL,
    meaning_telugu  TEXT,
    category        TEXT,
    mastery_level   SMALLINT NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
    review_count    INT NOT NULL DEFAULT 0,
    correct_count   INT NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ,
    next_review_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery_user_id       ON vocabulary_mastery (user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery_mastery_level ON vocabulary_mastery (user_id, mastery_level);
CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery_next_review   ON vocabulary_mastery (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_vocabulary_mastery_category      ON vocabulary_mastery (category);

-- ---------------------------------------------------------------------------
-- 11. user_learning_path
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_learning_path (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE UNIQUE,
    current_level        TEXT NOT NULL DEFAULT 'beginner',
    focus_areas          JSONB NOT NULL DEFAULT '[]',
    weak_topics          JSONB NOT NULL DEFAULT '[]',
    strong_topics        JSONB NOT NULL DEFAULT '[]',
    recommended_modules  JSONB NOT NULL DEFAULT '[]',
    ai_analysis_at       TIMESTAMPTZ,
    next_milestone       TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_learning_path_user_id ON user_learning_path (user_id);

CREATE TRIGGER trg_user_learning_path_updated_at
    BEFORE UPDATE ON user_learning_path
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 12. pronunciation_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pronunciation_history (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    phrase           TEXT NOT NULL,
    target_phrase    TEXT,
    score            DECIMAL(5,2),
    word_scores      JSONB DEFAULT '[]',
    improvement_tips JSONB DEFAULT '[]',
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pronunciation_history_user_id    ON pronunciation_history (user_id);
CREATE INDEX IF NOT EXISTS idx_pronunciation_history_recorded_at ON pronunciation_history (user_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- 13. grammar_exercises
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grammar_exercises (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic                TEXT NOT NULL CHECK (topic IN (
                             'tenses','verbs','articles','prepositions',
                             'sentence_structure','active_passive','reported_speech'
                         )),
    title                TEXT NOT NULL,
    title_telugu         TEXT,
    explanation          TEXT,
    explanation_telugu   TEXT,
    examples             JSONB DEFAULT '[]',
    exercises            JSONB DEFAULT '[]',
    difficulty           SMALLINT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    xp_reward            INT NOT NULL DEFAULT 10,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grammar_exercises_topic      ON grammar_exercises (topic);
CREATE INDEX IF NOT EXISTS idx_grammar_exercises_difficulty ON grammar_exercises (difficulty);

CREATE TRIGGER trg_grammar_exercises_updated_at
    BEFORE UPDATE ON grammar_exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 14. user_grammar_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_grammar_progress (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
    topic               TEXT NOT NULL,
    exercises_completed INT NOT NULL DEFAULT 0,
    correct_answers     INT NOT NULL DEFAULT 0,
    mastery_score       DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_practiced_at   TIMESTAMPTZ,
    UNIQUE (user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_user_id ON user_grammar_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_topic   ON user_grammar_progress (user_id, topic);
