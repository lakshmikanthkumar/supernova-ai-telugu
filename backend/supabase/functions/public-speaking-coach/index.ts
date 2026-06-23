import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FILLER_WORDS = ["um", "uh", "like", "basically", "actually", "you know", "so", "right", "okay", "well", "i mean", "kind of", "sort of"];

interface FillerCount {
  word: string;
  count: number;
}

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

function analyzeFillersAndWpm(
  transcript: string,
  durationSeconds: number
): { fillerWords: FillerCount[]; wpm: number; wordCount: number } {
  const lowerText = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wpm = durationSeconds > 0 ? Math.round(wordCount / (durationSeconds / 60)) : 0;

  const fillerWords: FillerCount[] = [];
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(" ", "\\s+")}\\b`, "gi");
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      fillerWords.push({ word: filler, count: matches.length });
    }
  }

  return { fillerWords, wpm, wordCount };
}

function rateWpm(wpm: number): "too_slow" | "good" | "too_fast" {
  if (wpm < 110) return "too_slow";
  if (wpm > 160) return "too_fast";
  return "good";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { transcript, speech_type, duration_seconds, topic, user_id } = body;

    if (!transcript || !speech_type || !duration_seconds || !topic || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: transcript, speech_type, duration_seconds, topic, user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fillerWords, wpm, wordCount } = analyzeFillersAndWpm(transcript, duration_seconds);
    const wpmRating = rateWpm(wpm);
    const totalFillers = fillerWords.reduce((sum, f) => sum + f.count, 0);
    const fillerRate = wordCount > 0 ? (totalFillers / wordCount) * 100 : 0;

    const systemPrompt = `You are an expert public speaking coach for Telugu-speaking Indian professionals. Analyze speech transcripts and provide detailed, actionable coaching feedback. Be encouraging but honest. Reference common challenges faced by Indian English speakers.

Always respond with valid JSON matching this exact structure:
{
  "overall_score": <number 1-100>,
  "fluency_score": <number 1-100>,
  "confidence_score": <number 1-100>,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "coaching_feedback": "Detailed 3-4 sentence feedback paragraph",
  "telugu_tip": "One practical tip in Telugu script",
  "practice_suggestion": "Specific exercise or practice activity to improve"
}`;

    const userPrompt = `Analyze this speech transcript and provide coaching feedback.

Speech Type: ${speech_type}
Topic: ${topic}
Duration: ${duration_seconds} seconds
Word Count: ${wordCount}
Words Per Minute: ${wpm} (${wpmRating})
Filler Word Usage: ${fillerRate.toFixed(1)}% of total words
Filler Words Detected: ${fillerWords.map((f) => `${f.word} (${f.count}x)`).join(", ") || "None"}

Transcript:
${transcript}

Evaluate the opening strength, closing strength, structure, and overall delivery. Consider the filler word usage and pace in your scoring.`;

    const aiCallResult = await callGroqWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 800, jsonMode: true }
    );

    const aiResult = JSON.parse(aiCallResult.content);

    const result = {
      ...aiResult,
      pace_analysis: {
        wpm,
        rating: wpmRating,
        ideal_wpm: 130,
      },
      filler_words: fillerWords,
      model_used: aiCallResult.model,
    };

    // Save to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: dbError } = await supabase.from("public_speech_sessions").insert({
      id: crypto.randomUUID(),
      user_id,
      speech_type,
      topic,
      duration_seconds,
      word_count: wordCount,
      wpm,
      overall_score: result.overall_score,
      fluency_score: result.fluency_score,
      confidence_score: result.confidence_score,
      filler_word_count: totalFillers,
      coaching_feedback: result.coaching_feedback,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("DB insert error:", dbError.message);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("public-speaking-coach error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
