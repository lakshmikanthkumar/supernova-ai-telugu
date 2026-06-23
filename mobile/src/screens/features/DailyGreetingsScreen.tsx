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
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'morning', label: '🌅 Morning' },
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

const PracticeModal: React.FC<{
  visible: boolean;
  greeting: Greeting | null;
  onClose: () => void;
}> = ({ visible, greeting, onClose }) => {
  if (!greeting) return null;

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
              <TouchableOpacity style={styles.micButton}>
                <Text style={styles.micIcon}>🎤</Text>
              </TouchableOpacity>
              <Text style={styles.micHint}>Tap mic and say the greeting</Text>
            </View>

            {/* Score */}
            <View style={styles.scoreCard}>
              <Text style={styles.scoreEmoji}>🎯</Text>
              <Text style={styles.scoreTitle}>Great!</Text>
              <Text style={styles.scoreValue}>85 / 100</Text>
              <Text style={styles.scoreSubtitle}>Pronunciation Score</Text>
            </View>

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
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

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
    backgroundColor: '#4F46E5',
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
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
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
    color: '#4F46E5',
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
    color: '#4F46E5',
  },
  practiceButtonFeatured: {
    flex: 1,
    backgroundColor: '#4F46E5',
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
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
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
    backgroundColor: '#4F46E5',
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
    backgroundColor: '#4F46E5',
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
});

export default DailyGreetingsScreen;
