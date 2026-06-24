import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import * as Speech from 'expo-speech';
import { Bot } from 'lucide-react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IntroTemplate {
  key: string;
  label: string;
  icon: string;
  description: string;
  fullText: string;
  keyPhrases: { phrase: string; meaning: string }[];
  tips: string[];
  mockFeedback: {
    score: number;
    strengths: string[];
    improvements: string[];
  };
}

// ─── Templates ────────────────────────────────────────────────────────────────

const INTRO_TEMPLATES: IntroTemplate[] = [
  {
    key: 'student',
    label: 'Student',
    icon: '🎓',
    description: 'For college/school introductions',
    fullText:
      "Good morning, everyone! My name is Ravi Kumar, and I am currently pursuing my Bachelor's in Computer Science at JNTU. I am from Hyderabad, Telangana. I am passionate about coding and software development. In my free time, I enjoy solving problems on coding platforms and participating in hackathons. I am eager to learn new technologies and collaborate with talented individuals. It is a pleasure to meet all of you, and I look forward to growing together.",
    keyPhrases: [
      { phrase: 'currently pursuing', meaning: 'ప్రస్తుతం చదువుతున్నాను' },
      { phrase: 'passionate about', meaning: 'పట్ల అభిరుచి ఉంది' },
      { phrase: 'eager to learn', meaning: 'నేర్చుకోవాలని ఉత్సుకత ఉంది' },
      { phrase: 'It is a pleasure to meet', meaning: 'కలవడం సంతోషంగా ఉంది' },
    ],
    tips: [
      'Speak clearly and at a steady pace',
      'Make eye contact with the audience',
      'Mention your academic goals',
      'Add a unique hobby or interest',
    ],
    mockFeedback: {
      score: 82,
      strengths: ['Clear structure', 'Good vocabulary', 'Confident tone'],
      improvements: ['Add more specific achievements', 'Practice smoother transitions'],
    },
  },
  {
    key: 'fresher',
    label: 'Fresher',
    icon: '🌱',
    description: 'First job / entry-level introduction',
    fullText:
      "Good morning! I am Priya Sharma, a recent graduate from Osmania University with a degree in Electronics and Communication Engineering. I completed my internship at a software firm where I worked on IoT projects. I am a quick learner and I adapt well to new environments. My strengths include problem-solving, teamwork, and a strong work ethic. I am very excited about this opportunity and I am confident that I can contribute positively to your organisation. Thank you for this opportunity.",
    keyPhrases: [
      { phrase: 'recent graduate', meaning: 'ఇటీవలే పట్టభద్రుడయ్యాను' },
      { phrase: 'quick learner', meaning: 'వేగంగా నేర్చుకుంటాను' },
      { phrase: 'strong work ethic', meaning: 'పని పట్ల అంకితభావం' },
      { phrase: 'contribute positively', meaning: 'సానుకూలంగా సహకరించడం' },
    ],
    tips: [
      'Highlight your internship or project experience',
      'Mention technical skills relevant to the job',
      'Show enthusiasm and eagerness',
      'Keep it under 2 minutes',
    ],
    mockFeedback: {
      score: 78,
      strengths: ['Relevant experience mentioned', 'Positive attitude', 'Good vocabulary'],
      improvements: ['Add specific technical skills', 'Quantify achievements if possible'],
    },
  },
  {
    key: 'experienced',
    label: 'Experienced',
    icon: '💼',
    description: 'Mid / senior-level professional',
    fullText:
      "Good afternoon! I am Suresh Reddy, and I have over seven years of experience in software development, specialising in full-stack technologies. I have worked with companies like Infosys and Wipro, leading teams of up to ten engineers. Throughout my career, I have delivered multiple high-impact projects, reducing system downtime by thirty percent and improving application performance significantly. I am now looking for a challenging role where I can drive innovation and mentor the next generation of engineers. I am confident that my experience aligns well with your requirements.",
    keyPhrases: [
      { phrase: 'specialising in', meaning: 'నిపుణత కలిగి ఉన్నాను' },
      { phrase: 'leading teams of', meaning: 'బృందాన్ని నడిపిస్తూ' },
      { phrase: 'drive innovation', meaning: 'నవ్యత తీసుకువచ్చే దిశలో పని చేయడం' },
      { phrase: 'aligns well with', meaning: 'అనుగుణంగా ఉంది' },
    ],
    tips: [
      'Quantify your achievements with numbers',
      'Mention team leadership and collaboration',
      'Focus on value you bring to the company',
      'Keep it crisp and impactful under 90 seconds',
    ],
    mockFeedback: {
      score: 90,
      strengths: ['Strong achievements', 'Leadership highlighted', 'Confident delivery'],
      improvements: ['Tailor more to the specific company', 'Briefly mention future vision'],
    },
  },
  {
    key: 'interview',
    label: 'Interview',
    icon: '🤝',
    description: 'HR/technical interview opening',
    fullText:
      "Good morning! Thank you for giving me this opportunity. My name is Anitha Rao. I hold a Master's degree in Information Technology from Hyderabad Central University. I have three years of experience as a data analyst, where I have worked extensively with Python, SQL, and Power BI to derive actionable insights from large datasets. In my last role, I helped reduce report generation time by forty percent by automating manual processes. I am highly motivated, detail-oriented, and I thrive in collaborative environments. I am excited about this role and I believe my skills make me a strong fit for your team.",
    keyPhrases: [
      { phrase: 'actionable insights', meaning: 'ఉపయోగకరమైన విశ్లేషణలు' },
      { phrase: 'automating manual processes', meaning: 'మాన్యువల్ పనులను ఆటోమేట్ చేయడం' },
      { phrase: 'detail-oriented', meaning: 'వివరాలపై దృష్టి పెట్టే' },
      { phrase: 'strong fit', meaning: 'సరైన అభ్యర్థి అని' },
    ],
    tips: [
      "Start with a warm thank-you — it sets a positive tone",
      "Match your skills to the job description",
      "Use numbers to make your impact concrete",
      "End with enthusiasm for this specific role",
    ],
    mockFeedback: {
      score: 88,
      strengths: ['Role-specific skills', 'Quantified impact', 'Professional tone'],
      improvements: ['Research the company and mention it briefly', 'Maintain steady eye contact'],
    },
  },
  {
    key: 'public_speaking',
    label: 'Public Speaking',
    icon: '🎤',
    description: 'Stage / event / seminar introduction',
    fullText:
      "A very warm good morning to all the distinguished guests, respected faculty members, and my dear friends! My name is Kiran Babu, and I am honoured to stand before you today. I am a third-year student of Mechanical Engineering with a deep interest in renewable energy and sustainability. I have had the privilege of representing our college at several national-level technical fests and winning awards for project presentations. Today, I am here to share my thoughts on the future of green energy in India. I hope my words will inspire and resonate with each one of you. Thank you!",
    keyPhrases: [
      { phrase: 'I am honoured to', meaning: 'నేను గర్వంగా భావిస్తున్నాను' },
      { phrase: 'I have had the privilege', meaning: 'నాకు అదృష్టం కలిగింది' },
      { phrase: 'inspire and resonate', meaning: 'స్ఫూర్తి కలిగించడం మరియు మనసుకు హత్తుకోవడం' },
      { phrase: 'distinguished guests', meaning: 'గౌరవనీయ అతిథులు' },
    ],
    tips: [
      'Use a powerful opening line to grab attention',
      'Speak slowly and articulate clearly on stage',
      'Use appropriate pauses for impact',
      'Acknowledge the audience and organisers',
    ],
    mockFeedback: {
      score: 85,
      strengths: ['Engaging opening', 'Formal vocabulary', 'Clear purpose stated'],
      improvements: ['Use more expressive gestures', 'Add a memorable hook or quote'],
    },
  },
  {
    key: 'networking',
    label: 'Networking',
    icon: '🌐',
    description: 'Events, meetups, LinkedIn connections',
    fullText:
      "Hi! I am Deepika Nair, a product manager at a fintech startup in Hyderabad. I have been in the product space for about five years now, working on building mobile payment solutions for tier-two and tier-three cities across India. I am passionate about user experience and making technology accessible to everyone. I am always looking to connect with founders, developers, and designers who share a vision for inclusive tech. It would be great to know what you are working on! Let us stay in touch.",
    keyPhrases: [
      { phrase: 'making technology accessible', meaning: 'సాంకేతికతను అందరికీ అందుబాటులో ఉంచడం' },
      { phrase: 'inclusive tech', meaning: 'అందరినీ చేర్చే సాంకేతికత' },
      { phrase: 'Let us stay in touch', meaning: 'మనం సంబంధంలో ఉందాం' },
      { phrase: 'share a vision', meaning: 'ఒకే లక్ష్యాన్ని పంచుకోవడం' },
    ],
    tips: [
      'Be concise — 30 to 60 seconds is ideal',
      'End with an invitation to connect',
      'Mention your unique value proposition',
      'Show genuine curiosity about others',
    ],
    mockFeedback: {
      score: 86,
      strengths: ['Concise and impactful', 'Clear value proposition', 'Friendly and approachable'],
      improvements: ['Prepare a business card or LinkedIn QR', 'Ask a follow-up question'],
    },
  },
];

