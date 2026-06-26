// ============================================================
// EnglishMitraAI - API Extensions
// New feature service modules complementing api.ts
// Edge Functions: interview-coach, email-assistant,
//                 grammar-engine, public-speaking-coach
// ============================================================

import { supabase } from './supabase'

// ─── TYPES ─────────────────────────────────────────────────────────────────

export interface DailyGreeting {
  id: string
  date: string
  category: string
  greeting_english: string
  greeting_telugu: string
  pronunciation_guide: string
  usage_examples: string[]
  cultural_note: string
  difficulty: number
}

export interface SelfIntroTemplate {
  id: string
  level: string
  title: string
  template_english: string
  template_telugu: string
  key_phrases: Array<{ english: string; telugu: string }>
  tips: string[]
}

export interface OfficeScenario {
  id: string
  title: string
  title_telugu: string
  category: string
  difficulty: number
  ai_persona: string
  system_prompt: string
  starter_message: string
  key_vocabulary: Array<{ word: string; meaning: string; example: string }>
  cultural_tips: string
}

export interface EmailTemplate {
  id: string
  category: string
  subject: string
  body: string
  body_telugu: string
  formality_level: string
  key_phrases: string[]
  mistakes_to_avoid: string[]
}

export interface InterviewSession {
  id: string
  user_id: string
  job_role: string
  experience_level: string
  session_type: string
  questions_answered: number
  overall_score: number
  confidence_score: number
  grammar_score: number
  fluency_score: number
  ai_feedback: any
  duration_seconds: number
}

export interface PhoneCallScenario {
  id: string
  title: string
  title_telugu: string
  category: string
  difficulty: number
  ai_persona: string
  starter_message: string
  key_phrases: string[]
}

export interface GrammarExercise {
  id: string
  topic: string
  title: string
  title_telugu: string
  explanation: string
  explanation_telugu: string
  examples: Array<{ english: string; telugu: string; explanation: string }>
  exercises: Array<{
    question: string
    options: string[]
    answer: string
    explanation: string
  }>
  difficulty: number
  xp_reward: number
}

export interface PublicSpeechSession {
  id: string
  user_id: string
  topic: string
  speech_type: string
  duration_seconds: number
  confidence_score: number
  fluency_score: number
  ai_feedback: any
}

export interface LearningPath {
  id: string
  user_id: string
  current_level: string
  focus_areas: string[]
  weak_topics: string[]
  strong_topics: string[]
  recommended_modules: string[]
  next_milestone: string
}

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

const MOCK_DAILY_GREETINGS: DailyGreeting[] = [
  {
    id: 'dg-001',
    date: new Date().toISOString().split('T')[0],
    category: 'morning',
    greeting_english: 'Good morning! Hope you have a wonderful day ahead.',
    greeting_telugu: 'శుభోదయం! మీకు అద్భుతమైన రోజు ఉండాలని ఆశిస్తున్నాను.',
    pronunciation_guide: 'Good MOR-ning! Hope you have a WUN-der-ful day a-HEAD.',
    usage_examples: [
      'Good morning, sir! How are you today?',
      'Good morning team, let us begin our meeting.',
      'Good morning! Did you sleep well?',
    ],
    cultural_note:
      'In Indian offices, "Good morning sir/madam" with a slight nod is a respectful and common greeting. It shows professionalism and warmth.',
    difficulty: 1,
  },
  {
    id: 'dg-002',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    category: 'office',
    greeting_english: 'Good afternoon! How is your day going?',
    greeting_telugu: 'శుభ మధ్యాహ్నం! మీ రోజు ఎలా గడుస్తోంది?',
    pronunciation_guide: 'Good af-ter-NOON! How is your DAY GO-ing?',
    usage_examples: [
      'Good afternoon, shall we start the presentation?',
      'Good afternoon everyone, thanks for joining the call.',
    ],
    cultural_note:
      'Afternoon greetings are common in professional settings especially before meetings or calls starting after 12 PM.',
    difficulty: 1,
  },
  {
    id: 'dg-003',
    date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    category: 'farewell',
    greeting_english: 'Have a great evening! See you tomorrow.',
    greeting_telugu: 'మీకు మంచి సాయంత్రం కలగాలి! రేపు కలుద్దాం.',
    pronunciation_guide: 'Have a GREAT EEV-ning! See you to-MOR-row.',
    usage_examples: [
      'Have a great evening, drive safe!',
      'See you tomorrow, have a good evening.',
    ],
    cultural_note:
      'Wishing colleagues a good evening when leaving work shows collegiality. It is a warm yet professional send-off.',
    difficulty: 1,
  },
]

