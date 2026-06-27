import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  FlatList,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import * as Speech from 'expo-speech';
import {
  startListening,
  stopListening,
  initializeSpeechRecognition,
  destroySpeechRecognition,
  isSpeechRecognitionAvailable,
} from '../../services/audio/speechRecognition';
import {
  scorePronunciation,
  PronunciationScore,
} from '../../services/pronunciation/pronunciationScorer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Greeting {
  id: string;
  category: string;
  greeting_english: string;
  greeting_telugu: string;
  pronunciation_guide: string;
  usage_examples: string[];
  cultural_note: string;
  difficulty: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_GREETINGS: Greeting[] = [
  // ── Morning ──────────────────────────────────────────────────────────────────
  {
    id: '1',
    category: 'morning',
    greeting_english: 'Good morning! How are you today?',
    greeting_telugu: 'శుభోదయం! మీరు ఎలా ఉన్నారు?',
    pronunciation_guide: '/gʊd ˈmɔːrnɪŋ haʊ ɑːr juː/',
    usage_examples: ['When arriving at office', 'Meeting neighbors', 'Starting a call'],
    cultural_note: 'Always smile when greeting in professional settings',
    difficulty: 1,
  },
  {
    id: '7',
    category: 'morning',
    greeting_english: 'Rise and shine! It\'s a beautiful morning!',
    greeting_telugu: 'లేచి వెలగండి! ఎంత అందమైన ఉదయం!',
    pronunciation_guide: '/raɪz ænd ʃaɪn ɪts ə ˈbjuːtɪfəl ˈmɔːrnɪŋ/',
    usage_examples: ['Waking up family members', 'Motivating colleagues', 'Morning social media posts'],
    cultural_note: 'A cheerful phrase used to energise people — very common in Indian English households',
    difficulty: 1,
  },
  {
    id: '8',
    category: 'morning',
    greeting_english: 'Good morning! Did you sleep well?',
    greeting_telugu: 'శుభోదయం! మీకు మంచి నిద్ర వచ్చిందా?',
    pronunciation_guide: '/gʊd ˈmɔːrnɪŋ dɪd juː sliːp wel/',
    usage_examples: ['Greeting family at breakfast', 'Casual morning chat with colleagues', 'Hostel roommate greetings'],
    cultural_note: 'Asking about sleep is a common warm-up question in Indian families to show care',
    difficulty: 1,
  },
  {
    id: '9',
    category: 'morning',
    greeting_english: 'Morning! Hope your day goes wonderfully!',
    greeting_telugu: 'శుభోదయం! మీ రోజు చాలా బాగా గడుస్తుందని ఆశిస్తున్నాను!',
    pronunciation_guide: '/ˈmɔːrnɪŋ hoʊp jɔːr deɪ ɡoʊz ˈwʌndərfəli/',
    usage_examples: ['Quick office corridor greeting', 'WhatsApp good morning message', 'Sending off a family member'],
    cultural_note: 'Shorter form of "Good morning" — widely used in texts and quick interactions',
    difficulty: 2,
  },

  // ── Afternoon ─────────────────────────────────────────────────────────────────
  {
    id: '10',
    category: 'afternoon',
    greeting_english: 'Good afternoon! Hope your morning was productive.',
    greeting_telugu: 'శుభ మధ్యాహ్నం! మీ ఉదయం చాలా ఉత్పాదకంగా గడిచిందని ఆశిస్తున్నాను.',
    pronunciation_guide: '/gʊd ˌɑːftərˈnuːn hoʊp jɔːr ˈmɔːrnɪŋ wəz prəˈdʌktɪv/',
    usage_examples: ['Post-lunch office greetings', 'Starting an afternoon meeting', 'Meeting a colleague after break'],
    cultural_note: 'Use between 12 PM and 5 PM — a polished phrase for formal Indian workplaces',
    difficulty: 2,
  },
  {
    id: '11',
    category: 'afternoon',
    greeting_english: 'Good afternoon! Hope lunch was good!',
    greeting_telugu: 'శుభ మధ్యాహ్నం! భోజనం బాగా చేసారా?',
    pronunciation_guide: '/gʊd ˌɑːftərˈnuːn hoʊp lʌntʃ wəz gʊd/',
    usage_examples: ['Post-lunch corridor chat', 'Canteen meeting', 'After a team lunch'],
    cultural_note: 'Food is central to Telugu culture — asking about lunch is a natural and warm conversation starter',
    difficulty: 1,
  },
  {
    id: '12',
    category: 'afternoon',
    greeting_english: 'Hi there! Having a good afternoon?',
    greeting_telugu: 'హాయ్! మధ్యాహ్నం బాగుందా?',
    pronunciation_guide: '/haɪ ðer ˈhævɪŋ ə gʊd ˌɑːftərˈnuːn/',
    usage_examples: ['Casual office chat', 'Greeting a visitor', 'Video call opening'],
    cultural_note: 'Casual but professional — suitable for peers and colleagues in modern IT companies',
    difficulty: 1,
  },
  {
    id: '13',
    category: 'afternoon',
    greeting_english: 'Good afternoon, everyone! Shall we get started?',
    greeting_telugu: 'శుభ మధ్యాహ్నం అందరికీ! మనం ప్రారంభిద్దామా?',
    pronunciation_guide: '/gʊd ˌɑːftərˈnuːn ˈevriwʌn ʃæl wiː ɡet ˈstɑːrtɪd/',
    usage_examples: ['Opening a team meeting', 'Starting a training session', 'Classroom or workshop beginning'],
    cultural_note: 'Great for group settings — shows confidence and leadership, valued in Indian corporate culture',
    difficulty: 2,
  },

  // ── Evening ───────────────────────────────────────────────────────────────────
  {
    id: '4',
    category: 'evening',
    greeting_english: 'Good evening! Hope you had a wonderful day!',
    greeting_telugu: 'శుభ సాయంత్రం! మీకు చాలా మంచి రోజు గడిచిందని ఆశిస్తున్నాను!',
    pronunciation_guide: '/gʊd ˈiːvnɪŋ/',
    usage_examples: ['After work hours', 'Evening events', 'Dinner meetings'],
    cultural_note: 'Use after 5 PM or sunset',
    difficulty: 1,
  },
  {
    id: '14',
    category: 'evening',
    greeting_english: 'Good evening! Ready to wind down after a long day?',
    greeting_telugu: 'శుభ సాయంత్రం! పొడవైన రోజు తర్వాత విశ్రాంతి తీసుకోవడానికి సిద్ధంగా ఉన్నారా?',
    pronunciation_guide: '/gʊd ˈiːvnɪŋ ˈredi tuː waɪnd daʊn ˌɑːftər ə lɔːŋ deɪ/',
    usage_examples: ['After office hours', 'Evening phone call to family', 'Meeting colleagues at end of shift'],
    cultural_note: 'Expressing empathy for a hard day is very common in Telugu households and workplaces',
    difficulty: 2,
  },
  {
    id: '15',
    category: 'evening',
    greeting_english: 'Evening! Great to see you after so long!',
    greeting_telugu: 'సాయంత్రం! చాలా కాలం తర్వాత మిమ్మల్ని చూడడం చాలా సంతోషంగా ఉంది!',
    pronunciation_guide: '/ˈiːvnɪŋ ɡreɪt tuː siː juː ˌɑːftər soʊ lɔːŋ/',
    usage_examples: ['Bumping into an old friend in the evening', 'Evening social events', 'Family gatherings after a long gap'],
    cultural_note: 'Telugu culture values reunions warmly — expressing joy at seeing someone after a long time is very natural',
    difficulty: 2,
  },
  {
    id: '16',
    category: 'evening',
    greeting_english: 'Good evening! Shall we grab a cup of tea?',
    greeting_telugu: 'శుభ సాయంత్రం! ఒక కప్పు టీ తాగుదామా?',
    pronunciation_guide: '/gʊd ˈiːvnɪŋ ʃæl wiː ɡræb ə kʌp əv tiː/',
    usage_examples: ['Inviting a colleague for tea break', 'Relaxed evening with neighbours', 'Casual post-work catchup'],
    cultural_note: 'Evening tea (chai) is a cultural ritual in Andhra Pradesh — this phrase is extremely natural and relatable',
    difficulty: 1,
  },

  // ── Festival ──────────────────────────────────────────────────────────────────
  {
    id: '6',
    category: 'festival',
    greeting_english: 'Happy Diwali! May this festival bring you joy and prosperity!',
    greeting_telugu:
      'దీపావళి శుభాకాంక్షలు! ఈ పండుగ మీకు ఆనందాన్ని మరియు సంపదను తీసుకొస్తుందని ఆశిస్తున్నాను!',
    pronunciation_guide: '/ˈhæpi dɪˈwɑːli/',
    usage_examples: ['Festival season greetings', 'WhatsApp messages', 'Office celebration'],
    cultural_note: 'Great for Indian festivals - very natural expression',
    difficulty: 2,
  },
  {
    id: '17',
    category: 'festival',
    greeting_english: 'Happy New Year! Wishing you health, wealth and happiness!',
    greeting_telugu: 'నూతన సంవత్సర శుభాకాంక్షలు! మీకు ఆరోగ్యం, సంపద మరియు ఆనందం కలగాలని కోరుకుంటున్నాను!',
    pronunciation_guide: '/ˈhæpi njuː jɪər ˈwɪʃɪŋ juː helθ welθ ænd ˈhæpinəs/',
    usage_examples: ['January 1st greetings', 'Telugu New Year (Ugadi)', 'Office new year party'],
    cultural_note: 'Works for both January 1st and Ugadi — Indians celebrate multiple new years, making this phrase very useful',
    difficulty: 1,
  },
  {
    id: '18',
    category: 'festival',
    greeting_english: 'Congratulations! You truly deserve this success!',
    greeting_telugu: 'అభినందనలు! మీరు నిజంగా ఈ విజయానికి అర్హులు!',
    pronunciation_guide: '/kənˌɡrætʃuˈleɪʃənz juː ˈtruːli dɪˈzɜːrv ðɪs səkˈses/',
    usage_examples: ['Exam results', 'Job promotion news', 'Wedding or engagement announcement'],
    cultural_note: 'In Telugu culture, academic and career achievements are celebrated publicly — this phrase is very impactful',
    difficulty: 2,
  },
  {
    id: '19',
    category: 'festival',
    greeting_english: 'Happy Sankranthi! May the harvest season bless your family!',
    greeting_telugu: 'సంక్రాంతి శుభాకాంక్షలు! పంట కాలం మీ కుటుంబాన్ని దీవించాలని కోరుకుంటున్నాను!',
    pronunciation_guide: '/ˈhæpi sæŋˈkrɑːnti meɪ ðə ˈhɑːrvɪst ˈsiːzən bles jɔːr ˈfæmɪli/',
    usage_examples: ['Sankranthi holiday greetings', 'Village homecoming wishes', 'WhatsApp family group messages'],
    cultural_note: 'Sankranthi is the biggest Telugu festival — mentioning harvest connects deeply with Telugu cultural identity',
    difficulty: 3,
  },

  // ── Professional ──────────────────────────────────────────────────────────────
  {
    id: '2',
    category: 'professional',
    greeting_english: 'Good morning, sir. How may I assist you?',
    greeting_telugu: 'శుభోదయం, సార్. నేను మీకు ఎలా సహాయపడగలను?',
    pronunciation_guide: '/gʊd ˈmɔːrnɪŋ sɜːr/',
    usage_examples: ['When customer enters', 'Phone reception', 'Meeting a senior'],
    cultural_note: "Use sir/ma'am in formal Indian contexts",
    difficulty: 2,
  },
  {
    id: '20',
    category: 'professional',
    greeting_english: 'Good to see you! How have you been?',
    greeting_telugu: 'మిమ్మల్ని చూడడం చాలా సంతోషంగా ఉంది! మీరు ఎలా ఉన్నారు?',
    pronunciation_guide: '/gʊd tuː siː juː haʊ həv juː biːn/',
    usage_examples: ['Reconnecting with a client', 'Meeting an old colleague', 'Post-conference networking'],
    cultural_note: 'A warm professional opener — widely used in IT, banking, and business settings across Andhra and Telangana',
    difficulty: 2,
  },
  {
    id: '21',
    category: 'professional',
    greeting_english: 'Nice to meet you! Looking forward to working together.',
    greeting_telugu: 'మిమ్మల్ని కలవడం చాలా సంతోషంగా ఉంది! కలిసి పని చేయడానికి ఎదురుచూస్తున్నాను.',
    pronunciation_guide: '/naɪs tuː miːt juː ˈlʊkɪŋ ˈfɔːrwərd tuː ˈwɜːrkɪŋ təˈɡeðər/',
    usage_examples: ['First day at a new job', 'Meeting a new project team', 'Onboarding introductions'],
    cultural_note: 'Essential for job interviews and first meetings — shows enthusiasm which is highly valued in Indian workplaces',
    difficulty: 2,
  },
  {
    id: '22',
    category: 'professional',
    greeting_english: 'Hello! Thank you for taking the time to meet with me.',
    greeting_telugu: 'హలో! నన్ను కలవడానికి సమయం తీసుకున్నందుకు ధన్యవాదాలు.',
    pronunciation_guide: '/həˈloʊ θæŋk juː fər ˈteɪkɪŋ ðə taɪm tuː miːt wɪð miː/',
    usage_examples: ['Starting a client meeting', 'Job interview opening', 'Meeting a manager for the first time'],
    cultural_note: 'Expressing gratitude for someone\'s time is considered respectful in Indian professional culture',
    difficulty: 3,
  },

  // ── Casual ────────────────────────────────────────────────────────────────────
  {
    id: '3',
    category: 'casual',
    greeting_english: "Hey! What's up? Long time no see!",
    greeting_telugu: 'హే! ఏం జరుగుతోంది? చాలా కాలం అయింది!',
    pronunciation_guide: '/heɪ wɒts ʌp/',
    usage_examples: ['Meeting friends', 'Social media', 'Informal office chat'],
    cultural_note: 'Use only with close friends, not seniors',
    difficulty: 1,
  },
  {
    id: '23',
    category: 'casual',
    greeting_english: "How's it going? All good with you?",
    greeting_telugu: 'ఎలా ఉంది? మీతో అంతా బాగుందా?',
    pronunciation_guide: '/haʊz ɪt ˈɡoʊɪŋ ɔːl ɡʊd wɪð juː/',
    usage_examples: ['Friends at college', 'Catching up with cousins', 'Team lunch small talk'],
    cultural_note: 'Very common among urban Telugu youth — especially in IT hubs like Hyderabad and Vijayawada',
    difficulty: 1,
  },
  {
    id: '24',
    category: 'casual',
    greeting_english: "Yo! Haven't seen you in ages!",
    greeting_telugu: 'యో! చాలా రోజులుగా మిమ్మల్ని చూడలేదు!',
    pronunciation_guide: '/joʊ ˈhævənt siːn juː ɪn ˈeɪdʒɪz/',
    usage_examples: ['Meeting a close friend unexpectedly', 'Social media DM', 'College reunion vibes'],
    cultural_note: '"Yo" is very popular with younger Telugu speakers — only use with peers of similar age',
    difficulty: 1,
  },
  {
    id: '25',
    category: 'casual',
    greeting_english: "Hey there! What are you up to these days?",
    greeting_telugu: 'హేయ్! ఈ రోజుల్లో మీరు ఏం చేస్తున్నారు?',
    pronunciation_guide: '/heɪ ðer wɒt ɑːr juː ʌp tuː ðiːz deɪz/',
    usage_examples: ['Reconnecting with old classmates', 'Casual WhatsApp opener', 'Running into a neighbour'],
    cultural_note: 'A friendly way to show genuine interest in someone\'s life — highly valued in close-knit Telugu communities',
    difficulty: 2,
  },

  // ── Customer Service ──────────────────────────────────────────────────────────
  {
    id: '5',
    category: 'customer',
    greeting_english: 'Welcome! Please come in. How can I help you today?',
    greeting_telugu: 'స్వాగతం! దయచేసి లోపలికి రండి. నేడు నేను మీకు ఎలా సహాయపడగలను?',
    pronunciation_guide: '/ˈwelkəm pliːz kʌm ɪn/',
    usage_examples: ['Shop/store entry', 'Office reception', 'Bank greeting'],
    cultural_note: 'Smile and make eye contact',
    difficulty: 2,
  },
  {
    id: '26',
    category: 'customer',
    greeting_english: 'Thank you for visiting us! Please have a seat.',
    greeting_telugu: 'మాను సందర్శించినందుకు ధన్యవాదాలు! దయచేసి కూర్చోండి.',
    pronunciation_guide: '/θæŋk juː fər ˈvɪzɪtɪŋ ʌs pliːz hæv ə siːt/',
    usage_examples: ['Welcoming a customer at a bank', 'Hospital reception', 'Service centre front desk'],
    cultural_note: 'Offering a seat is a sign of hospitality deeply rooted in Telugu culture — always feels warm and inviting',
    difficulty: 2,
  },
  {
    id: '27',
    category: 'customer',
    greeting_english: 'Good morning! How may I direct your call?',
    greeting_telugu: 'శుభోదయం! మీ కాల్‌ను నేను ఎక్కడికి బదిలీ చేయాలి?',
    pronunciation_guide: '/gʊd ˈmɔːrnɪŋ haʊ meɪ aɪ dɪˈrekt jɔːr kɔːl/',
    usage_examples: ['Office telephone reception', 'Call centre opening line', 'Receptionist greeting'],
    cultural_note: 'Polished phone etiquette phrase — essential for BPO and IT sector professionals in Hyderabad',
    difficulty: 3,
  },
  {
    id: '28',
    category: 'customer',
    greeting_english: 'Is there anything else I can help you with today?',
    greeting_telugu: 'నేడు నేను మీకు మరింత సహాయపడగలనా?',
    pronunciation_guide: '/ɪz ðer ˈeniθɪŋ els aɪ kæn help juː wɪð təˈdeɪ/',
    usage_examples: ['End of a customer interaction', 'After resolving a complaint', 'Post-purchase at a store'],
    cultural_note: 'Closing a service interaction gracefully is a key skill — shows thoroughness valued in Indian service industries',
    difficulty: 3,
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'morning', label: '🌅 Morning' },
  { key: 'afternoon', label: '☀️ Afternoon' },
  { key: 'evening', label: '🌆 Evening' },
  { key: 'professional', label: '💼 Professional' },
  { key: 'casual', label: '😊 Casual' },
  { key: 'festival', label: '🎉 Festival' },
  { key: 'customer', label: '🛍️ Customer' },
  { key: 'friend', label: '👫 Friend' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTodayDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const renderDifficultyStars = (difficulty: number): string => {
  const filled = '★'.repeat(difficulty);
  const empty = '☆'.repeat(3 - difficulty);
  return filled + empty;
};

const speakText = (text: string) => {
  Speech.speak(text, { language: 'en-IN', rate: 0.8, pitch: 1.0 });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const FeaturedGreetingCard: React.FC<{ greeting: Greeting; onPractice: () => void }> = ({
  greeting,
  onPractice,
}) => (
  <View style={styles.featuredCard}>
    <View style={styles.categoryBadge}>
      <Text style={styles.categoryBadgeText}>{greeting.category.toUpperCase()}</Text>
    </View>
    <Text style={styles.featuredGreetingText}>{greeting.greeting_english}</Text>
    <Text style={styles.featuredTeluguText}>{greeting.greeting_telugu}</Text>
    <View style={styles.pronunciationRow}>
      <Text style={styles.pronunciationIcon}>🔤</Text>
      <Text style={styles.pronunciationText}>{greeting.pronunciation_guide}</Text>
    </View>
    <View style={styles.featuredActions}>
      <TouchableOpacity
        style={styles.hearButton}
        onPress={() => speakText(greeting.greeting_english)}
      >
        <Text style={styles.hearButtonIcon}>🔊</Text>
        <Text style={styles.hearButtonText}>Tap to hear</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.practiceButtonFeatured} onPress={onPractice}>
        <Text style={styles.practiceButtonFeaturedText}>Practice</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const GreetingCard: React.FC<{ greeting: Greeting; onPractice: () => void }> = ({
  greeting,
  onPractice,
}) => (
  <View style={styles.greetingCard}>
    <View style={styles.greetingCardHeader}>
      <Text style={styles.greetingCardEnglish} numberOfLines={2}>
        {greeting.greeting_english}
      </Text>
      <TouchableOpacity
        style={styles.audioButton}
        onPress={() => speakText(greeting.greeting_english)}
      >
        <Text style={styles.audioButtonIcon}>🔊</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.greetingCardTelugu} numberOfLines={2}>
      {greeting.greeting_telugu}
    </Text>
    <View style={styles.greetingCardFooter}>
      <Text style={styles.difficultyStars}>{renderDifficultyStars(greeting.difficulty)}</Text>
      <TouchableOpacity style={styles.practiceButtonSmall} onPress={onPractice}>
        <Text style={styles.practiceButtonSmallText}>Practice</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Practice Modal ───────────────────────────────────────────────────────────

// ─── Practice Modal ───────────────────────────────────────────────────────────

const PracticeModal: React.FC<{
  visible: boolean;
  greeting: Greeting | null;
  onClose: () => void;
}> = ({ visible, greeting, onClose }) => {
  const [isListening, setIsListening] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [result, setResult] = useState<PronunciationScore | null>(null);
  const [sttAvailable, setSttAvailable] = useState(true);

  useEffect(() => {
    if (visible) {
      initializeSpeechRecognition();
      checkSTTAvailability();
      setResult(null);
      setPartialTranscript('');
      setIsListening(false);
    }
    return () => {
      destroySpeechRecognition();
    };
  }, [visible]);

  const checkSTTAvailability = async () => {
    const available = await isSpeechRecognitionAvailable();
    setSttAvailable(available);
  };

  if (!greeting) return null;

  const handleStartListening = async () => {
    if (!sttAvailable) {
      alert('Speech recognition is not available on this device.');
      return;
    }

    setResult(null);
    setPartialTranscript('');
    setIsListening(true);

    try {
      await startListening({
        language: 'en-IN',
        partialResults: true,
        continuous: Platform.OS === 'android' || Platform.OS === 'web',
        onPartialResult: (text) => setPartialTranscript(text),
        onFinalResult: async (recognitionResult) => {
          setIsListening(false);
          setPartialTranscript('');
          gradeRecognition(recognitionResult.transcript);
        },
        onError: (error) => {
          setIsListening(false);
          setPartialTranscript('');
          console.warn('[STT Error]', error);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
    } catch (err) {
      setIsListening(false);
      console.error(err);
    }
  };

  const handleStopListening = async () => {
    await stopListening();
    setIsListening(false);
  };

  const gradeRecognition = (transcript: string) => {
    if (!transcript.trim()) return;
    const score = scorePronunciation(transcript, greeting.greeting_english);
    setResult(score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent! 🌟';
    if (score >= 75) return 'Good! 👍';
    if (score >= 60) return 'Fair 😊';
    if (score >= 40) return 'Keep Practicing 💪';
    return 'Needs Work 📖';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Practice Mode</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Greeting display */}
            <View style={styles.practiceGreetingBox}>
              <Text style={styles.practiceGreetingEnglish}>{greeting.greeting_english}</Text>
              <Text style={styles.practiceGreetingTelugu}>{greeting.greeting_telugu}</Text>
              <Text style={styles.practicePronunciation}>{greeting.pronunciation_guide}</Text>
            </View>

            {/* Listen button */}
            <TouchableOpacity
              style={styles.listenButton}
              onPress={() => speakText(greeting.greeting_english)}
            >
              <Text style={styles.listenButtonIcon}>🔊</Text>
              <Text style={styles.listenButtonText}>Listen</Text>
            </TouchableOpacity>

            {/* Speak section */}
            <View style={styles.speakSection}>
              <Text style={styles.speakTitle}>Your turn — speak it!</Text>

              {partialTranscript ? (
                <View style={styles.partialTranscriptContainer}>
                  <Text style={styles.partialTranscriptText}>"{partialTranscript}"</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.micButton, isListening && styles.micButtonActive]}
                onPress={isListening ? handleStopListening : handleStartListening}
              >
                <Text style={styles.micIcon}>{isListening ? '⏹️' : '🎤'}</Text>
              </TouchableOpacity>
              <Text style={styles.micHint}>
                {isListening ? '🔴 Recording... Tap to stop' : 'Tap mic and say the greeting'}
              </Text>
              {!sttAvailable && (
                <Text style={styles.sttWarningText}>
                  ⚠️ Speech recognition not fully supported on this device/browser.
                </Text>
              )}
            </View>

            {/* Score */}
            {result ? (
              <View style={[styles.scoreCard, { borderColor: getScoreColor(result.overall_score) + '55' }]}>
                <Text style={styles.scoreEmoji}>🎯</Text>
                <Text style={[styles.scoreTitle, { color: getScoreColor(result.overall_score) }]}>
                  {getScoreLabel(result.overall_score)}
                </Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(result.overall_score) }]}>
                  {result.overall_score} / 100
                </Text>
                <Text style={styles.scoreSubtitle}>Pronunciation Score</Text>

                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackText}>{result.feedback}</Text>
                  <Text style={styles.feedbackTelugu}>{result.feedback_telugu}</Text>
                </View>

                {result.words_analysis?.length > 0 && (
                  <View style={styles.wordsAnalysisBox}>
                    <Text style={styles.wordsAnalysisTitle}>Word Analysis:</Text>
                    {result.words_analysis.map((wa, i) => (
                      <View key={i} style={styles.wordAnalysisItem}>
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: wa.status === 'correct' ? '#10B981' : wa.status === 'mispronounced' ? '#F59E0B' : '#EF4444'
                        }}>
                          {wa.status === 'correct' ? '✓' : wa.status === 'mispronounced' ? '~' : '✗'} {wa.word}
                        </Text>
                        {wa.tip && wa.status !== 'correct' && (
                          <Text style={styles.wordTipText}>{wa.tip}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.scoreCard, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }]}>
                <Text style={styles.scoreEmoji}>🎙️</Text>
                <Text style={[styles.scoreTitle, { color: '#4B5563' }]}>Ready to Practice</Text>
                <Text style={styles.scoreSubtitle}>Speak to get your pronunciation score</Text>
              </View>
            )}

            {/* Tips */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Tips</Text>
              <View style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{greeting.cultural_note}</Text>
              </View>
              {greeting.usage_examples.map((example, index) => (
                <View key={index} style={styles.tipItem}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{example}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const DailyGreetingsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [practiceGreeting, setPracticeGreeting] = useState<Greeting | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const greetings = MOCK_GREETINGS;
  const featuredGreeting = greetings[0];

  const filteredGreetings =
    selectedCategory === 'all'
      ? greetings
      : greetings.filter((g) => g.category === selectedCategory);

  const openPractice = useCallback((greeting: Greeting) => {
    setPracticeGreeting(greeting);
    setModalVisible(true);
  }, []);

  const closePractice = useCallback(() => {
    setModalVisible(false);
    setCompletedCount((prev) => Math.min(prev + 1, 3));
  }, []);

  const renderGreetingItem = useCallback(
    ({ item }: { item: Greeting }) => (
      <GreetingCard greeting={item} onPractice={() => openPractice(item)} />
    ),
    [openPractice]
  );

  const keyExtractor = useCallback((item: Greeting) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7B61FF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Daily Greetings</Text>
          <Text style={styles.headerSubtitle}>Master real-world English greetings</Text>
          <Text style={styles.headerDate}>{getTodayDate()}</Text>
        </View>
        <Text style={styles.headerEmoji}>👋</Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Daily Challenge Banner */}
        <View style={styles.challengeBanner}>
          <Text style={styles.challengeIcon}>🏆</Text>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle}>Daily Challenge</Text>
            <Text style={styles.challengeSubtitle}>
              Complete 3 greetings for 50 XP!
            </Text>
          </View>
          <View style={styles.challengeProgress}>
            <Text style={styles.challengeProgressText}>
              {completedCount}/3
            </Text>
          </View>
        </View>

        {/* Featured Greeting */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⭐ Today's Featured Greeting</Text>
          <FeaturedGreetingCard
            greeting={featuredGreeting}
            onPractice={() => openPractice(featuredGreeting)}
          />
        </View>

        {/* Category Filter Tabs */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Browse by Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContainer}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.tab, selectedCategory === cat.key && styles.tabActive]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <Text
                  style={[styles.tabText, selectedCategory === cat.key && styles.tabTextActive]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Greetings Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {filteredGreetings.length} Greetings
          </Text>
          {filteredGreetings.map((item) => (
            <GreetingCard
              key={item.id}
              greeting={item}
              onPractice={() => openPractice(item)}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Practice Modal */}
      <PracticeModal
        visible={modalVisible}
        greeting={practiceGreeting}
        onClose={closePractice}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#7B61FF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#C7D2FE',
    marginTop: 2,
  },
  headerDate: {
    fontSize: 11,
    color: '#A5B4FC',
    marginTop: 4,
  },
  headerEmoji: {
    fontSize: 40,
  },
  body: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  // Challenge Banner
  challengeBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  challengeIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  challengeSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  challengeProgress: {
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeProgressText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Featured Card
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#7B61FF',
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7B61FF',
    letterSpacing: 1,
  },
  featuredGreetingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 8,
  },
  featuredTeluguText: {
    fontSize: 15,
    color: '#7C3AED',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 22,
  },
  pronunciationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  pronunciationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  pronunciationText: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
  },
  featuredActions: {
    flexDirection: 'row',
    gap: 10,
  },
  hearButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  hearButtonIcon: {
    fontSize: 16,
  },
  hearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B61FF',
  },
  practiceButtonFeatured: {
    flex: 1,
    backgroundColor: '#7B61FF',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  practiceButtonFeaturedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Category Tabs
  tabsContainer: {
    paddingRight: 16,
    gap: 8,
  },
  tab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: '#7B61FF',
    borderColor: '#7B61FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  // Greeting Card
  greetingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  greetingCardEnglish: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  audioButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioButtonIcon: {
    fontSize: 16,
  },
  greetingCardTelugu: {
    fontSize: 13,
    color: '#7C3AED',
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 20,
  },
  greetingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  difficultyStars: {
    fontSize: 16,
    color: '#F59E0B',
    letterSpacing: 2,
  },
  practiceButtonSmall: {
    backgroundColor: '#7B61FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  practiceButtonSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseIcon: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '700',
  },
  practiceGreetingBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 18,
    marginTop: 16,
  },
  practiceGreetingEnglish: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 26,
    marginBottom: 8,
  },
  practiceGreetingTelugu: {
    fontSize: 14,
    color: '#7C3AED',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  practicePronunciation: {
    fontSize: 13,
    color: '#4B5563',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  listenButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7B61FF',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  listenButtonIcon: {
    fontSize: 18,
  },
  listenButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  speakSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  speakTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  micButton: {
    backgroundColor: '#10B981',
    borderRadius: 40,
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  micIcon: {
    fontSize: 30,
  },
  micHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
  scoreCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  scoreEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#10B981',
    marginVertical: 4,
  },
  scoreSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  tipsSection: {
    marginTop: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  tipBullet: {
    fontSize: 14,
    color: '#F59E0B',
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  partialTranscriptContainer: {
    backgroundColor: '#FFF0E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    maxWidth: '85%',
  },
  partialTranscriptText: {
    color: '#7B61FF',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sttWarningText: {
    color: '#F59E0B',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
  feedbackContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackTelugu: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  wordsAnalysisBox: {
    width: '100%',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
  },
  wordsAnalysisTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  wordAnalysisItem: {
    marginBottom: 6,
  },
  wordTipText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    marginLeft: 16,
  },
});

export default DailyGreetingsScreen;