// ─── Practice Modal ───────────────────────────────────────────────────────────

const PracticeModal: React.FC<{
  visible: boolean;
  template: IntroTemplate | null;
  onClose: () => void;
}> = ({ visible, template, onClose }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!template) return null;

  const handleSpeak = async () => {
    setIsSpeaking(true);
    Speech.speak(template.fullText, {
      language: 'en-IN',
      rate: 0.8,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  const handleStopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboard}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Practice Introduction</Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Full Text */}
              <View style={styles.practiceTextBox}>
                <Text style={styles.practiceTextLabel}>Your Introduction</Text>
                <Text style={styles.practiceFullText}>{template.fullText}</Text>
              </View>

              {/* Speak It buttons */}
              <View style={styles.practiceActions}>
                {!isSpeaking ? (
                  <TouchableOpacity style={styles.speakItBtn} onPress={handleSpeak}>
                    <Text style={styles.speakItIcon}>🔊</Text>
                    <Text style={styles.speakItText}>Listen</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.stopSpeakBtn} onPress={handleStopSpeaking}>
                    <Text style={styles.speakItIcon}>⏹️</Text>
                    <Text style={styles.speakItText}>Stop</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Record section */}
              <View style={styles.recordSection}>
                <Text style={styles.recordTitle}>Record Your Introduction</Text>
                <TouchableOpacity style={styles.micBigButton}>
                  <Text style={styles.micBigIcon}>🎤</Text>
                </TouchableOpacity>
                <Text style={styles.micHint}>Tap to start recording</Text>
              </View>

              {/* AI Feedback */}
              <View style={styles.feedbackSection}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                  <Bot size={18} color="#111827" style={{marginRight: 6}} />
                  <Text style={[styles.feedbackTitle, {marginBottom: 0}]}>AI Feedback</Text>
                </View>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreCircle}>
                    <Text style={styles.scoreNumber}>{template.mockFeedback.score}</Text>
                    <Text style={styles.scoreOutOf}>/100</Text>
                  </View>
                  <View style={styles.scoreDetails}>
                    <Text style={styles.strengthsLabel}>✅ Strengths</Text>
                    {template.mockFeedback.strengths.map((s, i) => (
                      <Text key={i} style={styles.strengthItem}>• {s}</Text>
                    ))}
                  </View>
                </View>
                <Text style={styles.improvementsLabel}>🔧 Areas to Improve</Text>
                {template.mockFeedback.improvements.map((imp, i) => (
                  <Text key={i} style={styles.improvementItem}>• {imp}</Text>
                ))}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ─── Improve Modal ────────────────────────────────────────────────────────────

