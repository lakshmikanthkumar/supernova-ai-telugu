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
  Platform,
  Alert,
} from 'react-native';
import {
  initializeSpeechRecognition,
  destroySpeechRecognition,
  startListening,
  stopListening,
  isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition';

const { width } = Dimensions.get('window');

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
  { emoji: '📊', label: 'Presentation', description: 'Clear and professional delivery', color: '#7B61FF' },
  { emoji: '📖', label: 'Storytelling', description: 'Engage through narrative', color: '#10B981' },
];

const SUGGESTED_TOPICS = [
  'My Journey to Learn English',
  'Technology in India',
  'My Hometown',
  'My Dream Career',
  'Climate Change',
];

const FILLER_WORDS = [
  'um', 'uh', 'like', 'you know', 'basically', 'literally', 'actually', 'so', 'right',
];

// ============================================================
// LOCAL SPEECH ANALYSIS — no network call needed
// ============================================================

function analyzeSpeech(transcript: string, speakingSeconds: number, mode: SpeakingMode): AnalysisResult {
  const text = transcript.trim();
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // WPM
  const speakingMinutes = Math.max(speakingSeconds / 60, 0.1);
  const wpm = Math.round(wordCount / speakingMinutes);

  // Filler word detection (case-insensitive, whole-word match)
  const lowerText = text.toLowerCase();
  const foundFillers: string[] = [];
  let totalFillerCount = 0;

  for (const filler of FILLER_WORDS) {
    // For multi-word fillers like "you know", do a simple indexOf scan
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      foundFillers.push(filler);
      totalFillerCount += matches.length;
    }
  }

  // Fluency score: based on WPM (100–170 WPM is ideal = 80–100 score)
  let fluency: number;
  if (wpm >= 100 && wpm <= 170) {
    // Scale 100–170 → 80–100
    fluency = Math.round(80 + ((wpm - 100) / 70) * 20);
  } else if (wpm < 100) {
    // Too slow: scale 0–99 → 0–79
    fluency = Math.max(0, Math.round((wpm / 100) * 79));
  } else {
    // Too fast: penalise above 170
    fluency = Math.max(40, Math.round(100 - ((wpm - 170) / 2)));
  }

  // Deduct for filler words — each filler above 2 costs 3 points
  const fillerPenalty = Math.max(0, (totalFillerCount - 2) * 3);
  fluency = Math.max(0, Math.min(100, fluency - fillerPenalty));

  // Clarity: heuristic — average words per sentence
  // Split on sentence-ending punctuation
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);
  const avgWordsPerSentence = wordCount / sentenceCount;
  // Ideal sentence length: 10–20 words → clarity 75–100
  let clarity: number;
  if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 20) {
    clarity = Math.round(75 + ((avgWordsPerSentence - 10) / 10) * 25);
  } else if (avgWordsPerSentence < 10) {
    clarity = Math.round(50 + (avgWordsPerSentence / 10) * 25);
  } else {
    // Very long sentences reduce clarity
    clarity = Math.max(40, Math.round(100 - (avgWordsPerSentence - 20) * 2));
  }

  // Pace score: derived from WPM relative to mode ideals
  const idealWpm: Record<SpeakingMode, number> = {
    'TED-style': 140,
    'Debate': 145,
    'Motivational': 135,
    'Presentation': 150,
    'Storytelling': 125,
  };
  const ideal = idealWpm[mode];
  const deviation = Math.abs(wpm - ideal);
  const pace = Math.max(40, Math.min(100, Math.round(100 - deviation * 0.8)));

  // Overall: weighted average
  const overall = Math.round(fluency * 0.4 + clarity * 0.3 + pace * 0.3);

  // ---- Feedback generation ----
  const wpmDesc = wpm > 170 ? 'too fast' : wpm < 100 ? 'too slow' : 'good';
  const fillerDesc = totalFillerCount === 0
    ? 'No filler words detected — excellent!'
    : totalFillerCount <= 2
    ? `Only ${totalFillerCount} filler word(s) — great self-awareness.`
    : `${totalFillerCount} filler words detected (${foundFillers.slice(0, 3).join(', ')}). Work on replacing them with pauses.`;

  const paceAdvice = wpm > 170
    ? `Slow down — you're speaking at ${wpm} WPM. Aim for ${ideal} WPM for ${mode} to let your audience follow you.`
    : wpm < 100
    ? `Pick up the pace — ${wpm} WPM is too slow. Aim for around ${ideal} WPM for ${mode}.`
    : `Your pace of ${wpm} WPM is ${wpmDesc} for ${mode}.`;

  const modeSpecificTip: Record<SpeakingMode, string> = {
    'TED-style': "Add a 3-second pause after key points for dramatic effect. Vary your pitch and volume to keep the audience engaged.",
    'Debate': "Use strong transitions — 'Furthermore', 'In contrast', 'Therefore' — to connect arguments logically.",
    'Motivational': "Build energy progressively. End with a powerful call to action that your audience can act on immediately.",
    'Presentation': "Structure your talk clearly: tell them what you'll say, say it, then summarise. Use data to back claims.",
    'Storytelling': "Use sensory detail and the 'show don't tell' technique. Describe actions that reveal emotions rather than naming them.",
  };

  const scoreLabel = overall >= 80 ? 'Excellent' : overall >= 60 ? 'Good' : 'Keep Practising';
  const feedback = `${scoreLabel} ${mode} delivery! ${paceAdvice} ${fillerDesc} ${modeSpecificTip[mode]}`;

  // ---- Telugu tip generation ----
  const teluguTips: Record<SpeakingMode, string> = {
    'TED-style': `మీ speech ${wpm} WPM వేగంతో వచ్చింది. ${wpm > 170 ? 'కొంచెం నెమ్మదిగా మాట్లాడండి.' : wpm < 100 ? 'కొంచెం వేగంగా మాట్లాడండి.' : 'వేగం బాగుంది!'} Important points తర్వాత pause తీసుకోండి — audience కి absorb చేసుకోవడానికి సమయం ఇవ్వండి.`,
    'Debate': `Debate లో clarity చాలా important. మీ arguments మధ్య strong transitions వాడండి — 'మొదటగా', 'అంతేకాక', 'కాబట్టి' వంటివి. ${totalFillerCount > 3 ? "Filler words తగ్గించండి." : "Filler words బాగా control చేస్తున్నారు!"}`,
    'Motivational': `మీ motivational speech లో energy ${overall >= 70 ? 'బాగుంది' : 'improve చేయాలి'}! Voice tone vary చేయండి — exciting moments లో pitch పెంచండి. Strong call-to-action తో end చేయండి.`,
    'Presentation': `Professional presentation లో 'um' అనే బదులు silent pause తీసుకోండి — ఇది confident గా అనిపిస్తుంది. మీ data points clearly చెప్పారు — ఇది మీ strong point.`,
    'Storytelling': `Storytelling లో sensory details వాడండి — చూడడం, వినడం, తాకడం describe చేయండి. మీ pace (${wpm} WPM) ${wpm >= 110 && wpm <= 140 ? 'storytelling కి perfect గా ఉంది' : 'కొంచెం adjust చేయండి'}.`,
  };

  const teluguTip = teluguTips[mode];

  return {
    overall: Math.max(0, Math.min(100, overall)),
    wpm,
    fillerWords: foundFillers,
    fillerCount: totalFillerCount,
    fluency: Math.max(0, Math.min(100, fluency)),
    clarity: Math.max(0, Math.min(100, clarity)),
    pace: Math.max(0, Math.min(100, pace)),
    feedback,
    teluguTip,
  };
}