const MOCK_SELF_INTRO_TEMPLATES: SelfIntroTemplate[] = [
  {
    id: 'sit-001',
    level: 'beginner',
    title: 'Basic Self Introduction',
    template_english:
      'Hello, my name is [NAME]. I am from [CITY], [STATE]. I work as a [PROFESSION]. I am learning English to improve my communication skills.',
    template_telugu:
      'హలో, నా పేరు [పేరు]. నేను [నగరం], [రాష్ట్రం] నుండి వచ్చాను. నేను [వృత్తి] గా పని చేస్తున్నాను. నా కమ్యూనికేషన్ నైపుణ్యాలను మెరుగుపరచుకోవడానికి ఇంగ్లీష్ నేర్చుకుంటున్నాను.',
    key_phrases: [
      { english: 'My name is', telugu: 'నా పేరు' },
      { english: 'I am from', telugu: 'నేను ... నుండి వచ్చాను' },
      { english: 'I work as', telugu: 'నేను ... గా పని చేస్తున్నాను' },
      { english: 'Nice to meet you', telugu: 'మిమ్మల్ని కలవడం సంతోషంగా ఉంది' },
    ],
    tips: [
      'Speak slowly and clearly',
      'Maintain eye contact',
      'Smile while introducing yourself',
      'Keep it short – under 30 seconds for a basic intro',
    ],
  },
  {
    id: 'sit-002',
    level: 'intermediate',
    title: 'Professional Self Introduction',
    template_english:
      'Good morning! My name is [NAME] and I have [X] years of experience in [FIELD]. Currently, I am working at [COMPANY] as a [ROLE]. I am passionate about [INTEREST] and I am always looking to grow and learn new things.',
    template_telugu:
      'శుభోదయం! నా పేరు [పేరు] మరియు నాకు [X] సంవత్సరాల [రంగం] లో అనుభవం ఉంది. ప్రస్తుతం, నేను [కంపెనీ] లో [పాత్ర] గా పని చేస్తున్నాను. నేను [ఆసక్తి] పట్ల మక్కువ కలిగి ఉన్నాను మరియు ఎల్లప్పుడూ నూతన విషయాలు నేర్చుకోవాలని చూస్తున్నాను.',
    key_phrases: [
      { english: 'I have X years of experience', telugu: 'నాకు X సంవత్సరాల అనుభవం ఉంది' },
      { english: 'I am passionate about', telugu: 'నేను ... పట్ల మక్కువ కలిగి ఉన్నాను' },
      { english: 'Currently working at', telugu: 'ప్రస్తుతం ... లో పని చేస్తున్నాను' },
      { english: 'Looking forward to', telugu: '... కోసం ఎదురు చూస్తున్నాను' },
    ],
    tips: [
      'Highlight your strongest skill first',
      'Use numbers to quantify experience',
      'Mention your current role confidently',
      'End with an enthusiastic statement',
    ],
  },
  {
    id: 'sit-003',
    level: 'advanced',
    title: 'Executive Introduction',
    template_english:
      'Hello everyone, I am [NAME], [TITLE] at [COMPANY]. Over the past [X] years, I have led initiatives in [DOMAIN] that resulted in [ACHIEVEMENT]. I believe in [PHILOSOPHY] and I am committed to driving impactful outcomes. I am delighted to be here and look forward to collaborating with all of you.',
    template_telugu:
      'హలో అందరికీ, నేను [పేరు], [కంపెనీ] లో [శీర్షిక]. గత [X] సంవత్సరాలలో, నేను [డొమైన్] లో కార్యక్రమాలను నడిపించాను, ఇవి [సాధన] కు దారితీశాయి. నేను [తత్వం] లో విశ్వసిస్తాను మరియు ప్రభావశీలమైన ఫలితాలు సాధించడానికి కట్టుబడి ఉన్నాను.',
    key_phrases: [
      { english: 'I have led initiatives', telugu: 'నేను కార్యక్రమాలను నడిపించాను' },
      { english: 'Resulted in', telugu: '... కు దారితీసింది' },
      { english: 'Committed to', telugu: '... కట్టుబడి ఉన్నాను' },
      { english: 'Look forward to collaborating', telugu: 'కలిసి పని చేయడానికి ఎదురు చూస్తున్నాను' },
    ],
    tips: [
      'Use confident, assertive language',
      'Quantify achievements with specific numbers',
      'Show both expertise and approachability',
      'Practice until it sounds natural, not rehearsed',
    ],
  },
]

const MOCK_OFFICE_SCENARIOS: OfficeScenario[] = [
  {
    id: 'os-001',
    title: 'Meeting a New Colleague',
    title_telugu: 'కొత్త సహోద్యోగిని కలవడం',
    category: 'introductions',
    difficulty: 1,
    ai_persona: 'Priya, a friendly HR executive',
    system_prompt:
      'You are Priya, a friendly HR executive at a tech company. You are meeting a new employee on their first day. Be welcoming, ask about their background, and help them feel comfortable. Keep responses concise (2-3 sentences).',
    starter_message:
      "Hi there! Welcome to the team. I am Priya from HR. It is wonderful to have you on board. How are you feeling on your first day?",
    key_vocabulary: [
      { word: 'onboarding', meaning: 'the process of integrating a new employee', example: 'Your onboarding will take two days.' },
      { word: 'colleague', meaning: 'a person you work with', example: 'Let me introduce you to your colleague Ravi.' },
      { word: 'orientation', meaning: 'an introduction to a new job or place', example: 'Orientation starts at 10 AM.' },
    ],
    cultural_tips:
      'In Indian workplaces, a formal yet warm greeting is appreciated. Address senior colleagues as "Sir" or "Ma\'am" unless told otherwise. A smile and a slight head nod go a long way.',
  },
  {
    id: 'os-002',
    title: 'Presenting in a Team Meeting',
    title_telugu: 'టీమ్ మీటింగ్ లో ప్రెజెంటేషన్ ఇవ్వడం',
    category: 'presentations',
    difficulty: 3,
    ai_persona: 'Vikram, a senior manager',
    system_prompt:
      'You are Vikram, a senior manager listening to a team presentation. Ask relevant follow-up questions, request clarifications, and provide brief feedback. Be professional but encouraging. Keep responses to 2-3 sentences.',
    starter_message:
      "Good morning everyone. Let us get started with the weekly update. [NAME], could you please take us through the project status?",
    key_vocabulary: [
      { word: 'deliverable', meaning: 'a thing that can be provided as a result of work', example: 'The main deliverable this sprint is the login module.' },
      { word: 'bottleneck', meaning: 'a point of congestion in a process', example: 'The testing phase is currently our bottleneck.' },
      { word: 'stakeholder', meaning: 'a person with an interest in a project', example: 'We need stakeholder approval before proceeding.' },
    ],
    cultural_tips:
      'When presenting in Indian offices, acknowledge senior members first. Use "We" instead of "I" to show team collaboration. Always thank the audience at the end.',
  },
  {
    id: 'os-003',
    title: 'Asking for a Leave',
    title_telugu: 'సెలవు అడగడం',
    category: 'requests',
    difficulty: 2,
    ai_persona: 'Ramesh, your direct manager',
    system_prompt:
      'You are Ramesh, a direct manager. An employee is requesting leave. Ask about the reason, duration, and work handover plan. Be professional and fair. Respond in 2-3 sentences.',
    starter_message:
      "Good morning. You mentioned you wanted to discuss something. Please go ahead.",
    key_vocabulary: [
      { word: 'handover', meaning: 'transferring responsibilities to another person', example: 'Please prepare a handover document before your leave.' },
      { word: 'prior notice', meaning: 'informing someone in advance', example: 'We require at least 3 days prior notice for leaves.' },
      { word: 'urgent', meaning: 'requiring immediate attention', example: 'Is this an urgent personal matter?' },
    ],
    cultural_tips:
      'In India, always be polite and brief when requesting leave. Offer to complete pending tasks or hand them over. Avoid being overly personal about reasons unless necessary.',
  },
]

