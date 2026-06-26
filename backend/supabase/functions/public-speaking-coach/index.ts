import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Filler words to detect server-side before the AI call
const FILLER_WORDS = [
  "um", "uh", "like", "basically", "actually",
  "you know", "so", "right", "okay", "well",
  "i mean", "kind of", "sort of", "literally",
];

type SpeechMode = "TED-style" | "Debate" | "Motivational" | "Presentation" | "Storytelling";

interface FillerCount {
  word: string;
  count: number;
}

// ============================================================
// MODEL FAILOVER CHAIN
import { callAIWithFallback } from "../_shared/ai.ts";`);
}

// ============================================================
// IN-MEMORY RATE LIMITER  (10 requests / user / minute)
// ============================================================

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 10;

  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}

// ============================================================
// SERVER-SIDE ANALYTICS (filler words + WPM)
// ============================================================

function analyzeSpeech(
  transcript: string,
  durationSeconds: number
): { fillerWords: FillerCount[]; fillerCount: number; wpm: number; wordCount: number } {
  const lowerText = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wpm = durationSeconds > 0 ? Math.round(wordCount / (durationSeconds / 60)) : 0;

  const fillerWords: FillerCount[] = [];
  for (const filler of FILLER_WORDS) {
    const escaped = filler.replace(/\s+/g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      fillerWords.push({ word: filler, count: matches.length });
    }
  }
  const fillerCount = fillerWords.reduce((sum, f) => sum + f.count, 0);

  return { fillerWords, fillerCount, wpm, wordCount };
}

function rateWpm(wpm: number): "too_slow" | "good" | "too_fast" {
  if (wpm < 110) return "too_slow";
  if (wpm > 170) return "too_fast";
  return "good";
}

function ratePauses(wpm: number, fillerCount: number): "poor" | "fair" | "good" | "excellent" {
  // Proxy: if pace is natural and few fillers, pauses are likely intentional
  if (fillerCount > 8 || wpm > 180) return "poor";
  if (fillerCount > 4 || wpm > 165) return "fair";
  if (fillerCount <= 1 && wpm >= 115 && wpm <= 155) return "excellent";
  return "good";
}

// ============================================================
// MODE-SPECIFIC CRITERIA DESCRIPTION FOR THE PROMPT
// ============================================================

const MODE_CRITERIA: Record<SpeechMode, string> = {
  "TED-style": `TED-style criteria: big idea clarity, story-driven narrative, emotional connection with audience, memorable opening hook, strong call-to-action close, conversational yet authoritative tone.`,
  "Debate": `Debate criteria: logical argument structure (claim→evidence→warrant), rebuttal readiness, persuasive language, factual accuracy signals, controlled aggression, concise impactful statements.`,
  "Motivational": `Motivational criteria: inspirational tone, relatable personal story, emotional peaks, audience empowerment language, clear uplifting message, energy and passion in delivery.`,
  "Presentation": `Presentation criteria: clear agenda/introduction, logical flow between points, data/evidence references, professional vocabulary, concise summaries, strong close with next-steps.`,
  "Storytelling": `Storytelling criteria: compelling narrative arc (setup→conflict→resolution), vivid descriptive language, character development, emotional engagement, pacing variation, memorable conclusion.`,
};

// ============================================================
// PROMPT BUILDERS
// ============================================================

function buildSystemPrompt(): string {
  return `You are an expert public speaking coach specializing in helping Telugu-speaking Indian professionals become confident English speakers. You analyze speech transcripts and give detailed, actionable, encouraging feedback.

Always respond with ONLY valid JSON — no markdown fences, no extra text — matching this EXACT structure:
{
  "overall_score": <number 0-100>,
  "metrics": {
    "fluency":    { "score": <0-100>, "feedback": "2-3 sentences in English", "telugu": "same in Telugu script" },
    "clarity":    { "score": <0-100>, "feedback": "2-3 sentences in English", "telugu": "same in Telugu script" },
    "vocabulary": { "score": <0-100>, "feedback": "2-3 sentences in English", "telugu": "same in Telugu script" },
    "structure":  { "score": <0-100>, "feedback": "2-3 sentences in English", "telugu": "same in Telugu script" },
    "confidence": { "score": <0-100>, "feedback": "2-3 sentences in English", "telugu": "same in Telugu script" }
  },
  "strengths":    ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"],
  "suggestions":  ["actionable tip1", "actionable tip2", "actionable tip3"],
  "telugu_summary": "3-4 sentence overall summary written entirely in Telugu script",
  "example_opening": "A rewritten stronger opening sentence or two for this specific speech"
}

