// ============================================================
// EnglishMitraAI - Grammar Engine Edge Function
// Actions: check | explain | quiz
// Target audience: Telugu-speaking English learners
// Uses: Groq API with 4-model failover chain
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// TYPES
// ============================================================

type GrammarAction = "check" | "explain" | "quiz";
type LevelType = "beginner" | "intermediate" | "advanced";

interface GrammarRequest {
  action: GrammarAction;
  text?: string;          // for "check"
  rule?: string;          // for "explain"
  topic?: string;         // for "quiz" (and fallback for "explain")
  level?: LevelType;
  user_id?: string;
}

import { callAIWithFallback } from '../_shared/ai.ts'

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const BASE_CONTEXT = `You are an expert English grammar teacher specializing in helping Telugu-speaking Indian learners from Andhra Pradesh and Telangana. Your explanations are clear, encouraging, and culturally relevant. You always include Telugu (తెలుగు) explanations to help learners understand concepts in their mother tongue. Always respond with valid JSON only — no markdown, no code fences, no extra text outside the JSON.`;

function buildCheckSystemPrompt(): string {
  return `${BASE_CONTEXT}

For grammar checking, respond with this EXACT JSON structure:
{
  "has_errors": true,
  "score": 75,
  "corrections": [
    {
      "original": "the incorrect phrase from the text",
      "corrected": "the corrected version",
      "explanation": "Simple English explanation of the error",
      "explanation_telugu": "తెలుగులో వివరణ",
      "rule": "Grammar Rule Name (e.g. Subject-Verb Agreement)",
      "tip": "A short memorable tip for this rule"
    }
  ],
  "overall_feedback": "Encouraging 1-2 sentence feedback in English",
  "telugu_summary": "మొత్తం అభిప్రాయం తెలుగులో",
  "xp_earned": 10
}

If there are no errors: set "has_errors" to false, "corrections" to [], "score" to 100, and give positive feedback.
The "score" is 0-100 reflecting overall grammatical accuracy.
"xp_earned" should be: 10 for no errors, 5 for 1-2 errors, 3 for 3+ errors.`;
}

function buildExplainSystemPrompt(): string {
  return `${BASE_CONTEXT}

For grammar rule explanation, respond with this EXACT JSON structure:
{
  "rule_name": "Official name of the grammar rule",
  "explanation": "Clear, detailed English explanation (3-5 sentences)",
  "explanation_telugu": "తెలుగులో వివరణ (3-5 వాక్యాలు)",
  "examples": [
    {
      "correct": "A correct example sentence.",
      "incorrect": "An incorrect version of the same idea.",
      "telugu": "ఈ ఉదాహరణ తెలుగులో వివరణ"
    }
  ],
  "common_mistakes": [
    "Common mistake Telugu learners make with this rule",
    "Another common mistake"
  ],
  "telugu_tips": [
    "గుర్తుంచుకోవడానికి చిట్కా తెలుగులో",
    "మరొక సహాయకర చిట్కా"
  ]
}

Provide 3 examples and 3 common_mistakes and 3 telugu_tips. Make mistakes and tips highly relevant to Telugu-medium learners.`;
}

function buildQuizSystemPrompt(): string {
  return `${BASE_CONTEXT}

For quiz generation, respond with this EXACT JSON structure:
{
  "question": "Choose the correct sentence:",
  "options": ["Option A sentence", "Option B sentence", "Option C sentence", "Option D sentence"],
  "correct_index": 0,
  "explanation": "English explanation of why the correct option is right",
  "explanation_telugu": "తెలుగులో వివరణ",
  "topic": "the grammar topic"
}

Rules:
- "correct_index" is 0-3 (index of the correct option in "options" array)
- All 4 options must be plausible; only one is grammatically correct
- Make questions relevant to everyday Indian professional/student life (Hyderabad, IT, college, family)
- The question stem should clearly indicate what to look for (e.g., "Choose the grammatically correct sentence:", "Fill in the blank: She ___ to college every day.")`;
}

// ============================================================
// USER PROMPTS
// ============================================================

