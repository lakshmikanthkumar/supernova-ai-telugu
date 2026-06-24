import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Bot } from 'lucide-react-native';


type Phase = 'mode' | 'topic' | 'prepare' | 'speaking' | 'results';
type SpeakingMode = 'TED-style' | 'Debate' | 'Motivational' | 'Presentation' | 'Storytelling';

interface ModeConfig {
  emoji: string;
  label: SpeakingMode;
  description: string;
  color: string;
}

interface AnalysisResult {
  overall: number;
  wpm: number;
  fillerWords: string[];
  fillerCount: number;
  fluency: number;
  clarity: number;
  pace: number;
  feedback: string;
  teluguTip: string;
}

const MODES: ModeConfig[] = [
  { emoji: '🎤', label: 'TED-style', description: 'Inspiring talk with storytelling', color: '#EF4444' },
  { emoji: '⚔️', label: 'Debate', description: 'Argue your point persuasively', color: '#F59E0B' },
  { emoji: '🔥', label: 'Motivational', description: 'Inspire and energize your audience', color: '#F97316' },
  { emoji: '📊', label: 'Presentation', description: 'Clear and professional delivery', color: '#4F46E5' },
  { emoji: '📖', label: 'Storytelling', description: 'Engage through narrative', color: '#10B981' },
];

const SUGGESTED_TOPICS = [
  'My Journey to Learn English',
  'Technology in India',
  'My Hometown',
  'My Dream Career',
  'Climate Change',
];

const MOCK_TRANSCRIPTS: Record<SpeakingMode, string> = {
  'TED-style': "Friends, let me tell you about the moment that changed my life forever. It was a rainy Tuesday morning... um... when I realized that learning something new is not about... you know... the destination, it is about the journey we take to get there. Every step we take, every word we learn, it adds up to something bigger than ourselves.",
  'Debate': "I strongly believe that... um... technology has transformed our lives for the better. The evidence is clear — productivity has increased, communication barriers have fallen, and... like... we have access to information that was unimaginable just decades ago. Those who argue otherwise are ignoring the fundamental progress humanity has made.",
  'Motivational': "You have the power to change your story! No matter where you come from, no matter what challenges you face... um... you have the ability to rise above. Look at every successful person around you — they all started somewhere. They all had doubts, they all faced failures. But they kept going. And so must you!",
  'Presentation': "Today I will be presenting our quarterly results and... um... the strategic roadmap for the next fiscal year. Our key metrics show a 23% increase in user engagement. The main drivers of this growth are... you know... our improved product features and expanded market reach across tier-2 cities.",
  'Storytelling': "Once upon a time, in a small village in Andhra Pradesh, there lived a young girl with a big dream. Her name was Kavya, and every evening she would sit under the neem tree and... um... imagine a world where she could speak to people from all over the world. That dream led her to learn English, and today... like... that dream is her reality.",
};

