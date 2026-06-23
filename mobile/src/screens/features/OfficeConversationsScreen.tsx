import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'categories' | 'scenarios' | 'conversation' | 'feedback';

interface CategoryItem {
  id: string;
  icon: string;
  title: string;
  color: string[];
  scenarioCount: number;
}

interface Scenario {
  id: string;
  categoryId: string;
  title: string;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  persona: string;
  starterMessage: string;
  keyVocab: string[];
  culturalTip: string;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

interface FeedbackData {
  score: number;
  professionalWords: string[];
  suggestions: string[];
  teluguGuidance: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const CATEGORIES: CategoryItem[] = [
  { id: 'leave', icon: '📋', title: 'Leave Request', color: ['#667eea', '#764ba2'], scenarioCount: 4 },
  { id: 'updates', icon: '📊', title: 'Work Updates', color: ['#f093fb', '#f5576c'], scenarioCount: 5 },
  { id: 'manager', icon: '👔', title: 'With Manager', color: ['#4facfe', '#00f2fe'], scenarioCount: 6 },
  { id: 'meetings', icon: '🤝', title: 'Team Meetings', color: ['#43e97b', '#38f9d7'], scenarioCount: 5 },
  { id: 'hr', icon: '👩‍💼', title: 'HR Communication', color: ['#fa709a', '#fee140'], scenarioCount: 4 },
  { id: 'client', icon: '📞', title: 'Client Calls', color: ['#a18cd1', '#fbc2eb'], scenarioCount: 5 },
  { id: 'project', icon: '💻', title: 'Project Discussion', color: ['#ffecd2', '#fcb69f'], scenarioCount: 6 },
  { id: 'standup', icon: '⏰', title: 'Daily Standup', color: ['#a1c4fd', '#c2e9fb'], scenarioCount: 3 },
  { id: 'remote', icon: '🏠', title: 'Remote Work', color: ['#d4fc79', '#96e6a1'], scenarioCount: 4 },
  { id: 'smalltalk', icon: '☕', title: 'Small Talk', color: ['#fddb92', '#d1fdff'], scenarioCount: 5 },
];

const SCENARIOS: Scenario[] = [
  {
    id: 'leave_1',
    categoryId: 'leave',
    title: 'Requesting Casual Leave',
    difficulty: 1,
    estimatedMinutes: 5,
    persona: 'Rahul Sir (Your Manager)',
    starterMessage: "Good morning! You wanted to talk to me about something?",
    keyVocab: ['I would like to request', 'convenient time', 'prior approval', 'urgent personal matter', 'handover'],
    culturalTip: 'Always address your manager respectfully. In Indian offices, saying "Sir" or "Ma\'am" is common and expected. Giving advance notice is very important.',
  },
  {
    id: 'leave_2',
    categoryId: 'leave',
    title: 'Applying for Medical Leave',
    difficulty: 1,
    estimatedMinutes: 5,
    persona: 'Priya (HR Manager)',
    starterMessage: "Hello! I see you'd like to apply for medical leave. What seems to be the situation?",
    keyVocab: ['medical certificate', 'unable to attend', 'under doctor\'s advice', 'recovery period', 'work from home option'],
    culturalTip: 'For medical leave, always mention that you will submit a medical certificate. HR appreciates proactive communication.',
  },
  {
    id: 'manager_1',
    categoryId: 'manager',
    title: 'Asking for a Salary Hike',
    difficulty: 3,
    estimatedMinutes: 10,
    persona: 'Anil Kumar (Your Manager)',
    starterMessage: "Come in, come in. You said you wanted to discuss something important. Please sit down.",
    keyVocab: ['performance review', 'market rate', 'contributions', 'revision', 'responsibilities have grown'],
    culturalTip: 'In Indian corporate culture, it is best to have this conversation after appraisal season or after completing a major project. Always back your request with data.',
  },
  {
    id: 'standup_1',
    categoryId: 'standup',
    title: 'Daily Standup Update',
    difficulty: 1,
    estimatedMinutes: 3,
    persona: 'Team Lead Sanjay',
    starterMessage: "Good morning team! Let's start the standup. Arjun, can you give your update first?",
    keyVocab: ['yesterday I completed', 'today I am working on', 'no blockers', 'will need help with', 'on track'],
    culturalTip: 'Keep standup updates crisp — typically under 2 minutes. Cover: what you did, what you will do, any blockers. Do not go into deep technical details.',
  },
  {
    id: 'client_1',
    categoryId: 'client',
    title: 'Handling a Client Complaint',
    difficulty: 3,
    estimatedMinutes: 10,
    persona: 'Mr. Sharma (Client)',
    starterMessage: "I am very disappointed with the delays in your project. This is the third time the deadline has been missed. What is your explanation?",
    keyVocab: ['sincerely apologize', 'understand your frustration', 'immediate action', 'escalate', 'ensure this does not happen again'],
    culturalTip: 'Never get defensive with a client. Acknowledge the issue, apologize sincerely, and offer a clear action plan. Stay calm and professional at all times.',
  },
  {
    id: 'smalltalk_1',
    categoryId: 'smalltalk',
    title: 'Coffee Machine Chat',
    difficulty: 1,
    estimatedMinutes: 4,
    persona: 'Divya (Colleague from Finance)',
    starterMessage: "Hey! Haven't seen you around much this week. Been super busy?",
    keyVocab: ['been swamped', 'catching up', 'how is your project going', 'work-life balance', 'looking forward to the weekend'],
    culturalTip: 'Small talk builds workplace relationships. Keep topics light: weather, weekend plans, recent movies, food. Avoid politics, salary, and personal relationships.',
  },
  {
    id: 'meetings_1',
    categoryId: 'meetings',
    title: 'Presenting in a Team Meeting',
    difficulty: 2,
    estimatedMinutes: 8,
    persona: 'Team (4 members + Manager Kavitha)',
    starterMessage: "Alright everyone, Arjun is going to present the Q3 analysis. Arjun, the floor is yours.",
    keyVocab: ['as you can see from the data', 'to summarize', 'in conclusion', 'I would like to highlight', 'questions are welcome'],
    culturalTip: 'When presenting, speak slowly and clearly. It is okay to say "Let me check and get back to you" if you do not know an answer. Never bluff.',
  },
  {
    id: 'hr_1',
    categoryId: 'hr',
    title: 'Performance Review Discussion',
    difficulty: 2,
    estimatedMinutes: 8,
    persona: 'Meena (HR Business Partner)',
    starterMessage: "Hi, thanks for coming. Let's start your annual performance review. How do you feel this year went for you overall?",
    keyVocab: ['exceeded expectations', 'areas of improvement', 'career goals', 'upskilling', 'feedback'],
    culturalTip: 'Be honest but positive in performance reviews. Acknowledge areas to improve but frame them as growth opportunities. Always have your achievements ready with examples.',
  },
];

const MOCK_AI_RESPONSES: Record<string, string[]> = {
  leave_1: [
    "I see, so you need leave for a personal matter. How many days are you looking at?",
    "Okay, and have you made sure your current work is covered? Who will handle your tasks?",
    "Alright, I appreciate you informing me in advance. Please send me a formal leave application by email and I will approve it.",
  ],
  manager_1: [
    "I see. And what makes you feel a revision is warranted at this point?",
    "Those are good points. I have to be honest with you — budgets are tight right now. What is your expectation?",
    "Let me take this up with upper management and get back to you by end of this week. I appreciate you having this conversation directly with me.",
  ],
  default: [
    "I understand. Could you tell me more about that?",
    "That is a fair point. Let me think about this.",
    "Okay, that makes sense. What would you like to do next?",
  ],
};

const FEEDBACK_DATA: FeedbackData = {
  score: 82,
  professionalWords: ['appreciate', 'at your earliest convenience', 'ensure', 'prior approval', 'respectfully request'],
  suggestions: [
    "Use 'I would like to' instead of 'I want to' for a more professional tone.",
    "Always mention a backup plan — who will handle your work in your absence.",
    "End with a polite closing like 'Thank you for your understanding.'",
  ],
  teluguGuidance:
    'మీరు conversation లో professional గా మాట్లాడారు. కానీ కొన్ని చోట్ల informal words use చేసారు. "I want" కి బదులు "I would like" అంటే మరింత polite గా ఉంటుంది. Manager తో మాట్లాడేటప్పుడు Sir/Ma\'am తో address చేయడం మరియు advance notice ఇవ్వడం చాలా important.',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const StarRating: React.FC<{ count: 1 | 2 | 3 }> = ({ count }) => (
  <Text style={styles.stars}>
    {'★'.repeat(count)}{'☆'.repeat(3 - count)}
  </Text>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const OfficeConversationsScreen: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('categories');
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [aiResponseIndex, setAiResponseIndex] = useState(0);
  const [vocabVisible, setVocabVisible] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const totalScenarios = SCENARIOS.length;

  const categoryScenarios = selectedCategory
    ? SCENARIOS.filter((s) => s.categoryId === selectedCategory.id)
    : [];

  const startScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([
      {
        id: 'ai_0',
        role: 'ai',
        text: scenario.starterMessage,
        timestamp: new Date(),
      },
    ]);
    setAiResponseIndex(0);
    setTurnCount(0);
    setScreen('conversation');
  };

  const sendMessage = () => {
    if (!inputText.trim() || !selectedScenario) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: inputText.trim(),
      timestamp: new Date(),
    };

    const responses = MOCK_AI_RESPONSES[selectedScenario.id] ?? MOCK_AI_RESPONSES.default;
    const aiText = responses[aiResponseIndex % responses.length];

    const aiMsg: ChatMessage = {
      id: `ai_${Date.now() + 1}`,
      role: 'ai',
      text: aiText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInputText('');
    setAiResponseIndex((prev) => prev + 1);
    setTurnCount((prev) => prev + 1);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);

    if (turnCount >= 2) {
      setTimeout(() => setScreen('feedback'), 600);
    }
  };

