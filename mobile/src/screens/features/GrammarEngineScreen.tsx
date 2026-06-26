import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrammarTopic {
  id: string;
  icon: string;
  name: string;
  nameTelugu: string;
  subtitle: string;
  mastery: number;
  status: 'Beginner' | 'Intermediate' | 'Master';
  explanation: string;
  explanationTelugu: string;
  examples: { english: string; telugu: string; explanation: string }[];
  quizQuestions: QuizQuestion[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanationEnglish: string;
  explanationTelugu: string;
}

interface GrammarError {
  original: string;
  correction: string;
  explanation: string;
  explanationTelugu: string;
  tip: string;
}

interface CheckResult {
  score: number;
  errors: GrammarError[];
  overallFeedback?: string;
  teluguSummary?: string;
  xpEarned?: number;
}

// ─── API response types ────────────────────────────────────────────────────────

interface ApiCorrection {
  original: string;
  corrected: string;
  explanation: string;
  explanation_telugu: string;
  rule?: string;
  tip: string;
}

interface ApiCheckResponse {
  has_errors: boolean;
  score: number;
  corrections: ApiCorrection[];
  overall_feedback: string;
  telugu_summary: string;
  xp_earned: number;
}

interface ApiExplainExample {
  correct: string;
  incorrect: string;
  telugu: string;
}

interface ApiExplainResponse {
  rule_name: string;
  explanation: string;
  explanation_telugu: string;
  examples: ApiExplainExample[];
  common_mistakes: string[];
  telugu_tips: string[];
}

interface ApiQuizResponse {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  explanation_telugu: string;
  topic: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    id: 'tenses',
    icon: '⏰',
    name: 'Tenses',
    nameTelugu: 'కాలాలు',
    subtitle: '12 tenses',
    mastery: 72,
    status: 'Intermediate',
    explanation: 'Tenses show when an action happened - past, present, or future.',
    explanationTelugu: 'Tenses అంటే ఒక పని ఎప్పుడు జరిగింది అని చెప్పే Grammar నియమాలు.',
    examples: [
      { english: 'I am eating rice.', telugu: 'నేను అన్నం తింటున్నాను.', explanation: 'Present Continuous - action happening now' },
      { english: 'I ate rice.', telugu: 'నేను అన్నం తిన్నాను.', explanation: 'Past Simple - completed action' },
      { english: 'I will eat rice.', telugu: 'నేను అన్నం తింటాను.', explanation: 'Future Simple - future action' },
    ],
    quizQuestions: [
      {
        question: 'Which sentence uses Present Continuous correctly?',
        options: ['She is go to school.', 'She is going to school.', 'She going to school.', 'She goes to school now.'],
        correctIndex: 1,
        explanationEnglish: 'Present Continuous = is/am/are + verb-ing.',
        explanationTelugu: 'Present Continuous లో is/am/are తర్వాత verb-ing వస్తుంది.',
      },
      {
        question: 'Choose the correct Past Simple sentence:',
        options: ['I goed to the market.', 'I goes to the market.', 'I went to the market.', 'I going to the market.'],
        correctIndex: 2,
        explanationEnglish: '"Go" is irregular; its Past Simple form is "went".',
        explanationTelugu: '"Go" irregular verb, దాని past form "went" అవుతుంది.',
      },
      {
        question: 'Which is correct Future Simple?',
        options: ['She will goes home.', 'She will going home.', 'She will go home.', 'She wills go home.'],
        correctIndex: 2,
        explanationEnglish: 'Future Simple = will + base verb (no -s or -ing).',
        explanationTelugu: 'Future Simple లో will తర్వాత verb యొక్క base form వాడాలి.',
      },
      {
        question: '"They have finished the work." — which tense?',
        options: ['Past Simple', 'Present Perfect', 'Future Perfect', 'Past Continuous'],
        correctIndex: 1,
        explanationEnglish: 'have/has + past participle = Present Perfect.',
        explanationTelugu: 'have/has + past participle = Present Perfect tense.',
      },
      {
        question: 'Complete: "When I arrived, she ___ cooking."',
        options: ['was', 'is', 'were', 'has been'],
        correctIndex: 0,
        explanationEnglish: 'Past Continuous (was/were + -ing) for an ongoing past action interrupted by another.',
        explanationTelugu: 'గతంలో జరుగుతున్న పనిని చెప్పడానికి Past Continuous వాడతాం.',
      },
    ],
  },
  {
    id: 'verbs',
    icon: '🔤',
    name: 'Verbs',
    nameTelugu: 'క్రియలు',
    subtitle: 'Regular/Irregular',
    mastery: 55,
    status: 'Intermediate',
    explanation: 'Verbs express actions, events, or states of being.',
    explanationTelugu: 'Verbs అంటే పని లేదా స్థితిని తెలిపే పదాలు.',
    examples: [
      { english: 'She runs every morning.', telugu: 'ఆమె ప్రతి రోజు పరుగెడుతుంది.', explanation: 'Regular verb - runs' },
      { english: 'He bought a new phone.', telugu: 'అతను కొత్త ఫోన్ కొన్నాడు.', explanation: 'Irregular verb - buy → bought' },
      { english: 'They are working hard.', telugu: 'వారు కష్టంగా పని చేస్తున్నారు.', explanation: 'Helping verb - are' },
    ],
    quizQuestions: [
      {
        question: 'Past tense of "write" is:',
        options: ['writed', 'wrote', 'written', 'writes'],
        correctIndex: 1,
        explanationEnglish: '"Write" is irregular; past tense = "wrote".',
        explanationTelugu: '"Write" irregular verb, దాని past form "wrote".',
      },
      {
        question: 'Which is a regular verb?',
        options: ['go', 'eat', 'walk', 'speak'],
        correctIndex: 2,
        explanationEnglish: '"Walk" is regular: walk → walked → walked.',
        explanationTelugu: '"Walk" regular verb: walk → walked.',
      },
      {
        question: '"She ___ a letter yesterday." Fill in:',
        options: ['write', 'writes', 'wrote', 'written'],
        correctIndex: 2,
        explanationEnglish: 'Past Simple of irregular verb "write" is "wrote".',
        explanationTelugu: 'yesterday తో past tense వాడాలి — "wrote".',
      },
      {
        question: 'Identify the main verb: "He is playing cricket."',
        options: ['He', 'is', 'playing', 'cricket'],
        correctIndex: 2,
        explanationEnglish: '"Playing" is the main verb; "is" is the auxiliary.',
        explanationTelugu: '"Playing" main verb; "is" helping verb.',
      },
      {
        question: 'Past participle of "go":',
        options: ['went', 'goed', 'gone', 'going'],
        correctIndex: 2,
        explanationEnglish: 'go → went → gone.',
        explanationTelugu: 'go యొక్క past participle "gone".',
      },
    ],
  },
  {
    id: 'articles',
    icon: '📝',
    name: 'Articles',
    nameTelugu: 'వ్యాకరణ చిహ్నాలు',
    subtitle: 'A, An, The',
    mastery: 85,
    status: 'Master',
    explanation: 'Articles (a, an, the) are used before nouns to define them.',
    explanationTelugu: 'Articles అంటే noun ముందు వాడే చిన్న పదాలు — a, an, the.',
    examples: [
      { english: 'I saw a dog.', telugu: 'నేను ఒక కుక్కను చూశాను.', explanation: 'a - before consonant sound' },
      { english: 'She is an engineer.', telugu: 'ఆమె ఒక ఇంజినీర్.', explanation: 'an - before vowel sound' },
      { english: 'The sun rises in the east.', telugu: 'సూర్యుడు తూర్పున ఉదయిస్తాడు.', explanation: 'the - specific / unique' },
    ],
    quizQuestions: [
      {
        question: '"___ apple a day keeps the doctor away."',
        options: ['A', 'An', 'The', 'No article'],
        correctIndex: 1,
        explanationEnglish: '"Apple" starts with a vowel sound, so use "an".',
        explanationTelugu: '"Apple" vowel తో మొదలవుతుంది, కాబట్టి "an" వాడాలి.',
      },
      {
        question: '"He is ___ honest man."',
        options: ['a', 'an', 'the', 'no article'],
        correctIndex: 1,
        explanationEnglish: '"Honest" starts with a silent h — vowel sound /ɒ/, so use "an".',
        explanationTelugu: '"Honest" లో h మూగది, vowel sound వస్తుంది — "an" వాడాలి.',
      },
      {
        question: '"___ Taj Mahal is in Agra."',
        options: ['A', 'An', 'The', 'No article'],
        correctIndex: 2,
        explanationEnglish: 'Use "the" for unique landmarks.',
        explanationTelugu: 'ప్రత్యేకమైన ప్రదేశాల ముందు "the" వాడాలి.',
      },
      {
        question: '"I want to be ___ doctor."',
        options: ['a', 'an', 'the', 'no article'],
        correctIndex: 0,
        explanationEnglish: '"Doctor" begins with a consonant sound — use "a".',
        explanationTelugu: '"Doctor" consonant తో మొదలవుతుంది — "a" వాడాలి.',
      },
      {
        question: '"___ sky is blue."',
        options: ['A', 'An', 'The', 'No article'],
        correctIndex: 2,
        explanationEnglish: 'Use "the" for things unique in context (the sky, the sun, the moon).',
        explanationTelugu: 'విశ్వంలో ఒకే ఒక్కటి ఉండే వాటికి "the" వాడాలి.',
      },
    ],
  },
  {
    id: 'prepositions',
    icon: '📍',
    name: 'Prepositions',
    nameTelugu: 'విభక్తి పదాలు',
    subtitle: 'In, On, At, etc.',
    mastery: 40,
    status: 'Beginner',
    explanation: 'Prepositions link nouns to other words, showing direction, time, place, etc.',
    explanationTelugu: 'Prepositions అంటే స్థలం, సమయం, దిశను తెలిపే పదాలు.',
    examples: [
      { english: 'The book is on the table.', telugu: 'పుస్తకం టేబుల్ పై ఉంది.', explanation: 'on - surface' },
      { english: 'She lives in Hyderabad.', telugu: 'ఆమె హైదరాబాద్ లో నివసిస్తుంది.', explanation: 'in - enclosed space / city' },
      { english: 'Meet me at 5 PM.', telugu: '5 గంటలకు నన్ను కలు.', explanation: 'at - specific time' },
    ],
    quizQuestions: [
      {
        question: '"She was born ___ Monday."',
        options: ['in', 'on', 'at', 'by'],
        correctIndex: 1,
        explanationEnglish: 'Use "on" with days of the week.',
        explanationTelugu: 'వారం రోజుల ముందు "on" వాడాలి.',
      },
      {
        question: '"He arrived ___ the airport."',
        options: ['in', 'on', 'at', 'to'],
        correctIndex: 2,
        explanationEnglish: 'Use "at" for specific locations like airports, stations.',
        explanationTelugu: 'Airport, station వంటి నిర్దిష్ట స్థలాల ముందు "at".',
      },
      {
        question: '"I study ___ the morning."',
        options: ['in', 'on', 'at', 'during'],
        correctIndex: 0,
        explanationEnglish: 'Use "in" with parts of the day (morning, afternoon, evening).',
        explanationTelugu: 'రోజు భాగాల (morning, evening) ముందు "in".',
      },
      {
        question: '"The meeting is ___ noon."',
        options: ['in', 'on', 'at', 'by'],
        correctIndex: 2,
        explanationEnglish: 'Use "at" with exact times and noon/midnight.',
        explanationTelugu: 'noon, midnight, నిర్దిష్ట సమయాల ముందు "at".',
      },
      {
        question: '"They live ___ India."',
        options: ['in', 'on', 'at', 'from'],
        correctIndex: 0,
        explanationEnglish: 'Use "in" for countries and large areas.',
        explanationTelugu: 'దేశాల పేర్ల ముందు "in" వాడాలి.',
      },
    ],
  },
  {
    id: 'sentence-structure',
    icon: '🏗️',
    name: 'Sentence Structure',
    nameTelugu: 'వాక్య నిర్మాణం',
    subtitle: 'Subject + Verb + Object',
    mastery: 60,
    status: 'Intermediate',
    explanation: 'A sentence must have a subject and a verb; an object is optional.',
    explanationTelugu: 'వాక్యంలో Subject మరియు Verb తప్పనిసరి; Object ఐచ్ఛికం.',
    examples: [
      { english: 'Ram eats mangoes.', telugu: 'రాం మామిడి పండ్లు తింటాడు.', explanation: 'S + V + O structure' },
      { english: 'She sings beautifully.', telugu: 'ఆమె అందంగా పాటలు పాడుతుంది.', explanation: 'S + V + Adverb' },
      { english: 'The tall boy ran fast.', telugu: 'పొడవైన అబ్బాయి వేగంగా పరుగెత్తాడు.', explanation: 'Article + Adj + S + V + Adverb' },
    ],
    quizQuestions: [
      {
        question: 'Identify the subject: "The old man walks slowly."',
        options: ['old', 'The old man', 'walks', 'slowly'],
        correctIndex: 1,
        explanationEnglish: 'The subject is who or what the sentence is about — "The old man".',
        explanationTelugu: 'పని చేసే వ్యక్తి Subject — "The old man".',
      },
      {
        question: 'Which sentence has correct SVO order?',
        options: ['Mangoes I eat.', 'I eat mangoes.', 'Eat I mangoes.', 'Mangoes eat I.'],
        correctIndex: 1,
        explanationEnglish: 'English uses S + V + O order.',
        explanationTelugu: 'ఇంగ్లీషులో S + V + O క్రమం అనుసరించాలి.',
      },
      {
        question: 'What is missing? "Running in the park."',
        options: ['Object', 'Subject', 'Verb', 'Adverb'],
        correctIndex: 1,
        explanationEnglish: 'This phrase has no subject; add one: "She is running in the park."',
        explanationTelugu: 'Subject లేకుండా వాక్యం పూర్తి కాదు.',
      },
      {
        question: 'Identify the object: "She wrote a letter."',
        options: ['She', 'wrote', 'a letter', 'letter'],
        correctIndex: 2,
        explanationEnglish: 'The object receives the action — "a letter".',
        explanationTelugu: 'Verb చర్య ఎవరికి/దేనికి వర్తిస్తుందో అది Object — "a letter".',
      },
      {
        question: 'Which is a complete sentence?',
        options: ['Because it was raining.', 'The dog barked loudly.', 'After the party.', 'Running fast always.'],
        correctIndex: 1,
        explanationEnglish: '"The dog barked loudly." has subject, verb, and adverb — complete.',
        explanationTelugu: '"The dog barked loudly." లో subject మరియు verb రెండూ ఉన్నాయి.',
      },
    ],
  },
  {
    id: 'active-passive',
    icon: '🔄',
    name: 'Active/Passive Voice',
    nameTelugu: 'కర్తరి/కర్మణి వాచ్యం',
    subtitle: 'Voice transformation',
    mastery: 30,
    status: 'Beginner',
    explanation: 'Active voice: subject does the action. Passive voice: subject receives the action.',
    explanationTelugu: 'Active: subject పని చేస్తుంది. Passive: subject పని అందుకుంటుంది.',
    examples: [
      { english: 'Ram wrote the letter. (Active)', telugu: 'రాం ఉత్తరం రాశాడు.', explanation: 'Subject performs the action' },
      { english: 'The letter was written by Ram. (Passive)', telugu: 'ఉత్తరం రాం చేత రాయబడింది.', explanation: 'Subject receives the action' },
      { english: 'She is cooking food. (Active)', telugu: 'ఆమె వంట చేస్తోంది.', explanation: 'Active continuous' },
    ],
    quizQuestions: [
      {
        question: 'Convert to passive: "The teacher praised the student."',
        options: ['The student praised the teacher.', 'The student was praised by the teacher.', 'The student is praised by teacher.', 'The student has praised the teacher.'],
        correctIndex: 1,
        explanationEnglish: 'Passive = Object + was/were + past participle + by + subject.',
        explanationTelugu: 'Passive లో Object subject అవుతుంది, "by" తో original subject చేర్చబడుతుంది.',
      },
      {
        question: 'Which sentence is in passive voice?',
        options: ['He painted the wall.', 'The wall was painted by him.', 'He was painting the wall.', 'He paints the wall.'],
        correctIndex: 1,
        explanationEnglish: '"was painted by him" — passive structure.',
        explanationTelugu: '"was painted" passive voice యొక్క నిర్మాణం.',
      },
      {
        question: '"A new road is being built." — what tense is this passive?',
        options: ['Past Passive', 'Present Simple Passive', 'Present Continuous Passive', 'Future Passive'],
        correctIndex: 2,
        explanationEnglish: '"is being built" = Present Continuous Passive.',
        explanationTelugu: '"is being + past participle" = Present Continuous Passive.',
      },
      {
        question: 'Convert to active: "The cake was eaten by the children."',
        options: ['The children ate the cake.', 'The children eats the cake.', 'The cake ate the children.', 'The cake eating children.'],
        correctIndex: 0,
        explanationEnglish: 'Active: The children (subject) + ate (verb) + the cake (object).',
        explanationTelugu: 'Active లో "by" తర్వాత వచ్చేది subject అవుతుంది.',
      },
      {
        question: '"She will complete the project." — passive form?',
        options: ['The project will completed by her.', 'The project will be completed by her.', 'The project was completed by her.', 'The project is completed by her.'],
        correctIndex: 1,
        explanationEnglish: 'Future Passive = will + be + past participle.',
        explanationTelugu: 'Future Passive = will be + past participle.',
      },
    ],
  },
  {
    id: 'reported-speech',
    icon: '💬',
    name: 'Reported Speech',
    nameTelugu: 'పరోక్ష వచనం',
    subtitle: 'Direct to Indirect',
    mastery: 20,
    status: 'Beginner',
    explanation: 'Reported speech conveys what someone said without quoting them directly.',
    explanationTelugu: 'Reported Speech లో మరొకరు చెప్పిన మాటలను మన మాటల్లో చెప్తాం.',
    examples: [
      { english: 'Direct: "I am tired." → Indirect: He said that he was tired.', telugu: 'అతను అలసిపోయాను అని చెప్పాడు.', explanation: 'Present → Past shift' },
      { english: 'Direct: "I will help you." → Indirect: She said that she would help me.', telugu: 'ఆమె నాకు సహాయం చేస్తానని చెప్పింది.', explanation: 'will → would' },
      { english: 'Direct: "Are you coming?" → Indirect: He asked if I was coming.', telugu: 'అతను నేను వస్తున్నానా అని అడిగాడు.', explanation: 'Yes/No question → if/whether' },
    ],
    quizQuestions: [
      {
        question: 'Direct: "I live in Delhi." Reported: She said that she ___ in Delhi.',
        options: ['live', 'lives', 'lived', 'is living'],
        correctIndex: 2,
        explanationEnglish: 'In reported speech, present simple shifts to past simple.',
        explanationTelugu: 'Reported speech లో present simple → past simple అవుతుంది.',
      },
      {
        question: 'Direct: "I will call you." Reported: He said he ___ call me.',
        options: ['will', 'would', 'shall', 'should'],
        correctIndex: 1,
        explanationEnglish: '"will" changes to "would" in reported speech.',
        explanationTelugu: 'Reported speech లో "will" → "would" అవుతుంది.',
      },
      {
        question: 'Direct: "Did you eat?" Reported: She asked ___ I had eaten.',
        options: ['that', 'if', 'what', 'when'],
        correctIndex: 1,
        explanationEnglish: 'Yes/No questions use "if" or "whether" in reported speech.',
        explanationTelugu: 'Yes/No questions ని Reported speech లో "if/whether" తో మొదలుపెడతాం.',
      },
      {
        question: 'Direct: "Don\'t go there." Reported: He told me ___ go there.',
        options: ['not to', 'to not', 'don\'t', 'not'],
        correctIndex: 0,
        explanationEnglish: 'Negative imperatives become "not to + infinitive" in reported speech.',
        explanationTelugu: 'Negative command → "not to + verb" గా మారుతుంది.',
      },
      {
        question: 'Direct: "Where do you work?" Reported: She asked me where I ___.',
        options: ['work', 'works', 'worked', 'am working'],
        correctIndex: 2,
        explanationEnglish: 'WH-questions: tense shifts back (work → worked).',
        explanationTelugu: 'WH questions లో present → past గా మారుతుంది.',
      },
    ],
  },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Beginner: { bg: '#FFF3CD', text: '#856404' },
  Intermediate: { bg: '#CCE5FF', text: '#004085' },
  Master: { bg: '#D4EDDA', text: '#155724' },
};

