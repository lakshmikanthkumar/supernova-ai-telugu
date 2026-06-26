
```typescript
// mobile/__tests__/mocks/groqMocks.ts

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqChoice {
  index: number;
  message: GroqMessage;
  finish_reason: string;
  logprobs: null;
}

export interface GroqUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_time: number;
  completion_time: number;
  total_time: number;
}

export interface GroqChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqChoice[];
  usage: GroqUsage;
  system_fingerprint: string;
  x_groq: { id: string };
}

export interface GroqErrorResponse {
  error: {
    message: string;
    type: string;
    code: string | number;
  };
}

export interface GrammarCorrection {
  original: string;
  correction: string;
  explanation: string;
  type: 'grammar' | 'spelling' | 'punctuation' | 'word_choice' | 'structure';
  telugu: string;
}

export interface GrammarResponseContent {
  corrections: GrammarCorrection[];
  improvedText: string;
  score: number;
}

export interface InterviewFeedbackContent {
  overallScore: number;
  fluency: number;
  vocabulary: number;
  grammar: number;
  confidence: number;
  relevance: number;
  strengths: string[];
  areasForImprovement: string[];
  detailedFeedback: string;
  suggestedAnswer: string;
  teluguSummary: string;
}

// Standard chat response
export const MOCK_GROQ_CHAT_RESPONSE: GroqChatResponse = {
  id: 'chatcmpl-mock-123456789',
  object: 'chat.completion',
  created: 1719456000,
  model: 'llama-3.3-70b-versatile',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content:
          'Hello! I am Nova, your English learning assistant. How can I help you improve your English today?',
      },
      finish_reason: 'stop',
      logprobs: null,
    },
  ],
  usage: {
    prompt_tokens: 42,
    completion_tokens: 24,
    total_tokens: 66,
    prompt_time: 0.012,
    completion_time: 0.034,
    total_time: 0.046,
  },
  system_fingerprint: 'fp_mock_groq_001',
  x_groq: { id: 'req_mock_groq_001' },
};

// Grammar correction response
const grammarContent: GrammarResponseContent = {
  corrections: [
    {
      original: 'I goed to market yesterday',
      correction: 'I went to the market yesterday',
      explanation:
        '"Went" is the past tense of "go". Also, "market" needs the article "the" when referring to a specific market.',
      type: 'grammar',
      telugu:
        '"go" à°¯à±Šà°•à±à°• past tense "went" à°…à°µà±à°¤à±à°‚à°¦à°¿. à°¨à°¿à°°à±à°¦à°¿à°·à±à°Ÿ market à°—à±à°°à°¿à°‚à°šà°¿ à°®à°¾à°Ÿà±à°²à°¾à°¡à±‡à°Ÿà°ªà±à°ªà±à°¡à± "the" à°µà°¾à°¡à°¾à°²à°¿.',
    },
    {
      original: 'buyed',
      correction: 'bought',
      explanation: '"Bought" is the correct past tense of "buy". "Buyed" is not a valid English word.',
      type: 'grammar',
      telugu: '"buy" à°¯à±Šà°•à±à°• past tense "bought" à°…à°µà±à°¤à±à°‚à°¦à°¿.',
    },
    {
      original: 'vegetable\'s',
      correction: 'vegetables',
      explanation: 'No apostrophe is needed here. "Vegetables" is simply the plural form.',
      type: 'punctuation',
      telugu: 'Plural à°•à±‹à°¸à°‚ apostrophe à°µà°¾à°¡à°•à±‚à°¡à°¦à±.',
    },
  ],
  improvedText: 'I went to the market yesterday and bought fresh vegetables.',
  score: 65,
};

export const MOCK_GROQ_GRAMMAR_RESPONSE: GroqChatResponse = {
  id: 'chatcmpl-mock-grammar-001',
  object: 'chat.completion',
  created: 1719456100,
  model: 'llama-3.1-8b-instant',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: JSON.stringify(grammarContent),
      },
      finish_reason: 'stop',
      logprobs: null,
    },
  ],
  usage: {
    prompt_tokens: 85,
    completion_tokens: 210,
    total_tokens: 295,
    prompt_time: 0.018,
    completion_time: 0.089,
    total_time: 0.107,
  },
  system_fingerprint: 'fp_mock_groq_002',
  x_groq: { id: 'req_mock_groq_002' },
};

// Interview feedback response
const interviewContent: InterviewFeedbackContent = {
  overallScore: 72,
  fluency: 68,
  vocabulary: 75,
  grammar: 70,
  confidence: 78,
  relevance: 80,
  strengths: [
    'Good use of industry-specific terminology',
    'Clear communication of past experience',
    'Confident tone throughout the answer',
  ],
  areasForImprovement: [
    'Use more complex sentence structures to demonstrate advanced grammar',
    'Avoid filler words like "um" and "basically"',
    'Provide more quantifiable achievements in your examples',
  ],
  detailedFeedback:
    'Your answer demonstrated a solid understanding of the role requirements. You communicated your experience clearly, though some grammatical errors were present. Focus on using the STAR method (Situation, Task, Action, Result) to structure your responses more effectively. Your vocabulary choices were appropriate for a professional setting.',
  suggestedAnswer:
    'In my previous role as a software developer, I successfully led a team of five engineers to deliver a critical product update three weeks ahead of schedule. By implementing agile methodologies and conducting daily stand-ups, we improved our team\'s productivity by 30%. This experience taught me the importance of clear communication and proactive problem-solving in a collaborative environment.',
  teluguSummary:
    'à°®à±€ à°¸à°®à°¾à°§à°¾à°¨à°‚ à°¬à°¾à°—à±à°‚à°¦à°¿, à°•à°¾à°¨à±€ grammar à°®à°°à°¿à°¯à± sentence structure à°®à±†à°°à±à°—à±à°ªà°°à°šà°¾à°²à°¿. à°®à±€à°°à± à°®à±€ achievements à°¨à°¿ à°¨à°¿à°°à±à°¦à°¿à°·à±à°Ÿ à°¸à°‚à°–à±à°¯à°²à°¤à±‹ à°šà±†à°ªà±à°ªà°¡à°‚ à°µà°²à±à°² à°®à±€ à°¸à°®à°¾à°§à°¾à°¨à°‚ à°®à°°à°¿à°‚à°¤ à°ªà±à°°à°­à°¾à°µà°µà°‚à°¤à°‚à°—à°¾ à°‰à°‚à°Ÿà±à°‚à°¦à°¿.',
};

export const MOCK_GROQ_INTERVIEW_RESPONSE: GroqChatResponse = {
  id: 'chatcmpl-mock-interview-001',
  object: 'chat.completion',
  created: 1719456200,
  model: 'gemma2-9b-it',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: JSON.stringify(interviewContent),
      },
      finish_reason: 'stop',
      logprobs: null,
    },
  ],
  usage: {
    prompt_tokens: 120,
    completion_tokens: 340,
    total_tokens: 460,
    prompt_time: 0.024,
    completion_time: 0.145,
    total_time: 0.169,
  },
  system_fingerprint: 'fp_mock_groq_003',
  x_groq: { id: 'req_mock_groq_003' },
};

// Error responses
export const MOCK_GROQ_RATE_LIMIT_ERROR: GroqErrorResponse = {
  error: {
    message:
      'Rate limit reached for model `llama-3.3-70b-versatile` in organization `org-mock` on tokens per minute (TPM). Limit 30000, Used 29876, Requested ~500. Please try again in 1s.',
    type: 'tokens',
    code: 429,
  },
};

export const MOCK_GROQ_TIMEOUT_ERROR: Error = Object.assign(
  new Error('Request timeout: The Groq API did not respond within the expected time limit of 30000ms.'),
  {
    name: 'TimeoutError',
    code: 'ETIMEDOUT',
  }
);

export const MOCK_GROQ_NETWORK_ERROR: Error = Object.assign(
  new Error('Network request failed: Unable to reach https://api.groq.com. Please check your internet connection.'),
  {
    name: 'NetworkError',
    code: 'ENETUNREACH',
  }
);

// Factory functions
export function createMockGroqResponse(content: string, model: string = 'llama-3.3-70b-versatile'): GroqChatResponse {
  return {
    id: `chatcmpl-mock-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: Math.floor(content.length / 4),
      completion_tokens: Math.floor(content.length / 3),
      total_tokens: Math.floor(content.length / 4) + Math.floor(content.length / 3),
      prompt_time: 0.015,
      completion_time: 0.055,
      total_time: 0.07,
    },
    system_fingerprint: `fp_mock_${Date.now()}`,
    x_groq: { id: `req_mock_${Date.now()}` },
  };
}