// ============================================================
// COMPONENT
// ============================================================

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
  const [sttAvailable, setSttAvailable] = useState<boolean | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);

  const scoreAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Accumulated transcript across multiple STT result events
  const accumulatedTranscriptRef = useRef('');
  // Current speaking time at point of stop (for analysis)
  const speakingTimeRef = useRef(0);

  // Phase fade/slide animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [phase]);

  // Recording pulse animation
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

  // Initialize STT on mount, destroy on unmount
  useEffect(() => {
    initializeSpeechRecognition();

    isSpeechRecognitionAvailable().then(available => {
      setSttAvailable(available);
    });

    return () => {
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (speakTimerRef.current) clearInterval(speakTimerRef.current);
      destroySpeechRecognition();
    };
  }, []);

  // Keep speakingTimeRef in sync with state for use in callbacks
  useEffect(() => {
    speakingTimeRef.current = speakingTime;
  }, [speakingTime]);

  const startSpeaking = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setSpeakingTime(0);
    speakingTimeRef.current = 0;
    setIsRecording(true);
    setTranscript('');
    setSttError(null);
    accumulatedTranscriptRef.current = '';
    setPhase('speaking');

    // Start speaking timer
    let time = 0;
    speakTimerRef.current = setInterval(() => {
      time += 1;
      setSpeakingTime(time);
      speakingTimeRef.current = time;
    }, 1000);

    // Start STT
    if (sttAvailable) {
      startListening({
        language: 'en-IN',
        partialResults: true,
        continuous: Platform.OS === 'android' || Platform.OS === 'web', // Android and Web support continuous
        onPartialResult: (text: string) => {
          // Show live partial transcript
          setTranscript(text);
        },
        onFinalResult: (result) => {
          // Append final result to accumulated transcript
          const newText = result.transcript.trim();
          if (newText) {
            const prev = accumulatedTranscriptRef.current;
            accumulatedTranscriptRef.current = prev ? `${prev} ${newText}` : newText;
            setTranscript(accumulatedTranscriptRef.current);
          }
          // On Android continuous mode, restart listening to keep capturing
          if (Platform.OS === 'android') {
            startListening({
              language: 'en-IN',
              partialResults: true,
              continuous: true,
              onPartialResult: (text: string) => {
                const base = accumulatedTranscriptRef.current;
                setTranscript(base ? `${base} ${text}` : text);
              },
              onFinalResult: (r) => {
                const t = r.transcript.trim();
                if (t) {
                  const p = accumulatedTranscriptRef.current;
                  accumulatedTranscriptRef.current = p ? `${p} ${t}` : t;
                  setTranscript(accumulatedTranscriptRef.current);
                }
              },
              onError: (err: string) => {
                // Silently ignore common interim errors (busy, no-speech) during ongoing session
                const ignorable = ['no speech', 'no match', 'busy'];
                const errLower = err.toLowerCase();
                if (!ignorable.some(e => errLower.includes(e))) {
                  setSttError(err);
                }
              },
              onEnd: () => {},
            });
          }
        },
        onError: (err: string) => {
          // Silently ignore common non-fatal errors
          const ignorable = ['no speech', 'no match', 'busy', 'aborted'];
          const errLower = err.toLowerCase();
          if (!ignorable.some(e => errLower.includes(e))) {
            setSttError(err);
          }
        },
        onEnd: () => {},
      });
    }
  }, [sttAvailable, selectedMode]);

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
  }, [selectedMode, selectedTopic, customTopic, startSpeaking]);

  const resetAll = useCallback(async () => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    if (isRecording && sttAvailable) {
      await stopListening();
    }
    setIsRecording(false);
    setSelectedMode(null);
    setSelectedTopic('');
    setCustomTopic('');
    setPrepCountdown(30);
    setSpeakingTime(0);
    speakingTimeRef.current = 0;
    setTranscript('');
    accumulatedTranscriptRef.current = '';
    setAnalysisResult(null);
    setSttError(null);
    scoreAnimation.setValue(0);
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setPhase('mode');
  }, [isRecording, sttAvailable]);

  const stopSpeaking = useCallback(async () => {
    if (speakTimerRef.current) clearInterval(speakTimerRef.current);
    setIsRecording(false);

    // Stop STT and collect final transcript
    if (sttAvailable) {
      await stopListening();
    }

    const finalTranscript = accumulatedTranscriptRef.current || transcript;
    const finalTime = speakingTimeRef.current;

    if (!finalTranscript.trim() || finalTime < 3) {
      // Not enough speech captured
      const fallbackMsg = sttAvailable
        ? 'Not enough speech was captured. Please speak clearly into your microphone for at least a few seconds and try again.'
        : 'Speech recognition is not available on this device. Please try on a different device or check your microphone settings.';

      if (Platform.OS === 'web') {
        const useDemo = window.confirm(
          `${fallbackMsg}\n\nClick "OK" to use Demo Content, or "Cancel" to try again.`
        );
        if (useDemo) {
          const demoText = "Good afternoon everyone. Today I want to share my thoughts on this topic. It's a subject close to my heart, and I believe we need to address it with creativity and perseverance. There are three key elements to keep in mind: first, connection; second, clarity; and third, commitment.";
          const result = analyzeSpeech(demoText, 15, selectedMode!);
          setAnalysisResult(result);
          scoreAnimation.setValue(0);
          Animated.timing(scoreAnimation, {
            toValue: result.overall,
            duration: 1600,
            useNativeDriver: false,
          }).start();
          fadeAnim.setValue(0);
          slideAnim.setValue(40);
          setPhase('results');
        } else {
          resetAll();
        }
        return;
      }

      Alert.alert(
        'No Speech Detected',
        fallbackMsg,
        [
          { text: 'Try Again', onPress: resetAll },
          {
            text: 'Use Demo Content',
            onPress: () => {
              const demoText = "Good afternoon everyone. Today I want to share my thoughts on this topic. It's a subject close to my heart, and I believe we need to address it with creativity and perseverance. There are three key elements to keep in mind: first, connection; second, clarity; and third, commitment.";
              const result = analyzeSpeech(demoText, 15, selectedMode!);
              setAnalysisResult(result);
              scoreAnimation.setValue(0);
              Animated.timing(scoreAnimation, {
                toValue: result.overall,
                duration: 1600,
                useNativeDriver: false,
              }).start();
              fadeAnim.setValue(0);
              slideAnim.setValue(40);
              setPhase('results');
            }
          }
        ]
      );
      return;
    }

    const result = analyzeSpeech(finalTranscript, finalTime, selectedMode!);
    setAnalysisResult(result);
    scoreAnimation.setValue(0);
    Animated.timing(scoreAnimation, {
      toValue: result.overall,
      duration: 1600,
      useNativeDriver: false,
    }).start();
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    setPhase('results');
  }, [sttAvailable, transcript, selectedMode, resetAll, fadeAnim, slideAnim]);

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

  // ============================================================
  // PHASE RENDERERS
  // ============================================================

  const renderModePhase = () => (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>🎙️</Text>
        <Text style={styles.headerTitle}>Public Speaking</Text>
        <Text style={styles.headerSubtitle}>Build confidence, speak powerfully</Text>
      </View>
      {sttAvailable === false && (
        <View style={styles.sttWarningBanner}>
          <Text style={styles.sttWarningText}>
            ⚠️ Speech recognition is not available on this device. You can still practice, but live transcription will not work.
          </Text>
        </View>
      )}
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
        {sttError && (
          <View style={styles.sttErrorBanner}>
            <Text style={styles.sttErrorText}>⚠️ {sttError}</Text>
          </View>
        )}
        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptLabel}>Live Transcript</Text>
          <ScrollView style={styles.transcriptScroll} showsVerticalScrollIndicator={false}>
            {transcript ? (
              <Text style={styles.transcriptText}>{transcript}</Text>
            ) : (
              <Text style={styles.transcriptPlaceholder}>
                {sttAvailable
                  ? 'Your speech will appear here as you speak...'
                  : 'Speech recognition not available. Speak your practice — analysis will use speaking time only.'}
              </Text>
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
            <Text style={styles.statHint}>
              {analysisResult.fillerWords.length > 0 ? analysisResult.fillerWords.join(', ') : 'None detected'}
            </Text>
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
                  backgroundColor: getScoreColor(score),
                }]} />
              </View>
              <Text style={[styles.metricScore, { color: getScoreColor(score) }]}>{score}</Text>
            </View>
          ))}
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>🤖 AI Coaching Feedback</Text>
          <Text style={styles.feedbackText}>{analysisResult.feedback}</Text>
        </View>

        <View style={styles.teluguCard}>
          <Text style={styles.teluguTitle}>🇮🇳 Telugu Tip</Text>
          <Text style={styles.teluguText}>{analysisResult.teluguTip}</Text>
        </View>

        {transcript.trim().length > 0 && (
          <View style={styles.transcriptResultCard}>
            <Text style={styles.transcriptResultTitle}>📝 Your Transcript</Text>
            <Text style={styles.transcriptResultText}>{transcript}</Text>
          </View>
        )}

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

  // STT availability banners
  sttWarningBanner: {
    backgroundColor: '#1A1000',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#92400E',
  },
  sttWarningText: { color: '#FCD34D', fontSize: 13, lineHeight: 20 },
  sttErrorBanner: {
    backgroundColor: '#1A0A0A',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  sttErrorText: { color: '#FCA5A5', fontSize: 12, lineHeight: 18 },

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

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  modeCard: {
    width: '48.5%',
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E2A4A',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  modeEmoji: { fontSize: 32, marginBottom: 8 },
  modeLabel: { color: '#E2E8F0', fontSize: 15, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  modeDescription: { color: '#64748B', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  modeSelectedDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },

  // Continue
  continueButton: {
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
  topicChipActive: { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
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
  centerPhase: { alignItems: 'center', paddingTop: 20, width: '100%' },
  prepTitle: { color: '#E2E8F0', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  prepTopic: { color: '#6366F1', fontSize: 16, fontWeight: '600', marginBottom: 30, textAlign: 'center' },
  countdownContainer: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: '#0F1629',
    borderWidth: 4, borderColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#7B61FF',
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#065F46',
  },
  teluguTitle: { color: '#10B981', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  teluguText: { color: '#6EE7B7', fontSize: 14, lineHeight: 24 },
  transcriptResultCard: {
    backgroundColor: '#0F1629',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E2A4A',
  },
  transcriptResultTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  transcriptResultText: { color: '#64748B', fontSize: 13, lineHeight: 22, fontStyle: 'italic' },
  practiceAgainButton: {
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
  practiceAgainText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