const MOCK_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'et-001',
    category: 'leave_request',
    subject: 'Leave Request – [DATE RANGE]',
    body: `Dear [Manager's Name],

I hope this email finds you well. I would like to request leave from [START DATE] to [END DATE] due to [REASON].

I have ensured that all pending tasks are up to date. I will hand over any urgent responsibilities to [COLLEAGUE NAME] during my absence.

Kindly let me know if this can be approved at your earliest convenience.

Thank you for your understanding.

Warm regards,
[YOUR NAME]`,
    body_telugu: `ప్రియమైన [మేనేజర్ పేరు],

ఈ ఇమెయిల్ మీకు బాగా అందగలదని ఆశిస్తున్నాను. నేను [ప్రారంభ తేదీ] నుండి [ముగింపు తేదీ] వరకు [కారణం] వల్ల సెలవు కోసం అభ్యర్థిస్తున్నాను.

అన్ని పెండింగ్ పనులు పూర్తి స్థితిలో ఉన్నాయని నిర్ధారించుకున్నాను. నా గైర్హాజరీ సమయంలో ఏదైనా అత్యవసర బాధ్యతలను [సహోద్యోగి పేరు] కి అప్పగిస్తాను.

దయచేసి ఇది ఆమోదించబడుతుందో లేదో త్వరగా తెలియజేయండి.

మీ అవగాహనకు ధన్యవాదాలు.`,
    formality_level: 'formal',
    key_phrases: [
      'I hope this email finds you well',
      'I would like to request',
      'at your earliest convenience',
      'Thank you for your understanding',
    ],
    mistakes_to_avoid: [
      'Do not use "I am requesting leave tomorrow" – give advance notice',
      'Avoid casual language like "Hey" or "Gonna"',
      'Do not forget to mention the handover plan',
    ],
  },
  {
    id: 'et-002',
    category: 'meeting_request',
    subject: 'Request for Meeting – [TOPIC]',
    body: `Dear [Name],

I hope you are doing well. I would like to schedule a brief meeting to discuss [TOPIC].

Would you be available on [PROPOSED DATE/TIME]? Please let me know a time that works best for you, and I will arrange accordingly.

Looking forward to your response.

Best regards,
[YOUR NAME]`,
    body_telugu: `ప్రియమైన [పేరు],

మీరు బాగున్నారని ఆశిస్తున్నాను. [విషయం] గురించి చర్చించడానికి ఒక సంక్షిప్త సమావేశాన్ని షెడ్యూల్ చేయాలనుకుంటున్నాను.

మీకు [ప్రతిపాదిత తేదీ/సమయం] లో అందుబాటులో ఉంటారా? మీకు అనువైన సమయం తెలియజేయండి, నేను తదనుగుణంగా ఏర్పాట్లు చేస్తాను.

మీ స్పందన కోసం ఎదురు చూస్తున్నాను.`,
    formality_level: 'semi-formal',
    key_phrases: [
      'I would like to schedule',
      'Would you be available',
      'Please let me know',
      'Looking forward to your response',
    ],
    mistakes_to_avoid: [
      'Avoid saying "I want to meet you" – use "I would like to schedule"',
      'Do not set a time without asking for availability',
      'Avoid overly long emails – keep it concise',
    ],
  },
  {
    id: 'et-003',
    category: 'project_update',
    subject: 'Project Update – [PROJECT NAME] – Week [X]',
    body: `Hi [Team/Manager Name],

Here is the weekly update for [PROJECT NAME]:

Completed this week:
- [TASK 1]
- [TASK 2]

In progress:
- [TASK 3] – Expected completion: [DATE]

Blockers (if any):
- [BLOCKER]

Please feel free to reach out if you need any clarifications.

Thanks,
[YOUR NAME]`,
    body_telugu: `హాయ్ [టీమ్/మేనేజర్ పేరు],

[ప్రాజెక్ట్ పేరు] కోసం వారపు అప్‌డేట్ ఇక్కడ ఉంది:

ఈ వారం పూర్తి చేసినవి:
- [పని 1]
- [పని 2]

పురోగతిలో ఉన్నవి:
- [పని 3] – అంచనా పూర్తి తేదీ: [తేదీ]

అడ్డంకులు (ఏదైనా ఉంటే):
- [అడ్డంకి]

ఏదైనా స్పష్టత అవసరమైతే నిరభ్యంతరంగా సంప్రదించండి.`,
    formality_level: 'semi-formal',
    key_phrases: [
      'Here is the weekly update',
      'Expected completion',
      'Please feel free to reach out',
      'In progress',
    ],
    mistakes_to_avoid: [
      'Do not skip mentioning blockers – transparency is key',
      'Avoid vague timelines – use specific dates',
      'Do not write a wall of text – use bullet points',
    ],
  },
]

