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
  SafeAreaView,
  StatusBar,
  FlatList,
  Alert,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  category: string;
  callerName: string;
  callerEmoji: string;
  purpose: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  openingLine: string;
  followUps: string[];
  keyPhrases: string[];
  tips: string[];
}

interface Message {
  id: string;
  from: 'ai' | 'user';
  text: string;
  timestamp: string;
}

type Screen = 'select' | 'call' | 'summary';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: 'customer-support',
    category: 'Customer Support',
    callerName: 'Neha from Customer Care',
    callerEmoji: '👩‍💼',
    purpose: 'Handle a bank account query',
    difficulty: 'Easy',
    openingLine: "Good morning! You've reached ABC Bank customer care. How may I assist you today?",
    followUps: [
      "I understand. Could you please provide your registered mobile number for verification?",
      "Thank you for the details. I'm checking your account right now.",
      "I can see the transaction on our end. I'll raise a request to reverse it within 3 working days.",
      "Is there anything else I can help you with today?",
      "Thank you for calling ABC Bank. Have a wonderful day!",
    ],
    keyPhrases: ['Could you please', 'I understand', 'Thank you for calling', 'working days', 'registered mobile number'],
    tips: ['Speak clearly and politely', 'State your query concisely', 'Note down reference numbers'],
  },
  {
    id: 'interview',
    category: 'Interview',
    callerName: 'Priya from TechCorp HR',
    callerEmoji: '👩‍💻',
    purpose: 'Schedule a job interview',
    difficulty: 'Medium',
    openingLine: "Hi, I'm Priya calling from TechCorp HR. Is this the right number? We reviewed your resume and would like to schedule an interview for the Software Engineer position.",
    followUps: [
      "Great! Could you share your availability for next week, preferably Tuesday or Wednesday?",
      "Perfect. The interview will be a video call, 45 minutes long, with two rounds.",
      "We'll send you the meeting link and preparation materials to your registered email.",
      "Do you have any questions about the role or the interview process?",
      "Wonderful! We look forward to speaking with you. Best of luck!",
    ],
    keyPhrases: ['availability', 'video call', 'preparation materials', 'registered email', 'interview process'],
    tips: ['Confirm the date and time clearly', 'Ask about interview format', 'Thank the caller professionally'],
  },
  {
    id: 'client',
    category: 'Client',
    callerName: 'Rajesh — Business Client',
    callerEmoji: '👨‍💼',
    purpose: 'Discuss a project deadline',
    difficulty: 'Hard',
    openingLine: "Hello! This is Rajesh calling from Sunrise Exports. I wanted to discuss the delivery timeline for our order placed last week.",
    followUps: [
      "We were expecting the shipment by the 25th, but we haven't received any confirmation yet.",
      "It's quite urgent — our production schedule depends on this delivery.",
      "Can you guarantee the revised date? We may need it in writing.",
      "Alright. Who should I follow up with if there's a further delay?",
      "Very well. Thank you for the update. I'll await your email.",
    ],
    keyPhrases: ['delivery timeline', 'production schedule', 'guarantee', 'revised date', 'follow up'],
    tips: ['Stay calm under pressure', 'Acknowledge the concern', 'Offer concrete solutions'],
  },
  {
    id: 'appointment',
    category: 'Appointment',
    callerName: 'City Hospital Reception',
    callerEmoji: '🏥',
    purpose: 'Confirm a medical appointment',
    difficulty: 'Easy',
    openingLine: "Hello! I'm calling from City Hospital. We have your appointment scheduled for tomorrow at 10 AM with Dr. Sharma. Are you able to make it?",
    followUps: [
      "Great! Please carry your previous reports and the original prescription.",
      "The OPD is on the second floor, Room 204. Registration opens at 9:30 AM.",
      "Do you need assistance with transportation or parking?",
      "If you need to reschedule, please call us at least 4 hours in advance.",
      "We'll send an appointment reminder SMS tonight. See you tomorrow!",
    ],
    keyPhrases: ['appointment', 'prescriptions', 'registration', 'reschedule', 'reminder'],
    tips: ['Confirm date, time, and doctor name', 'Ask about documents needed', 'Note the location details'],
  },
  {
    id: 'office',
    category: 'Office',
    callerName: 'Manager — Suresh Sir',
    callerEmoji: '👨‍🏫',
    purpose: 'Update on project status',
    difficulty: 'Medium',
    openingLine: "Good afternoon! This is Suresh. I wanted a quick update on the quarterly report you were working on.",
    followUps: [
      "Has the data collection from all departments been completed?",
      "Alright. What are the main bottlenecks causing the delay?",
      "I see. Can you send me a progress document by end of today?",
      "Make sure the finance section is reviewed by Ravi before submission.",
      "Good. Keep me posted. Let's touch base again tomorrow morning.",
    ],
    keyPhrases: ['quarterly report', 'bottlenecks', 'progress document', 'by end of today', 'touch base'],
    tips: ['Be concise and factual', 'Own up to delays professionally', 'Propose a clear timeline'],
  },
  {
    id: 'banking',
    category: 'Banking',
    callerName: 'HDFC Loan Department',
    callerEmoji: '🏦',
    purpose: 'Home loan enquiry follow-up',
    difficulty: 'Hard',
    openingLine: "Hello! I'm calling from HDFC Home Loans. You had submitted an inquiry about our home loan product last week. Is this a good time to talk?",
    followUps: [
      "Based on your profile, you may be eligible for a loan up to ₹60 lakhs at 8.5% per annum.",
      "The tenure can range from 5 to 30 years. What monthly EMI would suit your budget?",
      "We'll need your salary slips, Form 16, bank statements, and KYC documents.",
      "Our representative can visit your home or office for document collection — would that work?",
      "I'll send you the complete checklist and tentative schedule on your email. Thank you for your time!",
    ],
    keyPhrases: ['eligible', 'per annum', 'EMI', 'KYC documents', 'document collection'],
    tips: ['Ask for key terms in writing', 'Clarify processing fees', 'Understand prepayment clauses'],
  },
];