const MOCK_ANALYSIS: Record<SpeakingMode, AnalysisResult> = {
  'TED-style': {
    overall: 78,
    wpm: 142,
    fillerWords: ['um', 'you know'],
    fillerCount: 3,
    fluency: 82,
    clarity: 75,
    pace: 80,
    feedback: "Your TED-style talk showed great emotional connection! The opening hook was strong. Work on eliminating filler words like 'um' and 'you know' — they break the flow and reduce your authority as a speaker. Your pacing at 142 WPM is ideal for engaging talks. Try adding a 3-second pause after key points for dramatic effect.",
    teluguTip: "మీ speech చాలా inspiring గా ఉంది! 'um', 'you know' వంటి filler words తగ్గించండి. ప్రతి important point తర్వాత 3 seconds pause తీసుకోండి — ఇది audience కి మీ message absorb చేసుకోవడానికి సహాయపడుతుంది.",
  },
  'Debate': {
    overall: 71,
    wpm: 168,
    fillerWords: ['um', 'like'],
    fillerCount: 4,
    fluency: 69,
    clarity: 72,
    pace: 65,
    feedback: "Your debate skills show confidence! However, at 168 WPM you're speaking too fast — slow down to make your arguments more impactful. Your evidence was compelling but needs stronger transitions. Replace 'like' with 'specifically' or 'for instance' to sound more authoritative.",
    teluguTip: "Debate లో speed తగ్గించండి. మీరు చాలా వేగంగా మాట్లాడుతున్నారు (168 WPM). Ideal debate speed 130-150 WPM. Arguments మధ్య clear transitions వాడండి — 'First', 'Furthermore', 'Therefore' వంటివి.",
  },
  'Motivational': {
    overall: 85,
    wpm: 135,
    fillerWords: ['um'],
    fillerCount: 2,
    fluency: 88,
    clarity: 84,
    pace: 82,
    feedback: "Excellent motivational delivery! Your energy and passion came through clearly. The personal stories made it relatable. Only 2 filler words detected — that's great! Focus on varying your vocal tone more — go higher for excitement, lower for serious points. End with a clear call to action.",
    teluguTip: "మీ motivational speech చాలా powerful గా ఉంది! మీ voice tone vary చేయండి — exciting moments లో pitch పెంచండి, serious moments లో తగ్గించండి. Speech ని strong call-to-action తో end చేయండి.",
  },
  'Presentation': {
    overall: 73,
    wpm: 155,
    fillerWords: ['um', 'you know'],
    fillerCount: 5,
    fluency: 70,
    clarity: 78,
    pace: 72,
    feedback: "Your presentation was structured and clear. The data points were well-communicated. However, 5 filler words reduced your professional impact. Practice the 'replace with silence' technique — whenever you feel like saying 'um', just pause instead. Your clarity score of 78 shows great potential!",
    teluguTip: "'Um' అనే బదులు silent pause తీసుకోండి. Professional presentations లో silence confident గా అనిపిస్తుంది. మీ data points చాలా clearly చెప్పారు — ఇది మీ strong point.",
  },
  'Storytelling': {
    overall: 81,
    wpm: 128,
    fillerWords: ['um', 'like'],
    fillerCount: 3,
    fluency: 85,
    clarity: 79,
    pace: 88,
    feedback: "Beautiful storytelling! Your pacing at 128 WPM is perfect for narrative — it allows listeners to visualize the story. The sensory details were vivid. Work on smoother transitions between scenes. Use the 'show don't tell' technique — instead of saying emotions, describe actions that show them.",
    teluguTip: "మీ storytelling చాలా vivid గా ఉంది! 'Show don't tell' technique వాడండి. Emotions చెప్పే బదులు, emotions show చేసే actions describe చేయండి. మీ pace (128 WPM) storytelling కి perfect గా ఉంది.",
  },
};