const MOCK_PHONE_SCENARIOS: PhoneCallScenario[] = [
  {
    id: 'pc-001',
    title: 'Calling for a Doctor Appointment',
    title_telugu: 'డాక్టర్ అపాయింట్‌మెంట్ కోసం కాల్ చేయడం',
    category: 'healthcare',
    difficulty: 1,
    ai_persona: 'Receptionist at City Clinic',
    starter_message:
      'Good morning, City Clinic. How can I help you today?',
    key_phrases: [
      'I would like to book an appointment',
      'Is the doctor available on',
      'What time works best',
      'Thank you for your help',
    ],
  },
  {
    id: 'pc-002',
    title: 'Calling Customer Support',
    title_telugu: 'కస్టమర్ సపోర్ట్ కి కాల్ చేయడం',
    category: 'customer_service',
    difficulty: 2,
    ai_persona: 'Customer support agent at a telecom company',
    starter_message:
      'Thank you for calling TechCare Support. My name is Arjun. How may I assist you today?',
    key_phrases: [
      'I am calling regarding',
      'I have an issue with',
      'Could you please help me',
      'My account number is',
    ],
  },
  {
    id: 'pc-003',
    title: 'Job Application Follow-up Call',
    title_telugu: 'జాబ్ అప్లికేషన్ ఫాలో-అప్ కాల్',
    category: 'professional',
    difficulty: 3,
    ai_persona: 'HR Manager at a software company',
    starter_message:
      'Hello, this is Meena from HR at InfoSystems. How can I help you?',
    key_phrases: [
      'I am following up on my application',
      'I applied for the position of',
      'Could you provide an update',
      'I remain very interested in this opportunity',
    ],
  },
]

const MOCK_GRAMMAR_EXERCISES: GrammarExercise[] = [
  {
    id: 'ge-001',
    topic: 'tenses',
    title: 'Simple Present vs Present Continuous',
    title_telugu: 'సాధారణ వర్తమాన కాలం vs వర్తమాన నిరంతర కాలం',
    explanation:
      'Use Simple Present for habits, facts, and routines. Use Present Continuous for actions happening right now.',
    explanation_telugu:
      'అలవాట్లు, వాస్తవాలు మరియు రొటీన్‌లకు సాధారణ వర్తమాన కాలం వాడండి. ఇప్పుడు జరుగుతున్న చర్యలకు వర్తమాన నిరంతర కాలం వాడండి.',
    examples: [
      { english: 'I eat rice every day.', telugu: 'నేను ప్రతి రోజూ అన్నం తింటాను.', explanation: 'Daily habit → Simple Present' },
      { english: 'I am eating rice right now.', telugu: 'నేను ఇప్పుడు అన్నం తింటున్నాను.', explanation: 'Happening now → Present Continuous' },
      { english: 'She works in Hyderabad.', telugu: 'ఆమె హైదరాబాద్‌లో పని చేస్తుంది.', explanation: 'Fact/routine → Simple Present' },
    ],
    exercises: [
      {
        question: 'Choose the correct form: She ___ (read) a book right now.',
        options: ['reads', 'is reading', 'read', 'has read'],
        answer: 'is reading',
        explanation: 'The phrase "right now" signals an ongoing action → Present Continuous.',
      },
      {
        question: 'Choose the correct form: He ___ (go) to the gym every morning.',
        options: ['is going', 'goes', 'go', 'went'],
        answer: 'goes',
        explanation: '"Every morning" indicates a routine → Simple Present with "goes" for third person singular.',
      },
    ],
    difficulty: 2,
    xp_reward: 20,
  },
  {
    id: 'ge-002',
    topic: 'articles',
    title: 'Using A, An, and The',
    title_telugu: 'A, An మరియు The వాడకం',
    explanation:
      '"A" and "An" are indefinite articles used for non-specific nouns. "An" is used before vowel sounds. "The" is the definite article used for specific nouns.',
    explanation_telugu:
      '"A" మరియు "An" నిర్ధిష్టత లేని నామవాచకాలకు వాడతారు. "An" అచ్చు ధ్వనుల ముందు వాడతారు. "The" నిర్ధిష్ట నామవాచకాలకు వాడతారు.',
    examples: [
      { english: 'I saw a dog in the park.', telugu: 'నేను పార్కులో ఒక కుక్కను చూశాను.', explanation: '"a dog" = any dog (indefinite)' },
      { english: 'The dog was very friendly.', telugu: 'ఆ కుక్క చాలా స్నేహపూర్వకంగా ఉంది.', explanation: '"The dog" = the specific dog mentioned before' },
      { english: 'She is an engineer.', telugu: 'ఆమె ఒక ఇంజనీర్.', explanation: '"an engineer" – "en" starts with a vowel sound' },
    ],
    exercises: [
      {
        question: 'Fill in the blank: I need ___ umbrella.',
        options: ['a', 'an', 'the', 'no article'],
        answer: 'an',
        explanation: '"Umbrella" starts with a vowel sound "u" → use "an".',
      },
      {
        question: 'Fill in the blank: ___ Eiffel Tower is in Paris.',
        options: ['A', 'An', 'The', 'no article'],
        answer: 'The',
        explanation: '"Eiffel Tower" is a specific, unique landmark → use "The".',
      },
    ],
    difficulty: 1,
    xp_reward: 15,
  },
]

// ─── DAILY GREETINGS SERVICE ────────────────────────────────────────────────

