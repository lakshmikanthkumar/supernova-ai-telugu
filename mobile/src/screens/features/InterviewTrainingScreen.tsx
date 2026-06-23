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
} from 'react-native';
import * as Speech from 'expo-speech';

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

interface FeedbackData {
  score: number;
  text: string;
  betterAnswer: string;
  grammarCorrections: string[];
  teluguGuidance: string;
}

interface CompletionData {
  overall: number;
  confidence: number;
  grammar: number;
  vocabulary: number;
  fluency: number;
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

const MOCK_FEEDBACK: FeedbackData[] = [
  {
    score: 7,
    text: "Good start! Your answer covered the basics well. Try to structure it as: Present (current) → Past (experience) → Future (goals). This is called the PAT method and interviewers love it!",
    betterAnswer: "I am a [role] with [X years] of experience in [field]. Currently, I work at [company] where I [key responsibility]. Before that, I [past experience]. I'm looking forward to [future goal] and believe this role aligns perfectly with my career path.",
    grammarCorrections: ["Use 'have been working' instead of 'am working' for ongoing experience", "Avoid starting sentences with 'So' or 'Like'"],
    teluguGuidance: "మీ సమాధానం మంచిగా ఉంది! PAT పద్ధతిని వాడండి: Present → Past → Future. ఇంటర్వ్యూయర్లకు ఇది చాలా నచ్చుతుంది.",
  },
  {
    score: 8,
    text: "Excellent answer! You used specific examples which is exactly what STAR method recommends. Situation, Task, Action, Result — you covered all four points! Work on making your conclusion more impactful.",
    betterAnswer: "In my previous role at [company], I faced [specific situation]. My task was to [clear objective]. I took action by [specific steps]. As a result, [measurable outcome] which led to [positive impact].",
    grammarCorrections: ["Consider using past tense consistently throughout your answer"],
    teluguGuidance: "చాలా బాగా చెప్పారు! STAR పద్ధతి వాడారు — ఇది చాలా professional గా ఉంటుంది. మీ conclusion ని మరింత strong గా చేయండి.",
  },
  {
    score: 6,
    text: "Your answer shows genuine enthusiasm! However, try to be more specific about your knowledge of the company. Research their recent news, products, and values before the interview.",
    betterAnswer: "I admire [Company]'s commitment to [specific value/product]. I've been following your [recent achievement] and I believe my skills in [relevant skill] would contribute significantly to [company goal].",
    grammarCorrections: ["'I am knowing' should be 'I know'", "Use 'opportunity' instead of 'chance' in professional settings"],
    teluguGuidance: "కంపెనీ గురించి ముందే research చేయండి. వాళ్ళ products, values మరియు recent news తెలుసుకోండి. ఇది మీ answer ని చాలా impressive గా చేస్తుంది.",
  },
];

const RECENT_SESSIONS: SessionResult[] = [
  { date: '2024-01-15', role: 'IT', score: 82, type: 'Technical Round' },
  { date: '2024-01-12', role: 'HR', score: 74, type: 'HR Round' },
  { date: '2024-01-10', role: 'Marketing', score: 89, type: 'Mock Interview' },
];

const INTERVIEW_TIPS = [
  "Research the company thoroughly before the interview",
  "Use the STAR method for behavioral questions",
  "Maintain eye contact and smile confidently",
  "Prepare 2-3 questions to ask the interviewer",
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
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [allScores, setAllScores] = useState<number[]>([]);

  const scoreAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const submitAnswer = useCallback(() => {
    if (!currentAnswer.trim()) return;
    const mockFeedback = MOCK_FEEDBACK[currentQuestionIndex % MOCK_FEEDBACK.length];
    setFeedback(mockFeedback);
    setAllScores(prev => [...prev, mockFeedback.score]);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    setPhase('feedback');
  }, [currentAnswer, currentQuestionIndex]);

  const nextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      const scores = [...allScores, feedback?.score || 7];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const overall = Math.round(avg * 10);
      setCompletionData({
        overall,
        confidence: Math.round(overall * 0.9 + Math.random() * 10),
        grammar: Math.round(overall * 0.85 + Math.random() * 15),
        vocabulary: Math.round(overall * 0.92 + Math.random() * 8),
        fluency: Math.round(overall * 0.88 + Math.random() * 12),
        strengths: [
          'Clear communication style',
          'Good use of specific examples',
          'Professional vocabulary',
        ],
        improvements: [
          'Use more structured answers (STAR method)',
          'Reduce filler words like "um" and "like"',
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
    setPhase('setup');
    setCurrentAnswer('');
    setFeedback(null);
    setAllScores([]);
    setCurrentQuestionIndex(0);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#10B981';
    if (score >= 6) return '#F59E0B';
    return '#EF4444';
  };

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
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(session.score / 10) + '20' }]}>
              <Text style={[styles.scoreBadgeText, { color: getScoreColor(session.score / 10) }]}>{session.score}%</Text>
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
              <TouchableOpacity style={styles.micButton}>
                <Text style={styles.micButtonText}>🎤 Speak My Answer</Text>
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