// ─── Mock grammar checker (fallback) ──────────────────────────────────────────

function mockCheckGrammar(text: string): CheckResult {
  const errors: GrammarError[] = [];
  const lower = text.toLowerCase();

  if (/\bi goes\b/.test(lower)) {
    errors.push({ original: 'I goes', correction: 'I go', explanation: 'Use "go" (not "goes") with "I".', explanationTelugu: '"I" తో "goes" కాదు, "go" వాడాలి.', tip: 'Remember: goes is only for he/she/it.' });
  }
  if (/\bshe go\b/.test(lower) || /\bhe go\b/.test(lower)) {
    errors.push({ original: 'he/she go', correction: 'he/she goes', explanation: 'Third-person singular needs -s/-es.', explanationTelugu: 'He/She/It తో verb కు -s/-es చేర్చాలి.', tip: 'He goes, She works, It runs.' });
  }
  if (/\ba apple\b/.test(lower)) {
    errors.push({ original: 'a apple', correction: 'an apple', explanation: '"Apple" starts with a vowel — use "an".', explanationTelugu: 'Vowel తో మొదలయ్యే పదాల ముందు "an" వాడాలి.', tip: 'an + vowel sound word.' });
  }
  if (/\bmore better\b/.test(lower)) {
    errors.push({ original: 'more better', correction: 'better', explanation: '"Better" is already a comparative; do not add "more".', explanationTelugu: '"Better" ఇప్పటికే comparative — "more" అవసరం లేదు.', tip: 'Never use "more" with -er comparatives.' });
  }
  if (/\bi am go\b/.test(lower)) {
    errors.push({ original: 'I am go', correction: 'I am going', explanation: 'Continuous tense needs verb + -ing.', explanationTelugu: 'Continuous tense లో verb కు -ing చేర్చాలి.', tip: 'am/is/are + verb-ing.' });
  }

  const score = Math.max(0, 100 - errors.length * 20);
  return { score, errors };
}