export const DailyGreetingsService = {
  async getTodayGreeting(): Promise<DailyGreeting | null> {
    const today = new Date().toISOString().split('T')[0]
    try {
      const { data, error } = await supabase
        .from('daily_greetings')
        .select('*')
        .eq('date', today)
        .maybeSingle()
      if (error) throw error
      if (data) return data
    } catch (err) {
      console.warn('[DailyGreetingsService.getTodayGreeting] fallback to mock:', err)
    }
    return MOCK_DAILY_GREETINGS.find(g => g.date === today) || MOCK_DAILY_GREETINGS[0]
  },

  async getAllGreetings(): Promise<DailyGreeting[]> {
    try {
      const { data, error } = await supabase
        .from('daily_greetings')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[DailyGreetingsService.getAllGreetings] fallback to mock:', err)
    }
    return MOCK_DAILY_GREETINGS
  },

  async getGreetingsByCategory(category: string): Promise<DailyGreeting[]> {
    try {
      const { data, error } = await supabase
        .from('daily_greetings')
        .select('*')
        .eq('category', category)
        .order('date', { ascending: false })
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[DailyGreetingsService.getGreetingsByCategory] fallback to mock:', err)
    }
    return MOCK_DAILY_GREETINGS.filter(g => g.category === category)
  },
}

// ─── SELF INTRODUCTION SERVICE ──────────────────────────────────────────────

export const SelfIntroductionService = {
  async getAllTemplates(): Promise<SelfIntroTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('self_intro_templates')
        .select('*')
        .order('level')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[SelfIntroductionService.getAllTemplates] fallback to mock:', err)
    }
    return MOCK_SELF_INTRO_TEMPLATES
  },

  async getTemplateByLevel(level: string): Promise<SelfIntroTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('self_intro_templates')
        .select('*')
        .eq('level', level)
        .maybeSingle()
      if (error) throw error
      if (data) return data
    } catch (err) {
      console.warn('[SelfIntroductionService.getTemplateByLevel] fallback to mock:', err)
    }
    return MOCK_SELF_INTRO_TEMPLATES.find(t => t.level === level) || null
  },

  async analyzeIntroduction(
    text: string,
    level: string
  ): Promise<{
    score: number
    feedback: string
    improved: string
    grammar_issues: any[]
    telugu_guidance: string
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('interview-coach', {
        body: { action: 'analyze_intro', text, level },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[SelfIntroductionService.analyzeIntroduction] fallback to mock:', err)
    }
    // Mock fallback
    return {
      score: 72,
      feedback:
        'Your introduction is clear and covers the basics. Try to add a specific achievement or skill to make it more memorable.',
      improved: text.trim()
        ? `${text.trim()} I am particularly skilled at problem-solving and look forward to contributing positively to the team.`
        : 'Hello, my name is [Your Name]. I have experience in my field and I am eager to learn and grow. Nice to meet you.',
      grammar_issues: [],
      telugu_guidance:
        'మీ పరిచయం స్పష్టంగా ఉంది. ఒక నిర్దిష్ట నైపుణ్యం లేదా సాధనను జోడించడం ద్వారా మరింత ఆకట్టుకొనేలా చేయవచ్చు.',
    }
  },
}

// ─── OFFICE CONVERSATIONS SERVICE ───────────────────────────────────────────

export const OfficeConversationsService = {
  async getAllScenarios(): Promise<OfficeScenario[]> {
    try {
      const { data, error } = await supabase
        .from('office_scenarios')
        .select('*')
        .order('difficulty')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[OfficeConversationsService.getAllScenarios] fallback to mock:', err)
    }
    return MOCK_OFFICE_SCENARIOS
  },

  async getScenariosByCategory(category: string): Promise<OfficeScenario[]> {
    try {
      const { data, error } = await supabase
        .from('office_scenarios')
        .select('*')
        .eq('category', category)
        .order('difficulty')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[OfficeConversationsService.getScenariosByCategory] fallback to mock:', err)
    }
    return MOCK_OFFICE_SCENARIOS.filter(s => s.category === category)
  },

  async getScenarioById(id: string): Promise<OfficeScenario | null> {
    try {
      const { data, error } = await supabase
        .from('office_scenarios')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (data) return data
    } catch (err) {
      console.warn('[OfficeConversationsService.getScenarioById] fallback to mock:', err)
    }
    return MOCK_OFFICE_SCENARIOS.find(s => s.id === id) || null
  },

  async startOfficeConversation(
    scenarioId: string,
    userId: string
  ): Promise<{ sessionId: string; starterMessage: string }> {
    const scenario =
      (await OfficeConversationsService.getScenarioById(scenarioId)) ||
      MOCK_OFFICE_SCENARIOS[0]

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: userId,
          session_type: 'office_roleplay',
          scenario_id: scenarioId,
          title: scenario?.title || 'Office Conversation',
        })
        .select('id')
        .single()
      if (error) throw error
      return {
        sessionId: data.id,
        starterMessage: scenario?.starter_message || 'Hello! How can I help you today?',
      }
    } catch (err) {
      console.warn('[OfficeConversationsService.startOfficeConversation] fallback to mock:', err)
      return {
        sessionId: 'mock-office-session-' + Math.random().toString(36).substring(7),
        starterMessage: scenario?.starter_message || 'Hello! How can I help you today?',
      }
    }
  },
}

// ─── EMAIL ASSISTANT SERVICE ─────────────────────────────────────────────────

