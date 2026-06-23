import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type EmailAction = "generate" | "improve" | "simplify";

interface EmailRequest {
  action: EmailAction;
  category?: string;
  user_draft?: string;
  context?: string;
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const { action, category, user_draft, context } = body;

    if (!action || !["generate", "improve", "simplify"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid or missing 'action'. Must be 'generate', 'improve', or 'simplify'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate" && (!category || !context)) {
      return new Response(
        JSON.stringify({ error: "Action 'generate' requires 'category' and 'context' fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if ((action === "improve" || action === "simplify") && !user_draft) {
      return new Response(
        JSON.stringify({ error: `Action '${action}' requires 'user_draft' field.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a professional business English writing expert for Indian professionals. Help Telugu-speaking users write clear, professional emails. Always provide the email in proper format with Subject and Body. Keep language formal but natural. Explain improvements in Telugu when requested.

Always respond with valid JSON matching this exact structure:
{
  "subject": "Email subject line",
  "body": "Full email body text",
  "formality_score": <number 1-10>,
  "key_phrases_used": ["phrase1", "phrase2"],
  "improvements_made": ["what was changed or added"],
  "telugu_explanation": "Brief explanation in Telugu script"
}`;

    let userPrompt: string;

    if (action === "generate") {
      userPrompt = `Generate a professional email.
Category: ${category}
Context/Details: ${context}

Write a complete professional email with appropriate Subject and Body.`;
    } else if (action === "improve") {
      userPrompt = `Improve this email draft to be more professional and effective.
Category: ${category ?? "General Business"}
Original Draft:
${user_draft}

Enhance the tone, structure, and language while preserving the core message.`;
    } else {
      userPrompt = `Simplify this email to make it clearer and easier to understand.
Category: ${category ?? "General Business"}
Original Draft:
${user_draft}

Make the language simpler and more direct while keeping it professional.`;
    }

    const result = await callGroqWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 800, jsonMode: true }
    );

    const emailResult = JSON.parse(result.content);

    return new Response(JSON.stringify({ ...emailResult, model_used: result.model }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("email-assistant error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
