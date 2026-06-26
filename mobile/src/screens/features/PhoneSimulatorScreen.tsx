import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Speech from 'expo-speech';
import { supabase } from '../../services/supabase';
import {
  startListening,
  stopListening,
  cancelListening,
  initializeSpeechRecognition,
  destroySpeechRecognition,
  isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition';
import { Colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  title: string;
  emoji: string;
  category: string;
  difficulty: 1 | 2 | 3;
  difficultyLabel: 'Easy' | 'Medium' | 'Hard';
  description: string;
  callerName: string;
  callerTitle: string;
  openingLine: string;
  keyPhrases: string[];
  culturalNote: string;
  teluguTip: string;
  systemPrompt: string;
}

interface Message {
  id: string;
  from: 'ai' | 'user';
  text: string;
  timestamp: string;
}

type Screen = 'select' | 'ringing' | 'call' | 'summary';

// ─── Scenario Data ────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: 'customer-service',
    title: 'Customer Service Inquiry',
    emoji: '🛎️',
    category: 'Customer Service',
    difficulty: 1,
    difficultyLabel: 'Easy',
    description: 'Call a company to ask about a product or service issue.',
    callerName: 'Meena',
    callerTitle: 'Customer Care Executive — ShopEasy',
    openingLine:
      "Good morning! Thank you for calling ShopEasy customer support. My name is Meena. How may I assist you today?",
    keyPhrases: [
      "I would like to inquire about",
      "Could you please help me",
      "I placed an order",
      "Can you confirm",
      "Thank you for your help",
      "I understand",
    ],
    culturalNote:
      "In India, customer care agents expect you to state your account/order number quickly. Use formal English and be patient — hold times are common.",
    teluguTip:
      "మీ query clearly చెప్పండి. 'order number చెప్పండి' అని అడగడం చాలా common. Order ID ready గా పెట్టుకోండి.",
    systemPrompt:
      "You are Meena, a customer care executive at ShopEasy, an Indian e-commerce company. The user is a customer calling with a query (could be about a delayed order, return, refund, or product issue). Be professional, polite, ask for order details, and try to resolve the issue. Speak natural Indian English. Ask follow-up questions like a real customer care agent. Keep responses to 2-3 sentences.",
  },
  {
    id: 'appointment-booking',
    title: 'Appointment Booking',
    emoji: '📅',
    category: 'Appointments',
    difficulty: 1,
    difficultyLabel: 'Easy',
    description: 'Book an appointment at a clinic, salon, or service center.',
    callerName: 'Receptionist Asha',
    callerTitle: 'Front Desk — Apollo Clinic',
    openingLine:
      "Hello, Apollo Clinic reception. This is Asha speaking. How can I help you?",
    keyPhrases: [
      "I would like to book an appointment",
      "Is the doctor available on",
      "What time slots are available",
      "I prefer morning",
      "Can you confirm the appointment",
      "What documents should I bring",
    ],
    culturalNote:
      "Indian clinics often require your Aadhaar card or prior prescription. Asking 'Is there a prior appointment required?' is very natural here.",
    teluguTip:
      "Appointment book చేసేటప్పుడు date, time clearly చెప్పండి. 'Morning slot available ఉందా?' అని అడగడం polite గా ఉంటుంది.",
    systemPrompt:
      "You are Asha, the front desk receptionist at Apollo Clinic in Hyderabad. A patient is calling to book an appointment with a doctor. Ask for their name, which doctor they want to see, preferred date and time. Offer 2-3 time slot options. Confirm the appointment details at the end. Speak friendly, professional Indian English. Keep responses to 2-3 sentences.",
  },
  {
    id: 'job-interview-followup',
    title: 'Job Interview Follow-up',
    emoji: '💼',
    category: 'Professional',
    difficulty: 2,
    difficultyLabel: 'Medium',
    description: 'Call HR to follow up after submitting a job application.',
    callerName: 'Ravi',
    callerTitle: 'HR Recruiter — Infosys',
    openingLine:
      "Hello, this is Ravi from Infosys HR. How may I help you?",
    keyPhrases: [
      "I am calling to follow up on my application",
      "I applied for the position of",
      "I wanted to check the status",
      "Could you please update me",
      "I am very interested in this opportunity",
      "When can I expect to hear back",
    ],
    culturalNote:
      "Following up after 5-7 business days is completely acceptable and shows initiative. Always mention the role title and when you applied. HR at large Indian firms appreciate concise, confident communication.",
    teluguTip:
      "Interview follow-up call లో nervous గా ఉండకండి. 'I applied on [date] for [role]' అని clearly చెప్పండి. Confident గా మాట్లాడటం HR కి positive impression ఇస్తుంది.",
    systemPrompt:
      "You are Ravi, an HR recruiter at Infosys in Hyderabad. A candidate is calling to follow up on their job application. Ask which position they applied for and when. Check the 'status' (act like you're looking it up). Tell them the application is under review and interviews will be scheduled next week. Ask if they have any questions. Speak professional Indian English. Keep responses to 2-3 sentences.",
  },
  {
    id: 'business-proposal',
    title: 'Business Proposal Call',
    emoji: '🤝',
    category: 'Business',
    difficulty: 3,
    difficultyLabel: 'Hard',
    description: 'Pitch a business idea or partnership to a potential partner.',
    callerName: 'Kavitha',
    callerTitle: 'Director — Sunrise Ventures',
    openingLine:
      "Hello, this is Kavitha from Sunrise Ventures. I understand you wanted to discuss a potential collaboration. Please go ahead.",
    keyPhrases: [
      "I would like to propose",
      "This could be mutually beneficial",
      "Our solution addresses",
      "The market opportunity is",
      "I can send you a detailed proposal",
      "Would you be open to a meeting",
    ],
    culturalNote:
      "In Indian business culture, build rapport before jumping into details. Mentioning mutual connections or shared values helps. Be direct about the value proposition but leave room for questions.",
    teluguTip:
      "Business proposal call లో confident గా మాట్లాడండి. Numbers, facts చెప్పడం convincing గా ఉంటుంది. 'meeting schedule చేద్దామా?' అని close చేయండి.",
    systemPrompt:
      "You are Kavitha, Director at Sunrise Ventures, a mid-sized investment and partnership firm in Hyderabad. A person is calling to pitch a business idea or partnership. Listen to their pitch, ask challenging but fair questions about their market, revenue model, and team. Show conditional interest. Be professional and slightly skeptical but open-minded. Push back once or twice to test their confidence. Speak business-level Indian English. Keep responses to 2-3 sentences.",
  },
  {
    id: 'complaint-handling',
    title: 'Complaint Handling',
    emoji: '😤',
    category: 'Customer Service',
    difficulty: 2,
    difficultyLabel: 'Medium',
    description: 'Handle or register a complaint professionally with a company.',
    callerName: 'Vikram',
    callerTitle: 'Customer Relations Manager — CityBank',
    openingLine:
      "Good afternoon, CityBank customer relations. My name is Vikram. I understand you have a concern you would like to raise?",
    keyPhrases: [
      "I am extremely dissatisfied",
      "This has caused me inconvenience",
      "I would like to escalate this",
      "Can I have a reference number",
      "When will this be resolved",
      "I expect a written confirmation",
    ],
    culturalNote:
      "In India, saying 'I would like to escalate this to your senior manager' is a powerful phrase that usually gets faster resolution. Stay firm but polite — aggressive language often backfires.",
    teluguTip:
      "Complaint call లో calm గా ఉండటం important. 'Reference number ఇవ్వండి' అని అడగండి — future follow-up కి useful. Angry గా మాట్లాడకుండా assertive గా మాట్లాడండి.",
    systemPrompt:
      "You are Vikram, Customer Relations Manager at CityBank India. The user is a customer who has a complaint (e.g., unauthorized transaction, poor service, loan issue). Apologize for the inconvenience, ask for account details, assure escalation, offer a resolution timeline of 3-5 working days. If they escalate, provide a ticket number. Remain professional and empathetic throughout. Speak formal Indian English. Keep responses to 2-3 sentences.",
  },
  {
    id: 'cold-call-receiver',
    title: 'Cold Call / Telemarketing',
    emoji: '📲',
    category: 'Everyday Life',
    difficulty: 1,
    difficultyLabel: 'Easy',
    description: 'Practice politely declining or engaging with a telemarketer.',
    callerName: 'Anil',
    callerTitle: 'Sales Executive — QuickLoan Finance',
    openingLine:
      "Hello! Am I speaking with Mr. or Ms...? I am calling from QuickLoan Finance. We have an exclusive pre-approved personal loan offer for you today. Do you have two minutes?",
    keyPhrases: [
      "I am not interested at the moment",
      "Please remove my number from your list",
      "Can you send me the details by email",
      "I will call back if required",
      "Thank you but I will pass",
      "Is this a mandatory call",
    ],
    culturalNote:
      "India receives millions of telemarketing calls daily. Saying 'Please add me to the DND registry' is a real and effective phrase. You can also say 'I am registered on DND' to assert your rights politely.",
    teluguTip:
      "Telemarketing calls లో politely 'Not interested' చెప్పడం perfectly okay. 'మీ offer details WhatsApp చేయండి, చూసి reply చేస్తాను' అనడం graceful way to end the call.",
    systemPrompt:
      "You are Anil, a sales executive at QuickLoan Finance. You are making a cold call to sell a personal loan offer. Start with a short friendly pitch, offer an attractive low-interest rate. If the user says no, try one polite counter offer. If they insist on declining, wrap up professionally. Be persistent but not rude. Speak casual Indian English. Keep responses to 2-3 sentences.",
  },
  {
    id: 'emergency-call',
    title: 'Emergency Call (Practice)',
    emoji: '🚨',
    category: 'Emergency',
    difficulty: 2,
    difficultyLabel: 'Medium',
    description: 'Practice communicating clearly in an emergency situation.',
    callerName: 'Officer Suresh',
    callerTitle: 'Emergency Response — Police Control Room',
    openingLine:
      "Emergency control room. Please state your emergency.",
    keyPhrases: [
      "I need immediate help",
      "The address is",
      "There has been an accident",
      "Please send an ambulance",
      "The person is unconscious",
      "I am at",
    ],
    culturalNote:
      "In India, dial 112 for all emergencies. When calling, state the type of emergency first (medical / fire / crime), then give the exact address. Speak slowly and clearly — the operator needs to log every detail accurately.",
    teluguTip:
      "Emergency call లో calm గా ఉండండి. Address చెప్పేటప్పుడు landmark చెప్పండి — 'Near State Bank', 'Opposite Big Bazaar' అని చెప్పడం operator కి locate చేయడం easy అవుతుంది.",
    systemPrompt:
      "You are Officer Suresh from the emergency control room (India 112). A caller is reporting an emergency. Ask clearly: type of emergency, exact location (address + landmark), number of people involved, caller's name and mobile number. Stay calm, professional, and directive. Give clear instructions like 'Stay on the line' or 'Do not move the injured person'. Speak clear, simple Indian English. Keep responses to 2-3 sentences.",
  },
];