  // ─── Categories Grid ──────────────────────────────────────────────────────

  const renderCategories = () => (
    <View style={styles.modeContainer}>
      <View style={styles.scenarioBadge}>
        <Text style={styles.scenarioBadgeText}>{totalScenarios} Scenarios</Text>
      </View>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.categoryCard}
            onPress={() => { setSelectedCategory(cat); setScreen('scenarios'); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={cat.color as any} style={styles.categoryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={styles.categoryCardTitle}>{cat.title}</Text>
              <Text style={styles.categoryCardCount}>{cat.scenarioCount} scenarios</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ─── Scenario List ────────────────────────────────────────────────────────

  const renderScenarios = () => (
    <View style={styles.modeContainer}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('categories')}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>{selectedCategory?.icon} {selectedCategory?.title}</Text>
      {categoryScenarios.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No scenarios yet. Coming soon!</Text>
        </View>
      ) : (
        categoryScenarios.map((scenario) => (
          <View key={scenario.id} style={styles.scenarioCard}>
            <View style={styles.scenarioCardTop}>
              <Text style={styles.scenarioTitle}>{scenario.title}</Text>
              <StarRating count={scenario.difficulty} />
            </View>
            <Text style={styles.scenarioDuration}>⏱ ~{scenario.estimatedMinutes} minutes</Text>
            <Text style={styles.scenarioPersona}>🎭 {scenario.persona}</Text>
            <TouchableOpacity onPress={() => startScenario(scenario)}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.startBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.startBtnText}>▶ Start Practice</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  // ─── Conversation ─────────────────────────────────────────────────────────

  const renderConversation = () => {
    if (!selectedScenario) return null;
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* AI Persona Header */}
        <View style={styles.personaHeader}>
          <TouchableOpacity onPress={() => setScreen('scenarios')} style={styles.backSmall}>
            <Text style={styles.backSmallText}>←</Text>
          </TouchableOpacity>
          <View style={styles.personaAvatar}>
            <Text style={styles.personaAvatarText}>{selectedScenario.persona.charAt(0)}</Text>
          </View>
          <View style={styles.personaInfo}>
            <Text style={styles.personaLabel}>Talking with:</Text>
            <Text style={styles.personaName}>{selectedScenario.persona}</Text>
          </View>
          <TouchableOpacity style={styles.tipBtn} onPress={() => setTipVisible(true)}>
            <Text style={styles.tipBtnText}>💡 Tips</Text>
          </TouchableOpacity>
        </View>

        {/* Chat */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {msg.role === 'ai' && <Text style={styles.aiName}>{selectedScenario.persona.split('(')[0].trim()}</Text>}
              <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.aiText]}>{msg.text}</Text>
              <Text style={styles.messageTime}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
          {turnCount >= 2 && (
            <View style={styles.endConversationHint}>
              <Text style={styles.endHintText}>Conversation ending... preparing feedback</Text>
            </View>
          )}
        </ScrollView>

        {/* Vocab Panel */}
        {vocabVisible && (
          <View style={styles.vocabPanel}>
            <View style={styles.vocabHeader}>
              <Text style={styles.vocabTitle}>Key Vocabulary</Text>
              <TouchableOpacity onPress={() => setVocabVisible(false)}>
                <Text style={styles.vocabClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedScenario.keyVocab.map((word, i) => (
              <View key={i} style={styles.vocabItem}>
                <Text style={styles.vocabBullet}>•</Text>
                <Text style={styles.vocabWord}>{word}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TouchableOpacity style={styles.vocabToggleBtn} onPress={() => setVocabVisible(!vocabVisible)}>
            <Text style={styles.vocabToggleText}>📚</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.chatInput}
            placeholder="Type your reply..."
            placeholderTextColor="#aaa"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={300}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.sendBtnGradient}>
              <Text style={styles.sendBtnText}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Cultural Tip Modal */}
        <Modal visible={tipVisible} transparent animationType="fade">
          <View style={styles.tipOverlay}>
            <View style={styles.tipModal}>
              <Text style={styles.tipModalTitle}>💡 Cultural Tip</Text>
              <Text style={styles.tipModalText}>{selectedScenario.culturalTip}</Text>
              <TouchableOpacity style={styles.tipModalClose} onPress={() => setTipVisible(false)}>
                <Text style={styles.tipModalCloseText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  };

  // ─── Feedback ─────────────────────────────────────────────────────────────

  const renderFeedback = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.modeContainer}>
        <View style={styles.scoreCircleContainer}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>{FEEDBACK_DATA.score}</Text>
            <Text style={styles.scoreLabel}>/100</Text>
          </LinearGradient>
          <Text style={styles.scoreTitle}>Communication Score</Text>
          <Text style={styles.scoreSubtitle}>
            {FEEDBACK_DATA.score >= 80 ? 'Great job! Keep practicing.' : 'Good effort! Review the tips below.'}
          </Text>
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackSectionTitle}>Professional Vocabulary Used</Text>
          <View style={styles.vocabUsedContainer}>
            {FEEDBACK_DATA.professionalWords.map((word, i) => (
              <View key={i} style={styles.vocabUsedChip}>
                <Text style={styles.vocabUsedText}>✓ {word}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackSectionTitle}>Suggestions to Improve</Text>
          {FEEDBACK_DATA.suggestions.map((s, i) => (
            <View key={i} style={styles.suggestionRow}>
              <Text style={styles.suggestionNumber}>{i + 1}</Text>
              <Text style={styles.suggestionText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.feedbackCard, styles.teluguFeedbackCard]}>
          <Text style={styles.teluguFeedbackLabel}>Telugu Guidance (తెలుగు సూచనలు)</Text>
          <Text style={styles.teluguFeedbackText}>{FEEDBACK_DATA.teluguGuidance}</Text>
        </View>

        <View style={styles.feedbackActions}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { if (selectedScenario) startScenario(selectedScenario); }}
          >
            <Text style={styles.retryBtnText}>🔄 Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setScreen('categories')} style={styles.homeHalf}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.homeBtn}>
              <Text style={styles.homeBtnText}>🏠 More Scenarios</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      {screen !== 'conversation' && (
        <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.headerTitle}>🏢 Office Conversations</Text>
          <Text style={styles.headerSubtitle}>Real workplace English</Text>
          {screen === 'categories' && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{totalScenarios} Scenarios</Text>
            </View>
          )}
        </LinearGradient>
      )}

      <View style={styles.flex}>
        {screen === 'categories' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderCategories()}
          </ScrollView>
        )}
        {screen === 'scenarios' && (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderScenarios()}
          </ScrollView>
        )}
        {screen === 'conversation' && renderConversation()}
        {screen === 'feedback' && renderFeedback()}
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#667eea';
const TEAL = '#4facfe';
const CARD_BG = '#1e1e2e';
const BG = '#12121f';
const TEXT = '#ffffff';
const TEXT_MUTED = '#9ca3af';
const BORDER = '#2d2d44';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  modeContainer: { padding: 16 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  headerBadgeText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // Categories
  scenarioBadge: { alignSelf: 'flex-end', backgroundColor: 'rgba(79,172,254,0.15)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginBottom: 12 },
  scenarioBadgeText: { fontSize: 13, color: TEAL, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: { width: '47%', borderRadius: 16, overflow: 'hidden' },
  categoryGradient: { padding: 16, minHeight: 100, justifyContent: 'space-between' },
  categoryIcon: { fontSize: 28 },
  categoryCardTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 8 },
  categoryCardCount: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Scenarios
  backBtn: { marginBottom: 14 },
  backBtnText: { fontSize: 15, color: TEAL, fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 16 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: TEXT_MUTED },
  scenarioCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  scenarioCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scenarioTitle: { fontSize: 15, fontWeight: '700', color: TEXT, flex: 1, marginRight: 10 },
  stars: { fontSize: 14, color: '#ffd700' },
  scenarioDuration: { fontSize: 13, color: TEXT_MUTED, marginBottom: 4 },
  scenarioPersona: { fontSize: 13, color: TEXT_MUTED, marginBottom: 14 },
  startBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  startBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // Conversation
  personaHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BG, padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 10 },
  backSmall: { padding: 4 },
  backSmallText: { fontSize: 20, color: TEAL },
  personaAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  personaAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  personaInfo: { flex: 1 },
  personaLabel: { fontSize: 11, color: TEXT_MUTED },
  personaName: { fontSize: 14, fontWeight: '700', color: TEXT },
  tipBtn: { backgroundColor: 'rgba(255,214,0,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  tipBtnText: { fontSize: 12, color: '#ffd700', fontWeight: '600' },

  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 20 },
  messageBubble: { maxWidth: '80%', marginBottom: 14, borderRadius: 16, padding: 12 },
  aiBubble: { backgroundColor: CARD_BG, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: BORDER },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiName: { fontSize: 11, color: TEAL, fontWeight: '700', marginBottom: 4 },
  messageText: { fontSize: 14, lineHeight: 21 },
  aiText: { color: TEXT },
  userText: { color: '#fff' },
  messageTime: { fontSize: 10, color: TEXT_MUTED, marginTop: 4, alignSelf: 'flex-end' },

  endConversationHint: { alignItems: 'center', paddingVertical: 10 },
  endHintText: { fontSize: 13, color: TEXT_MUTED, fontStyle: 'italic' },

  vocabPanel: { backgroundColor: '#1a1a2e', borderTopWidth: 1, borderTopColor: BORDER, padding: 14 },
  vocabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  vocabTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  vocabClose: { fontSize: 16, color: TEXT_MUTED },
  vocabItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  vocabBullet: { fontSize: 14, color: PURPLE, fontWeight: '700' },
  vocabWord: { fontSize: 13, color: TEXT_MUTED, flex: 1 },

  inputArea: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: CARD_BG, borderTopWidth: 1, borderTopColor: BORDER, gap: 8 },
  vocabToggleBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  vocabToggleText: { fontSize: 18 },
  chatInput: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: TEXT, maxHeight: 100, borderWidth: 1, borderColor: BORDER },
  sendBtn: { width: 44, height: 44 },
  sendBtnGradient: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: '#fff' },

  tipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  tipModal: { backgroundColor: '#1e1e2e', borderRadius: 20, padding: 24, width: '100%' },
  tipModalTitle: { fontSize: 18, fontWeight: '800', color: '#ffd700', marginBottom: 12 },
  tipModalText: { fontSize: 14, color: TEXT, lineHeight: 22, marginBottom: 20 },
  tipModalClose: { backgroundColor: PURPLE, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  tipModalCloseText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  // Feedback
  scoreCircleContainer: { alignItems: 'center', marginBottom: 24 },
  scoreCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  scoreNumber: { fontSize: 36, fontWeight: '900', color: '#fff' },
  scoreLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: -4 },
  scoreTitle: { fontSize: 20, fontWeight: '800', color: TEXT, marginBottom: 4 },
  scoreSubtitle: { fontSize: 14, color: TEXT_MUTED },
  feedbackCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  feedbackSectionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 12 },
  vocabUsedContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vocabUsedChip: { backgroundColor: 'rgba(67,233,123,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  vocabUsedText: { fontSize: 13, color: '#43e97b', fontWeight: '600' },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  suggestionNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: PURPLE, textAlign: 'center', lineHeight: 24, fontSize: 12, color: '#fff', fontWeight: '700' },
  suggestionText: { flex: 1, fontSize: 13, color: TEXT_MUTED, lineHeight: 20 },
  teluguFeedbackCard: { borderLeftWidth: 4, borderLeftColor: TEAL },
  teluguFeedbackLabel: { fontSize: 12, color: TEAL, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  teluguFeedbackText: { fontSize: 13, color: TEXT, lineHeight: 21 },
  feedbackActions: { flexDirection: 'row', gap: 12 },
  retryBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  retryBtnText: { fontSize: 14, color: TEXT, fontWeight: '600' },
  homeHalf: { flex: 1 },
  homeBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  homeBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});

export default OfficeConversationsScreen;