export type GroqErrorType = 'rate_limit' | 'timeout' | 'network' | 'invalid';

export function createMockGroqError(type: GroqErrorType): Error | GroqErrorResponse {
  switch (type) {
    case 'rate_limit':
      return MOCK_GROQ_RATE_LIMIT_ERROR as unknown as Error;
    case 'timeout':
      return MOCK_GROQ_TIMEOUT_ERROR;
    case 'network':
      return MOCK_GROQ_NETWORK_ERROR;
    case 'invalid':
      return Object.assign(
        new Error('Invalid request: The provided model ID is not valid or not available in your region.'),
        {
          name: 'InvalidRequestError',
          code: 400,
        }
      );
    default: {
      const exhaustiveCheck: never = type;
      throw new Error(`Unknown error type: ${exhaustiveCheck}`);
    }
  }
}

// jest fetch mock helpers
export function mockGroqAPI(
  response: GroqChatResponse = MOCK_GROQ_CHAT_RESPONSE,
  options: { status?: number; delay?: number } = {}
): void {
  const { status = 200, delay = 0 } = options;

  const mockFetch = jest.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        const respond = () =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: status === 200 ? 'OK' : 'Error',
            headers: new Headers({
              'content-type': 'application/json',
              'x-ratelimit-limit-requests': '100',
              'x-ratelimit-remaining-requests': '99',
              'x-ratelimit-reset-requests': '1s',
            }),
            json: async () => response,
            text: async () => JSON.stringify(response),
          });

        if (delay > 0) {
          setTimeout(respond, delay);
        } else {
          respond();
        }
      })
  );

  global.fetch = mockFetch;
}

