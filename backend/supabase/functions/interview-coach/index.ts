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
import { callAIWithFallback } from "../_shared/ai.ts";`)
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

    const systemPrompt = `You are an expert interview coach for Telugu-speaking Indian professionals. You help freshers and experienced candidates prepare for IT and corporate interviews. Give encouraging, practical feedback. Reference Indian work culture and IT industry context.

Always respond with valid JSON matching this EXACT structure (no extra keys, no omissions):
{
  "overall_score": <number 0-100>,
  "categories": {
    "clarity": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences on how clearly the candidate expressed their thoughts",
      "telugu": "Same feedback in Telugu script"
    },
    "confidence": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences on tone, assertiveness, and self-assurance in the answer",
      "telugu": "Same feedback in Telugu script"
    },
    "relevance": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences on how well the answer addressed the specific question",
      "telugu": "Same feedback in Telugu script"
    },
    "grammar": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences on grammatical accuracy and sentence structure",
      "telugu": "Same feedback in Telugu script"
    },
    "vocabulary": {
      "score": <number 0-100>,
      "feedback": "2-3 sentences on word choice, professional terminology, and range of vocabulary",
      "telugu": "Same feedback in Telugu script"
    }
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"],
  "next_steps": ["actionable next step 1", "actionable next step 2"],
  "sample_answer": "A complete, polished version of the answer demonstrating best practices",
  "follow_up_question": "The next logical interview question an interviewer would ask",
  "telugu_summary": "A brief overall summary of the coaching feedback written in Telugu script"
}

Rules:
- overall_score should be a weighted average of the 5 category scores (clarity 20%, confidence 20%, relevance 25%, grammar 20%, vocabulary 15%)
- strengths must have exactly 3 items
- improvements must have exactly 2 items
- next_steps must have exactly 2 items
- sample_answer must be a complete answer, not just a snippet
- telugu fields must use actual Telugu script (not transliteration)`;

    const userPrompt = `Job Role: ${job_role}
Experience Level: ${experience_level}
Interview Question: ${question}
Candidate's Answer: ${user_answer}

Please evaluate this answer across all 5 categories and provide structured coaching feedback.`;

    const result = await callAIWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 1200, jsonMode: true }
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
      score: coachingResult.overall_score,
      feedback: coachingResult.telugu_summary,
      improved_answer: coachingResult.sample_answer,
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
