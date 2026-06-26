export interface AIModelConfig {
  id: string
  provider: 'groq' | 'gemini' | 'openrouter'
  priority: number
}

const MODEL_CHAIN: AIModelConfig[] = [
  { id: 'llama-3.3-70b-versatile', provider: 'groq', priority: 1 },
  { id: 'gemini-1.5-flash', provider: 'gemini', priority: 2 },
  { id: 'llama-3.1-8b-instant', provider: 'groq', priority: 3 },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', provider: 'openrouter', priority: 4 },
  { id: 'gemma2-9b-it', provider: 'groq', priority: 5 },
]

export async function callAIWithFallback(
  messages: any[],
  options: { maxTokens?: number; temperature?: number; jsonMode?: boolean } = {}
): Promise<{ content: string; model: string; tokens: number }> {
  const { maxTokens = 512, temperature = 0.7, jsonMode = false } = options
  
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')

  let lastError: unknown

  for (const model of MODEL_CHAIN) {
    try {
      if (model.provider === 'groq' && !GROQ_API_KEY) continue
      if (model.provider === 'gemini' && !GEMINI_API_KEY) continue
      if (model.provider === 'openrouter' && !OPENROUTER_API_KEY) continue

      let response;
      let content = '';
      let tokens = 0;

      if (model.provider === 'groq' || model.provider === 'openrouter') {
        const url = model.provider === 'groq' 
          ? 'https://api.groq.com/openai/v1/chat/completions'
          : 'https://openrouter.ai/api/v1/chat/completions';
        
        const apiKey = model.provider === 'groq' ? GROQ_API_KEY : OPENROUTER_API_KEY;

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            ...(model.provider === 'openrouter' ? {
              'HTTP-Referer': 'https://englishmitra.com',
              'X-Title': 'EnglishMitra AI',
            } : {})
          },
          body: JSON.stringify({
            model: model.id,
            messages,
            max_tokens: maxTokens,
            temperature,
            ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[Fallback] ${model.id} rate limited, trying next...`)
            lastError = { type: 'rate_limit', model: model.id }
          } else {
            console.warn(`[Fallback] ${model.id} returned ${response.status}, trying next...`)
            lastError = { type: 'http_error', status: response.status, model: model.id }
          }
          continue
        }

        const data = await response.json()
        content = data.choices?.[0]?.message?.content ?? ''
        tokens = data.usage?.total_tokens ?? 0

      } else if (model.provider === 'gemini') {
        let systemInstruction = undefined
        const geminiMessages = []
        
        for (const m of messages) {
          if (m.role === 'system') {
            systemInstruction = { parts: [{ text: m.content }] }
          } else {
            geminiMessages.push({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            })
          }
        }

        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            systemInstruction,
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
            }
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (!response.ok) {
          console.warn(`[Fallback] ${model.id} returned ${response.status}, trying next...`)
          lastError = { type: 'http_error', status: response.status, model: model.id }
          continue
        }

        const data = await response.json()
        content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        tokens = data.usageMetadata?.totalTokenCount ?? 0
      }

      if (!content) {
        console.warn(`[Fallback] ${model.id} returned empty content, trying next...`)
        continue
      }

      console.log(`[Fallback] Success with model: ${model.id}`)
      return { content, model: model.id, tokens }

    } catch (err) {
      console.warn(`[Fallback] ${model.id} error: ${err}, trying next...`)
      lastError = err
    }
  }

  throw new Error(`All models failed. Last error: ${JSON.stringify(lastError)}`)
}