function buildCheckUserPrompt(text: string): string {
  return `Check the grammar of the following English text written by a Telugu-speaking learner. Identify all grammatical errors (subject-verb agreement, tense, articles, prepositions, spelling-grammar conflicts, etc.) and suggest corrections.

Text to check: "${text}"

Remember to include Telugu explanations for each correction to help the learner understand.`;
}

function buildExplainUserPrompt(rule: string, level: LevelType): string {
  return `Explain the following English grammar rule at ${level} level for a Telugu-speaking learner from India:

Grammar Rule/Topic: "${rule}"

Provide a thorough explanation with 3 example pairs (correct + incorrect), common mistakes Telugu speakers make, and practical Telugu tips to remember the rule.`;
}

function buildQuizUserPrompt(topic: string, level: LevelType): string {
  return `Generate ONE grammar quiz question on the following topic at ${level} level for Telugu-speaking Indian English learners:

Topic: "${topic}"

Make the sentence contexts relevant to Indian daily life (IT jobs, college, family, Hyderabad). Provide a clear explanation and Telugu explanation for the correct answer.`;
}

// ============================================================
// XP CALCULATION
// ============================================================

function calculateXP(action: GrammarAction, score?: number): number {
  if (action === "check") {
    if (!score) return 3;
    if (score >= 90) return 10;
    if (score >= 70) return 7;
    if (score >= 50) return 5;
    return 3;
  }
  if (action === "explain") return 5;
  if (action === "quiz") return 5;
  return 3;
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: GrammarRequest = await req.json();
    const { action, text, rule, topic, level = "intermediate", user_id } = body;

    // --- Validate action ---
    if (!action || !["check", "explain", "quiz"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing 'action'. Must be 'check', 'explain', or 'quiz'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Validate required fields per action ---
    if (action === "check" && (!text || !text.trim())) {
      return new Response(
        JSON.stringify({ error: "Action 'check' requires a non-empty 'text' field." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "explain" && !rule && !topic) {
      return new Response(
        JSON.stringify({ error: "Action 'explain' requires a 'rule' field (or 'topic' as fallback)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "quiz" && !topic) {
      return new Response(
        JSON.stringify({ error: "Action 'quiz' requires a 'topic' field." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Rate limiting ---
    const rateLimitKey = user_id || req.headers.get("x-forwarded-for") || "anonymous";
    if (!checkRateLimit(rateLimitKey)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 10 requests per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Build prompts ---
    let systemPrompt: string;
    let userPrompt: string;

    if (action === "check") {
      systemPrompt = buildCheckSystemPrompt();
      userPrompt = buildCheckUserPrompt(text!);
    } else if (action === "explain") {
      systemPrompt = buildExplainSystemPrompt();
      userPrompt = buildExplainUserPrompt(rule || topic!, level);
    } else {
      // quiz
      systemPrompt = buildQuizSystemPrompt();
      userPrompt = buildQuizUserPrompt(topic!, level);
    }

    // --- Call Groq with 4-model failover ---
    const result = await callAIWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 900, temperature: 0.6, jsonMode: true }
    );

    // --- Parse AI response ---
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      console.error("Failed to parse AI JSON response:", result.content);
      return new Response(
        JSON.stringify({ error: "AI returned an invalid response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Enrich response with XP and model info ---
    const xpEarned = action === "check"
      ? (parsed.xp_earned ?? calculateXP("check", parsed.score))
      : calculateXP(action);

    // Ensure xp_earned is set for check responses
    if (action === "check") {
      parsed.xp_earned = xpEarned;
    }

    // For quiz, ensure topic is echoed back
    if (action === "quiz" && !parsed.topic) {
      parsed.topic = topic;
    }

    // --- Optionally award XP in Supabase (non-fatal) ---
    if (user_id && xpEarned > 0) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
        );
        await supabase.from("xp_transactions").insert({
          user_id,
          amount: xpEarned,
          source: "grammar_engine",
          description: `Grammar ${action} XP`,
        });
      } catch (xpErr) {
        console.warn("XP transaction failed (non-fatal):", xpErr);
      }
    }

    return new Response(
      JSON.stringify({ ...parsed, model_used: result.model }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("grammar-engine error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