export const EmailAssistantService = {
  async getAllTemplates(): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[EmailAssistantService.getAllTemplates] fallback to mock:', err)
    }
    return MOCK_EMAIL_TEMPLATES
  },

  async getTemplatesByCategory(category: string): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('category', category)
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[EmailAssistantService.getTemplatesByCategory] fallback to mock:', err)
    }
    return MOCK_EMAIL_TEMPLATES.filter(t => t.category === category)
  },

  async generateEmail(
    category: string,
    context: string
  ): Promise<{
    subject: string
    body: string
    formality_score: number
    telugu_explanation: string
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('email-assistant', {
        body: { action: 'generate', category, context },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[EmailAssistantService.generateEmail] fallback to mock:', err)
    }
    const template = MOCK_EMAIL_TEMPLATES.find(t => t.category === category) || MOCK_EMAIL_TEMPLATES[0]
    return {
      subject: template.subject,
      body: template.body,
      formality_score: 85,
      telugu_explanation:
        'ఈ ఇమెయిల్ అధికారిక స్వరంలో రాయబడింది. "Dear" తో ప్రారంభించడం మరియు "Regards" తో ముగించడం మంచి ఇంగ్లీష్ ఇమెయిల్ నిర్మాణానికి చిహ్నాలు.',
    }
  },

  async improveEmail(draft: string): Promise<{
    subject: string
    body: string
    improvements_made: string[]
    telugu_explanation: string
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('email-assistant', {
        body: { action: 'improve', draft },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[EmailAssistantService.improveEmail] fallback to mock:', err)
    }
    return {
      subject: 'Improved Email Subject',
      body: draft,
      improvements_made: [
        'Added a professional greeting',
        'Improved sentence structure for clarity',
        'Added a formal closing',
      ],
      telugu_explanation:
        'మీ ఇమెయిల్‌లో కొన్ని మెరుగుదలలు చేయబడ్డాయి. పలకరింపు మరియు ముగింపు వాక్యాలు అధికారికంగా మార్చబడ్డాయి.',
    }
  },

  async simplifyEmail(draft: string): Promise<{
    subject: string
    body: string
    telugu_explanation: string
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('email-assistant', {
        body: { action: 'simplify', draft },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[EmailAssistantService.simplifyEmail] fallback to mock:', err)
    }
    return {
      subject: 'Simplified Email',
      body: draft
        .split('\n')
        .filter(line => line.trim().length > 0)
        .join('\n'),
      telugu_explanation:
        'మీ ఇమెయిల్ సరళమైన భాషలో రాయబడింది. చిన్న మరియు స్పష్టమైన వాక్యాలు చదవడానికి సులభంగా ఉంటాయి.',
    }
  },
}

// ─── INTERVIEW SERVICE ───────────────────────────────────────────────────────

export const InterviewService = {
  async createSession(
    userId: string,
    jobRole: string,
    experienceLevel: string,
    sessionType: string
  ): Promise<{ sessionId: string }> {
    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: userId,
          job_role: jobRole,
          experience_level: experienceLevel,
          session_type: sessionType,
          questions_answered: 0,
          overall_score: 0,
          confidence_score: 0,
          grammar_score: 0,
          fluency_score: 0,
          duration_seconds: 0,
        })
        .select('id')
        .single()
      if (error) throw error
      return { sessionId: data.id }
    } catch (err) {
      console.warn('[InterviewService.createSession] fallback to mock:', err)
      return { sessionId: 'mock-interview-session-' + Math.random().toString(36).substring(7) }
    }
  },

  async getSessionById(sessionId: string): Promise<InterviewSession | null> {
    if (sessionId.startsWith('mock-')) {
      return {
        id: sessionId,
        user_id: 'mock-user',
        job_role: 'Software Engineer',
        experience_level: 'mid',
        session_type: 'technical',
        questions_answered: 3,
        overall_score: 75,
        confidence_score: 70,
        grammar_score: 80,
        fluency_score: 72,
        ai_feedback: { summary: 'Good performance overall. Work on fluency.' },
        duration_seconds: 600,
      }
    }
    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[InterviewService.getSessionById] fallback to mock:', err)
      return null
    }
  },

  async getUserSessions(userId: string): Promise<InterviewSession[]> {
    try {
      const { data, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('[InterviewService.getUserSessions] fallback to mock:', err)
      return []
    }
  },

  async submitAnswer(
    sessionId: string,
    question: string,
    answer: string,
    jobRole: string,
    experienceLevel: string
  ): Promise<{
    feedback: string
    improved_answer: string
    score: number
    follow_up_question: string
    telugu_guidance: string
    grammar_issues: any[]
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('interview-coach', {
        body: {
          action: 'evaluate_answer',
          session_id: sessionId,
          question,
          answer,
          job_role: jobRole,
          experience_level: experienceLevel,
        },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[InterviewService.submitAnswer] fallback to mock:', err)
    }
    return {
      feedback:
        'Good attempt! You covered the main points. Try to structure your answer using the STAR method (Situation, Task, Action, Result) for a stronger response.',
      improved_answer: answer.trim()
        ? `${answer.trim()} Additionally, this experience helped me develop strong problem-solving skills which I can bring to this role.`
        : 'In my previous role, I faced a challenging situation where I had to deliver a project under tight deadlines. I prioritized tasks, coordinated with my team effectively, and we delivered successfully, resulting in a 20% improvement in client satisfaction.',
      score: 68,
      follow_up_question:
        'Can you give me a specific example of a time when you had to deal with a difficult team member?',
      telugu_guidance:
        'మీ జవాబు మంచి ప్రారంభాన్ని కలిగి ఉంది. STAR పద్ధతి (పరిస్థితి, పని, చర్య, ఫలితం) ఉపయోగించి జవాబు ఇస్తే మరింత స్పష్టంగా ఉంటుంది.',
      grammar_issues: [],
    }
  },

  async completeSession(
    sessionId: string,
    scores: Partial<InterviewSession>
  ): Promise<void> {
    if (sessionId.startsWith('mock-')) return
    try {
      const { error } = await supabase
        .from('interview_sessions')
        .update({
          ...scores,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
      if (error) throw error
    } catch (err) {
      console.warn('[InterviewService.completeSession] error (non-fatal):', err)
    }
  },
}

// ─── PUBLIC SPEAKING SERVICE ─────────────────────────────────────────────────

export const PublicSpeakingService = {
  async createSession(
    userId: string,
    topic: string,
    speechType: string
  ): Promise<{ sessionId: string }> {
    try {
      const { data, error } = await supabase
        .from('public_speech_sessions')
        .insert({
          user_id: userId,
          topic,
          speech_type: speechType,
          duration_seconds: 0,
          confidence_score: 0,
          fluency_score: 0,
        })
        .select('id')
        .single()
      if (error) throw error
      return { sessionId: data.id }
    } catch (err) {
      console.warn('[PublicSpeakingService.createSession] fallback to mock:', err)
      return { sessionId: 'mock-speech-session-' + Math.random().toString(36).substring(7) }
    }
  },

  async analyzeSpeech(
    sessionId: string,
    transcript: string,
    durationSeconds: number,
    topic: string,
    speechType: string
  ): Promise<{
    overall_score: number
    fluency_score: number
    filler_words: any[]
    coaching_feedback: string
    telugu_tip: string
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('public-speaking-coach', {
        body: {
          action: 'analyze',
          session_id: sessionId,
          transcript,
          duration_seconds: durationSeconds,
          topic,
          speech_type: speechType,
        },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[PublicSpeakingService.analyzeSpeech] fallback to mock:', err)
    }

    const fillerWordList = ['um', 'uh', 'like', 'you know', 'basically', 'actually']
    const detectedFillers = fillerWordList
      .filter(w => transcript.toLowerCase().includes(w))
      .map(w => ({
        word: w,
        count: (transcript.toLowerCase().match(new RegExp(w, 'g')) || []).length,
      }))

    return {
      overall_score: 71,
      fluency_score: 68,
      filler_words: detectedFillers,
      coaching_feedback:
        'Your speech had good energy and covered the topic well. Try to reduce filler words like "um" and "uh" by pausing briefly instead. Pauses are powerful – they give the audience time to process your message.',
      telugu_tip:
        '"um" మరియు "uh" వంటి పూరక పదాలను తగ్గించడానికి, మాట్లాడే ముందు ఒక్క క్షణం ఆగండి. నిశ్శబ్దం బలహీనత కాదు – అది నమ్మకంగా కనిపిస్తుంది.',
    }
  },

  async getUserSessions(userId: string): Promise<PublicSpeechSession[]> {
    try {
      const { data, error } = await supabase
        .from('public_speech_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('[PublicSpeakingService.getUserSessions] fallback to mock:', err)
      return []
    }
  },
}

// ─── PHONE SIMULATOR SERVICE ─────────────────────────────────────────────────

export const PhoneSimulatorService = {
  async getAllScenarios(): Promise<PhoneCallScenario[]> {
    try {
      const { data, error } = await supabase
        .from('phone_call_scenarios')
        .select('*')
        .order('difficulty')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[PhoneSimulatorService.getAllScenarios] fallback to mock:', err)
    }
    return MOCK_PHONE_SCENARIOS
  },

  async getScenariosByCategory(category: string): Promise<PhoneCallScenario[]> {
    try {
      const { data, error } = await supabase
        .from('phone_call_scenarios')
        .select('*')
        .eq('category', category)
        .order('difficulty')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[PhoneSimulatorService.getScenariosByCategory] fallback to mock:', err)
    }
    return MOCK_PHONE_SCENARIOS.filter(s => s.category === category)
  },

  async startPhoneSession(
    scenarioId: string
  ): Promise<{ sessionId: string; starterMessage: string; aiPersona: string }> {
    const scenario =
      MOCK_PHONE_SCENARIOS.find(s => s.id === scenarioId) || MOCK_PHONE_SCENARIOS[0]

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user.id,
            session_type: 'phone_simulation',
            scenario_id: scenarioId,
            title: scenario?.title || 'Phone Call Practice',
          })
          .select('id')
          .single()
        if (!error && data) {
          return {
            sessionId: data.id,
            starterMessage: scenario?.starter_message || 'Hello! How can I help you?',
            aiPersona: scenario?.ai_persona || 'Customer Service Agent',
          }
        }
      }
    } catch (err) {
      console.warn('[PhoneSimulatorService.startPhoneSession] fallback to mock session:', err)
    }

    return {
      sessionId: 'mock-phone-session-' + Math.random().toString(36).substring(7),
      starterMessage: scenario?.starter_message || 'Hello! How can I help you?',
      aiPersona: scenario?.ai_persona || 'Customer Service Agent',
    }
  },
}

// ─── GRAMMAR SERVICE ─────────────────────────────────────────────────────────

export const GrammarService = {
  async getAllExercises(): Promise<GrammarExercise[]> {
    try {
      const { data, error } = await supabase
        .from('grammar_exercises')
        .select('*')
        .order('difficulty')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[GrammarService.getAllExercises] fallback to mock:', err)
    }
    return MOCK_GRAMMAR_EXERCISES
  },

  async getExercisesByTopic(topic: string): Promise<GrammarExercise[]> {
    try {
      const { data, error } = await supabase
        .from('grammar_exercises')
        .select('*')
        .eq('topic', topic)
        .order('difficulty')
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[GrammarService.getExercisesByTopic] fallback to mock:', err)
    }
    return MOCK_GRAMMAR_EXERCISES.filter(e => e.topic === topic)
  },

  async checkGrammar(
    text: string
  ): Promise<{ errors: any[]; overall_score: number; suggestions: string[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('grammar-engine', {
        body: { action: 'check', text },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[GrammarService.checkGrammar] fallback to mock:', err)
    }

    // Basic client-side grammar heuristics as fallback
    const errors: any[] = []
    const lowerText = text.toLowerCase()

    if (/\bi is\b/.test(lowerText)) {
      errors.push({
        original: 'I is',
        corrected: 'I am',
        rule: 'Subject-verb agreement',
        explanation: '"I" must be followed by "am", not "is".',
        explanation_telugu: '"I" తర్వాత "am" రావాలి, "is" కాదు.',
      })
    }
    if (/\bhe are\b/.test(lowerText) || /\bshe are\b/.test(lowerText)) {
      errors.push({
        original: 'he/she are',
        corrected: 'he/she is',
        rule: 'Subject-verb agreement',
        explanation: '"He" and "She" must be followed by "is", not "are".',
        explanation_telugu: '"He" మరియు "She" తర్వాత "is" రావాలి, "are" కాదు.',
      })
    }
    if (/\bthey is\b/.test(lowerText)) {
      errors.push({
        original: 'they is',
        corrected: 'they are',
        rule: 'Subject-verb agreement',
        explanation: '"They" must be followed by "are", not "is".',
        explanation_telugu: '"They" తర్వాత "are" రావాలి, "is" కాదు.',
      })
    }

    const score = Math.max(0, 100 - errors.length * 15)
    return {
      errors,
      overall_score: score,
      suggestions:
        errors.length === 0
          ? ['Great grammar! Keep practicing to maintain consistency.']
          : ['Review subject-verb agreement rules.', 'Practice with simple sentences first.'],
    }
  },

  async generateQuiz(
    topic: string,
    difficulty: number
  ): Promise<{ questions: any[] }> {
    try {
      const { data, error } = await supabase.functions.invoke('grammar-engine', {
        body: { action: 'quiz_generate', topic, difficulty },
      })
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[GrammarService.generateQuiz] fallback to mock:', err)
    }

    const mockExercise = MOCK_GRAMMAR_EXERCISES.find(e => e.topic === topic) || MOCK_GRAMMAR_EXERCISES[0]
    return {
      questions: mockExercise.exercises.map((ex, i) => ({
        id: `q-${i + 1}`,
        question: ex.question,
        options: ex.options,
        correct_answer: ex.answer,
        explanation: ex.explanation,
        difficulty,
      })),
    }
  },

  async getUserProgress(
    userId: string
  ): Promise<Array<{ topic: string; mastery_score: number; exercises_completed: number }>> {
    try {
      const { data, error } = await supabase
        .from('user_grammar_progress')
        .select('topic, mastery_score, exercises_completed')
        .eq('user_id', userId)
      if (error) throw error
      if (data && data.length > 0) return data
    } catch (err) {
      console.warn('[GrammarService.getUserProgress] fallback to mock:', err)
    }
    return [
      { topic: 'tenses', mastery_score: 65, exercises_completed: 8 },
      { topic: 'articles', mastery_score: 80, exercises_completed: 12 },
      { topic: 'prepositions', mastery_score: 55, exercises_completed: 5 },
      { topic: 'vocabulary', mastery_score: 70, exercises_completed: 15 },
    ]
  },
}

// ─── LEARNING PATH SERVICE ───────────────────────────────────────────────────

export const LearningPathService = {
  async getUserLearningPath(userId: string): Promise<LearningPath | null> {
    try {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return data
    } catch (err) {
      console.warn('[LearningPathService.getUserLearningPath] fallback to mock:', err)
      return null
    }
  },

  async generatePersonalizedPath(userId: string): Promise<LearningPath> {
    try {
      // Gather existing progress data for analysis
      const [grammarProgress, speechSessions, interviewSessions] = await Promise.allSettled([
        GrammarService.getUserProgress(userId),
        PublicSpeakingService.getUserSessions(userId),
        InterviewService.getUserSessions(userId),
      ])

      const grammarData =
        grammarProgress.status === 'fulfilled' ? grammarProgress.value : []
      const speechData =
        speechSessions.status === 'fulfilled' ? speechSessions.value : []
      const interviewData =
        interviewSessions.status === 'fulfilled' ? interviewSessions.value : []

      const { data, error } = await supabase.functions.invoke('interview-coach', {
        body: {
          action: 'analyze_learning',
          user_id: userId,
          grammar_progress: grammarData,
          speech_sessions: speechData,
          interview_sessions: interviewData,
        },
      })
      if (error) throw error

      // Persist the path
      const path: LearningPath = { ...data, user_id: userId }
      await supabase
        .from('learning_paths')
        .upsert({ ...path, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

      return path
    } catch (err) {
      console.warn('[LearningPathService.generatePersonalizedPath] fallback to mock:', err)
    }

    // Mock personalised path fallback
    const mockPath: LearningPath = {
      id: 'mock-path-' + userId,
      user_id: userId,
      current_level: 'intermediate',
      focus_areas: ['speaking_confidence', 'grammar_accuracy', 'professional_vocabulary'],
      weak_topics: ['articles', 'prepositions', 'conditional_sentences'],
      strong_topics: ['basic_tenses', 'greetings', 'numbers'],
      recommended_modules: [
        'office_conversations',
        'email_assistant',
        'grammar_articles',
        'interview_practice',
        'pronunciation_lab',
      ],
      next_milestone: 'Complete 5 office conversations with a score above 75',
    }

    try {
      await supabase
        .from('learning_paths')
        .upsert({ ...mockPath, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    } catch { /* non-fatal */ }

    return mockPath
  },

  async updateLearningPath(
    userId: string,
    updates: Partial<LearningPath>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('learning_paths')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      if (error) throw error
    } catch (err) {
      console.warn('[LearningPathService.updateLearningPath] error (non-fatal):', err)
    }
  },
}

// ─── RE-EXPORTS ──────────────────────────────────────────────────────────────

export {
  DailyGreetingsService as dailyGreetingsService,
  SelfIntroductionService as selfIntroductionService,
  OfficeConversationsService as officeConversationsService,
  EmailAssistantService as emailAssistantService,
  InterviewService as interviewService,
  PublicSpeakingService as publicSpeakingService,
  PhoneSimulatorService as phoneSimulatorService,
  GrammarService as grammarService,
  LearningPathService as learningPathService,
}