export function mockGroqAPIFailure(type: GroqErrorType): void {
  if (type === 'network') {
    global.fetch = jest.fn().mockRejectedValue(MOCK_GROQ_NETWORK_ERROR);
    return;
  }

  if (type === 'timeout') {
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(MOCK_GROQ_TIMEOUT_ERROR), 100);
        })
    );
    return;
  }

  if (type === 'rate_limit') {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({
        'content-type': 'application/json',
        'retry-after': '1',
        'x-ratelimit-limit-requests': '100',
        'x-ratelimit-remaining-requests': '0',
        'x-ratelimit-reset-requests': '1s',
      }),
      json: async () => MOCK_GROQ_RATE_LIMIT_ERROR,
      text: async () => JSON.stringify(MOCK_GROQ_RATE_LIMIT_ERROR),
    });
    return;
  }

  if (type === 'invalid') {
    const invalidError: GroqErrorResponse = {
      error: {
        message: 'Invalid request: The provided model ID is not valid or not available in your region.',
        type: 'invalid_request_error',
        code: 400,
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => invalidError,
      text: async () => JSON.stringify(invalidError),
    });
  }
}

// Model constants matching the app's real usage
export const GROQ_MODELS = {
  LLAMA_70B: 'llama-3.3-70b-versatile',
  LLAMA_8B: 'llama-3.1-8b-instant',
  GEMMA2_9B: 'gemma2-9b-it',
  MISTRAL_SABA: 'mistral-saba-24b',
} as const;

export type GroqModel = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];

// Groq API endpoint
export const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