// ─── API detail state ─────────────────────────────────────────────────────────

interface DetailAiData {
  explanation: string;
  explanationTelugu: string;
  examples: { english: string; telugu: string; explanation: string }[];
  commonMistakes: string[];
  teluguTips: string[];
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const MasteryBar: React.FC<{ percent: number }> = ({ percent }) => (
  <View style={styles.masteryBarBg}>
    <View style={[styles.masteryBarFill, { width: `${percent}%` as any }]} />
  </View>
);

const TopicCard: React.FC<{ topic: GrammarTopic; onPress: () => void }> = ({ topic, onPress }) => {
  const sc = STATUS_COLORS[topic.status];
  return (
    <TouchableOpacity style={styles.topicCard} onPress={onPress} activeOpacity={0.82}>
      <Text style={styles.topicIcon}>{topic.icon}</Text>
      <Text style={styles.topicName}>{topic.name}</Text>
      <Text style={styles.topicNameTelugu}>{topic.nameTelugu}</Text>
      <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
      <MasteryBar percent={topic.mastery} />
      <View style={styles.row}>
        <Text style={styles.masteryPct}>{topic.mastery}%</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{topic.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Screen = 'home' | 'checker' | 'detail' | 'quiz';

const GrammarEngineScreen: React.FC = () => {
  const { text } = useLocalSearchParams<{ text?: string }>();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedTopic, setSelectedTopic] = useState<GrammarTopic | null>(null);
  const [activeTab, setActiveTab] = useState<'topics' | 'checker'>('topics');

  // Grammar checker state
  const [inputText, setInputText] = useState('');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Detail AI data state
  const [detailAiData, setDetailAiData] = useState<DetailAiData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState<QuizQuestion | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizTotal] = useState(5); // fixed quiz length per session
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const overallScore = Math.round(GRAMMAR_TOPICS.reduce((s, t) => s + t.mastery, 0) / GRAMMAR_TOPICS.length);

  useEffect(() => {
    if (text) {
      setActiveTab('checker');
      setInputText(text);
      runCheckApi(text);
    }
  }, [text]);

  // ── API calls ──

  const runCheckApi = async (textToCheck: string) => {
    if (!textToCheck.trim()) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('grammar-engine', {
        body: {
          action: 'check',
          text: textToCheck,
          level: 'beginner',
        },
      });

      if (error || !data) throw new Error(error?.message ?? 'No data');

      const apiData = data as ApiCheckResponse;
      const errors: GrammarError[] = (apiData.corrections ?? []).map((c) => ({
        original: c.original,
        correction: c.corrected,
        explanation: c.explanation,
        explanationTelugu: c.explanation_telugu,
        tip: c.tip,
      }));

      setCheckResult({
        score: apiData.score ?? 100,
        errors,
        overallFeedback: apiData.overall_feedback,
        teluguSummary: apiData.telugu_summary,
        xpEarned: apiData.xp_earned,
      });
    } catch {
      // Fallback to mock
      setCheckResult(mockCheckGrammar(textToCheck));
    } finally {
      setChecking(false);
    }
  };

  const loadTopicExplanation = async (topic: GrammarTopic) => {
    setLoadingDetail(true);
    setDetailAiData(null);
    try {
      const { data, error } = await supabase.functions.invoke('grammar-engine', {
        body: {
          action: 'explain',
          rule: topic.name,
          level: topic.status.toLowerCase(),
        },
      });

      if (error || !data) throw new Error(error?.message ?? 'No data');

      const apiData = data as ApiExplainResponse;
      const examples = (apiData.examples ?? []).map((ex) => ({
        english: ex.correct,
        telugu: ex.telugu,
        explanation: `Correct: ${ex.correct}${ex.incorrect ? ` | Incorrect: ${ex.incorrect}` : ''}`,
      }));

      setDetailAiData({
        explanation: apiData.explanation ?? topic.explanation,
        explanationTelugu: apiData.explanation_telugu ?? topic.explanationTelugu,
        examples: examples.length > 0 ? examples : topic.examples,
        commonMistakes: apiData.common_mistakes ?? [],
        teluguTips: apiData.telugu_tips ?? [],
      });
    } catch {
      // Fallback: use the static topic data
      setDetailAiData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadQuizQuestion = async (topic: GrammarTopic): Promise<QuizQuestion | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('grammar-engine', {
        body: {
          action: 'quiz',
          topic: topic.name,
          level: topic.status.toLowerCase(),
        },
      });

      if (error || !data) throw new Error(error?.message ?? 'No data');

      const apiData = data as ApiQuizResponse;
      return {
        question: apiData.question,
        options: apiData.options,
        correctIndex: apiData.correct_index,
        explanationEnglish: apiData.explanation,
        explanationTelugu: apiData.explanation_telugu,
      };
    } catch {
      return null;
    }
  };

  // ── Navigation helpers ──

  const openTopic = (topic: GrammarTopic) => {
    setSelectedTopic(topic);
    setDetailAiData(null);
    setScreen('detail');
    loadTopicExplanation(topic);
  };

  const openQuiz = async () => {
    if (!selectedTopic) return;
    setQuizIndex(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setQuizDone(false);
    setCurrentQuizQuestion(null);
    setScreen('quiz');
    setLoadingQuiz(true);
    const aiQuestion = await loadQuizQuestion(selectedTopic);
    if (aiQuestion) {
      setCurrentQuizQuestion(aiQuestion);
    } else {
      // Fallback to static quiz questions
      setCurrentQuizQuestion(selectedTopic.quizQuestions[0] ?? null);
    }
    setLoadingQuiz(false);
  };

  const goHome = () => { setScreen('home'); setSelectedTopic(null); setDetailAiData(null); };

  // ── Grammar checker ──

  const handleCheck = () => {
    if (!inputText.trim()) return;
    runCheckApi(inputText);
  };

  // ── Quiz logic ──

  const getQuizQuestion = (): QuizQuestion | null => {
    if (currentQuizQuestion) return currentQuizQuestion;
    if (!selectedTopic) return null;
    return selectedTopic.quizQuestions[quizIndex] ?? null;
  };

  const handleOptionPress = (idx: number) => {
    if (answered) return;
    const q = getQuizQuestion();
    if (!q) return;
    setSelectedOption(idx);
    setAnswered(true);
    if (idx === q.correctIndex) {
      setScore(s => s + 1);
    }
  };

  const handleNextQuestion = async () => {
    if (!selectedTopic) return;
    if (quizIndex + 1 >= quizTotal) {
      setQuizDone(true);
    } else {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();

      const nextIndex = quizIndex + 1;
      setQuizIndex(nextIndex);
      setSelectedOption(null);
      setAnswered(false);
      setCurrentQuizQuestion(null);
      setLoadingQuiz(true);

      const aiQuestion = await loadQuizQuestion(selectedTopic);
      if (aiQuestion) {
        setCurrentQuizQuestion(aiQuestion);
      } else {
        // Fallback: cycle through static questions
        const staticQ = selectedTopic.quizQuestions[nextIndex % selectedTopic.quizQuestions.length];
        setCurrentQuizQuestion(staticQ ?? null);
      }
      setLoadingQuiz(false);
    }
  };

  // ── Renders ──

  const renderHome = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Grammar Engine</Text>
          <Text style={styles.headerSub}>Master English grammar</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeNum}>{overallScore}</Text>
          <Text style={styles.scoreBadgeLabel}>Score</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['topics', 'checker'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'topics' ? '📚 Topics' : '✅ Check Grammar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'topics' ? (
        <View style={styles.grid}>
          {GRAMMAR_TOPICS.map(topic => (
            <TopicCard key={topic.id} topic={topic} onPress={() => openTopic(topic)} />
          ))}
        </View>
      ) : (
        renderChecker()
      )}
    </ScrollView>
  );

  const renderChecker = () => (
    <View style={styles.checkerContainer}>
      <Text style={styles.sectionTitle}>✅ Grammar Checker</Text>
      <Text style={styles.checkerHint}>Try: "I are going to school" or "a apple"</Text>
      <TextInput
        style={styles.checkerInput}
        placeholder="Type or paste any sentence..."
        placeholderTextColor="#999"
        value={inputText}
        onChangeText={setInputText}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <TouchableOpacity style={[styles.checkBtn, checking && styles.checkBtnDisabled]} onPress={handleCheck} activeOpacity={0.85} disabled={checking}>
        {checking ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
            <Text style={styles.checkBtnText}>Checking with AI...</Text>
          </View>
        ) : (
          <Text style={styles.checkBtnText}>🔍 Check Grammar</Text>
        )}
      </TouchableOpacity>

      {checkResult && (
        <View style={styles.resultsPanel}>
          {/* Score — prominent */}
          <View style={styles.resultScoreRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultScoreLabel}>Overall Score</Text>
              {checkResult.overallFeedback ? (
                <Text style={styles.resultFeedback}>{checkResult.overallFeedback}</Text>
              ) : null}
            </View>
            <View style={[styles.resultScoreCircle, { backgroundColor: checkResult.score >= 80 ? '#28A745' : checkResult.score >= 60 ? '#FFC107' : '#DC3545' }]}>
              <Text style={styles.resultScoreNum}>{checkResult.score}</Text>
              <Text style={styles.resultScoreOutOf}>/100</Text>
            </View>
          </View>

          {checkResult.xpEarned != null && checkResult.xpEarned > 0 && (
            <View style={styles.xpEarnedBanner}>
              <Text style={styles.xpEarnedText}>🎉 +{checkResult.xpEarned} XP Earned!</Text>
            </View>
          )}

          {checkResult.errors.length === 0 ? (
            <View style={styles.noErrorsBox}>
              <Text style={styles.noErrorsText}>✅ Perfect! No errors found.</Text>
              {checkResult.teluguSummary ? (
                <Text style={styles.noErrorsSub}>{checkResult.teluguSummary}</Text>
              ) : (
                <Text style={styles.noErrorsSub}>మీ వాక్యం సరైనది!</Text>
              )}
            </View>
          ) : (
            <>
              {checkResult.errors.map((err, i) => (
                <View key={i} style={styles.errorCard}>
                  <View style={styles.errorRow}>
                    <View style={styles.errorBadge}><Text style={styles.errorBadgeText}>Error {i + 1}</Text></View>
                  </View>
                  <View style={styles.correctionRow}>
                    <Text style={styles.originalText}>❌ {err.original}</Text>
                    <Text style={styles.arrow}>→</Text>
                    <Text style={styles.correctionText}>✅ {err.correction}</Text>
                  </View>
                  <Text style={styles.errorExplain}>{err.explanation}</Text>
                  <Text style={styles.errorExplainTe}>{err.explanationTelugu}</Text>
                  <View style={styles.tipBox}>
                    <Text style={styles.tipText}>💡 {err.tip}</Text>
                  </View>
                </View>
              ))}
              {checkResult.teluguSummary ? (
                <View style={styles.teluguSummaryBox}>
                  <Text style={styles.teluguSummaryText}>📝 {checkResult.teluguSummary}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderDetail = () => {
    if (!selectedTopic) return null;

    // Merge AI data with static fallback
    const explanation = detailAiData?.explanation ?? selectedTopic.explanation;
    const explanationTelugu = detailAiData?.explanationTelugu ?? selectedTopic.explanationTelugu;
    const examples = detailAiData?.examples ?? selectedTopic.examples;
    const commonMistakes = detailAiData?.commonMistakes ?? [];
    const teluguTips = detailAiData?.teluguTips ?? [];

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back + Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={goHome} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.detailIcon}>{selectedTopic.icon}</Text>
          <Text style={styles.detailTitle}>{selectedTopic.name}</Text>
          <Text style={styles.detailTitleTe}>{selectedTopic.nameTelugu}</Text>
        </View>

        {/* Loading indicator for AI explanation */}
        {loadingDetail && (
          <View style={styles.detailLoadingBox}>
            <ActivityIndicator color={Colors.primary} size="small" />
            <Text style={styles.detailLoadingText}>Loading AI explanation...</Text>
          </View>
        )}

        {/* Explanation */}
        <View style={styles.explainBox}>
          <Text style={styles.explainTitle}>📖 Explanation</Text>
          <Text style={styles.explainText}>{explanation}</Text>
          <View style={styles.dividerLight} />
          <Text style={styles.explainTe}>{explanationTelugu}</Text>
        </View>

        {/* Common Mistakes — AI only */}
        {commonMistakes.length > 0 && (
          <View style={styles.mistakesSection}>
            <Text style={styles.sectionTitle}>⚠️ Common Mistakes</Text>
            {commonMistakes.map((mistake, i) => (
              <View key={i} style={styles.mistakeCard}>
                <Text style={styles.mistakeText}>• {mistake}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Examples */}
        <View style={styles.examplesSection}>
          <Text style={styles.sectionTitle}>🔤 Examples</Text>
          {examples.map((ex, i) => (
            <View key={i} style={styles.exampleCard}>
              <Text style={styles.exampleEn}>{ex.english}</Text>
              <Text style={styles.exampleTe}>{ex.telugu}</Text>
              <Text style={styles.exampleNote}>📌 {ex.explanation}</Text>
            </View>
          ))}
        </View>

        {/* Telugu Tips — AI only */}
        {teluguTips.length > 0 && (
          <View style={styles.teluguTipsSection}>
            <Text style={styles.sectionTitle}>💡 Telugu Tips</Text>
            {teluguTips.map((tip, i) => (
              <View key={i} style={styles.teluguTipCard}>
                <Text style={styles.teluguTipText}>• {tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Take Quiz */}
        <TouchableOpacity style={styles.quizBtn} onPress={openQuiz} activeOpacity={0.85}>
          <Text style={styles.quizBtnText}>🎯 Take Quiz  •  +50 XP</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderQuiz = () => {
    if (!selectedTopic) return null;

    const xpEarned = score * 10;

    if (quizDone) {
      const pct = Math.round((score / quizTotal) * 100);
      return (
        <View style={styles.quizDoneContainer}>
          <Text style={styles.quizDoneEmoji}>{pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '📚'}</Text>
          <Text style={styles.quizDoneTitle}>Quiz Complete!</Text>
          <Text style={styles.quizDoneScore}>{score}/{quizTotal} Correct</Text>
          <View style={[styles.quizScoreCircle, { backgroundColor: pct >= 80 ? '#28A745' : pct >= 60 ? '#FFC107' : '#DC3545' }]}>
            <Text style={styles.quizScorePct}>{pct}%</Text>
          </View>
          <Text style={styles.xpLabel}>+{xpEarned} XP Earned!</Text>
          <TouchableOpacity style={styles.quizBtn} onPress={goHome} activeOpacity={0.85}>
            <Text style={styles.quizBtnText}>← Back to Topics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quizBtn, { backgroundColor: '#17A2B8', marginTop: 10 }]} onPress={openQuiz} activeOpacity={0.85}>
            <Text style={styles.quizBtnText}>🔄 Retry Quiz</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Loading state for quiz question
    if (loadingQuiz) {
      return (
        <View style={styles.quizLoadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.quizLoadingText}>Generating AI question...</Text>
        </View>
      );
    }

    const q = getQuizQuestion();
    if (!q) return null;

    return (
      <Animated.View style={[styles.quizContainer, { opacity: fadeAnim }]}>
        {/* Progress */}
        <View style={styles.quizProgressRow}>
          <Text style={styles.quizCounter}>Question {quizIndex + 1}/{quizTotal}</Text>
          <Text style={styles.quizScore}>Score: {score}</Text>
        </View>
        <MasteryBar percent={(quizIndex / quizTotal) * 100} />

        {/* Question */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{q.question}</Text>
        </View>

        {/* Options */}
        {q.options.map((opt, idx) => {
          let optStyle = styles.optionBtn;
          let textStyle = styles.optionText;
          if (answered) {
            if (idx === q.correctIndex) {
              optStyle = { ...styles.optionBtn, ...styles.optionCorrect } as any;
              textStyle = { ...styles.optionText, color: '#155724' } as any;
            } else if (idx === selectedOption) {
              optStyle = { ...styles.optionBtn, ...styles.optionWrong } as any;
              textStyle = { ...styles.optionText, color: '#721C24' } as any;
            }
          }
          return (
            <TouchableOpacity key={idx} style={optStyle} onPress={() => handleOptionPress(idx)} activeOpacity={0.82}>
              <Text style={textStyle}>{String.fromCharCode(65 + idx)}. {opt}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Feedback */}
        {answered && (
          <View style={[styles.feedbackBox, { backgroundColor: selectedOption === q.correctIndex ? '#D4EDDA' : '#F8D7DA' }]}>
            <Text style={styles.feedbackTitle}>{selectedOption === q.correctIndex ? '✅ Correct!' : '❌ Incorrect'}</Text>
            <Text style={styles.feedbackText}>{q.explanationEnglish}</Text>
            <Text style={styles.feedbackTe}>{q.explanationTelugu}</Text>
            {selectedOption === q.correctIndex && <Text style={styles.xpLabel}>+10 XP</Text>}
          </View>
        )}

        {answered && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNextQuestion} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{quizIndex + 1 < quizTotal ? 'Next Question →' : 'See Results 🏆'}</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F0" />
      {screen === 'home' && renderHome()}
      {screen === 'detail' && renderDetail()}
      {screen === 'quiz' && renderQuiz()}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 12, backgroundColor: Colors.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scoreBadge: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 10, minWidth: 60 },
  scoreBadgeNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  scoreBadgeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  // Tabs
  tabBar: { flexDirection: 'row', margin: 16, marginBottom: 8, backgroundColor: '#FFE8DC', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 24 },
  topicCard: { width: (width - 50) / 2, backgroundColor: '#fff', borderRadius: 16, margin: 6, padding: 14, shadowColor: Colors.primary, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  topicIcon: { fontSize: 28, marginBottom: 6 },
  topicName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  topicNameTelugu: { fontSize: 11, color: '#666', marginBottom: 2 },
  topicSubtitle: { fontSize: 11, color: '#999', marginBottom: 8 },
  masteryBarBg: { height: 6, backgroundColor: '#FFE8DC', borderRadius: 3, overflow: 'hidden', marginVertical: 6 },
  masteryBarFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  masteryPct: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Checker
  checkerContainer: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  checkerHint: { fontSize: 12, color: '#888', marginBottom: 10 },
  checkerInput: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#FFD5C2', padding: 14, fontSize: 15, color: '#111827', minHeight: 100, marginBottom: 12 },
  checkBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
  checkBtnDisabled: { backgroundColor: Colors.primaryDark, opacity: 0.7 },
  checkBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  // Results
  resultsPanel: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  resultScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  resultScoreLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  resultFeedback: { fontSize: 12, color: '#555', marginTop: 4, flexShrink: 1 },
  resultScoreCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  resultScoreNum: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 26 },
  resultScoreOutOf: { fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  xpEarnedBanner: { backgroundColor: '#FFF3CD', borderRadius: 10, padding: 10, marginBottom: 12, alignItems: 'center' },
  xpEarnedText: { fontSize: 14, fontWeight: '700', color: '#856404' },
  noErrorsBox: { alignItems: 'center', paddingVertical: 16 },
  noErrorsText: { fontSize: 16, fontWeight: '700', color: '#28A745' },
  noErrorsSub: { fontSize: 13, color: '#666', marginTop: 4, textAlign: 'center' },
  errorCard: { backgroundColor: '#FFF8F8', borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#DC3545' },
  errorRow: { flexDirection: 'row', marginBottom: 8 },
  errorBadge: { backgroundColor: '#DC3545', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  errorBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  correctionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' },
  originalText: { fontSize: 14, color: '#DC3545', fontWeight: '600', marginRight: 6 },
  arrow: { fontSize: 14, color: '#666', marginRight: 6 },
  correctionText: { fontSize: 14, color: '#28A745', fontWeight: '600' },
  errorExplain: { fontSize: 13, color: '#333', marginBottom: 3 },
  errorExplainTe: { fontSize: 12, color: '#666', marginBottom: 6 },
  tipBox: { backgroundColor: '#FFF3CD', borderRadius: 8, padding: 8 },
  tipText: { fontSize: 12, color: '#856404' },
  teluguSummaryBox: { backgroundColor: '#E8F4FD', borderRadius: 10, padding: 10, marginTop: 8 },
  teluguSummaryText: { fontSize: 13, color: '#1A6FA0' },

  // Detail
  detailHeader: { alignItems: 'center', backgroundColor: Colors.primary, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  backBtn: { alignSelf: 'flex-start', marginLeft: 16, marginBottom: 8 },
  backBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
  detailIcon: { fontSize: 48, marginBottom: 6 },
  detailTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  detailTitleTe: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  detailLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12 },
  detailLoadingText: { fontSize: 13, color: Colors.primary, marginLeft: 8 },
  explainBox: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  explainTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  explainText: { fontSize: 14, color: '#333', lineHeight: 21 },
  dividerLight: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
  explainTe: { fontSize: 13, color: '#666', lineHeight: 20 },
  mistakesSection: { paddingHorizontal: 16, paddingBottom: 8 },
  mistakeCard: { backgroundColor: '#FFF3CD', borderRadius: 10, padding: 10, marginBottom: 6 },
  mistakeText: { fontSize: 13, color: '#856404' },
  examplesSection: { paddingHorizontal: 16, paddingBottom: 8 },
  exampleCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  exampleEn: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  exampleTe: { fontSize: 13, color: Colors.primary, marginBottom: 4 },
  exampleNote: { fontSize: 12, color: '#888' },
  teluguTipsSection: { paddingHorizontal: 16, paddingBottom: 8 },
  teluguTipCard: { backgroundColor: '#E8F4FD', borderRadius: 10, padding: 10, marginBottom: 6 },
  teluguTipText: { fontSize: 13, color: '#1A6FA0' },

  quizBtn: { margin: 16, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  quizBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Quiz
  quizContainer: { flex: 1, padding: 20 },
  quizLoadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  quizLoadingText: { fontSize: 15, color: Colors.primary, marginTop: 12, fontWeight: '600' },
  quizProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  quizCounter: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  quizScore: { fontSize: 15, fontWeight: '700', color: '#28A745' },
  questionBox: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginVertical: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  questionText: { fontSize: 16, fontWeight: '600', color: '#111827', lineHeight: 24 },
  optionBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#FFD5C2' },
  optionCorrect: { backgroundColor: '#D4EDDA', borderColor: '#28A745' },
  optionWrong: { backgroundColor: '#F8D7DA', borderColor: '#DC3545' },
  optionText: { fontSize: 14, color: '#333', fontWeight: '500' },
  feedbackBox: { borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, color: '#111827' },
  feedbackText: { fontSize: 13, color: '#333', marginBottom: 4 },
  feedbackTe: { fontSize: 12, color: '#555' },
  xpLabel: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 4 },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Quiz Done
  quizDoneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  quizDoneEmoji: { fontSize: 64, marginBottom: 12 },
  quizDoneTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 6 },
  quizDoneScore: { fontSize: 18, color: '#555', marginBottom: 16 },
  quizScoreCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  quizScorePct: { fontSize: 28, fontWeight: '800', color: '#fff' },
});

export default GrammarEngineScreen;