export default function PublicSpeakingScreen() {
  const [phase, setPhase] = useState<Phase>('mode');
  const [selectedMode, setSelectedMode] = useState<SpeakingMode | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [prepCountdown, setPrepCountdown] = useState(30);
  const [speakingTime, setSpeakingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const scoreAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    };
  }, []);

  const startPrepPhase = useCallback(() => {
    if (!selectedMode) return;
    const topic = selectedTopic || customTopic.trim();
    if (!topic) return;
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setPrepCountdown(30);
    setPhase('prepare');
    prepTimerRef.current = setInterval(() => {
      setPrepCountdown(prev => {
        if (prev <= 1) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          startSpeaking();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [selectedMode, selectedTopic, customTopic]);

  const startSpeaking = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setSpeakingTime(0);
    setIsRecording(true);
    setTranscript('');
    setPhase('speaking');
    let time = 0;
    speakTimerRef.current = setInterval(() => {
      time += 1;
      setSpeakingTime(time);
      if (time > 3) {
        setTranscript(MOCK_TRANSCRIPTS[selectedMode!] || '');
      }
    }, 1000);
  }, [selectedMode]);

  const stopSpeaking = useCallback(() => {
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    setIsRecording(false);
    const result = MOCK_ANALYSIS[selectedMode!];
    setAnalysisResult(result);
    Animated.timing(scoreAnimation, {
      toValue: result.overall,
      duration: 1600,
      useNativeDriver: false,
    }).start();
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setPhase('results');
  }, [selectedMode]);

  const resetAll = useCallback(() => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    setIsRecording(false);
    setSelectedMode(null);
    setSelectedTopic('');
    setCustomTopic('');
    setPrepCountdown(30);
    setSpeakingTime(0);
    setTranscript('');
    setAnalysisResult(null);
    scoreAnimation.setValue(0);
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setPhase('mode');
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const scorePercent = scoreAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const renderModePhase = () => (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>🎙️</Text>
        <Text style={styles.headerTitle}>Public Speaking</Text>
        <Text style={styles.headerSubtitle}>Build confidence, speak powerfully</Text>
      </View>
      <Text style={styles.sectionLabel}>Choose Your Mode</Text>
      <View style={styles.modeGrid}>
        {MODES.map(mode => (
          <TouchableOpacity
            key={mode.label}
            style={[styles.modeCard, selectedMode === mode.label && { borderColor: mode.color, borderWidth: 2 }]}
            onPress={() => setSelectedMode(mode.label)}
          >
            <Text style={styles.modeEmoji}>{mode.emoji}</Text>
            <Text style={[styles.modeLabel, selectedMode === mode.label && { color: mode.color }]}>{mode.label}</Text>
            <Text style={styles.modeDescription}>{mode.description}</Text>
            {selectedMode === mode.label && (
              <View style={[styles.modeSelectedDot, { backgroundColor: mode.color }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      {selectedMode && (
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => {
            fadeAnim.setValue(0);
            slideAnim.setValue(40);
            setPhase('topic');
          }}
        >
          <Text style={styles.continueButtonText}>Continue → Choose Topic</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderTopicPhase = () => (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.backRow} onPress={() => setPhase('mode')}>
        <Text style={styles.backRowText}>← Back to Modes</Text>
      </TouchableOpacity>
      <View style={styles.modeTagRow}>
        <Text style={styles.modeTag}>{MODES.find(m => m.label === selectedMode)?.emoji} {selectedMode}</Text>
      </View>
      <Text style={styles.sectionLabel}>Choose a Topic</Text>
      <View style={styles.topicsGrid}>
        {SUGGESTED_TOPICS.map(topic => (
          <TouchableOpacity
            key={topic}
            style={[styles.topicChip, selectedTopic === topic && styles.topicChipActive]}
            onPress={() => { setSelectedTopic(topic); setCustomTopic(''); }}
          >
            <Text style={[styles.topicChipText, selectedTopic === topic && styles.topicChipTextActive]}>{topic}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.orDivider}>— or type your own —</Text>
      <TextInput
        style={styles.customTopicInput}
        placeholder="Enter a custom topic..."
        placeholderTextColor="#6B7280"
        value={customTopic}
        onChangeText={text => { setCustomTopic(text); setSelectedTopic(''); }}
      />
      <TouchableOpacity
        style={[styles.continueButton, !(selectedTopic || customTopic.trim()) && styles.continueButtonDisabled]}
        onPress={startPrepPhase}
        disabled={!(selectedTopic || customTopic.trim())}
      >
        <Text style={styles.continueButtonText}>Start Preparation ⏱️</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderPreparePhase = () => {
    const topic = selectedTopic || customTopic;
    const circumference = 2 * Math.PI * 44;
    const progress = (prepCountdown / 30) * circumference;
    return (
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, styles.centerPhase]}>
        <Text style={styles.prepTitle}>Get Ready!</Text>
        <Text style={styles.prepTopic}>"{topic}"</Text>
        <View style={styles.countdownContainer}>
          <View style={styles.countdownInner}>
            <Text style={styles.countdownNumber}>{prepCountdown}</Text>
            <Text style={styles.countdownLabel}>seconds</Text>
          </View>
        </View>
        <Text style={styles.prepHint}>Organize your thoughts and key points</Text>
        <View style={styles.prepTips}>
          {['Start with a strong hook', 'Have 3 main points ready', 'End with a memorable conclusion'].map((tip, i) => (
            <View key={i} style={styles.prepTipRow}>
              <Text style={styles.prepTipIcon}>💡</Text>
              <Text style={styles.prepTipText}>{tip}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.skipPrepButton} onPress={startSpeaking}>
          <Text style={styles.skipPrepText}>Skip Prep — Start Now</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSpeakingPhase = () => {
    const topic = selectedTopic || customTopic;
    return (
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.speakingHeader}>
          <Text style={styles.speakingTopic}>"{topic}"</Text>
          <Text style={styles.speakingMode}>{selectedMode}</Text>
        </View>
        <View style={styles.timerRow}>
          <Text style={styles.timerText}>{formatTime(speakingTime)}</Text>
          <Animated.View style={[styles.recordingBadge, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording...</Text>
          </Animated.View>
        </View>
        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptLabel}>Live Transcript</Text>
          <ScrollView style={styles.transcriptScroll} showsVerticalScrollIndicator={false}>
            {transcript ? (
              <Text style={styles.transcriptText}>{transcript}</Text>
            ) : (
              <Text style={styles.transcriptPlaceholder}>Your speech will appear here as you speak...</Text>
            )}
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.stopButton} onPress={stopSpeaking}>
          <View style={styles.stopIcon} />
          <Text style={styles.stopButtonText}>Stop & Analyze</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderResultsPhase = () => {
    if (!analysisResult) return null;
    return (
      <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Analysis Complete</Text>
          <Text style={styles.resultsMode}>{selectedMode}</Text>
        </View>

        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>Overall Score</Text>
          <View style={styles.overallScoreRow}>
            <Text style={[styles.overallScore, { color: getScoreColor(analysisResult.overall) }]}>
              {analysisResult.overall}
            </Text>
            <Text style={styles.overallMax}>/100</Text>
          </View>
          <View style={styles.scoreBarBg}>
            <Animated.View style={[styles.scoreBarFill, {
              width: scorePercent,
              backgroundColor: getScoreColor(analysisResult.overall),
            }]} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={[styles.statValue, { color: analysisResult.wpm > 160 ? '#F59E0B' : '#10B981' }]}>
              {analysisResult.wpm}
            </Text>
            <Text style={styles.statLabel}>Words/Min</Text>
            <Text style={styles.statHint}>{analysisResult.wpm > 160 ? 'Too fast' : analysisResult.wpm < 110 ? 'Too slow' : 'Perfect'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🗣️</Text>
            <Text style={[styles.statValue, { color: analysisResult.fillerCount > 5 ? '#EF4444' : '#10B981' }]}>
              {analysisResult.fillerCount}
            </Text>
            <Text style={styles.statLabel}>Filler Words</Text>
            <Text style={styles.statHint}>{analysisResult.fillerWords.join(', ')}</Text>
          </View>
        </View>

        <View style={styles.metricsCard}>
          {[
            { label: 'Fluency', score: analysisResult.fluency },
            { label: 'Clarity', score: analysisResult.clarity },
            { label: 'Pace', score: analysisResult.pace },
          ].map(({ label, score }) => (
            <View key={label} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{label}</Text>
              <View style={styles.metricBarBg}>
                <View style={[styles.metricBarFill, {
                  width: `${score}%`,
                  backgroundColor: getScoreColor(score / 10),
                }]} />
              </View>
              <Text style={[styles.metricScore, { color: getScoreColor(score / 10) }]}>{score}</Text>
            </View>
          ))}
        </View>

        <View style={styles.feedbackCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
            <Bot size={18} color="#A5B4FC" style={{marginRight: 6}} />
            <Text style={[styles.feedbackTitle, {marginBottom: 0}]}>AI Coaching Feedback</Text>
          </View>
          <Text style={styles.feedbackText}>{analysisResult.feedback}</Text>
        </View>

        <View style={styles.teluguCard}>
          <Text style={styles.teluguTitle}>🇮🇳 Telugu Tip</Text>
          <Text style={styles.teluguText}>{analysisResult.teluguTip}</Text>
        </View>

        <TouchableOpacity style={styles.practiceAgainButton} onPress={resetAll}>
          <Text style={styles.practiceAgainText}>Practice Again 🔄</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F1629" />
      <View style={styles.topBar}>
        {phase !== 'mode' && (
          <TouchableOpacity onPress={resetAll} style={styles.exitButton}>
            <Text style={styles.exitButtonText}>✕ Exit</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.topBarTitle}>Public Speaking</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {phase === 'mode' && renderModePhase()}
        {phase === 'topic' && renderTopicPhase()}
        {phase === 'prepare' && renderPreparePhase()}
        {phase === 'speaking' && renderSpeakingPhase()}
        {phase === 'results' && renderResultsPhase()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0B14' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F1629',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A4A',
  },
  topBarTitle: { color: '#E2E8F0', fontSize: 17, fontWeight: '700' },
  exitButton: { paddingHorizontal: 8, paddingVertical: 4 },
  exitButtonText: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Header
  headerCard: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
    backgroundColor: '#0F1629',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  headerEmoji: { fontSize: 52, marginBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#E2E8F0', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#64748B' },

  // Sections
  sectionLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },

  // Modes
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginBottom: 20 },
  modeCard: {
    width: '48%',
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2A4A',
    alignItems: 'center',
    position: 'relative',
  },
  modeEmoji: { fontSize: 32, marginBottom: 8 },
  modeLabel: { color: '#E2E8F0', fontSize: 15, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  modeDescription: { color: '#64748B', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  modeSelectedDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },

  // Continue
  continueButton: {
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
  continueButtonDisabled: { backgroundColor: '#1E2A4A', opacity: 0.5 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  // Back
  backRow: { marginBottom: 12 },
  backRowText: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
  modeTagRow: { marginBottom: 16 },
  modeTag: { color: '#A5B4FC', fontSize: 14, fontWeight: '700', backgroundColor: '#1E2A4A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },

  // Topics
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0F1629',
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  topicChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  topicChipText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  topicChipTextActive: { color: '#FFFFFF' },
  orDivider: { color: '#374151', textAlign: 'center', marginVertical: 12, fontSize: 13 },
  customTopicInput: {
    backgroundColor: '#0F1629',
    borderRadius: 12,
    padding: 14,
    color: '#E2E8F0',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1E2A4A',
    marginBottom: 16,
  },

  // Prepare
  centerPhase: { alignItems: 'center', paddingTop: 20 },
  prepTitle: { color: '#E2E8F0', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  prepTopic: { color: '#6366F1', fontSize: 16, fontWeight: '600', marginBottom: 30, textAlign: 'center' },
  countdownContainer: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#0F1629',
    borderWidth: 4, borderColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  countdownInner: { alignItems: 'center' },
  countdownNumber: { color: '#E2E8F0', fontSize: 48, fontWeight: '900' },
  countdownLabel: { color: '#64748B', fontSize: 13 },
  prepHint: { color: '#64748B', fontSize: 14, marginBottom: 20 },
  prepTips: { width: '100%', marginBottom: 24 },
  prepTipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 16 },
  prepTipIcon: { fontSize: 16, marginRight: 10 },
  prepTipText: { color: '#94A3B8', fontSize: 13 },
  skipPrepButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  skipPrepText: { color: '#64748B', fontSize: 14 },

  // Speaking
  speakingHeader: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E2A4A',
    alignItems: 'center',
  },
  speakingTopic: { color: '#E2E8F0', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  speakingMode: { color: '#6366F1', fontSize: 13 },
  timerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  timerText: { color: '#10B981', fontSize: 36, fontWeight: '900', fontVariant: ['tabular-nums'] },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A0A0A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginRight: 8 },
  recordingText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  transcriptCard: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E2A4A',
    minHeight: 160,
  },
  transcriptLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  transcriptScroll: { maxHeight: 200 },
  transcriptText: { color: '#CBD5E1', fontSize: 14, lineHeight: 24 },
  transcriptPlaceholder: { color: '#374151', fontSize: 14, fontStyle: 'italic' },
  stopButton: {
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  stopIcon: { width: 14, height: 14, backgroundColor: '#FFFFFF', borderRadius: 2 },
  stopButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  // Results
  resultsHeader: { marginBottom: 20 },
  resultsTitle: { color: '#E2E8F0', fontSize: 26, fontWeight: '800', marginBottom: 4 },
  resultsMode: { color: '#6366F1', fontSize: 14, fontWeight: '600' },
  overallCard: {
    backgroundColor: '#0F1629',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  overallLabel: { color: '#64748B', fontSize: 14, marginBottom: 8 },
  overallScoreRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  overallScore: { fontSize: 60, fontWeight: '900' },
  overallMax: { color: '#374151', fontSize: 22, marginBottom: 8, marginLeft: 4 },
  scoreBarBg: { width: '100%', height: 10, backgroundColor: '#0A0B14', borderRadius: 5, overflow: 'hidden' },
  scoreBarFill: { height: 10, borderRadius: 5 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  statEmoji: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statHint: { color: '#64748B', fontSize: 11, textAlign: 'center' },
  metricsCard: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  metricRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  metricLabel: { color: '#94A3B8', fontSize: 13, width: 70 },
  metricBarBg: { flex: 1, height: 8, backgroundColor: '#0A0B14', borderRadius: 4, overflow: 'hidden', marginHorizontal: 10 },
  metricBarFill: { height: 8, borderRadius: 4 },
  metricScore: { fontSize: 13, fontWeight: '700', width: 30, textAlign: 'right' },
  feedbackCard: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  feedbackTitle: { color: '#A5B4FC', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  feedbackText: { color: '#CBD5E1', fontSize: 14, lineHeight: 22 },
  teluguCard: {
    backgroundColor: '#0D1F1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#065F46',
  },
  teluguTitle: { color: '#10B981', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  teluguText: { color: '#6EE7B7', fontSize: 14, lineHeight: 24 },
  practiceAgainButton: {
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
  practiceAgainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