Rules:
- overall_score = weighted average: fluency 20%, clarity 20%, vocabulary 15%, structure 25%, confidence 20%
- strengths must have exactly 3 items
- improvements must have exactly 2 items
- suggestions must have exactly 3 items
- telugu fields must use actual Telugu script, NOT transliteration
- example_opening must reference the actual topic of the speech`;
}

function buildUserPrompt(
  transcript: string,
  mode: SpeechMode,
  topic: string,
  durationSeconds: number,
  wordCount: number,
  wpm: number,
  wpmRating: string,
  fillerWords: FillerCount[],
  fillerCount: number
): string {
  const fillerSummary =
    fillerWords.length > 0
      ? fillerWords.map((f) => `"${f.word}" (${f.count}×)`).join(", ")
      : "None detected";

  const fillerRatePct =
    wordCount > 0 ? ((fillerCount / wordCount) * 100).toFixed(1) : "0.0";

  return `Please evaluate this speech transcript and provide structured coaching feedback.

Speech Mode: ${mode}
Topic: "${topic}"
Duration: ${durationSeconds} seconds  |  Word Count: ${wordCount}  |  WPM: ${wpm} (${wpmRating})
Filler Words Detected: ${fillerSummary}
Filler Rate: ${fillerRatePct}% of total words

Mode-specific evaluation criteria:
${MODE_CRITERIA[mode]}

Transcript:
"""
${transcript}
"""

Evaluate opening strength, closing strength, logical structure, vocabulary richness, fluency, and delivery confidence. Factor filler word overuse and pace into the fluency and confidence scores.`;
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      transcript,
      mode,
      topic,
      duration_seconds,
      user_id,
    } = body as {
      transcript: string;
      mode: SpeechMode;
      topic: string;
      duration_seconds: number;
      user_id: string;
    };

    // ---- Validation ----
    if (!transcript || !mode || !topic || duration_seconds == null || !user_id) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: transcript, mode, topic, duration_seconds, user_id",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validModes: SpeechMode[] = [
      "TED-style", "Debate", "Motivational", "Presentation", "Storytelling",
    ];
    if (!validModes.includes(mode)) {
      return new Response(
        JSON.stringify({
          error: `Invalid mode. Must be one of: ${validModes.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Rate limit ----
    if (!checkRateLimit(user_id)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Maximum 10 requests per minute." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Server-side analytics (no AI needed) ----
    const { fillerWords, fillerCount, wpm, wordCount } = analyzeSpeech(
      transcript,
      duration_seconds
    );
    const wpmRating = rateWpm(wpm);
    const pauseQuality = ratePauses(wpm, fillerCount);

    // ---- AI analysis ----
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      transcript,
      mode,
      topic,
      duration_seconds,
      wordCount,
      wpm,
      wpmRating,
      fillerWords,
      fillerCount
    );

    const aiResult = await callAIWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 1000, jsonMode: true }
    );

    const coaching = JSON.parse(aiResult.content);

    // ---- Assemble final response ----
    const result = {
      overall_score:  coaching.overall_score,
      wpm,
      filler_count:   fillerCount,
      filler_words:   fillerWords,
      pause_quality:  pauseQuality,
      metrics:        coaching.metrics,
      strengths:      coaching.strengths,
      improvements:   coaching.improvements,
      suggestions:    coaching.suggestions,
      telugu_summary: coaching.telugu_summary,
      example_opening: coaching.example_opening,
      model_used:     aiResult.model,
    };

    // ---- Persist to Supabase (non-fatal) ----
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase.from("public_speech_sessions").insert({
      id: crypto.randomUUID(),
      user_id,
      speech_type:        mode,
      topic,
      duration_seconds,
      word_count:         wordCount,
      wpm,
      overall_score:      result.overall_score,
      fluency_score:      coaching.metrics?.fluency?.score ?? null,
      confidence_score:   coaching.metrics?.confidence?.score ?? null,
      filler_word_count:  fillerCount,
      coaching_feedback:  coaching.telugu_summary,
      created_at:         new Date().toISOString(),
    });

    if (dbError) {
      console.error("DB insert error:", dbError.message);
      // Non-fatal — coaching result is still returned
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("public-speaking-coach error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
