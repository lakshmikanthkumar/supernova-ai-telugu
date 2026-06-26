import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import { supabase } from '../../services/supabase';
import {
  initializeSpeechRecognition,
  destroySpeechRecognition,
  startListening,
  stopListening,
  isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition';

const { width } = Dimensions.get('window');

type Phase = 'setup' | 'active' | 'feedback' | 'complete';
type JobRole = 'IT' | 'Finance' | 'Marketing' | 'HR' | 'Operations' | 'Teaching';
type Experience = 'Fresher' | '1-3 Years' | '3-5 Years' | '5+ Years';
type SessionType = 'HR Round' | 'Technical Round' | 'Behavioral' | 'Mock Interview';

interface Question {
  text: string;
  category: string;
}

interface SessionResult {
  date: string;
  role: string;
  score: number;
  type: string;
}

interface CategoryScore {
  score: number;
  feedback: string;
  telugu: string;
}

interface FeedbackData {
  overall_score: number;
  categories: {
    clarity: CategoryScore;
    confidence: CategoryScore;
    relevance: CategoryScore;
    grammar: CategoryScore;
    vocabulary: CategoryScore;
  };
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  sample_answer: string;
  follow_up_question: string;
  telugu_summary: string;
}

interface CompletionData {
  overall: number;
  clarity: number;
  confidence: number;
  relevance: number;
  grammar: number;
  vocabulary: number;
  strengths: string[];
  improvements: string[];
}

const INTERVIEW_QUESTIONS: Record<string, Question[]> = {
  'HR Round': [
    { text: 'Tell me about yourself.', category: 'Introduction' },
    { text: 'What are your strengths and weaknesses?', category: 'Self Assessment' },
    { text: 'Why do you want to join our company?', category: 'Motivation' },
    { text: 'Where do you see yourself in 5 years?', category: 'Goals' },
    { text: 'Why are you leaving your current job?', category: 'Career Move' },
  ],
  'Behavioral': [
    { text: 'Tell me about a challenge you faced and how you overcame it.', category: 'Problem Solving' },
    { text: 'Describe a time you worked effectively in a team.', category: 'Teamwork' },
    { text: 'How do you handle pressure and tight deadlines?', category: 'Stress Management' },
    { text: 'Give an example of when you showed leadership.', category: 'Leadership' },
  ],
  'Technical Round': [
    { text: 'Walk me through your technical skills and expertise.', category: 'Skills' },
    { text: 'Describe a complex technical problem you solved.', category: 'Problem Solving' },
    { text: 'How do you stay updated with the latest technologies?', category: 'Learning' },
    { text: 'Explain a project where you used your technical skills.', category: 'Projects' },
  ],
  'Mock Interview': [
    { text: 'Tell me about yourself.', category: 'Introduction' },
    { text: 'What are your greatest strengths?', category: 'Self Assessment' },
    { text: 'Tell me about a challenge you faced and how you overcame it.', category: 'Problem Solving' },
    { text: 'Where do you see yourself in 5 years?', category: 'Goals' },
    { text: 'Do you have any questions for us?', category: 'Closing' },
  ],
  'Fresher': [
    { text: 'What are your hobbies and interests?', category: 'Personal' },
    { text: 'Tell us about your final year project.', category: 'Academic' },
    { text: 'What are your career goals?', category: 'Goals' },
    { text: 'Why did you choose this field of study?', category: 'Motivation' },
  ],
};

// Fallback mock feedback shown to guests or when the edge function is unavailable
const GUEST_MOCK_FEEDBACK: FeedbackData = {
  overall_score: 72,
  categories: {
    clarity: { score: 75, feedback: 'Your answer was fairly clear. Structure it as Present → Past → Future for a stronger impact.', telugu: 'మీ సమాధానం స్పష్టంగా ఉంది. Present → Past → Future పద్ధతిలో చెప్పండి.' },
    confidence: { score: 70, feedback: 'Speak with more assertiveness. Avoid starting sentences with "I think maybe" or similar hedges.', telugu: 'మరింత ధైర్యంగా మాట్లాడండి. "బహుశా" లాంటి మాటలు తగ్గించండి.' },
    relevance: { score: 78, feedback: 'Your answer addressed the question well. Try to tie your experience directly to the role.', telugu: 'మీ సమాధానం ప్రశ్నకు సంబంధించినదే. మీ అనుభవాన్ని role తో ముడిపెట్టండి.' },
    grammar: { score: 68, feedback: "Use 'have been working' instead of 'am working' for ongoing experience. Avoid filler words.", telugu: "కొనసాగుతున్న అనుభవానికి 'have been working' వాడండి. పదాల మధ్య gap తగ్గించండి." },
    vocabulary: { score: 72, feedback: "Replace common words with professional ones. For example, 'chance' → 'opportunity', 'boss' → 'manager'.", telugu: "సాధారణ పదాలకు బదులు professional పదాలు వాడండి. ఉదాహరణకు 'chance' కాదు 'opportunity'." },
  },
  strengths: ['Clear communication style', 'Good use of specific examples', 'Positive attitude'],
  improvements: ['Use the STAR method for behavioral questions', "Reduce filler words like 'um' and 'like'", 'Practice concise responses under 2 minutes'],
  next_steps: ['Record yourself answering and review the recording', 'Practice one new STAR answer every day', 'Read one professional article daily to improve vocabulary'],
  sample_answer: "I am a [role] with [X years] of experience in [field]. Currently, I [key responsibility]. Before that, I [past experience]. I'm looking forward to [future goal] and believe this role aligns perfectly with my career path.",
  follow_up_question: 'Can you give me a specific example that highlights your biggest strength?',
  telugu_summary: 'మీ సమాధానం మంచిగా ఉంది! PAT పద్ధతిని వాడండి: Present → Past → Future. STAR పద్ధతి నేర్చుకోండి — ఇంటర్వ్యూయర్లకు ఇది చాలా నచ్చుతుంది.',
};

const RECENT_SESSIONS: SessionResult[] = [
  { date: '2024-01-15', role: 'IT', score: 82, type: 'Technical Round' },
  { date: '2024-01-12', role: 'HR', score: 74, type: 'HR Round' },
  { date: '2024-01-10', role: 'Marketing', score: 89, type: 'Mock Interview' },
];

const INTERVIEW_TIPS = [
  'Research the company thoroughly before the interview',
  'Use the STAR method for behavioral questions',
  'Maintain eye contact and smile confidently',
  'Prepare 2-3 questions to ask the interviewer',
  "Practice your 'Tell me about yourself' answer daily",
];

export default function InterviewTrainingScreen() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [selectedRole, setSelectedRole] = useState<JobRole>('IT');
  const [selectedExperience, setSelectedExperience] = useState<Experience>('Fresher');
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('HR Round');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [allScores, setAllScores] = useState<number[]>([]);
  const [sessionId] = useState<string>(() =>
    `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  const scoreAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [isRecording, setIsRecording] = useState(false);
  const [sttAvailable, setSttAvailable] = useState<boolean | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);

  const baseAnswerRef = useRef('');

  useEffect(() => {
    initializeSpeechRecognition();

    isSpeechRecognitionAvailable().then(available => {
      setSttAvailable(available);
    });

    return () => {
      destroySpeechRecognition();
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  const startInterview = useCallback(() => {
    const questionKey = selectedExperience === 'Fresher' ? 'Fresher' : selectedSessionType;
    const questionList = INTERVIEW_QUESTIONS[questionKey] || INTERVIEW_QUESTIONS['HR Round'];
    setQuestions(questionList);
    setCurrentQuestionIndex(0);
    setAllScores([]);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    setPhase('active');
    setTimeout(() => {
      speakQuestion(questionList[0]?.text || 'Tell me about yourself.');
    }, 1000);
  }, [selectedRole, selectedExperience, selectedSessionType]);

  const speakQuestion = useCallback((text: string) => {
    if (isSpeaking) {
      Speech.stop();
    }
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'en-IN',
      pitch: 1.0,
      rate: 0.85,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [isSpeaking]);

  const toggleRecording = useCallback(async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }

    if (!sttAvailable) {
      Alert.alert(
        'Speech Recognition Unavailable',
        'Speech-to-text is not supported on this browser/device. Please type your answer directly into the input field or try on a different browser/device.'
      );
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      await stopListening();
    } else {
      setIsRecording(true);
      setSttError(null);
      baseAnswerRef.current = currentAnswer.trim();

      startListening({
        language: 'en-IN',
        partialResults: true,
        continuous: Platform.OS === 'android',
        onPartialResult: (text: string) => {
          const prefix = baseAnswerRef.current;
          setCurrentAnswer(prefix ? `${prefix} ${text}` : text);
        },
        onFinalResult: (result) => {
          const newText = result.transcript.trim();
          if (newText) {
            const prefix = baseAnswerRef.current;
            baseAnswerRef.current = prefix ? `${prefix} ${newText}` : newText;
            setCurrentAnswer(baseAnswerRef.current);
          }
          if (Platform.OS === 'android') {
            startListening({
              language: 'en-IN',
              partialResults: true,
              continuous: true,
              onPartialResult: (text: string) => {
                const prefix = baseAnswerRef.current;
                setCurrentAnswer(prefix ? `${prefix} ${text}` : text);
              },
              onFinalResult: (r) => {
                const t = r.transcript.trim();
                if (t) {
                  const prefix = baseAnswerRef.current;
                  baseAnswerRef.current = prefix ? `${prefix} ${t}` : t;
                  setCurrentAnswer(baseAnswerRef.current);
                }
              },
              onError: (err: string) => {
                const ignorable = ['no speech', 'no match', 'busy'];
                if (!ignorable.some(e => err.toLowerCase().includes(e))) {
                  setSttError(err);
                }
              },
              onEnd: () => {},
            });
          }
        },
        onError: (err: string) => {
          const ignorable = ['no speech', 'no match', 'busy', 'aborted'];
          if (!ignorable.some(e => err.toLowerCase().includes(e))) {
            setSttError(err);
          }
        },
        onEnd: () => {},
      });
    }
  }, [isRecording, isSpeaking, sttAvailable, currentAnswer]);

  const submitAnswer = useCallback(async () => {
    if (!currentAnswer.trim()) return;

    if (isRecording) {
      setIsRecording(false);
      await stopListening();
    }

    setIsLoadingFeedback(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    setPhase('feedback');

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Guest mode: use mock feedback after a short simulated delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setFeedback(GUEST_MOCK_FEEDBACK);
        setAllScores(prev => [...prev, GUEST_MOCK_FEEDBACK.overall_score]);
        return;
      }

      const question = questions[currentQuestionIndex];
      const { data, error } = await supabase.functions.invoke('interview-coach', {
        body: {
          job_role: selectedRole,
          experience_level: selectedExperience,
          question: question?.text ?? 'Tell me about yourself.',
          user_answer: currentAnswer.trim(),
          session_id: sessionId,
          user_id: user.id,
        },
      });

      if (error || !data) {
        console.warn('interview-coach edge function error:', error);
        // Fall back to mock feedback so the user can still practice
        setFeedback(GUEST_MOCK_FEEDBACK);
        setAllScores(prev => [...prev, GUEST_MOCK_FEEDBACK.overall_score]);
        return;
      }

      const result = data as FeedbackData;
      setFeedback(result);
      setAllScores(prev => [...prev, result.overall_score]);
    } catch (err) {
      console.warn('submitAnswer error:', err);
      setFeedback(GUEST_MOCK_FEEDBACK);
      setAllScores(prev => [...prev, GUEST_MOCK_FEEDBACK.overall_score]);
    } finally {
      setIsLoadingFeedback(false);
    }
  }, [currentAnswer, currentQuestionIndex, questions, selectedRole, selectedExperience, sessionId, isRecording]);

  const nextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      const latestScore = feedback?.overall_score ?? 72;
      const scores = [...allScores, latestScore];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const overall = Math.round(avg);

      // Aggregate category averages from the last feedback if available
      const cats = feedback?.categories;
      setCompletionData({
        overall,
        clarity: cats?.clarity?.score ?? Math.round(overall * 0.95 + Math.random() * 5),
        confidence: cats?.confidence?.score ?? Math.round(overall * 0.9 + Math.random() * 10),
        relevance: cats?.relevance?.score ?? Math.round(overall * 0.97 + Math.random() * 3),
        grammar: cats?.grammar?.score ?? Math.round(overall * 0.85 + Math.random() * 15),
        vocabulary: cats?.vocabulary?.score ?? Math.round(overall * 0.92 + Math.random() * 8),
        strengths: feedback?.strengths ?? [
          'Clear communication style',
          'Good use of specific examples',
          'Professional vocabulary',
        ],
        improvements: feedback?.improvements ?? [
          'Use more structured answers (STAR method)',
          "Reduce filler words like 'um' and 'like'",
          'Practice concise responses under 2 minutes',
        ],
      });
      Animated.timing(scoreAnimation, {
        toValue: overall,
        duration: 1500,
        useNativeDriver: false,
      }).start();
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setPhase('complete');
    } else {
      setCurrentQuestionIndex(nextIndex);
      setCurrentAnswer('');
      setFeedback(null);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setPhase('active');
      setTimeout(() => {
        speakQuestion(questions[nextIndex]?.text || '');
      }, 500);
    }
  }, [currentQuestionIndex, questions, allScores, feedback]);

  const resetSession = useCallback(() => {
    Speech.stop();
    if (isRecording) {
      setIsRecording(false);
      stopListening();
    }
    setPhase('setup');
    setCurrentAnswer('');
    setFeedback(null);
    setAllScores([]);
    setCurrentQuestionIndex(0);
    setIsLoadingFeedback(false);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
  }, [isRecording]);

  const getScoreColor = (score: number) => {
    // Accepts 0-100 scale
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  // ─── Setup Phase ────────────────────────────────────────────
  const renderSetupPhase = () => (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>🎯</Text>
        <Text style={styles.headerTitle}>Interview Training</Text>
        <Text style={styles.headerSubtitle}>Practice with AI Interviewer</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Job Role</Text>
        <View style={styles.chipGrid}>
          {(['IT', 'Finance', 'Marketing', 'HR', 'Operations', 'Teaching'] as JobRole[]).map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.chip, selectedRole === role && styles.chipActive]}
              onPress={() => setSelectedRole(role)}
            >
              <Text style={[styles.chipText, selectedRole === role && styles.chipTextActive]}>{role}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Experience Level</Text>
        <View style={styles.chipGrid}>
          {(['Fresher', '1-3 Years', '3-5 Years', '5+ Years'] as Experience[]).map(exp => (
            <TouchableOpacity
              key={exp}
              style={[styles.chip, selectedExperience === exp && styles.chipActive]}
              onPress={() => setSelectedExperience(exp)}
            >
              <Text style={[styles.chipText, selectedExperience === exp && styles.chipTextActive]}>{exp}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Session Type</Text>
        <View style={styles.chipGrid}>
          {(['HR Round', 'Technical Round', 'Behavioral', 'Mock Interview'] as SessionType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, selectedSessionType === type && styles.chipActive]}
              onPress={() => setSelectedSessionType(type)}
            >
              <Text style={[styles.chipText, selectedSessionType === type && styles.chipTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={startInterview}>
        <Text style={styles.startButtonText}>Start Interview 🚀</Text>
      </TouchableOpacity>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {RECENT_SESSIONS.map((session, index) => (
          <View key={index} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionRole}>{session.role} — {session.type}</Text>
              <Text style={styles.sessionDate}>{session.date}</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(session.score) + '20' }]}>
              <Text style={[styles.scoreBadgeText, { color: getScoreColor(session.score) }]}>{session.score}%</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>💡 Interview Tips</Text>
        {INTERVIEW_TIPS.map((tip, index) => (
          <View key={index} style={styles.tipRow}>
            <Text style={styles.tipNumber}>{index + 1}</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  // ─── Active Phase ────────────────────────────────────────────
  const renderActivePhase = () => {
    const question = questions[currentQuestionIndex];
    return (
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Question {currentQuestionIndex + 1} of {questions.length}</Text>

        <View style={styles.interviewerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </View>
          <View style={styles.interviewerInfo}>
            <Text style={styles.interviewerName}>Priya AI Interviewer</Text>
            <Text style={styles.interviewerRole}>{selectedRole} • {selectedSessionType}</Text>
            {isSpeaking && <Text style={styles.speakingIndicator}>🔊 Speaking...</Text>}
          </View>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionCategory}>{question?.category}</Text>
          <Text style={styles.questionText}>{question?.text || 'How are you?'}</Text>
          <TouchableOpacity
            style={styles.hearButton}
            onPress={() => speakQuestion(question?.text || '')}
          >
            <Text style={styles.hearButtonText}>🔊 Hear Question Again</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.answerCard}>
            <Text style={styles.answerLabel}>Your Answer</Text>
            <TextInput
              style={styles.answerInput}
              placeholder="Type your answer here... (Minimum 30 words)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              textAlignVertical="top"
            />
            <View style={styles.answerActions}>
              <TouchableOpacity
                style={[
                  styles.micButton,
                  isRecording && { backgroundColor: '#EF4444', borderColor: '#EF4444' }
                ]}
                onPress={toggleRecording}
              >
                <Text style={[styles.micButtonText, isRecording && { color: '#FFFFFF' }]}>
                  {isRecording ? '⏹️ Stop Recording' : '🎤 Speak My Answer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, !currentAnswer.trim() && styles.submitButtonDisabled]}
                onPress={submitAnswer}
                disabled={!currentAnswer.trim()}
              >
                <Text style={styles.submitButtonText}>Submit Answer ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  };

  // ─── Feedback Phase ──────────────────────────────────────────
  const renderFeedbackPhase = () => {
    if (isLoadingFeedback) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <Text style={styles.loadingTitle}>Analyzing Your Answer...</Text>
          <Text style={styles.loadingSubtitle}>Our AI coach is reviewing your response</Text>
        </View>
      );
    }

    if (!feedback) return null;

    const { overall_score, categories, strengths, improvements, sample_answer, follow_up_question, telugu_summary } = feedback;

    const categoryList: Array<{ key: keyof typeof categories; label: string }> = [
      { key: 'clarity', label: 'Clarity' },
      { key: 'confidence', label: 'Confidence' },
      { key: 'relevance', label: 'Relevance' },
      { key: 'grammar', label: 'Grammar' },
      { key: 'vocabulary', label: 'Vocabulary' },
    ];

    return (
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={styles.feedbackHeader}>
          <Text style={styles.feedbackTitle}>AI Feedback</Text>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(overall_score) }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(overall_score) }]}>{overall_score}</Text>
            <Text style={styles.scoreOutOf}>/100</Text>
          </View>
        </View>

        {/* 5-Category Scores */}
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackSubtitle}>📊 Score Breakdown</Text>
          {categoryList.map(({ key, label }) => {
            const cat = categories[key];
            const pct = Math.min(cat.score, 100);
            return (
              <View key={key} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryLabel}>{label}</Text>
                  <Text style={[styles.categoryScore, { color: getScoreColor(cat.score) }]}>{cat.score}</Text>
                </View>
                <View style={styles.categoryBarBg}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      { width: `${pct}%`, backgroundColor: getScoreColor(cat.score) },
                    ]}
                  />
                </View>
                <Text style={styles.categoryFeedback}>{cat.feedback}</Text>
              </View>
            );
          })}
        </View>

        {/* Strengths */}
        {strengths && strengths.length > 0 && (
          <View style={styles.strengthsCard}>
            <Text style={styles.strengthsTitle}>💪 Strengths</Text>
            {strengths.map((s, i) => (
              <View key={i} style={styles.strengthRow}>
                <Text style={styles.strengthIcon}>✅</Text>
                <Text style={styles.strengthText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Improvements */}
        {improvements && improvements.length > 0 && (
          <View style={styles.grammarCard}>
            <Text style={styles.grammarTitle}>📈 Areas to Improve</Text>
            {improvements.map((item, i) => (
              <View key={i} style={styles.correctionRow}>
                <Text style={styles.correctionBullet}>•</Text>
                <Text style={styles.correctionText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sample Answer */}
        {!!sample_answer && (
          <View style={styles.betterAnswerCard}>
            <Text style={styles.betterAnswerTitle}>✨ Sample Answer Structure</Text>
            <Text style={styles.betterAnswerText}>{sample_answer}</Text>
          </View>
        )}

        {/* Follow-up Question */}
        {!!follow_up_question && (
          <View style={styles.followUpCard}>
            <Text style={styles.followUpTitle}>🔄 Follow-up Question</Text>
            <Text style={styles.followUpText}>{follow_up_question}</Text>
          </View>
        )}

        {/* Telugu Summary */}
        {!!telugu_summary && (
          <View style={styles.teluguCard}>
            <Text style={styles.teluguTitle}>🇮🇳 Telugu Guidance</Text>
            <Text style={styles.teluguText}>{telugu_summary}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex + 1 >= questions.length ? 'See Results 🏆' : 'Next Question →'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── Complete Phase ───────────────────────────────────────────
  const renderCompletePhase = () => {
    if (!completionData) return null;
    const scoreDisplay = scoreAnimation.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });
    return (
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.completeHeader}>
          <Text style={styles.completeEmoji}>🏆</Text>
          <Text style={styles.completeTitle}>Interview Complete!</Text>
          <Text style={styles.completeSubtitle}>Here's how you performed</Text>
        </View>

        <View style={styles.overallScoreCard}>
          <Text style={styles.overallScoreLabel}>Overall Score</Text>
          <View style={styles.overallScoreCircle}>
            <Text style={[styles.overallScoreNumber, { color: getScoreColor(completionData.overall) }]}>
              {completionData.overall}
            </Text>
            <Text style={styles.overallScoreMax}>/100</Text>
          </View>
          <View style={styles.animatedBarContainer}>
            <Animated.View style={[styles.animatedBar, {
              width: scoreDisplay,
              backgroundColor: getScoreColor(completionData.overall),
            }]} />
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Performance Breakdown</Text>
          {[
            { label: 'Clarity', score: completionData.clarity },
            { label: 'Confidence', score: completionData.confidence },
            { label: 'Relevance', score: completionData.relevance },
            { label: 'Grammar', score: completionData.grammar },
            { label: 'Vocabulary', score: completionData.vocabulary },
          ].map(({ label, score }) => (
            <View key={label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{label}</Text>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, {
                  width: `${Math.min(score, 100)}%`,
                  backgroundColor: getScoreColor(score),
                }]} />
              </View>
              <Text style={[styles.breakdownScore, { color: getScoreColor(score) }]}>{score}</Text>
            </View>
          ))}
        </View>

        <View style={styles.strengthsCard}>
          <Text style={styles.strengthsTitle}>💪 Top Strengths</Text>
          {completionData.strengths.map((s, i) => (
            <View key={i} style={styles.strengthRow}>
              <Text style={styles.strengthIcon}>✅</Text>
              <Text style={styles.strengthText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={styles.improvementsCard}>
          <Text style={styles.improvementsTitle}>📈 Areas to Improve</Text>
          {completionData.improvements.map((item, i) => (
            <View key={i} style={styles.improvementRow}>
              <Text style={styles.improvementIcon}>🎯</Text>
              <Text style={styles.improvementText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.completeActions}>
          <TouchableOpacity style={styles.practiceAgainButton} onPress={resetSession}>
            <Text style={styles.practiceAgainText}>Practice Again 🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reportButton}>
            <Text style={styles.reportButtonText}>View Full Report 📄</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FFFFFF" />
      <View style={styles.topBar}>
        {phase !== 'setup' && (
          <TouchableOpacity onPress={resetSession} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Exit</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.topBarTitle}>Interview Training</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {phase === 'setup' && renderSetupPhase()}
        {phase === 'active' && renderActivePhase()}
        {phase === 'feedback' && renderFeedbackPhase()}
        {phase === 'complete' && renderCompletePhase()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E1A' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#312E81',
  },
  topBarTitle: { color: '#111827', fontSize: 17, fontWeight: '700' },
  backButton: { paddingHorizontal: 8, paddingVertical: 4 },
  backButtonText: { color: '#4F46E5', fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingTitle: { color: '#E0E7FF', fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  loadingSubtitle: { color: '#818CF8', fontSize: 14, textAlign: 'center' },

  // Header
  headerCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 16,
    backgroundColor: '#0a072a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#E0E7FF', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#818CF8' },

  // Sections
  sectionCard: {
    backgroundColor: '#1A1830',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#C7D2FE', marginBottom: 12 },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F0E1A',
    borderWidth: 1,
    borderColor: '#5A42F5',
  },
  chipActive: { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  chipText: { color: '#818CF8', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  // Start Button
  startButton: {
    backgroundColor: '#7B61FF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  // Recent Sessions
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
  },
  sessionInfo: { flex: 1 },
  sessionRole: { color: '#C7D2FE', fontSize: 14, fontWeight: '600' },
  sessionDate: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  scoreBadgeText: { fontSize: 14, fontWeight: '700' },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tipNumber: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#312E81', color: '#818CF8',
    fontSize: 12, fontWeight: '700', textAlign: 'center',
    lineHeight: 24, marginRight: 10, marginTop: 1,
  },
  tipText: { flex: 1, color: '#9CA3AF', fontSize: 13, lineHeight: 20 },

  // Progress
  progressBar: {
    height: 6, backgroundColor: '#FFFFFF', borderRadius: 3, marginBottom: 6,
  },
  progressFill: { height: 6, backgroundColor: '#7B61FF', borderRadius: 3 },
  progressText: { color: '#818CF8', fontSize: 13, marginBottom: 16, textAlign: 'center' },

  // Interviewer
  interviewerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1830',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#312E81', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: { fontSize: 28 },
  interviewerInfo: { flex: 1 },
  interviewerName: { color: '#E0E7FF', fontSize: 16, fontWeight: '700' },
  interviewerRole: { color: '#818CF8', fontSize: 13, marginTop: 2 },
  speakingIndicator: { color: '#10B981', fontSize: 12, marginTop: 4 },

  // Question
  questionCard: {
    backgroundColor: '#1a1830',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#5A42F5',
  },
  questionCategory: { color: '#818CF8', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  questionText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', lineHeight: 30, marginBottom: 16 },
  hearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#312E81',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  hearButtonText: { color: '#A5B4FC', fontSize: 13, fontWeight: '600' },

  // Answer
  answerCard: {
    backgroundColor: '#1A1830',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  answerLabel: { color: '#C7D2FE', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  answerInput: {
    backgroundColor: '#0F0E1A',
    borderRadius: 12,
    padding: 14,
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 24,
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#312E81',
    marginBottom: 14,
  },
  answerActions: { flexDirection: 'row', gap: 10 },
  micButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5A42F5',
  },
  micButtonText: { color: '#818CF8', fontSize: 14, fontWeight: '600' },
  submitButton: {
    flex: 1,
    backgroundColor: '#7B61FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#312E81', opacity: 0.5 },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Feedback Header
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  feedbackTitle: { color: '#E0E7FF', fontSize: 22, fontWeight: '800' },
  scoreCircle: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  scoreNumber: { fontSize: 26, fontWeight: '800' },
  scoreOutOf: { color: '#6B7280', fontSize: 11 },

  // Feedback Cards
  feedbackCard: {
    backgroundColor: '#1A1830',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  feedbackSubtitle: { color: '#818CF8', fontSize: 13, fontWeight: '700', marginBottom: 12 },
  feedbackText: { color: '#D1D5DB', fontSize: 14, lineHeight: 22 },

  // Category breakdown rows
  categoryRow: { marginBottom: 14 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  categoryLabel: { color: '#C7D2FE', fontSize: 13, fontWeight: '600' },
  categoryScore: { fontSize: 13, fontWeight: '800' },
  categoryBarBg: { height: 6, backgroundColor: '#0F0E1A', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  categoryBarFill: { height: 6, borderRadius: 3 },
  categoryFeedback: { color: '#9CA3AF', fontSize: 12, lineHeight: 18 },

  betterAnswerCard: {
    backgroundColor: '#0D1F1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#065F46',
  },
  betterAnswerTitle: { color: '#10B981', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  betterAnswerText: { color: '#6EE7B7', fontSize: 13, lineHeight: 21, fontStyle: 'italic' },

  grammarCard: {
    backgroundColor: '#1C1A0E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#78350F',
  },
  grammarTitle: { color: '#F59E0B', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  correctionRow: { flexDirection: 'row', marginBottom: 6 },
  correctionBullet: { color: '#F59E0B', marginRight: 8, fontSize: 16 },
  correctionText: { flex: 1, color: '#FCD34D', fontSize: 13, lineHeight: 20 },

  followUpCard: {
    backgroundColor: '#1A1830',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5A42F5',
  },
  followUpTitle: { color: '#A5B4FC', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  followUpText: { color: '#C7D2FE', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  teluguCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#5A42F5',
  },
  teluguTitle: { color: '#A5B4FC', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  teluguText: { color: '#C7D2FE', fontSize: 14, lineHeight: 24 },

  nextButton: {
    backgroundColor: '#7B61FF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  // Complete Phase
  completeHeader: { alignItems: 'center', marginBottom: 20 },
  completeEmoji: { fontSize: 56, marginBottom: 8 },
  completeTitle: { color: '#E0E7FF', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  completeSubtitle: { color: '#818CF8', fontSize: 14 },
  overallScoreCard: {
    backgroundColor: '#1A1830',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  overallScoreLabel: { color: '#818CF8', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  overallScoreCircle: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  overallScoreNumber: { fontSize: 56, fontWeight: '900' },
  overallScoreMax: { color: '#6B7280', fontSize: 20, marginBottom: 8, marginLeft: 4 },
  animatedBarContainer: {
    width: '100%', height: 8, backgroundColor: '#0F0E1A', borderRadius: 4, overflow: 'hidden',
  },
  animatedBar: { height: 8, borderRadius: 4 },
  breakdownCard: {
    backgroundColor: '#1A1830',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  breakdownTitle: { color: '#C7D2FE', fontSize: 15, fontWeight: '700', marginBottom: 14 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  breakdownLabel: { color: '#9CA3AF', fontSize: 13, width: 90 },
  breakdownBarBg: { flex: 1, height: 8, backgroundColor: '#0F0E1A', borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  breakdownBarFill: { height: 8, borderRadius: 4 },
  breakdownScore: { fontSize: 13, fontWeight: '700', width: 30, textAlign: 'right' },

  strengthsCard: {
    backgroundColor: '#0D1F1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#065F46',
  },
  strengthsTitle: { color: '#10B981', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  strengthRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  strengthIcon: { fontSize: 16, marginRight: 10 },
  strengthText: { flex: 1, color: '#6EE7B7', fontSize: 13, lineHeight: 20 },

  improvementsCard: {
    backgroundColor: '#1C1A0E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#78350F',
  },
  improvementsTitle: { color: '#F59E0B', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  improvementRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  improvementIcon: { fontSize: 16, marginRight: 10 },
  improvementText: { flex: 1, color: '#FCD34D', fontSize: 13, lineHeight: 20 },

  completeActions: { flexDirection: 'row', gap: 12 },
  practiceAgainButton: {
    flex: 1,
    backgroundColor: '#7B61FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  practiceAgainText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  reportButton: {
    flex: 1,
    backgroundColor: '#1A1830',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5A42F5',
  },
  reportButtonText: { color: '#818CF8', fontSize: 15, fontWeight: '700' },
});
