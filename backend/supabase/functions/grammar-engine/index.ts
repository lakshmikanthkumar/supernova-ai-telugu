import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GrammarAction = "check" | "explain" | "quiz_generate";

interface GrammarRequest {
  action: GrammarAction;
  text?: string;
  topic?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
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

function buildSystemPrompt(action: GrammarAction): string {
  const base = `You are an expert English grammar teacher specializing in helping Telugu-speaking Indian learners. Always respond with valid JSON only — no markdown, no extra text.`;

  if (action === "check") {
    return `${base}

For grammar checking, respond with this exact JSON structure:
{
  "errors": [
    {
      "text": "original incorrect text",
      "correction": "corrected text",
      "rule": "grammar rule name",
      "explanation": "English explanation of the error",
      "telugu_explanation": "Explanation in Telugu script"
    }
  ],
  "overall_score": <number 1-100>,
  "suggestions": ["general improvement suggestion 1", "suggestion 2"]
}`;
  }

  if (action === "explain") {
    return `${base}

For grammar topic explanation, respond with this exact JSON structure:
{
  "explanation": "Clear English explanation of the grammar topic",
  "examples": ["example sentence 1", "example sentence 2", "example sentence 3"],
  "common_mistakes": ["common mistake 1", "common mistake 2"],
  "telugu_explanation": "Explanation in Telugu script",
  "practice_sentences": ["Fill in the blank: sentence 1", "Correct the error: sentence 2", "sentence 3"]
}`;
  }

  // quiz_generate
  return `${base}

For quiz generation, respond with this exact JSON structure:
{
  "questions": [
    {
      "question": "The quiz question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": <index 0-3 of correct option>,
      "explanation": "Why this answer is correct"
    }
  ]
}
Generate exactly 5 questions.`;
}

function buildUserPrompt(action: GrammarAction, body: GrammarRequest): string {
  if (action === "check") {
    return `Check the grammar of the following text and identify all errors:

"${body.text}"

Find all grammatical errors, spelling mistakes related to grammar, and suggest improvements.`;
  }

  if (action === "explain") {
    const difficulty = body.difficulty ?? "intermediate";
    return `Explain the following English grammar topic at ${difficulty} level for a Telugu-speaking learner:

Topic: ${body.topic}

Provide a clear explanation with examples and common mistakes Indian learners make.`;
  }

  // quiz_generate
  const difficulty = body.difficulty ?? "intermediate";
  return `Generate 5 grammar quiz questions on the following topic at ${difficulty} level for Indian English learners:

Topic: ${body.topic}

Make the questions practical and relevant to everyday Indian professional or student contexts.`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: GrammarRequest = await req.json();
    const { action } = body;

    if (!action || !["check", "explain", "quiz_generate"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing 'action'. Must be 'check', 'explain', or 'quiz_generate'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "check" && !body.text) {
      return new Response(
        JSON.stringify({ error: "Action 'check' requires 'text' field." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((action === "explain" || action === "quiz_generate") && !body.topic) {
      return new Response(
        JSON.stringify({ error: `Action '${action}' requires 'topic' field.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(action);
    const userPrompt = buildUserPrompt(action, body);

    const result = await callGroqWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 800, jsonMode: true }
    );

    const grammarResult = JSON.parse(result.content);

    return new Response(JSON.stringify({ ...grammarResult, model_used: result.model }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("grammar-engine error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
