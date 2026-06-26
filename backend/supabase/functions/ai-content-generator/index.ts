// ============================================================
// EnglishMitraAI - AI Content Generator Edge Function
// Generates daily learning content: vocabulary, grammar tips,
// speaking prompts, quizzes, and challenges.
// Uses Groq API with 4-model failover chain.
// Caches results in the daily_content table (1 day TTL).
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

type ContentType = "vocabulary" | "grammar_tip" | "speaking_prompt" | "quiz" | "challenge";
type Level = "beginner" | "intermediate" | "advanced";

interface RequestBody {
  content_type: ContentType;
  level: Level;
  topic?: string | null;
  user_id: string;
  date: string; // "YYYY-MM-DD"
}

// ============================================================
// MODEL FAILOVER CHAIN (matches tutor-chat pattern)
import { callAIWithFallback } from "../_shared/ai.ts";

// ============================================================
// PROMPT BUILDERS
// ============================================================

function buildPrompt(
  contentType: ContentType,
  level: Level,
  topic: string | null | undefined
): string {
  const topicClause = topic ? `Topic: ${topic}.` : "";
  const levelClause = `Level: ${level}.`;

  switch (contentType) {
    case "vocabulary":
      return (
        `Generate one useful English vocabulary word for Telugu-medium learners.` +
        ` ${levelClause}${topicClause}` +
        ` Return JSON with exactly these keys: word (string), definition (string, English),` +
        ` telugu_meaning (string, Telugu script), example (string, full sentence),` +
        ` pronunciation (string, IPA), category (string), usage_tips (array of 2 strings),` +
        ` telugu_tip (string, brief Telugu explanation of when to use this word).`
      );

    case "grammar_tip":
      return (
        `Generate one practical English grammar tip for Telugu-medium learners.` +
        ` ${levelClause}${topicClause}` +
        ` Return JSON with exactly these keys: topic (string), tip (string, clear rule),` +
        ` example_correct (string, correct sentence), example_wrong (string, incorrect sentence),` +
        ` telugu_explanation (string, explanation in Telugu script),` +
        ` practice_sentence (string, fill-in-the-blank practice with ___ blanks).`
      );

    case "speaking_prompt":
      return (
        `Generate one speaking practice prompt for Telugu-medium English learners.` +
        ` ${levelClause}${topicClause}` +
        ` Return JSON with exactly these keys: prompt (string, the speaking topic),` +
        ` time_limit (number, suggested minutes to speak, typically 1-3),` +
        ` key_vocabulary (array of 3 relevant words to use),` +
        ` telugu_hint (string, hint in Telugu-English mix explaining what to talk about).`
      );

    case "quiz":
      return (
        `Generate one multiple-choice English quiz question for Telugu-medium learners.` +
        ` ${levelClause}${topicClause}` +
        ` Return JSON with exactly these keys: question (string), options (array of 4 strings A/B/C/D),` +
        ` correct_answer (string, the correct option text), explanation (string, why it is correct),` +
        ` telugu_explanation (string, explanation in Telugu script).`
      );

    case "challenge":
      return (
        `Generate one daily English practice challenge for Telugu-medium learners.` +
        ` ${levelClause}${topicClause}` +
        ` Return JSON with exactly these keys: title (string), description (string),` +
        ` task (string, what the learner must do), duration_minutes (number),` +
        ` xp_reward (number, 10-100), category (string),` +
        ` tips (array of 2 practical tips), telugu_guidance (string, guidance in Telugu-English mix).`
      );

    default:
      throw new Error(`Unsupported content_type: ${contentType}`);
  }
}

// ============================================================
// CACHE HELPERS
// ============================================================

async function fetchCached(
  supabase: ReturnType<typeof createClient>,
  contentType: ContentType,
  level: Level,
  date: string,
  topic: string | null | undefined
): Promise<Record<string, unknown> | null> {
  try {
    let query = supabase
      .from("daily_content")
      .select("content")
      .eq("content_type", contentType)
      .eq("level", level)
      .eq("date", date)
      .limit(1);

    if (topic) {
      query = query.eq("topic", topic);
    } else {
      query = query.is("topic", null);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.warn("Cache lookup error:", error.message);
      return null;
    }

    return data?.content ?? null;
  } catch (err) {
    console.warn("Cache lookup threw:", err);
    return null;
  }
}

async function saveToCache(
  supabase: ReturnType<typeof createClient>,
  contentType: ContentType,
  level: Level,
  date: string,
  topic: string | null | undefined,
  userId: string,
  content: Record<string, unknown>
): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      content_type: contentType,
      level,
      date,
      content,
      created_by: userId,
    };
    if (topic) row.topic = topic;

    const { error } = await supabase.from("daily_content").insert(row);
    if (error) {
      console.warn("Cache insert error:", error.message, error.code);
    }
  } catch (err) {
    console.warn("Cache insert threw:", err);
    // Non-fatal — we still return the generated content
  }
}

// ============================================================
// HANDLER
// ============================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { content_type, level, topic, user_id, date } = body;

    // --- Validation ---
    const validTypes: ContentType[] = ["vocabulary", "grammar_tip", "speaking_prompt", "quiz", "challenge"];
    const validLevels: Level[] = ["beginner", "intermediate", "advanced"];

    if (!content_type || !validTypes.includes(content_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid content_type. Must be one of: ${validTypes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!level || !validLevels.includes(level)) {
      return new Response(
        JSON.stringify({ error: `Invalid level. Must be one of: ${validLevels.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user_id) {
      return new Response(JSON.stringify({ error: "Missing required field: user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: "date must be in YYYY-MM-DD format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Cache check (requires Supabase; skip gracefully if not configured) ---
    const supabase =
      supabaseUrl && supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey)
        : null;

    if (supabase) {
      const cached = await fetchCached(supabase, content_type, level, date, topic);
      if (cached) {
        return new Response(
          JSON.stringify({ content: cached, cached: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- Generate via Groq ---
    const prompt = buildPrompt(content_type, level, topic);

    const { content: rawContent, model } = await callAIWithFallback(
      [
        {
          role: "system",
          content:
            "You are an expert English language teacher specializing in Telugu-medium learners in India. " +
            "Always respond with valid JSON only, matching the exact keys requested. " +
            "Keep explanations practical and relatable to daily life in Andhra Pradesh and Telangana.",
        },
        { role: "user", content: prompt },
      ],
      { maxTokens: 500, temperature: 0.8, jsonMode: true }
    );

    const generatedContent = JSON.parse(rawContent) as Record<string, unknown>;

    console.log(`[ContentGen] Generated ${content_type} (${level}) via ${model}`);

    // --- Cache the result (fire-and-forget; non-fatal) ---
    if (supabase) {
      await saveToCache(supabase, content_type, level, date, topic, user_id, generatedContent);
    }

    return new Response(
      JSON.stringify({ content: generatedContent, cached: false, model }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ContentGen] Unhandled error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
