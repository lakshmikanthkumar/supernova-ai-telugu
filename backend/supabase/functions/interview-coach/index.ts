import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================================
// MODEL FAILOVER CHAIN
// ============================================================

const MODEL_CHAIN = [
  { id: 'llama-3.3-70b-versatile', priority: 1 },
  { id: 'llama-3.1-8b-instant', priority: 2 },
  { id: 'gemma2-9b-it', priority: 3 },
  { id: 'mistral-saba-24b', priority: 4 },
]

async function callGroqWithFallback(
  messages: any[],
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<{ content: string; model: string; tokens: number }> {
  const { maxTokens = 512, temperature = 0.7, jsonMode = false } = options
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

  let lastError: unknown

  for (const model of MODEL_CHAIN) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.id,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(15000), // 15s timeout per model
      })

      if (response.status === 429) {
        console.warn(`[Fallback] ${model.id} rate limited, trying next...`)
        lastError = { type: 'rate_limit', model: model.id }
        continue
      }

      if (!response.ok) {
        console.warn(`[Fallback] ${model.id} returned ${response.status}, trying next...`)
        lastError = { type: 'http_error', status: response.status, model: model.id }
        continue
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content ?? ''

      if (!content) {
        console.warn(`[Fallback] ${model.id} returned empty content, trying next...`)
        continue
      }

      console.log(`[Fallback] Success with model: ${model.id}`)
      return {
        content,
        model: model.id,
        tokens: data.usage?.total_tokens ?? 0,
      }
    } catch (err) {
      console.warn(`[Fallback] ${model.id} error: ${err}, trying next...`)
      lastError = err
    }
  }

  throw new Error(`All models failed. Last error: ${JSON.stringify(lastError)}`)
}

// Simple in-memory rate limiter: user_id -> { count, window_start }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  const maxRequests = 10;

  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { job_role, experience_level, question, user_answer, session_id, user_id } = body;

    if (!job_role || !experience_level || !question || !user_answer || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: job_role, experience_level, question, user_answer, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!checkRateLimit(user_id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 10 requests per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert interview coach for Telugu-speaking Indian professionals. You help freshers and experienced candidates prepare for IT and corporate interviews. Give encouraging, practical feedback. Reference Indian work culture and IT industry context. Keep feedback concise and actionable.

Always respond with valid JSON matching this exact structure:
{
  "feedback": "2-3 sentence evaluation of the answer",
  "improved_answer": "A better version of their answer",
  "score": <number 1-10>,
  "confidence_tips": ["tip1", "tip2", "tip3"],
  "grammar_issues": [{"original": "wrong phrase", "corrected": "correct phrase"}],
  "follow_up_question": "The next logical interview question",
  "telugu_guidance": "Explanation in Telugu script"
}`;

    const userPrompt = `Job Role: ${job_role}
Experience Level: ${experience_level}
Interview Question: ${question}
Candidate's Answer: ${user_answer}

Please evaluate this answer and provide structured coaching feedback.`;

    const result = await callGroqWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 800, jsonMode: true }
    );

    const coachingResult = JSON.parse(result.content);

    // Save session to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase.from("interview_sessions").insert({
      id: session_id ?? crypto.randomUUID(),
      user_id,
      job_role,
      experience_level,
      question,
      user_answer,
      score: coachingResult.score,
      feedback: coachingResult.feedback,
      improved_answer: coachingResult.improved_answer,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("DB insert error:", dbError.message);
      // Non-fatal: still return coaching result
    }

    return new Response(JSON.stringify({ ...coachingResult, model_used: result.model }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("interview-coach error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
