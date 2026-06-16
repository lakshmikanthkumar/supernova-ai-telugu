// ============================================================
// EnglishMitraAi - Pronunciation Feedback Edge Function (FREE)
// Replaces: OpenAI Whisper (paid)
//
// NEW ARCHITECTURE (100% FREE):
// - Speech-to-text: done CLIENT-SIDE using react-native-voice
// - This edge function: receives transcript from client,
//   then uses Groq to generate detailed pronunciation feedback
// - No audio files uploaded to server (saves storage)
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

interface PronunciationRequest {
  transcript: string        // What the user actually said (from react-native-voice)
  target_phrase: string     // What they were supposed to say
  local_scores?: {          // Optional pre-computed scores from client-side Levenshtein
    overall_score: number
    accuracy_score: number
    completeness_score: number
    fluency_score: number
    words_analysis: Array<{
      word: string
      spoken: string | null
      status: 'correct' | 'mispronounced' | 'missing' | 'extra'
      similarity: number
      tip: string
    }>
  }
}

async function callGroq(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 400
): Promise<string> {
  const groqApiKey = Deno.env.get('GROQ_API_KEY')
  if (!groqApiKey) throw new Error('GROQ_API_KEY not set')

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    if (response.status === 429) throw new Error('Rate limit. Try again in a moment.')
    throw new Error(`Groq error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content || '{}'
}

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

    const body: PronunciationRequest = await req.json()
    const { transcript, target_phrase, local_scores } = body

    if (!transcript || !target_phrase) {
      return new Response(JSON.stringify({ error: 'transcript and target_phrase are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If client sent local scores (computed with Levenshtein), enhance them with AI feedback
    if (local_scores) {
      try {
        const prompt = `You are a pronunciation coach for Telugu-medium English learners.

Target phrase: "${target_phrase}"
What student said: "${transcript}"
Computed scores: overall=${local_scores.overall_score}%, accuracy=${local_scores.accuracy_score}%

Mispronounced words: ${local_scores.words_analysis.filter(w => w.status === 'mispronounced').map(w => w.word).join(', ') || 'none'}
Missing words: ${local_scores.words_analysis.filter(w => w.status === 'missing').map(w => w.word).join(', ') || 'none'}

Return JSON ONLY:
{
  "feedback": "2-3 sentences of specific, encouraging feedback in simple English",
  "feedback_telugu": "2-3 sentences in Telugu script",
  "encouragement": "Short motivating message in Telugu",
  "specific_tips": ["Tip 1 for improvement", "Tip 2"]
}`

        const raw = await callGroq([
          { role: 'system', content: 'You are a pronunciation coach. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ], 350)

        const aiEnhancement = JSON.parse(raw)

        return new Response(
          JSON.stringify({
            ...local_scores,
            transcript,
            target_phrase,
            feedback: aiEnhancement.feedback || 'Good effort!',
            feedback_telugu: aiEnhancement.feedback_telugu || 'మంచి ప్రయత్నం!',
            encouragement: aiEnhancement.encouragement || 'మళ్ళీ ప్రయత్నించండి!',
            specific_tips: aiEnhancement.specific_tips || [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch {
        // Return local scores without AI enhancement on error
        return new Response(
          JSON.stringify({
            ...local_scores,
            transcript,
            target_phrase,
            feedback: getLocalFeedback(local_scores.overall_score),
            feedback_telugu: getLocalFeedbackTelugu(local_scores.overall_score),
            encouragement: 'రోజూ అభ్యాసం చేయండి! 💪',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fallback: No local scores provided — compute basic feedback from transcript comparison
    const isMatch = transcript.toLowerCase().trim() === target_phrase.toLowerCase().trim()
    const basicScore = isMatch ? 95 : computeBasicSimilarity(transcript, target_phrase)

    return new Response(
      JSON.stringify({
        overall_score: basicScore,
        accuracy_score: basicScore,
        completeness_score: basicScore,
        fluency_score: basicScore,
        transcript,
        target_phrase,
        feedback: getLocalFeedback(basicScore),
        feedback_telugu: getLocalFeedbackTelugu(basicScore),
        encouragement: 'అభ్యాసం కొనసాగించండి! 💪',
        words_analysis: [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Pronunciation feedback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function computeBasicSimilarity(a: string, b: string): number {
  const aWords = new Set(a.toLowerCase().split(/\s+/))
  const bWords = new Set(b.toLowerCase().split(/\s+/))
  let matches = 0
  aWords.forEach(w => { if (bWords.has(w)) matches++ })
  const score = (matches / Math.max(aWords.size, bWords.size)) * 100
  return Math.round(Math.min(100, score))
}

function getLocalFeedback(score: number): string {
  if (score >= 90) return 'Excellent! Your pronunciation is very accurate.'
  if (score >= 75) return 'Good job! A few minor improvements needed.'
  if (score >= 55) return 'Fair attempt. Keep practicing the full phrase.'
  return 'Keep practicing. Listen to the model and try again slowly.'
}

function getLocalFeedbackTelugu(score: number): string {
  if (score >= 90) return 'అద్భుతం! మీ ఉచ్చారణ చాలా బాగుంది.'
  if (score >= 75) return 'బాగుంది! కొంచెం మరింత అభ్యాసం అవసరం.'
  if (score >= 55) return 'మంచి ప్రయత్నం. మొత్తం వాక్యం అభ్యాసం చేయండి.'
  return 'అభ్యాసం కొనసాగించండి. నమూనా వినండి మరియు నెమ్మదిగా చెప్పండి.'
}