const ImproveModal: React.FC<{
  visible: boolean;
  template: IntroTemplate | null;
  onClose: () => void;
}> = ({ visible, template, onClose }) => {
  const [inputText, setInputText] = useState('');
  const [improved, setImproved] = useState('');

  const handleImprove = () => {
    if (!inputText.trim()) return;
    setImproved(
      `Here is an improved version of your introduction:\n\n"${inputText.trim()} I am continuously striving to enhance my skills and contribute meaningfully to every team I work with. I believe in clear communication, continuous learning, and delivering results that make a real difference."`
    );
  };

  if (!template) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Improve My Introduction</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.improveLabel}>Paste or type your introduction:</Text>
            <TextInput
              style={styles.improveInput}
              multiline
              numberOfLines={6}
              placeholder="Type your introduction here..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.improveButton} onPress={handleImprove}>
              <Text style={styles.improveButtonIcon}>✨</Text>
              <Text style={styles.improveButtonText}>Improve with AI</Text>
            </TouchableOpacity>

            {improved ? (
              <View style={styles.improvedBox}>
                <Text style={styles.improvedLabel}>✅ Improved Version</Text>
                <Text style={styles.improvedText}>{improved}</Text>
                <TouchableOpacity
                  style={styles.speakImprovedBtn}
                  onPress={() => Speech.speak(improved, { language: 'en-IN', rate: 0.8 })}
                >
                  <Text style={styles.speakImprovedText}>🔊 Listen to improved version</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SelfIntroductionScreen: React.FC = () => {
  const dispatch = useDispatch();
  const [selectedLevel, setSelectedLevel] = useState<IntroTemplate | null>(null);
  const [practiceVisible, setPracticeVisible] = useState(false);
  const [improveVisible, setImproveVisible] = useState(false);

  const openPractice = useCallback((template: IntroTemplate) => {
    setSelectedLevel(template);
    setPracticeVisible(true);
  }, []);

  const openImprove = useCallback((template: IntroTemplate) => {
    setSelectedLevel(template);
    setImproveVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Self Introduction Builder</Text>
          <Text style={styles.headerSubtitle}>Build your perfect introduction</Text>
        </View>
        <Text style={styles.headerEmoji}>🙋</Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Intro Banner */}
        <View style={styles.introBanner}>
          <Text style={styles.introBannerIcon}>💡</Text>
          <Text style={styles.introBannerText}>
            Select your level below to get a ready-made introduction template with key phrases and tips.
          </Text>
        </View>

        {/* Level Selector Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose Your Level</Text>
          <View style={styles.levelsGrid}>
            {INTRO_TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.key}
                style={[
                  styles.levelCard,
                  selectedLevel?.key === template.key && styles.levelCardActive,
                ]}
                onPress={() => setSelectedLevel(template)}
              >
                <Text style={styles.levelIcon}>{template.icon}</Text>
                <Text
                  style={[
                    styles.levelLabel,
                    selectedLevel?.key === template.key && styles.levelLabelActive,
                  ]}
                >
                  {template.label}
                </Text>
                <Text style={styles.levelDescription} numberOfLines={2}>
                  {template.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Selected Template Display */}
        {selectedLevel && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                {selectedLevel.icon} {selectedLevel.label} Introduction
              </Text>
              <View style={styles.templateCard}>
                <Text style={styles.templateText}>{selectedLevel.fullText}</Text>

                <View style={styles.templateActions}>
                  <TouchableOpacity
                    style={styles.listenBtn}
                    onPress={() =>
                      Speech.speak(selectedLevel.fullText, { language: 'en-IN', rate: 0.8 })
                    }
                  >
                    <Text style={styles.listenBtnIcon}>🔊</Text>
                    <Text style={styles.listenBtnText}>Listen</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.practiceBtn}
                    onPress={() => openPractice(selectedLevel)}
                  >
                    <Text style={styles.practiceBtnIcon}>🎤</Text>
                    <Text style={styles.practiceBtnText}>Practice This</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.improveBtn}
                  onPress={() => openImprove(selectedLevel)}
                >
                  <Text style={styles.improveBtnIcon}>✨</Text>
                  <Text style={styles.improveBtnText}>Improve My Introduction</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Key Phrases */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Key Phrases</Text>
              {selectedLevel.keyPhrases.map((kp, index) => (
                <View key={index} style={styles.keyPhraseRow}>
                  <View style={styles.keyPhraseLeft}>
                    <Text style={styles.keyPhraseEnglish}>"{kp.phrase}"</Text>
                    <Text style={styles.keyPhraseTelugu}>{kp.meaning}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.keyPhraseAudio}
                    onPress={() =>
                      Speech.speak(kp.phrase, { language: 'en-IN', rate: 0.8 })
                    }
                  >
                    <Text style={styles.keyPhraseAudioIcon}>🔊</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Tips */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tips for Success</Text>
              <View style={styles.tipsCard}>
                {selectedLevel.tips.map((tip, index) => (
                  <View key={index} style={styles.tipRow}>
                    <Text style={styles.tipNumber}>{index + 1}</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {!selectedLevel && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>☝️</Text>
            <Text style={styles.emptyStateText}>Select a level above to get started</Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modals */}
      <PracticeModal
        visible={practiceVisible}
        template={selectedLevel}
        onClose={() => setPracticeVisible(false)}
      />
      <ImproveModal
        visible={improveVisible}
        template={selectedLevel}
        onClose={() => setImproveVisible(false)}
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#C7D2FE',
    marginTop: 3,
  },
  headerEmoji: {
    fontSize: 38,
    marginLeft: 12,
  },
  body: {
    flex: 1,
  },
  introBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF2FF',
    margin: 16,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  introBannerIcon: {
    fontSize: 20,
    marginTop: 1,
  },
  introBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#3730A3',
    lineHeight: 20,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  levelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  levelCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  levelCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  levelIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  levelLabelActive: {
    color: '#4F46E5',
  },
  levelDescription: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
  // Template
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  templateText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  listenBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  listenBtnIcon: {
    fontSize: 16,
  },
  listenBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  practiceBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  practiceBtnIcon: {
    fontSize: 16,
  },
  practiceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  improveBtn: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  improveBtnIcon: {
    fontSize: 16,
  },
  improveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Key Phrases
  keyPhraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  keyPhraseLeft: {
    flex: 1,
  },
  keyPhraseEnglish: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  keyPhraseTelugu: {
    fontSize: 12,
    color: '#7C3AED',
    fontStyle: 'italic',
  },
  keyPhraseAudio: {
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  keyPhraseAudioIcon: {
    fontSize: 16,
  },
  // Tips
  tipsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  tipNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
    width: 20,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalKeyboard: {
    flex: 1,
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
  practiceTextBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  practiceTextLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  practiceFullText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 24,
  },
  practiceActions: {
    marginTop: 14,
  },
  speakItBtn: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  stopSpeakBtn: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  speakItIcon: {
    fontSize: 18,
  },
  speakItText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recordSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 16,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  micBigButton: {
    backgroundColor: '#10B981',
    borderRadius: 44,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  micBigIcon: {
    fontSize: 32,
  },
  micHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
  feedbackSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  scoreOutOf: {
    fontSize: 11,
    color: '#D1FAE5',
  },
  scoreDetails: {
    flex: 1,
  },
  strengthsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  strengthItem: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  improvementsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 8,
    marginBottom: 4,
  },
  improvementItem: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  // Improve Modal
  improveLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 10,
  },
  improveInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 120,
    lineHeight: 22,
  },
  improveButton: {
    flexDirection: 'row',
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  improveButtonIcon: {
    fontSize: 16,
  },
  improveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  improvedBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  improvedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
    marginBottom: 10,
  },
  improvedText: {
    fontSize: 13,
    color: '#1E1B4B',
    lineHeight: 22,
  },
  speakImprovedBtn: {
    marginTop: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  speakImprovedText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default SelfIntroductionScreen;