  const renderFeedbackPhase = () => {
    if (!feedback) return null;
    return (
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.feedbackHeader}>
          <Text style={styles.feedbackTitle}>AI Feedback</Text>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(feedback.score) }]}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(feedback.score) }]}>{feedback.score}</Text>
            <Text style={styles.scoreOutOf}>/10</Text>
          </View>
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackSubtitle}>📊 Overall Feedback</Text>
          <Text style={styles.feedbackText}>{feedback.text}</Text>
        </View>

        <View style={styles.betterAnswerCard}>
          <Text style={styles.betterAnswerTitle}>✨ Better Answer Structure</Text>
          <Text style={styles.betterAnswerText}>{feedback.betterAnswer}</Text>
        </View>

        {feedback.grammarCorrections.length > 0 && (
          <View style={styles.grammarCard}>
            <Text style={styles.grammarTitle}>📝 Grammar Tips</Text>
            {feedback.grammarCorrections.map((correction, index) => (
              <View key={index} style={styles.correctionRow}>
                <Text style={styles.correctionBullet}>•</Text>
                <Text style={styles.correctionText}>{correction}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.teluguCard}>
          <Text style={styles.teluguTitle}>🇮🇳 Telugu Guidance</Text>
          <Text style={styles.teluguText}>{feedback.teluguGuidance}</Text>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex + 1 >= questions.length ? 'See Results 🏆' : 'Next Question →'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

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
            <Text style={[styles.overallScoreNumber, { color: getScoreColor(completionData.overall / 10) }]}>
              {completionData.overall}
            </Text>
            <Text style={styles.overallScoreMax}>/100</Text>
          </View>
          <View style={styles.animatedBarContainer}>
            <Animated.View style={[styles.animatedBar, {
              width: scoreDisplay,
              backgroundColor: getScoreColor(completionData.overall / 10),
            }]} />
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Performance Breakdown</Text>
          {[
            { label: 'Confidence', score: completionData.confidence },
            { label: 'Grammar', score: completionData.grammar },
            { label: 'Vocabulary', score: completionData.vocabulary },
            { label: 'Fluency', score: completionData.fluency },
          ].map(({ label, score }) => (
            <View key={label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{label}</Text>
              <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, {
                  width: `${Math.min(score, 100)}%`,
                  backgroundColor: getScoreColor(score / 10),
                }]} />
              </View>
              <Text style={[styles.breakdownScore, { color: getScoreColor(score / 10) }]}>{score}</Text>
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
      <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />
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
    backgroundColor: '#1E1B4B',
    borderBottomWidth: 1,
    borderBottomColor: '#312E81',
  },
  topBarTitle: { color: '#E0E7FF', fontSize: 17, fontWeight: '700' },
  backButton: { paddingHorizontal: 8, paddingVertical: 4 },
  backButtonText: { color: '#818CF8', fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Header
  headerCard: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 16,
    backgroundColor: '#1E1B4B',
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
    borderColor: '#4338CA',
  },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  chipText: { color: '#818CF8', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },

  // Start Button
  startButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#4F46E5',
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
    borderBottomColor: '#1E1B4B',
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
    height: 6, backgroundColor: '#1E1B4B', borderRadius: 3, marginBottom: 6,
  },
  progressFill: { height: 6, backgroundColor: '#4F46E5', borderRadius: 3 },
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
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#4338CA',
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
    backgroundColor: '#1E1B4B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  micButtonText: { color: '#818CF8', fontSize: 14, fontWeight: '600' },
  submitButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#312E81', opacity: 0.5 },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Feedback
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
    backgroundColor: '#1E1B4B',
  },
  scoreNumber: { fontSize: 26, fontWeight: '800' },
  scoreOutOf: { color: '#6B7280', fontSize: 11 },
  feedbackCard: {
    backgroundColor: '#1A1830',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#312E81',
  },
  feedbackSubtitle: { color: '#818CF8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  feedbackText: { color: '#D1D5DB', fontSize: 14, lineHeight: 22 },
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
  teluguCard: {
    backgroundColor: '#1E1B4B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4338CA',
  },
  teluguTitle: { color: '#A5B4FC', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  teluguText: { color: '#C7D2FE', fontSize: 14, lineHeight: 24 },
  nextButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  // Complete
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
    backgroundColor: '#4F46E5',
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
    borderColor: '#4338CA',
  },
  reportButtonText: { color: '#818CF8', fontSize: 15, fontWeight: '700' },
});