const CATEGORIES = ['All', 'Customer Support', 'Interview', 'Client', 'Appointment', 'Office', 'Banking'];

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: '#D4EDDA', text: '#155724' },
  Medium: { bg: '#FFF3CD', text: '#856404' },
  Hard: { bg: '#F8D7DA', text: '#721C24' },
};

function getTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PhoneSimulatorScreen: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('select');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [aiTurnIndex, setAiTurnIndex] = useState(0);
  const [callStarted, setCallStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [communicationScore, setCommunicationScore] = useState(0);
  const [rating, setRating] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Pulse animation for avatar
  useEffect(() => {
    if (screen === 'call') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [screen]);

  // Ring animation
  useEffect(() => {
    if (screen === 'call' && !callStarted) {
      const ring = Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(ringAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      );
      ring.start();
      return () => ring.stop();
    }
  }, [screen, callStarted]);

  // Timer
  useEffect(() => {
    if (callStarted && screen === 'call') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStarted, screen]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startCall = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setMessages([]);
    setAiTurnIndex(0);
    setCallDuration(0);
    setCallStarted(false);
    setMuted(false);
    setSpeakerOn(false);
    setScreen('call');

    // Auto-answer after 2s
    setTimeout(() => {
      setCallStarted(true);
      const openingMsg: Message = {
        id: Date.now().toString(),
        from: 'ai',
        text: scenario.openingLine,
        timestamp: getTime(),
      };
      setMessages([openingMsg]);
      setAiTurnIndex(0);
    }, 2000);
  };

  const sendUserReply = () => {
    if (!userInput.trim() || !activeScenario) return;
    const userMsg: Message = { id: Date.now().toString(), from: 'user', text: userInput.trim(), timestamp: getTime() };
    setMessages(prev => [...prev, userMsg]);
    setUserInput('');

    const nextIdx = aiTurnIndex;
    if (nextIdx < activeScenario.followUps.length) {
      setTimeout(() => {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          from: 'ai',
          text: activeScenario.followUps[nextIdx],
          timestamp: getTime(),
        };
        setMessages(prev => [...prev, aiMsg]);
        setAiTurnIndex(i => i + 1);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }, 1200);
    }
  };

  const endCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Calculate score based on messages sent
    const userMsgCount = messages.filter(m => m.from === 'user').length;
    const baseScore = Math.min(100, 50 + userMsgCount * 10);
    setCommunicationScore(baseScore);
    setRating(baseScore >= 80 ? 5 : baseScore >= 65 ? 4 : baseScore >= 50 ? 3 : 2);
    setScreen('summary');
  };

  const resetToSelect = () => {
    setScreen('select');
    setActiveScenario(null);
    setMessages([]);
    setCallDuration(0);
    setCallStarted(false);
  };

  const filteredScenarios = selectedCategory === 'All'
    ? SCENARIOS
    : SCENARIOS.filter(s => s.category === selectedCategory);

  // ─── Scenario Selection Screen ──────────────────────────────────────────────

  const renderSelect = () => (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F8FF" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.selectHeader}>
          <Text style={styles.selectTitle}>📞 Phone Call Practice</Text>
          <Text style={styles.selectSub}>ఇంగ్లీషులో phone calls practice చేయండి</Text>
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Scenario Cards */}
        <View style={styles.scenarioList}>
          {filteredScenarios.map(scenario => {
            const dc = DIFFICULTY_COLORS[scenario.difficulty];
            return (
              <View key={scenario.id} style={styles.scenarioCard}>
                <View style={styles.scenarioCardTop}>
                  <Text style={styles.scenarioEmoji}>{scenario.callerEmoji}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.scenarioCallerName}>{scenario.callerName}</Text>
                    <Text style={styles.scenarioPurpose}>{scenario.purpose}</Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: dc.bg }]}>
                    <Text style={[styles.diffText, { color: dc.text }]}>{scenario.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.scenarioPreview} numberOfLines={2}>"{scenario.openingLine}"</Text>
                <TouchableOpacity style={styles.startCallBtn} onPress={() => startCall(scenario)} activeOpacity={0.85}>
                  <Text style={styles.startCallBtnText}>📞 Start Call</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // ─── Active Call Screen ─────────────────────────────────────────────────────

  const renderCall = () => {
    if (!activeScenario) return null;
    return (
      <View style={styles.callScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0D2137" />
        <SafeAreaView style={{ flex: 1 }}>
          {/* Top: Caller Info */}
          <View style={styles.callerSection}>
            <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{activeScenario.callerEmoji}</Text>
              </View>
            </Animated.View>
            <Text style={styles.callerName}>{activeScenario.callerName}</Text>
            <Text style={styles.callerLabel}>AI Caller • {activeScenario.category}</Text>
            {callStarted ? (
              <Text style={styles.callTimer}>{formatDuration(callDuration)}</Text>
            ) : (
              <Animated.Text style={[styles.ringing, { opacity: ringAnim }]}>Ringing...</Animated.Text>
            )}
          </View>

          {/* Transcript */}
          <ScrollView
            ref={scrollRef}
            style={styles.transcriptScroll}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={false}
          >
            {!callStarted && (
              <Text style={styles.transcriptPlaceholder}>Connecting to {activeScenario.callerName}...</Text>
            )}
            {messages.map(msg => (
              <View key={msg.id} style={[styles.msgBubble, msg.from === 'ai' ? styles.aiBubble : styles.userBubble]}>
                <Text style={styles.msgSender}>{msg.from === 'ai' ? activeScenario.callerName : 'You'}</Text>
                <Text style={styles.msgText}>{msg.text}</Text>
                <Text style={styles.msgTime}>{msg.timestamp}</Text>
              </View>
            ))}
          </ScrollView>

          {/* User Input */}
          {callStarted && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.callInput}
                placeholder="Type your reply..."
                placeholderTextColor="rgba(255,255,255,0.45)"
                value={userInput}
                onChangeText={setUserInput}
                returnKeyType="send"
                onSubmitEditing={sendUserReply}
                multiline
              />
              <TouchableOpacity style={styles.replyBtn} onPress={sendUserReply} activeOpacity={0.85}>
                <Text style={styles.replyBtnText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.callControls}>
            <TouchableOpacity style={[styles.ctrlBtn, muted && styles.ctrlBtnActive]} onPress={() => setMuted(m => !m)}>
              <Text style={styles.ctrlBtnIcon}>{muted ? '🔇' : '🎙️'}</Text>
              <Text style={styles.ctrlBtnLabel}>{muted ? 'Muted' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
              <Text style={styles.endCallIcon}>📵</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.ctrlBtn, speakerOn && styles.ctrlBtnActive]} onPress={() => setSpeakerOn(s => !s)}>
              <Text style={styles.ctrlBtnIcon}>🔊</Text>
              <Text style={styles.ctrlBtnLabel}>{speakerOn ? 'On' : 'Speaker'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  };

  // ─── Call Summary Screen ────────────────────────────────────────────────────

  const renderSummary = () => {
    if (!activeScenario) return null;
    const userMsgs = messages.filter(m => m.from === 'user');
    const usedPhrases = activeScenario.keyPhrases.filter(phrase =>
      userMsgs.some(m => m.text.toLowerCase().includes(phrase.toLowerCase()))
    );
    const missedPhrases = activeScenario.keyPhrases.filter(phrase =>
      !userMsgs.some(m => m.text.toLowerCase().includes(phrase.toLowerCase()))
    );

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#F0F8FF" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summaryContent}>
          {/* Header */}
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryIcon}>📞</Text>
            <Text style={styles.summaryTitle}>Call Ended</Text>
            <Text style={styles.summaryDuration}>Duration: {formatDuration(callDuration)}</Text>
          </View>

          {/* Score */}
          <View style={styles.summaryScoreCard}>
            <Text style={styles.summaryScoreLabel}>Communication Score</Text>
            <View style={[styles.summaryScoreCircle, { backgroundColor: communicationScore >= 80 ? '#28A745' : communicationScore >= 60 ? '#FFC107' : '#DC3545' }]}>
              <Text style={styles.summaryScoreNum}>{communicationScore}</Text>
              <Text style={styles.summaryScoreMax}>/100</Text>
            </View>
          </View>

          {/* Rating */}
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Your Rating</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Text style={[styles.star, star <= rating && styles.starFilled]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Phrases Used */}
          {usedPhrases.length > 0 && (
            <View style={styles.phrasesCard}>
              <Text style={styles.phrasesTitle}>✅ Key Phrases Used Correctly</Text>
              {usedPhrases.map((p, i) => (
                <View key={i} style={styles.phraseRow}>
                  <Text style={styles.phraseGreen}>• "{p}"</Text>
                </View>
              ))}
            </View>
          )}

          {/* Improvement Tips */}
          {(missedPhrases.length > 0 || activeScenario.tips.length > 0) && (
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 What to Say Better</Text>
              {missedPhrases.map((p, i) => (
                <Text key={i} style={styles.tipRed}>• Practice using: "{p}"</Text>
              ))}
              {activeScenario.tips.map((tip, i) => (
                <Text key={`tip-${i}`} style={styles.tipBlue}>• {tip}</Text>
              ))}
            </View>
          )}

          {/* Conversation Recap */}
          <View style={styles.recapCard}>
            <Text style={styles.recapTitle}>📋 Conversation Recap</Text>
            {messages.map((msg, i) => (
              <View key={i} style={styles.recapRow}>
                <Text style={styles.recapSender}>{msg.from === 'ai' ? activeScenario.callerName : 'You'}: </Text>
                <Text style={styles.recapText} numberOfLines={2}>{msg.text}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <TouchableOpacity style={styles.tryAgainBtn} onPress={() => startCall(activeScenario)} activeOpacity={0.85}>
            <Text style={styles.tryAgainText}>🔄 Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backToSelectBtn} onPress={resetToSelect} activeOpacity={0.85}>
            <Text style={styles.backToSelectText}>← Choose Another Scenario</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  };

  if (screen === 'select') return renderSelect();
  if (screen === 'call') return renderCall();
  if (screen === 'summary') return renderSummary();
  return null;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F8FF' },

  // Select Screen
  selectHeader: { backgroundColor: '#1E3A5F', padding: 24, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  selectTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  selectSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  categoryScroll: { marginTop: 16, marginBottom: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#E0EAF8', borderRadius: 20, marginRight: 10 },
  catChipActive: { backgroundColor: '#1E3A5F' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#1E3A5F' },
  catChipTextActive: { color: '#fff' },

  scenarioList: { padding: 16 },
  scenarioCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#1E3A5F', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  scenarioCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scenarioEmoji: { fontSize: 38 },
  scenarioCallerName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  scenarioPurpose: { fontSize: 12, color: '#666', marginTop: 2 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diffText: { fontSize: 11, fontWeight: '700' },
  scenarioPreview: { fontSize: 13, color: '#555', fontStyle: 'italic', marginBottom: 12, lineHeight: 19 },
  startCallBtn: { backgroundColor: '#1E3A5F', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  startCallBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Active Call Screen
  callScreen: { flex: 1, backgroundColor: '#0D2137' },

  callerSection: { alignItems: 'center', paddingTop: 30, paddingBottom: 14 },
  avatarRing: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 44 },
  callerName: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  callerLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  callTimer: { fontSize: 28, fontWeight: '300', color: '#7FDBFF', marginTop: 8 },
  ringing: { fontSize: 16, color: '#7FDBFF', marginTop: 8 },

  transcriptScroll: { flex: 1, marginHorizontal: 12 },
  transcriptContent: { paddingVertical: 8 },
  transcriptPlaceholder: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, marginTop: 20 },

  msgBubble: { maxWidth: '82%', borderRadius: 16, padding: 12, marginBottom: 10 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.12)', borderBottomLeftRadius: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1A6EBD', borderBottomRightRadius: 4 },
  msgSender: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginBottom: 3 },
  msgText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4, alignSelf: 'flex-end' },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  callInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14, maxHeight: 80, marginRight: 8 },
  replyBtn: { backgroundColor: '#1A6EBD', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  replyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  callControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  ctrlBtn: { alignItems: 'center', width: 70, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' },
  ctrlBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  ctrlBtnIcon: { fontSize: 26 },
  ctrlBtnLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  endCallBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#E53935', alignItems: 'center', justifyContent: 'center', shadowColor: '#E53935', shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 },
  endCallIcon: { fontSize: 28 },

  // Summary Screen
  summaryContent: { padding: 20, paddingBottom: 40 },
  summaryHeader: { alignItems: 'center', backgroundColor: '#1E3A5F', borderRadius: 20, padding: 24, marginBottom: 18 },
  summaryIcon: { fontSize: 48, marginBottom: 8 },
  summaryTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  summaryDuration: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  summaryScoreCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  summaryScoreLabel: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  summaryScoreCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  summaryScoreNum: { fontSize: 30, fontWeight: '800', color: '#fff' },
  summaryScoreMax: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  ratingCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  ratingTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  starsRow: { flexDirection: 'row' },
  star: { fontSize: 36, color: '#DDD', marginHorizontal: 4 },
  starFilled: { color: '#FFC107' },

  phrasesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#28A745' },
  phrasesTitle: { fontSize: 15, fontWeight: '700', color: '#155724', marginBottom: 10 },
  phraseRow: { marginBottom: 4 },
  phraseGreen: { fontSize: 14, color: '#28A745', fontWeight: '600' },

  tipsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: '#FFC107' },
  tipsTitle: { fontSize: 15, fontWeight: '700', color: '#856404', marginBottom: 10 },
  tipRed: { fontSize: 13, color: '#DC3545', marginBottom: 5 },
  tipBlue: { fontSize: 13, color: '#004085', marginBottom: 5 },

  recapCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 18 },
  recapTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 10 },
  recapRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  recapSender: { fontSize: 12, fontWeight: '700', color: '#1E3A5F', minWidth: 50 },
  recapText: { fontSize: 12, color: '#555', flex: 1 },

  tryAgainBtn: { backgroundColor: '#1E3A5F', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  tryAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backToSelectBtn: { backgroundColor: '#E0EAF8', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  backToSelectText: { color: '#1E3A5F', fontSize: 15, fontWeight: '700' },
});

export default PhoneSimulatorScreen;
