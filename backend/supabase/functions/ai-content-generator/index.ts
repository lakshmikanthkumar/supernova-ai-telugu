import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ContentType =
  | "speaking_prompt"
  | "interview_question"
  | "vocabulary_word"
  | "grammar_tip"
  | "daily_challenge"
  | "motivational_quote"
  | "pronunciation_phrase"
  | "office_scenario_message";

interface RequestBody {
  type: ContentType;
  topic?: string;
  difficulty?: number;
  user_id?: string;
  force_regenerate?: boolean;
}

function buildGroqPrompt(type: ContentType, topic?: string, difficulty?: number): string {
  switch (type) {
    case "speaking_prompt":
      return `Generate a unique speaking practice prompt for Telugu-medium English learners. Topic: ${topic ?? "general conversation"}. Difficulty: ${difficulty ?? 3}/5. Return JSON: {"prompt": string, "duration_minutes": number, "tips": string[], "telugu_guidance": string}`;

    case "interview_question":
      return `Generate a unique interview question for ${topic ?? "general"} (e.g. IT/HR/fresher). Difficulty ${difficulty ?? 3}/5. Return JSON: {"question": string, "category": string, "sample_answer": string, "tips": string[], "telugu_tip": string}`;

    case "vocabulary_word":
      return `Generate a useful English word for Telugu-medium learners. Category: ${topic ?? "everyday"}. Return JSON: {"word": string, "meaning_english": string, "meaning_telugu": string, "pronunciation": string, "example_sentence": string, "example_telugu": string, "synonyms": string[], "difficulty": number}`;

    case "grammar_tip":
      return `Generate a practical grammar tip for Telugu-medium English learners. Topic: ${topic ?? "general grammar"}. Return JSON: {"topic": string, "tip": string, "example_correct": string, "example_wrong": string, "explanation": string, "telugu_explanation": string}`;

    case "daily_challenge":
      return `Generate an engaging daily English practice challenge for Telugu-medium learners. Difficulty ${difficulty ?? 3}/5. Return JSON: {"title": string, "description": string, "task": string, "duration_minutes": number, "xp_reward": number, "category": string, "tips": string[], "telugu_guidance": string}`;

    case "motivational_quote":
      return `Generate an inspiring quote for English learners. Return JSON: {"quote": string, "author": string, "telugu_translation": string, "lesson": string}`;

    case "pronunciation_phrase":
      return `Generate a pronunciation practice phrase for Telugu-medium English learners. Topic: ${topic ?? "common words"}. Difficulty: ${difficulty ?? 3}/5. Return JSON: {"phrase": string, "phonetic": string, "tips": string[], "common_mistakes": string[], "telugu_guidance": string}`;

    case "office_scenario_message":
      return `Generate a realistic office communication scenario message for Telugu-medium English learners. Topic: ${topic ?? "email communication"}. Difficulty: ${difficulty ?? 3}/5. Return JSON: {"scenario": string, "message": string, "purpose": string, "key_phrases": string[], "telugu_guidance": string}`;

    default:
      throw new Error(`Unsupported content type: ${type}`);
  }
}

async function callGroq(prompt: string, apiKey: string): Promise<Record<string, unknown>> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert English language teacher specializing in helping Telugu-medium learners. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error("No content returned from Groq");
  }

  return JSON.parse(rawContent);
}

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

    if (!groqApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing required environment variables");
    }

    const body: RequestBody = await req.json();
    const { type, topic, difficulty, user_id, force_regenerate = false } = body;

    if (!type) {
      return new Response(JSON.stringify({ error: "Missing required field: type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validTypes: ContentType[] = [
      "speaking_prompt",
      "interview_question",
      "vocabulary_word",
      "grammar_tip",
      "daily_challenge",
      "motivational_quote",
      "pronunciation_phrase",
      "office_scenario_message",
    ];

    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache unless force_regenerate is true
    if (!force_regenerate) {
      const now = new Date().toISOString();
      let query = supabase
        .from("ai_generated_content")
        .select("*")
        .eq("content_type", type)
        .gt("expires_at", now)
        .order("use_count", { ascending: true })
        .limit(1);

      if (topic) {
        query = query.eq("topic", topic);
      }
      if (difficulty) {
        query = query.eq("difficulty", difficulty);
      }

      const { data: cached, error: cacheError } = await query.maybeSingle();

      if (cacheError) {
        console.error("Cache lookup error:", cacheError);
      }

      if (cached) {
        // Increment use_count
        await supabase
          .from("ai_generated_content")
          .update({ use_count: (cached.use_count ?? 0) + 1 })
          .eq("id", cached.id);

        return new Response(
          JSON.stringify({
            content: cached.content,
            cached: true,
            content_id: cached.id,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Cache miss — generate from Groq
    const prompt = buildGroqPrompt(type, topic, difficulty);
    const generatedContent = await callGroq(prompt, groqApiKey);

    // Store in DB with 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const insertData: Record<string, unknown> = {
      content_type: type,
      content: generatedContent,
      expires_at: expiresAt.toISOString(),
      use_count: 1,
    };

    if (topic) insertData.topic = topic;
    if (difficulty) insertData.difficulty = difficulty;
    if (user_id) insertData.created_by = user_id;

    const { data: stored, error: insertError } = await supabase
      .from("ai_generated_content")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to cache content:", insertError);
      // Return content even if caching failed
      return new Response(
        JSON.stringify({
          content: generatedContent,
          cached: false,
          content_id: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        content: generatedContent,
        cached: false,
        content_id: stored.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
