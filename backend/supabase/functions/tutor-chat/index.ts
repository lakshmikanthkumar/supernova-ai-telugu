// ============================================================
// EnglishMitraAi - AI Tutor Chat Edge Function (FREE STACK)
// Replaces: OpenAI GPT-4 (paid)
// Uses: Groq API with multi-model failover
// Free tier: 14,400 req/day, 500,000 tokens/day
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_TOKENS = 512 // Keep token usage low for free tier
const MAX_HISTORY_MESSAGES = 8 // Limit context to save tokens

interface ChatRequest {
  session_id: string
  message: string
  session_type: 'free_chat' | 'roleplay' | 'interview' | 'pronunciation'
  scenario_id?: string
  include_correction?: boolean
  include_translation?: boolean
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GrammarCorrection {
  original: string
  corrected: string
  explanation: string
  explanation_telugu: string
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

// ============================================================
// SYSTEM PROMPTS
// ============================================================

const NOVA_SYSTEM_PROMPT = `You are Nova, a friendly English tutor for Telugu-medium students in Andhra Pradesh and Telangana, India.

Your rules:
1. Always respond in simple, clear English (2-4 sentences max)
2. When students make grammar mistakes, gently correct inline: "You said '...' — try '...' instead!"
3. Occasionally use a Telugu word to explain difficult concepts
4. Ask follow-up questions to keep conversation going
5. Reference Indian context naturally (Hyderabad, Telugu, chai, IT industry)
6. Be warm, encouraging, and celebrate small wins
7. Focus on spoken English confidence, not written formality

Keep responses SHORT to save tokens.`

const GRAMMAR_CHECK_PROMPT = `You are a grammar checker for Telugu-medium English learners. Check for errors and explain simply.

Return ONLY valid JSON:
{"has_errors":true/false,"corrections":[{"original":"wrong phrase","corrected":"correct phrase","explanation":"Simple explanation","explanation_telugu":"తెలుగు వివరణ"}],"improved_sentence":"full corrected sentence"}

If no errors: {"has_errors":false,"corrections":[],"improved_sentence":"<original>"}`

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: ChatRequest = await req.json()
    const { session_id, message, session_type, scenario_id, include_correction, include_translation } = body

    // Fetch recent conversation history (limit to save tokens)
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_MESSAGES)

    const recentHistory = (history || []).reverse()

    // Get scenario system prompt for roleplay
    let systemPrompt = NOVA_SYSTEM_PROMPT
    if (session_type === 'roleplay' && scenario_id) {
      const { data: scenario } = await supabase
        .from('roleplay_scenarios')
        .select('system_prompt')
        .eq('id', scenario_id)
        .single()
      if (scenario?.system_prompt) {
        systemPrompt = scenario.system_prompt + '\n\nKeep responses SHORT (2-4 sentences). Be encouraging.'
      }
    }

    // Build messages for Groq
    const messages: GroqMessage[] = [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ]

    // Call Groq with failover for main response
    const mainResult = await callGroqWithFallback(messages, { maxTokens: MAX_TOKENS, temperature: 0.8 })
    const assistantMessage = mainResult.content

    // Grammar correction (only if requested and message is substantial)
    let corrections: GrammarCorrection[] = []
    if (include_correction && message.trim().length > 5) {
      try {
        const grammarMessages: GroqMessage[] = [
          { role: 'system', content: GRAMMAR_CHECK_PROMPT },
          { role: 'user', content: `Check: "${message}"` },
        ]
        const grammarResult = await callGroqWithFallback(grammarMessages, { maxTokens: 300, temperature: 0.1, jsonMode: true })
        const parsed = JSON.parse(grammarResult.content)
        corrections = parsed.corrections || []
      } catch { /* grammar check failure is non-fatal */ }
    }

    // Translation using google-translate-api-x is done client-side
    // Edge function only handles AI responses to save on complexity
    let translation = ''
    if (include_translation) {
      // Simple Telugu translation via Groq (as fallback if client-side fails)
      try {
        const transMessages: GroqMessage[] = [
          { role: 'system', content: 'Translate to Telugu. Return only the Telugu translation, nothing else.' },
          { role: 'user', content: assistantMessage.slice(0, 200) }, // Limit for token savings
        ]
        const transResult = await callGroqWithFallback(transMessages, { maxTokens: 200, temperature: 0.1 })
        translation = transResult.content
      } catch { /* translation failure is non-fatal */ }
    }

    // Save both messages to database
    await supabase.from('chat_messages').insert([
      {
        session_id,
        role: 'user',
        content: message,
        grammar_corrections: corrections,
      },
      {
        session_id,
        role: 'assistant',
        content: assistantMessage,
        translations: translation ? { telugu: translation } : {},
      },
    ])

    // Update session message count + award XP every 10 messages
    const { data: session } = await supabase
      .from('chat_sessions')
      .select('messages_count, xp_earned')
      .eq('id', session_id)
      .single()

    if (session) {
      const newCount = (session.messages_count || 0) + 2
      let xpEarned = session.xp_earned || 0

      if (newCount % 10 === 0) {
        xpEarned += 5
        await supabase.from('xp_transactions').insert({
          user_id: user.id, amount: 5, source: 'chat',
          reference_id: session_id, description: 'Chat XP reward',
        })
      }

      await supabase.from('chat_sessions').update({
        messages_count: newCount, xp_earned: xpEarned,
      }).eq('id', session_id)
    }

    return new Response(
      JSON.stringify({ message: assistantMessage, corrections, translation, model_used: mainResult.model }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Tutor chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
