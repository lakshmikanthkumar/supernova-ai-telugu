-- ============================================================
-- 010_notifications.sql
-- Push notification infrastructure:
--   user_devices, notification_logs, notification_preferences
-- ============================================================

-- ── user_devices ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_devices (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    device_token TEXT NOT NULL,
    device_type  TEXT NOT NULL CHECK (device_type IN ('android', 'ios', 'web')),
    device_name  TEXT,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, device_token)
);

-- ── notification_logs ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_logs (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    body       TEXT NOT NULL,
    category   TEXT,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered  BOOLEAN NOT NULL DEFAULT FALSE,
    read_at    TIMESTAMPTZ
);

-- ── notification_preferences ──────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id                         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    push_enabled                    BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_enabled                BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_time                   TEXT NOT NULL DEFAULT '09:00',
    reminder_days                   TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],
    reminder_frequency              TEXT NOT NULL DEFAULT 'daily',
    achievement_notifications       BOOLEAN NOT NULL DEFAULT TRUE,
    streak_notifications            BOOLEAN NOT NULL DEFAULT TRUE,
    daily_challenge_notifications   BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_devices" ON user_devices
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_logs" ON notification_logs
    USING (auth.uid() = user_id);

CREATE POLICY "own_preferences" ON notification_preferences
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices (active) WHERE active = TRUE;

-- ── Streak milestone trigger ──────────────────────────────────

CREATE OR REPLACE FUNCTION notify_streak_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.streak > 0 AND NEW.streak % 7 = 0 AND
       (OLD.streak IS NULL OR OLD.streak <> NEW.streak) THEN
        INSERT INTO notification_logs (user_id, title, body, category)
        VALUES (
            NEW.id,
            '🔥 ' || NEW.streak || '-Day Streak!',
            'Amazing! You have practiced English for ' || NEW.streak || ' days in a row.',
            'streak'
        )
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS streak_milestone_trigger ON profiles;
CREATE TRIGGER streak_milestone_trigger
    AFTER UPDATE OF streak ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION notify_streak_milestone();

-- ── Helper: upsert device token (called from Edge Function) ───

CREATE OR REPLACE FUNCTION upsert_device_token(
    p_user_id      UUID,
    p_token        TEXT,
    p_device_type  TEXT,
    p_device_name  TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_devices (user_id, device_token, device_type, device_name, last_active)
    VALUES (p_user_id, p_token, p_device_type, p_device_name, NOW())
    ON CONFLICT (user_id, device_token)
    DO UPDATE SET
        last_active = NOW(),
        active = TRUE,
        device_name = COALESCE(EXCLUDED.device_name, user_devices.device_name);
END;
$$;
