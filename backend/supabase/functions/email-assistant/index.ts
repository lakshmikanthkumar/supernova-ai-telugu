import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// TYPES
// ============================================================

type EmailAction = "generate" | "improve" | "suggest_subject";
type EmailTone = "formal" | "semi-formal" | "casual";
type EmailType =
  | "leave"
  | "job_application"
  | "follow_up"
  | "apology"
  | "meeting"
  | "thank_you"
  | "inquiry";

interface EmailRequest {
  action: EmailAction;
  email_type?: EmailType;
  details?: Record<string, string>;
  draft?: string;
  tone?: EmailTone;
  user_id?: string;
}

// ============================================================
// MODEL FAILOVER CHAIN
import { callAIWithFallback } from "../_shared/ai.ts";`);
}

// ============================================================
// RATE LIMITER
// ============================================================

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

// ============================================================
// PROMPT BUILDERS
// ============================================================

function buildGeneratePrompt(
  email_type: EmailType,
  details: Record<string, string>,
  tone: EmailTone
): { system: string; user: string } {
  const system = `You are a professional business English writing expert for Indian professionals. Help Telugu-speaking users write clear, professional emails. Keep language ${tone} and natural. Always use appropriate salutations and closings for Indian business context.

Always respond with valid JSON matching this EXACT structure:
{
  "subject": "A concise, specific subject line for the email",
  "body": "The complete email body including salutation, paragraphs, and sign-off",
  "tone": "${tone}",
  "key_phrases": ["professional phrase used 1", "professional phrase used 2", "professional phrase used 3"],
  "telugu_note": "A brief note in Telugu script explaining the tone and key choices made"
}`;

  const detailsText = Object.entries(details)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const user = `Generate a ${tone} ${email_type.replace('_', ' ')} email.

Details provided:
${detailsText}

Write a complete, professional email suitable for an Indian workplace context.`;

  return { system, user };
}

function buildImprovePrompt(
  draft: string,
  email_type: EmailType | undefined,
  tone: EmailTone
): { system: string; user: string } {
  const system = `You are a professional business English writing expert for Indian professionals. Improve email drafts to be clearer, more professional, and more effective. Preserve the sender's core message and intent.

Always respond with valid JSON matching this EXACT structure:
{
  "improved": "The complete improved email text (subject line + body)",
  "changes": [
    {
      "original": "exact phrase from original",
      "improved": "replacement phrase",
      "reason": "why this change improves the email"
    }
  ],
  "tone_detected": "formal | semi-formal | casual",
  "subject_suggestion": "A suggested subject line for this email",
  "telugu_feedback": "Brief overall feedback in Telugu script explaining what was improved and why"
}

Rules:
- changes array must have between 2 and 5 items covering the most impactful improvements
- tone_detected must be one of: formal, semi-formal, casual
- improved must be the complete email, not just a snippet`;

  const context = email_type ? `Email type: ${email_type.replace('_', ' ')}` : '';
  const toneInstruction = tone !== 'semi-formal' ? `Target tone: ${tone}` : '';

  const user = `Improve this email draft to be more professional and effective.
${context}
${toneInstruction}

Original draft:
${draft}

Enhance tone, structure, grammar, and language while preserving the core message.`;

  return { system, user };
}

function buildSuggestSubjectPrompt(
  draft: string,
  email_type: EmailType | undefined,
  tone: EmailTone
): { system: string; user: string } {
  const system = `You are a professional business English writing expert for Indian professionals. Generate concise, effective subject lines for professional emails.

Always respond with valid JSON matching this EXACT structure:
{
  "subjects": [
    {
      "subject": "First subject line option",
      "style": "direct | descriptive | action-oriented",
      "note": "Brief reason why this subject line works"
    },
    {
      "subject": "Second subject line option",
      "style": "direct | descriptive | action-oriented",
      "note": "Brief reason why this subject line works"
    },
    {
      "subject": "Third subject line option",
      "style": "direct | descriptive | action-oriented",
      "note": "Brief reason why this subject line works"
    }
  ],
  "recommended_index": <0, 1, or 2>,
  "telugu_tip": "A brief tip in Telugu script about writing effective subject lines"
}

Rules:
- subjects array must have EXACTLY 3 items
- recommended_index must be 0, 1, or 2 pointing to the best option
- each style must be one of: direct, descriptive, action-oriented
- subject lines should be under 60 characters`;

  const context = email_type ? `Email type: ${email_type.replace('_', ' ')}` : '';

  const user = `Generate 3 subject line options for this email.
${context}
Tone: ${tone}

Email content:
${draft}`;

  return { system, user };
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: EmailRequest = await req.json();
    const {
      action,
      email_type,
      details = {},
      draft,
      tone = "formal",
      user_id,
    } = body;

    // --- Validate action ---
    const validActions: EmailAction[] = ["generate", "improve", "suggest_subject"];
    if (!action || !validActions.includes(action)) {
      return new Response(
        JSON.stringify({
          error: "Invalid or missing 'action'. Must be 'generate', 'improve', or 'suggest_subject'.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Validate tone ---
    const validTones: EmailTone[] = ["formal", "semi-formal", "casual"];
    if (tone && !validTones.includes(tone)) {
      return new Response(
        JSON.stringify({
          error: "Invalid 'tone'. Must be 'formal', 'semi-formal', or 'casual'.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Validate action-specific fields ---
    if (action === "generate") {
      if (!email_type) {
        return new Response(
          JSON.stringify({ error: "Action 'generate' requires 'email_type' field." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!details || Object.keys(details).length === 0) {
        return new Response(
          JSON.stringify({ error: "Action 'generate' requires 'details' field with at least one key." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if ((action === "improve" || action === "suggest_subject") && !draft) {
      return new Response(
        JSON.stringify({ error: `Action '${action}' requires 'draft' field.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Rate limiting (skip if no user_id supplied) ---
    if (user_id) {
      if (!checkRateLimit(user_id)) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Maximum 10 requests per minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // --- Build prompts per action ---
    let systemPrompt: string;
    let userPrompt: string;

    if (action === "generate") {
      const prompts = buildGeneratePrompt(email_type!, details, tone);
      systemPrompt = prompts.system;
      userPrompt = prompts.user;
    } else if (action === "improve") {
      const prompts = buildImprovePrompt(draft!, email_type, tone);
      systemPrompt = prompts.system;
      userPrompt = prompts.user;
    } else {
      // suggest_subject
      const prompts = buildSuggestSubjectPrompt(draft!, email_type, tone);
      systemPrompt = prompts.system;
      userPrompt = prompts.user;
    }

    const result = await callAIWithFallback(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 1000, jsonMode: true }
    );

    const emailResult = JSON.parse(result.content);

    return new Response(
      JSON.stringify({ ...emailResult, model_used: result.model }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("email-assistant error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
