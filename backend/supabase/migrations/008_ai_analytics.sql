-- AI Usage Analytics Tables

-- ai_usage_logs: every AI request logged
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  provider_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  latency_ms INT,
  success BOOLEAN DEFAULT true,
  error_type TEXT,
  fallbacks_used INT DEFAULT 0,
  cached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_logs_user ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_logs_provider ON ai_usage_logs(provider_id, created_at DESC);
CREATE INDEX idx_ai_logs_task ON ai_usage_logs(task_type, created_at DESC);

-- ai_provider_health: snapshots of provider health state
CREATE TABLE IF NOT EXISTS ai_provider_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('healthy','degraded','down')),
  success_rate DECIMAL(5,2),
  avg_latency_ms INT,
  error_count_1h INT DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ai_health_provider ON ai_provider_health(provider_id, recorded_at DESC);

-- ai_request_metrics: aggregated hourly metrics
CREATE TABLE IF NOT EXISTS ai_request_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hour_bucket TIMESTAMPTZ NOT NULL,  -- truncated to hour
  provider_id TEXT NOT NULL,
  total_requests INT DEFAULT 0,
  successful_requests INT DEFAULT 0,
  failed_requests INT DEFAULT 0,
  total_tokens INT DEFAULT 0,
  avg_latency_ms INT,
  cache_hits INT DEFAULT 0,
  fallback_count INT DEFAULT 0,
  UNIQUE(hour_bucket, provider_id)
);
CREATE INDEX idx_ai_metrics_hour ON ai_request_metrics(hour_bucket DESC);

-- RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own ai logs" ON ai_usage_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Service role inserts ai logs" ON ai_usage_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone reads ai health" ON ai_provider_health FOR SELECT USING (true);
CREATE POLICY "Anyone reads ai metrics" ON ai_request_metrics FOR SELECT USING (true);