const CATEGORIES = ['All', 'Customer Service', 'Appointments', 'Professional', 'Business', 'Everyday Life', 'Emergency'];

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy:   { bg: '#D4EDDA', text: '#155724', border: '#28A745' },
  Medium: { bg: '#FFF3CD', text: '#856404', border: '#FFC107' },
  Hard:   { bg: '#F8D7DA', text: '#721C24', border: '#DC3545' },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function getTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function generateSessionId(): string {
  return `phone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PhoneSimulatorScreen: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('select');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  // Call state
  const [callDuration, setCallDuration] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListeningSTT, setIsListeningSTT] = useState(false);
  const [sessionId] = useState(generateSessionId);

  const [sttAvailable, setSttAvailable] = useState<boolean | null>(null);
  const [sttError, setSttError] = useState<string | null>(null);
  const baseInputRef = useRef('');

  // Summary state
  const [communicationScore, setCommunicationScore] = useState(0);
  const [userRating, setUserRating] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const ringingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    initializeSpeechRecognition();

    isSpeechRecognitionAvailable().then(available => {
      setSttAvailable(available);
    });

    return () => {
      clearTimers();
      destroySpeechRecognition();
      Speech.stop();
    };
  }, []);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
  };

  // ─── Ringing animation ────────────────────────────────────────────────────

  useEffect(() => {
    if (screen === 'ringing') {
      // Outer ring pulse
      const outer = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      // Inner ring pulse (offset)
      const inner = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim2, { toValue: 1.2, duration: 700, delay: 200, useNativeDriver: true }),
          Animated.timing(pulseAnim2, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      // Ringing text blink
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      outer.start();
      inner.start();
      blink.start();
      return () => { outer.stop(); inner.stop(); blink.stop(); };
    }
    if (screen === 'call') {
      // Gentle pulse while on call
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [screen]);

  // ─── Call timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (screen === 'call') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen]);

  // ─── Start a scenario ─────────────────────────────────────────────────────

  const startCall = (scenario: Scenario) => {
    setActiveScenario(scenario);
    setMessages([]);
    setCallDuration(0);
    setMuted(false);
    setSpeakerOn(false);
    setIsAiThinking(false);
    setIsListeningSTT(false);
    setUserRating(0);
    setScreen('ringing');

    // Auto-answer after 3s (simulate ringing)
    ringingTimeoutRef.current = setTimeout(() => {
      setScreen('call');
      const openingMsg: Message = {
        id: Date.now().toString(),
        from: 'ai',
        text: scenario.openingLine,
        timestamp: getTime(),
      };
      setMessages([openingMsg]);
      // Speak opening line
      speakAI(scenario.openingLine);
    }, 3000);
  };

  // Answer immediately (user can tap "Answer" on ringing screen)
  const answerNow = () => {
    if (ringingTimeoutRef.current) clearTimeout(ringingTimeoutRef.current);
    if (!activeScenario) return;
    setScreen('call');
    const openingMsg: Message = {
      id: Date.now().toString(),
      from: 'ai',
      text: activeScenario.openingLine,
      timestamp: getTime(),
    };
    setMessages([openingMsg]);
    speakAI(activeScenario.openingLine);
  };

  // ─── TTS ─────────────────────────────────────────────────────────────────

  const speakAI = (text: string) => {
    if (muted) return;
    Speech.stop();
    Speech.speak(text, {
      language: 'en-IN',
      rate: 0.9,
      pitch: 1.0,
    });
  };

  // ─── AI response via Supabase edge function ───────────────────────────────

  const sendToAI = useCallback(async (userText: string) => {
    if (!activeScenario) return;
    setIsAiThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: {
          session_type: 'roleplay',
          message: userText,
          session_id: sessionId,
          scenario_id: activeScenario.id,
          system_prompt: activeScenario.systemPrompt,
        },
      });

      if (error || !data?.reply) {
        // Fallback: simple canned response
        throw new Error(error?.message || 'No reply');
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: data.reply,
        timestamp: getTime(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
      speakAI(data.reply);
    } catch {
      // Fallback response so the call doesn't break
      const fallback = getFallbackReply(activeScenario.id);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: fallback,
        timestamp: getTime(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
      speakAI(fallback);
    } finally {
      setIsAiThinking(false);
    }
  }, [activeScenario, sessionId, muted]);

  const getFallbackReply = (scenarioId: string): string => {
    const fallbacks: Record<string, string[]> = {
      'customer-service': [
        "I understand. Could you please provide your registered mobile number so I can look up your account?",
        "Thank you. I can see the details here. Let me raise a request for you right away.",
        "This will be resolved within 3 to 5 working days. You'll receive an SMS confirmation shortly.",
        "Is there anything else I can assist you with today?",
      ],
      'appointment-booking': [
        "Of course! Which doctor would you like to see, and do you have a preferred date?",
        "We have slots available on Tuesday at 10 AM and Thursday at 3 PM. Which works for you?",
        "Your appointment has been confirmed. Please carry a valid ID and any prior reports.",
      ],
      'job-interview-followup': [
        "Thank you for following up. Could you please confirm which position you applied for?",
        "I can see your application on file. The shortlisting process is ongoing and you should hear back within 5 working days.",
        "We appreciate your interest in Infosys. Is there anything else I can help you with?",
      ],
      'business-proposal': [
        "That sounds interesting. Could you tell me more about your revenue model and target market?",
        "What makes your solution different from existing players in this space?",
        "I would like to see a formal proposal document. Can you email it to our partnerships team?",
      ],
      'complaint-handling': [
        "I sincerely apologize for the inconvenience. Could you share your account number so I can look into this?",
        "I have escalated this to our resolution team. You will receive a callback within 24 hours.",
        "Your complaint has been registered. The reference number is CIT-2024-7831. Please quote this for any future follow-up.",
      ],
      'cold-call-receiver': [
        "I completely understand. Just to let you know, the interest rate is only 10.5 percent per annum — one of the lowest available.",
        "Of course, no pressure at all. May I send you the details via WhatsApp for your reference?",
        "Thank you for your time. Have a wonderful day!",
      ],
      'emergency-call': [
        "Understood. Please provide the exact address and the nearest landmark.",
        "I am dispatching an ambulance to your location immediately. Please stay on the line and do not move the injured person.",
        "Help is on the way. Can you confirm the number of people involved?",
      ],
    };
    const arr = fallbacks[scenarioId] || ["I understand, please continue."];
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // ─── Send user message ────────────────────────────────────────────────────

  const sendUserReply = () => {
    const text = userInput.trim();
    if (!text || isAiThinking) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      from: 'user',
      text,
      timestamp: getTime(),
    };
    setMessages(prev => [...prev, userMsg]);
    setUserInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    sendToAI(text);
  };

  // ─── STT ─────────────────────────────────────────────────────────────────

  const toggleSTT = async () => {
    if (isListeningSTT) {
      setIsListeningSTT(false);
      await stopListening();
    } else {
      if (sttAvailable === false) {
        Alert.alert(
          'Speech Recognition Unavailable',
          'Speech-to-text is not supported on this browser/device. Please type your reply directly into the input field.'
        );
        return;
      }
      setIsListeningSTT(true);
      setSttError(null);
      Speech.stop(); // stop any AI speech before recording
      baseInputRef.current = userInput.trim();

      await startListening({
        language: 'en-IN',
        partialResults: true,
        continuous: Platform.OS === 'android',
        onPartialResult: (text: string) => {
          const prefix = baseInputRef.current;
          setUserInput(prefix ? `${prefix} ${text}` : text);
        },
        onFinalResult: (result) => {
          const newText = result.transcript.trim();
          if (newText) {
            const prefix = baseInputRef.current;
            baseInputRef.current = prefix ? `${prefix} ${newText}` : newText;
            setUserInput(baseInputRef.current);
          }
          if (Platform.OS === 'android') {
            startListening({
              language: 'en-IN',
              partialResults: true,
              continuous: true,
              onPartialResult: (text: string) => {
                const prefix = baseInputRef.current;
                setUserInput(prefix ? `${prefix} ${text}` : text);
              },
              onFinalResult: (r) => {
                const t = r.transcript.trim();
                if (t) {
                  const prefix = baseInputRef.current;
                  baseInputRef.current = prefix ? `${prefix} ${t}` : t;
                  setUserInput(baseInputRef.current);
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
            Alert.alert('Mic Error', err);
          }
          setIsListeningSTT(false);
        },
        onEnd: () => {
          if (Platform.OS !== 'android') {
            setIsListeningSTT(false);
          }
        },
      });
    }
  };

  // ─── End call ─────────────────────────────────────────────────────────────

  const endCall = () => {
    clearTimers();
    cancelListening().catch(() => {});
    Speech.stop();
    setIsListeningSTT(false);
    setIsAiThinking(false);

    // Score calculation
    const userMsgs = messages.filter(m => m.from === 'user');
    const phraseBonus = activeScenario
      ? activeScenario.keyPhrases.filter(p =>
          userMsgs.some(m => m.text.toLowerCase().includes(p.toLowerCase()))
        ).length
      : 0;
    const base = Math.min(85, 30 + userMsgs.length * 8 + phraseBonus * 5);
    setCommunicationScore(Math.min(100, base));
    setUserRating(base >= 80 ? 5 : base >= 65 ? 4 : base >= 50 ? 3 : 2);
    setScreen('summary');
  };

  const resetToSelect = () => {
    clearTimers();
    Speech.stop();
    setScreen('select');
    setActiveScenario(null);
    setMessages([]);
    setCallDuration(0);
  };

  const filteredScenarios = selectedCategory === 'All'
    ? SCENARIOS
    : SCENARIOS.filter(s => s.category === selectedCategory);

  // ─── Scenario Selection Screen ────────────────────────────────────────────

  const renderSelect = () => (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.selectHeader}>
          <Text style={styles.selectTitle}>📞 Phone Call Practice</Text>
          <Text style={styles.selectSub}>ఇంగ్లీషులో real phone calls practice చేయండి</Text>
          <View style={styles.selectBadgeRow}>
            <View style={styles.selectBadge}>
              <Text style={styles.selectBadgeText}>7 Scenarios</Text>
            </View>
            <View style={styles.selectBadge}>
              <Text style={styles.selectBadgeText}>AI Roleplay</Text>
            </View>
            <View style={styles.selectBadge}>
              <Text style={styles.selectBadgeText}>Voice Input</Text>
            </View>
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Scenario Cards */}
        <View style={styles.scenarioList}>
          {filteredScenarios.map(scenario => {
            const dc = DIFFICULTY_COLORS[scenario.difficultyLabel];
            const stars = ['●', '●', '●'].map((dot, i) => (
              <Text key={i} style={{ color: i < scenario.difficulty ? Colors.primary : '#DDD', fontSize: 10, marginHorizontal: 1 }}>
                ●
              </Text>
            ));
            return (
              <View key={scenario.id} style={styles.scenarioCard}>
                {/* Card Top */}
                <View style={styles.scenarioCardTop}>
                  <View style={styles.scenarioEmojiWrap}>
                    <Text style={styles.scenarioEmoji}>{scenario.emoji}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                    <Text style={styles.scenarioCallerLine}>
                      {scenario.callerName} · {scenario.callerTitle}
                    </Text>
                  </View>
                  <View style={[styles.diffBadge, { backgroundColor: dc.bg, borderColor: dc.border }]}>
                    <Text style={[styles.diffText, { color: dc.text }]}>{scenario.difficultyLabel}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 2 }}>{stars}</View>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.scenarioDesc}>{scenario.description}</Text>

                {/* Opening preview */}
                <View style={styles.openingPreview}>
                  <Text style={styles.openingPreviewLabel}>Opening:</Text>
                  <Text style={styles.openingPreviewText} numberOfLines={2}>
                    "{scenario.openingLine}"
                  </Text>
                </View>

                {/* Key phrases preview */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {scenario.keyPhrases.slice(0, 3).map((p, i) => (
                    <View key={i} style={styles.keyPhraseChip}>
                      <Text style={styles.keyPhraseChipText}>{p}</Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Telugu tip */}
                <View style={styles.teluguTipBox}>
                  <Text style={styles.teluguTipIcon}>💡</Text>
                  <Text style={styles.teluguTipText} numberOfLines={2}>{scenario.teluguTip}</Text>
                </View>

                <TouchableOpacity
                  style={styles.startCallBtn}
                  onPress={() => startCall(scenario)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.startCallBtnText}>📞 Start Call</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // ─── Ringing Screen ───────────────────────────────────────────────────────

  const renderRinging = () => {
    if (!activeScenario) return null;
    return (
      <View style={styles.callScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.ringingContainer}>
            {/* Caller Info */}
            <View style={styles.callerInfoSection}>
              <Text style={styles.incomingLabel}>Incoming Call</Text>

              {/* Pulsing rings */}
              <View style={styles.ringingRingsWrap}>
                <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]} />
                <Animated.View style={[styles.innerRing, { transform: [{ scale: pulseAnim2 }] }]} />
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>{activeScenario.emoji}</Text>
                </View>
              </View>

              <Text style={styles.callerName}>{activeScenario.callerName}</Text>
              <Text style={styles.callerTitle}>{activeScenario.callerTitle}</Text>
              <Animated.Text style={[styles.ringingText, { opacity: ringOpacity }]}>
                Ringing...
              </Animated.Text>

              <View style={styles.culturalNoteBox}>
                <Text style={styles.culturalNoteText}>📌 {activeScenario.culturalNote}</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.ringingButtons}>
              <TouchableOpacity style={styles.declineBtn} onPress={resetToSelect}>
                <Text style={styles.declineBtnIcon}>📵</Text>
                <Text style={styles.declineBtnLabel}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.answerBtn} onPress={answerNow}>
                <Text style={styles.answerBtnIcon}>📞</Text>
                <Text style={styles.answerBtnLabel}>Answer</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.autoAnswerHint}>Auto-answering in a moment...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  };

  // ─── Active Call Screen ───────────────────────────────────────────────────

  const renderCall = () => {
    if (!activeScenario) return null;
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.callScreen}>
          <StatusBar barStyle="light-content" backgroundColor="#0A1628" />
          <SafeAreaView style={{ flex: 1 }}>
            {/* ── Top Caller Info ── */}
            <View style={styles.callTopBar}>
              <Animated.View style={[styles.callAvatarRing, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.callAvatarCircle}>
                  <Text style={styles.callAvatarEmoji}>{activeScenario.emoji}</Text>
                </View>
              </Animated.View>
              <View style={styles.callTopInfo}>
                <Text style={styles.callTopName}>{activeScenario.callerName}</Text>
                <Text style={styles.callTopTitle}>{activeScenario.callerTitle}</Text>
                <Text style={styles.callTopScenario}>{activeScenario.title}</Text>
              </View>
              <Text style={styles.callTimerText}>{formatDuration(callDuration)}</Text>
            </View>

            {/* ── Transcript ── */}
            <ScrollView
              ref={scrollRef}
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {/* Key phrases hint */}
              <View style={styles.phrasesHintBox}>
                <Text style={styles.phrasesHintTitle}>Key Phrases to Use:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {activeScenario.keyPhrases.map((p, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.phrasesHintChip}
                      onPress={() => setUserInput(p)}
                    >
                      <Text style={styles.phrasesHintChipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {messages.map(msg => (
                <View
                  key={msg.id}
                  style={[styles.msgBubble, msg.from === 'ai' ? styles.aiBubble : styles.userBubble]}
                >
                  <Text style={styles.msgSender}>
                    {msg.from === 'ai' ? activeScenario.callerName : 'You'}
                  </Text>
                  <Text style={styles.msgText}>{msg.text}</Text>
                  <Text style={styles.msgTime}>{msg.timestamp}</Text>
                </View>
              ))}

              {isAiThinking && (
                <View style={[styles.msgBubble, styles.aiBubble]}>
                  <Text style={styles.msgSender}>{activeScenario.callerName}</Text>
                  <View style={styles.thinkingDots}>
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                    <Text style={styles.thinkingText}>  typing...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* ── Input Row ── */}
            <View style={styles.inputRow}>
              {/* Voice button */}
              <TouchableOpacity
                style={[styles.voiceBtn, isListeningSTT && styles.voiceBtnActive]}
                onPress={toggleSTT}
                activeOpacity={0.85}
              >
                <Text style={styles.voiceBtnIcon}>{isListeningSTT ? '🔴' : '🎤'}</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.callInput}
                placeholder={isListeningSTT ? 'Listening...' : 'Type your reply...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={userInput}
                onChangeText={setUserInput}
                returnKeyType="send"
                onSubmitEditing={sendUserReply}
                multiline
                maxLength={300}
                editable={!isAiThinking}
              />

              <TouchableOpacity
                style={[styles.replyBtn, (!userInput.trim() || isAiThinking) && styles.replyBtnDisabled]}
                onPress={sendUserReply}
                disabled={!userInput.trim() || isAiThinking}
              >
                <Text style={styles.replyBtnText}>Send</Text>
              </TouchableOpacity>
            </View>

            {/* ── Call Controls ── */}
            <View style={styles.callControls}>
              <TouchableOpacity
                style={[styles.ctrlBtn, muted && styles.ctrlBtnActive]}
                onPress={() => setMuted(m => !m)}
              >
                <Text style={styles.ctrlBtnIcon}>{muted ? '🔇' : '🎙️'}</Text>
                <Text style={styles.ctrlBtnLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.endCallBtn} onPress={endCall}>
                <Text style={styles.endCallIcon}>📵</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, speakerOn && styles.ctrlBtnActive]}
                onPress={() => setSpeakerOn(s => !s)}
              >
                <Text style={styles.ctrlBtnIcon}>{speakerOn ? '🔊' : '🔈'}</Text>
                <Text style={styles.ctrlBtnLabel}>{speakerOn ? 'Speaker On' : 'Speaker'}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // ─── Summary Screen ───────────────────────────────────────────────────────

  const renderSummary = () => {
    if (!activeScenario) return null;
    const userMsgs = messages.filter(m => m.from === 'user');
    const usedPhrases = activeScenario.keyPhrases.filter(p =>
      userMsgs.some(m => m.text.toLowerCase().includes(p.toLowerCase()))
    );
    const missedPhrases = activeScenario.keyPhrases.filter(p =>
      !userMsgs.some(m => m.text.toLowerCase().includes(p.toLowerCase()))
    );
    const scoreColor =
      communicationScore >= 80 ? '#2ECC71' :
      communicationScore >= 60 ? '#F39C12' : '#E74C3C';

    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summaryContent}>

          {/* Header */}
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryHeaderEmoji}>📞</Text>
            <Text style={styles.summaryHeaderTitle}>Call Ended</Text>
            <Text style={styles.summaryHeaderSub}>
              {activeScenario.title} • {formatDuration(callDuration)}
            </Text>
          </View>

          {/* Score */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Communication Score</Text>
            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreNum, { color: scoreColor }]}>{communicationScore}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <Text style={styles.scoreLabel}>
              {communicationScore >= 80 ? 'Excellent! Great job.' :
               communicationScore >= 60 ? 'Good effort. Keep practising!' :
               'Keep going — practice makes perfect!'}
            </Text>
          </View>

          {/* Rating */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Rate This Call</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                  <Text style={[styles.star, star <= userRating && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Key phrases used */}
          {usedPhrases.length > 0 && (
            <View style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: '#2ECC71' }]}>
              <Text style={[styles.summaryCardTitle, { color: '#155724' }]}>✅ Key Phrases Used</Text>
              {usedPhrases.map((p, i) => (
                <Text key={i} style={styles.phraseGreen}>• "{p}"</Text>
              ))}
            </View>
          )}

          {/* Missed phrases */}
          {missedPhrases.length > 0 && (
            <View style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: '#F39C12' }]}>
              <Text style={[styles.summaryCardTitle, { color: '#856404' }]}>💡 Practice These Phrases</Text>
              {missedPhrases.map((p, i) => (
                <Text key={i} style={styles.phraseAmber}>• "{p}"</Text>
              ))}
            </View>
          )}

          {/* Cultural note */}
          <View style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: Colors.secondary }]}>
            <Text style={[styles.summaryCardTitle, { color: Colors.secondary }]}>🌏 Cultural Note</Text>
            <Text style={styles.culturalNoteCardText}>{activeScenario.culturalNote}</Text>
          </View>

          {/* Telugu tip */}
          <View style={[styles.summaryCard, { borderLeftWidth: 4, borderLeftColor: Colors.accent }]}>
            <Text style={[styles.summaryCardTitle, { color: '#7B4800' }]}>Telugu Tip</Text>
            <Text style={styles.teluguTipCardText}>{activeScenario.teluguTip}</Text>
          </View>

          {/* Transcript */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>📋 Full Transcript</Text>
            {messages.map((msg, i) => (
              <View key={i} style={styles.transcriptRow}>
                <Text style={[styles.transcriptSpeaker, msg.from === 'ai' ? styles.transcriptAI : styles.transcriptUser]}>
                  {msg.from === 'ai' ? activeScenario.callerName : 'You'}:
                </Text>
                <Text style={styles.transcriptRowText}>{msg.text}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.tryAgainBtn}
            onPress={() => startCall(activeScenario)}
            activeOpacity={0.85}
          >
            <Text style={styles.tryAgainText}>🔄 Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={resetToSelect}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>← Choose Another Scenario</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  };

  // ─── Router ───────────────────────────────────────────────────────────────

  if (screen === 'select') return renderSelect();
  if (screen === 'ringing') return renderRinging();
  if (screen === 'call') return renderCall();
  if (screen === 'summary') return renderSummary();
  return null;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // ── Select Screen ──────────────────────────────────────────────────────────
  selectHeader: {
    backgroundColor: Colors.primary,
    paddingTop: 28,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  selectTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  selectSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  selectBadgeRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  selectBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  categoryScroll: { marginTop: 16, marginBottom: 4 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F0E8E0',
    borderRadius: 20,
    marginRight: 10,
  },
  catChipActive: { backgroundColor: Colors.primary },
  catChipText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  catChipTextActive: { color: '#fff' },

  scenarioList: { padding: 14, paddingBottom: 30 },
  scenarioCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  scenarioCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  scenarioEmojiWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioEmoji: { fontSize: 28 },
  scenarioTitle: { fontSize: 15, fontWeight: '800', color: Colors.text },
  scenarioCallerLine: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  diffText: { fontSize: 10, fontWeight: '800' },
  scenarioDesc: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10, lineHeight: 19 },
  openingPreview: {
    backgroundColor: '#F8F4F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  openingPreviewLabel: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, marginBottom: 3 },
  openingPreviewText: { fontSize: 12, color: Colors.text, fontStyle: 'italic', lineHeight: 18 },
  keyPhraseChip: {
    backgroundColor: '#EEF4FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  keyPhraseChipText: { fontSize: 11, color: Colors.secondary, fontWeight: '600' },
  teluguTipBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  teluguTipIcon: { fontSize: 14, marginRight: 6, marginTop: 1 },
  teluguTipText: { flex: 1, fontSize: 11, color: '#7B4800', lineHeight: 17 },
  startCallBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  startCallBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── Ringing Screen ─────────────────────────────────────────────────────────
  callScreen: { flex: 1, backgroundColor: '#0A1628' },
  ringingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 30,
  },
  callerInfoSection: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  incomingLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 30,
  },
  ringingRingsWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  outerRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  innerRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,53,0.5)',
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,107,53,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarEmoji: { fontSize: 40 },
  callerName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  callerTitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8, textAlign: 'center' },
  ringingText: { fontSize: 14, color: Colors.primary, fontWeight: '600', marginBottom: 20 },
  culturalNoteBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    maxWidth: width - 80,
  },
  culturalNoteText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18, textAlign: 'center' },
  ringingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 12,
  },
  declineBtn: { alignItems: 'center' },
  declineBtnIcon: {
    fontSize: 28,
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: 'center',
    backgroundColor: '#E74C3C',
    borderRadius: 32,
    overflow: 'hidden',
  },
  declineBtnLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  answerBtn: { alignItems: 'center' },
  answerBtnIcon: {
    fontSize: 28,
    width: 64,
    height: 64,
    lineHeight: 64,
    textAlign: 'center',
    backgroundColor: '#2ECC71',
    borderRadius: 32,
    overflow: 'hidden',
  },
  answerBtnLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  autoAnswerHint: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 },

  // ── Active Call Screen ─────────────────────────────────────────────────────
  callTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  callAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,107,53,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,53,0.5)',
  },
  callAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,107,53,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callAvatarEmoji: { fontSize: 22 },
  callTopInfo: { flex: 1, marginLeft: 10 },
  callTopName: { fontSize: 14, fontWeight: '800', color: '#fff' },
  callTopTitle: { fontSize: 10, color: 'rgba(255,255,255,0.55)' },
  callTopScenario: { fontSize: 10, color: Colors.primary, fontWeight: '600', marginTop: 1 },
  callTimerText: { fontSize: 20, fontWeight: '300', color: '#7FDBFF', letterSpacing: 1 },

  transcriptScroll: { flex: 1 },
  transcriptContent: { paddingHorizontal: 12, paddingVertical: 8 },

  phrasesHintBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  phrasesHintTitle: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  phrasesHintChip: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  phrasesHintChipText: { fontSize: 11, color: 'rgba(255,200,180,0.9)', fontWeight: '600' },

  msgBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  msgSender: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
  msgText: { fontSize: 14, color: '#fff', lineHeight: 20 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, alignSelf: 'flex-end' },
  thinkingDots: { flexDirection: 'row', alignItems: 'center' },
  thinkingText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  voiceBtnActive: { backgroundColor: 'rgba(231,76,60,0.4)' },
  voiceBtnIcon: { fontSize: 20 },
  callInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
    marginRight: 8,
  },
  replyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyBtnDisabled: { backgroundColor: 'rgba(255,107,53,0.35)' },
  replyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  callControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  ctrlBtn: {
    alignItems: 'center',
    width: 72,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ctrlBtnActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  ctrlBtnIcon: { fontSize: 24 },
  ctrlBtnLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  endCallBtn: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E74C3C',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 8,
  },
  endCallIcon: { fontSize: 28 },

  // ── Summary Screen ─────────────────────────────────────────────────────────
  summaryContent: { padding: 16, paddingBottom: 40 },
  summaryHeader: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryHeaderEmoji: { fontSize: 44, marginBottom: 8 },
  summaryHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summaryHeaderSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 12 },

  scoreCircle: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  scoreNum: { fontSize: 30, fontWeight: '800' },
  scoreMax: { fontSize: 13, color: Colors.textSecondary },
  scoreLabel: { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic' },

  starsRow: { flexDirection: 'row', justifyContent: 'center' },
  star: { fontSize: 38, color: '#E0D0C0', marginHorizontal: 4 },
  starActive: { color: Colors.accent },

  phraseGreen: { fontSize: 13, color: '#27AE60', fontWeight: '600', marginBottom: 4 },
  phraseAmber: { fontSize: 13, color: '#F39C12', fontWeight: '600', marginBottom: 4 },
  culturalNoteCardText: { fontSize: 13, color: Colors.text, lineHeight: 20 },
  teluguTipCardText: { fontSize: 13, color: Colors.text, lineHeight: 20 },

  transcriptRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  transcriptSpeaker: { fontSize: 11, fontWeight: '800', minWidth: 38, marginRight: 6 },
  transcriptAI: { color: Colors.secondary },
  transcriptUser: { color: Colors.primary },
  transcriptRowText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  tryAgainBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  tryAgainText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: {
    backgroundColor: '#F0E8E0',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  backBtnText: { color: Colors.text, fontSize: 15, fontWeight: '700' },
});

export default PhoneSimulatorScreen;
