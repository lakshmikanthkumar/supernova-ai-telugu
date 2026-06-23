import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabMode = 'browse' | 'write' | 'improve';

type EmailCategory =
  | 'Leave'
  | 'Job Application'
  | 'Follow-up'
  | 'Client'
  | 'HR'
  | 'Apology'
  | 'Meeting'
  | 'Thank You'
  | 'Status';

type Formality = 'Formal' | 'Semi-formal';

interface EmailTemplate {
  id: string;
  category: EmailCategory;
  subject: string;
  body: string;
  formality: Formality;
  keyPhrases: string[];
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: '1',
    category: 'Leave',
    subject: 'Leave Request for [Date]',
    body: `Dear [Manager's Name],

I am writing to request leave from [start date] to [end date] for [reason].

I will ensure all my pending tasks are completed before I leave, and I will be available on phone for any urgent matters.

Kindly grant me leave approval at your earliest convenience.

Thank you for your understanding.

Best regards,
[Your Name]`,
    formality: 'Formal',
    keyPhrases: ['I am writing to request', 'at your earliest convenience', 'Thank you for your understanding'],
  },
  {
    id: '2',
    category: 'Job Application',
    subject: 'Application for [Job Title] Position',
    body: `Dear Hiring Manager,

I am writing to apply for the [Job Title] position at [Company Name] as advertised on [Platform].

With [X years] of experience in [field], I am confident that my skills and knowledge would be a valuable addition to your team.

I have attached my resume for your review and would welcome the opportunity to discuss how my background aligns with your requirements.

Thank you for considering my application.

Sincerely,
[Your Name]`,
    formality: 'Formal',
    keyPhrases: ['I am writing to apply', 'valuable addition to your team', 'aligns with your requirements'],
  },
  {
    id: '3',
    category: 'Follow-up',
    subject: 'Follow-up: [Topic/Meeting Name]',
    body: `Dear [Name],

I wanted to follow up on our conversation from [date] regarding [topic].

As discussed, I will be [action you committed to]. I would also like to confirm that [key point from discussion].

Please let me know if you need any additional information or if there are any updates from your side.

Looking forward to hearing from you.

Best regards,
[Your Name]`,
    formality: 'Semi-formal',
    keyPhrases: ['I wanted to follow up', 'As discussed', 'Looking forward to hearing from you'],
  },
  {
    id: '4',
    category: 'Client',
    subject: 'Project Update - [Project Name]',
    body: `Dear [Client Name],

I hope this email finds you well.

I am writing to provide you with an update on [Project Name]. We have successfully completed [milestone] and are currently working on [next phase].

We are on track to deliver the project by [deadline]. Please find the attached progress report for your reference.

Should you have any questions or concerns, please do not hesitate to contact me.

Warm regards,
[Your Name]`,
    formality: 'Formal',
    keyPhrases: ['I hope this email finds you well', 'on track to deliver', 'do not hesitate to contact'],
  },
  {
    id: '5',
    category: 'Apology',
    subject: 'Apology for [Issue/Incident]',
    body: `Dear [Name],

I sincerely apologize for [the issue/mistake] that occurred on [date]. I understand this has caused inconvenience, and I take full responsibility.

We have identified the root cause and have taken the following steps to resolve it: [steps taken].

To prevent this from happening in the future, we have implemented [preventive measures].

Once again, I deeply apologize and assure you that we are committed to providing better service going forward.

Sincerely,
[Your Name]`,
    formality: 'Formal',
    keyPhrases: ['I sincerely apologize', 'take full responsibility', 'committed to providing better service'],
  },
  {
    id: '6',
    category: 'Meeting',
    subject: 'Meeting Request: [Topic] on [Date]',
    body: `Dear [Name],

I hope you are doing well.

I would like to schedule a meeting to discuss [topic]. I believe a 30-minute discussion would be sufficient to cover all the key points.

I am available on the following dates and times:
- [Option 1]
- [Option 2]
- [Option 3]

Please let me know which time works best for you, or feel free to suggest an alternative.

Best regards,
[Your Name]`,
    formality: 'Semi-formal',
    keyPhrases: ['I would like to schedule', 'Please let me know', 'feel free to suggest'],
  },
  {
    id: '7',
    category: 'Thank You',
    subject: 'Thank You for [Reason]',
    body: `Dear [Name],

I wanted to take a moment to express my sincere gratitude for [reason].

Your [support/guidance/assistance] during [situation] was invaluable. It made a significant difference and I truly appreciate the time and effort you invested.

I look forward to [future opportunity/working together].

Thank you once again.

Warm regards,
[Your Name]`,
    formality: 'Semi-formal',
    keyPhrases: ['express my sincere gratitude', 'truly appreciate', 'look forward to'],
  },
  {
    id: '8',
    category: 'HR',
    subject: 'Salary Revision Request',
    body: `Dear [HR Manager's Name],

I am writing to formally request a review of my current compensation package.

I have been with [Company Name] for [duration] and during this time, I have [list achievements/responsibilities]. My contributions have included [specific examples].

I would like to request a meeting to discuss this matter at your convenience.

Thank you for your time and consideration.

Regards,
[Your Name]`,
    formality: 'Formal',
    keyPhrases: ['formally request', 'at your convenience', 'thank you for your consideration'],
  },
  {
    id: '9',
    category: 'Status',
    subject: 'Status Update - [Project/Task Name]',
    body: `Hi [Name],

Here is a quick status update for [project/task]:

Completed:
- [Task 1]
- [Task 2]

In Progress:
- [Task 3] - Expected completion: [date]

Upcoming:
- [Task 4]

Blockers: [Any issues or "None at this time"]

Please let me know if you need any additional details.

Thanks,
[Your Name]`,
    formality: 'Semi-formal',
    keyPhrases: ['status update', 'In Progress', 'Please let me know'],
  },
];

const CATEGORIES: EmailCategory[] = [
  'Leave', 'Job Application', 'Follow-up', 'Client',
  'HR', 'Apology', 'Meeting', 'Thank You', 'Status',
];

const GENERATED_EXAMPLE = {
  subject: 'Leave Request - 15th & 16th July 2025 (Wedding)',
  body: `Dear Ramesh Sir,

I am writing to request two days of leave on 15th and 16th July 2025, as I need to attend my cousin's wedding in Vijayawada.

I will complete all my pending deliverables before I leave and will hand over any urgent tasks to Suresh. I will also be reachable on my mobile for any critical matters during this time.

Kindly approve my leave request at your earliest convenience.

Thank you for your understanding and support.

Best regards,
Arjun Reddy`,
  formalityScore: 8.5,
  teluguExplanation:
    'ఈ email లో మీరు leave కోసం అడిగారు. Subject లో date mention చేసారు. Body లో reason చెప్పారు, పని complete చేస్తానని assurance ఇచ్చారు, మీ manager ని politely request చేసారు. ఇది professional email writing కి మంచి example.',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const FormalityBadge: React.FC<{ formality: Formality }> = ({ formality }) => (
  <View style={[styles.formalityBadge, formality === 'Formal' ? styles.formalBadge : styles.semiFormalBadge]}>
    <Text style={[styles.formalityText, formality === 'Formal' ? styles.formalText : styles.semiFormalText]}>
      {formality}
    </Text>
  </View>
);

const CategoryTag: React.FC<{ category: EmailCategory }> = ({ category }) => (
  <View style={styles.categoryTag}>
    <Text style={styles.categoryTagText}>{category}</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EmailWritingScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('browse');
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'All'>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Write mode
  const [writeCategory, setWriteCategory] = useState<EmailCategory>('Leave');
  const [writeContext, setWriteContext] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState<typeof GENERATED_EXAMPLE | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Improve mode
  const [pastedEmail, setPastedEmail] = useState('');
  const [improvedEmail, setImprovedEmail] = useState<{ before: string; after: string } | null>(null);
  const [isImproving, setIsImproving] = useState(false);

  const filteredTemplates =
    selectedCategory === 'All'
      ? EMAIL_TEMPLATES
      : EMAIL_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleGenerateEmail = () => {
    if (!writeContext.trim()) {
      Alert.alert('Missing Info', 'Please describe the purpose of your email.');
      return;
    }
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedEmail(GENERATED_EXAMPLE);
      setIsGenerating(false);
    }, 1500);
  };

  const handleImprove = (action: 'professional' | 'simplify') => {
    if (!pastedEmail.trim()) {
      Alert.alert('Missing Email', 'Please paste an email to improve.');
      return;
    }
    setIsImproving(true);
    setTimeout(() => {
      setImprovedEmail({
        before: pastedEmail,
        after:
          action === 'professional'
            ? `Dear [Recipient],\n\nI hope this message finds you well.\n\n${pastedEmail.replace(/hi|hello/gi, 'Dear').replace(/thanks/gi, 'Thank you')}\n\nBest regards,\n[Your Name]`
            : `Hi,\n\n${pastedEmail.slice(0, 120)}...\n\nThanks,\n[Your Name]`,
      });
      setIsImproving(false);
    }, 1400);
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', 'Text copied to clipboard.');
  };

  // ─── Render Browse ────────────────────────────────────────────────────────

  const renderBrowse = () => (
    <View style={styles.modeContainer}>
      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryScrollContent}>
        <TouchableOpacity
          style={[styles.filterChip, selectedCategory === 'All' && styles.filterChipActive]}
          onPress={() => setSelectedCategory('All')}
        >
          <Text style={[styles.filterChipText, selectedCategory === 'All' && styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Template Cards */}
      {filteredTemplates.map((template) => (
        <View key={template.id} style={styles.templateCard}>
          <View style={styles.templateCardHeader}>
            <CategoryTag category={template.category} />
            <FormalityBadge formality={template.formality} />
          </View>
          <Text style={styles.templateSubject} numberOfLines={1}>{template.subject}</Text>
          <Text style={styles.templatePreview} numberOfLines={2}>
            {template.body.split('\n').filter((l) => l.trim()).slice(0, 2).join(' ')}
          </Text>
          <View style={styles.templateActions}>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => { setSelectedTemplate(template); setModalVisible(true); }}
            >
              <Text style={styles.viewBtnText}>View Full Email</Text>
            </TouchableOpacity>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.useBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('write');
                  setWriteCategory(template.category as EmailCategory);
                }}
              >
                <Text style={styles.useBtnText}>Use Template</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      ))}
    </View>
  );

  // ─── Render Write ─────────────────────────────────────────────────────────

  const renderWrite = () => (
    <View style={styles.modeContainer}>
      {/* Category Picker */}
      <Text style={styles.fieldLabel}>Email Category</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
        <Text style={styles.dropdownBtnText}>{writeCategory}</Text>
        <Text style={styles.dropdownArrow}>{showCategoryPicker ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showCategoryPicker && (
        <View style={styles.dropdownMenu}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.dropdownItem, writeCategory === cat && styles.dropdownItemActive]}
              onPress={() => { setWriteCategory(cat); setShowCategoryPicker(false); }}
            >
              <Text style={[styles.dropdownItemText, writeCategory === cat && styles.dropdownItemTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Context Input */}
      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>What is the purpose?</Text>
      <TextInput
        style={styles.contextInput}
        placeholder="e.g., requesting 2 days leave for wedding on 15th July"
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={3}
        value={writeContext}
        onChangeText={setWriteContext}
        textAlignVertical="top"
      />

      {/* Generate Button */}
      <TouchableOpacity onPress={handleGenerateEmail} disabled={isGenerating}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.generateBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Text style={styles.generateBtnText}>{isGenerating ? 'Generating...' : '✨ Generate Email'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Generated Email */}
      {generatedEmail && (
        <View style={styles.generatedCard}>
          <View style={styles.generatedHeader}>
            <Text style={styles.generatedTitle}>Generated Email</Text>
            <View style={styles.formalityScore}>
              <Text style={styles.formalityScoreText}>⭐ {generatedEmail.formalityScore}/10</Text>
            </View>
          </View>

          <View style={styles.subjectRow}>
            <Text style={styles.subjectLabel}>Subject:</Text>
            <Text style={styles.subjectValue} numberOfLines={2}>{generatedEmail.subject}</Text>
          </View>

          <View style={styles.bodyBox}>
            <Text style={styles.bodyText}>{generatedEmail.body}</Text>
          </View>

          <View style={styles.teluguBox}>
            <Text style={styles.teluguLabel}>Telugu Explanation (తెలుగు వివరణ)</Text>
            <Text style={styles.teluguText}>{generatedEmail.teluguExplanation}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => copyToClipboard(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`)}>
              <Text style={styles.actionBtnText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setActiveTab('improve'); setPastedEmail(generatedEmail.body); }}
            >
              <Text style={styles.actionBtnText}>✏️ Improve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => { setActiveTab('improve'); setPastedEmail(generatedEmail.body); }}>
              <Text style={styles.actionBtnText}>🔤 Simplify</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // ─── Render Improve ───────────────────────────────────────────────────────

  const renderImprove = () => (
    <View style={styles.modeContainer}>
      <Text style={styles.fieldLabel}>Paste Your Email</Text>
      <TextInput
        style={styles.pasteInput}
        placeholder="Paste your email here to improve it..."
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={8}
        value={pastedEmail}
        onChangeText={setPastedEmail}
        textAlignVertical="top"
      />

      <View style={styles.improveButtons}>
        <TouchableOpacity onPress={() => handleImprove('professional')} disabled={isImproving} style={styles.improveHalf}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.improveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.improveBtnText}>{isImproving ? '...' : '👔 Make Professional'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleImprove('simplify')} disabled={isImproving} style={styles.improveHalf}>
          <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.improveBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.improveBtnText}>{isImproving ? '...' : '✂️ Simplify'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {improvedEmail && (
        <View style={styles.comparisonContainer}>
          <Text style={styles.comparisonTitle}>Before vs After</Text>

          <View style={styles.beforeBox}>
            <Text style={styles.beforeLabel}>Before</Text>
            <Text style={styles.beforeText}>{improvedEmail.before}</Text>
          </View>

          <View style={styles.afterBox}>
            <View style={styles.afterHeader}>
              <Text style={styles.afterLabel}>After</Text>
              <TouchableOpacity onPress={() => copyToClipboard(improvedEmail.after)}>
                <Text style={styles.copySmall}>📋 Copy</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.afterText}>{improvedEmail.after}</Text>
          </View>
        </View>
      )}
    </View>
  );

  // ─── Full Template Modal ──────────────────────────────────────────────────

  const renderModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Email Template</Text>
            <View style={{ width: 32 }} />
          </View>

          {selectedTemplate && (
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalMeta}>
                <CategoryTag category={selectedTemplate.category} />
                <FormalityBadge formality={selectedTemplate.formality} />
              </View>

              <View style={styles.modalSubjectBox}>
                <Text style={styles.modalSubjectLabel}>Subject</Text>
                <Text style={styles.modalSubject}>{selectedTemplate.subject}</Text>
              </View>

              <View style={styles.modalBodyBox}>
                <Text style={styles.modalBody}>{selectedTemplate.body}</Text>
              </View>

              <View style={styles.keyPhrasesBox}>
                <Text style={styles.keyPhrasesTitle}>Key Phrases</Text>
                {selectedTemplate.keyPhrases.map((phrase, i) => (
                  <View key={i} style={styles.keyPhraseChip}>
                    <Text style={styles.keyPhraseText}>"{phrase}"</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setActiveTab('write');
                  setWriteCategory(selectedTemplate.category as EmailCategory);
                }}
              >
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.copyToWriteBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.copyToWriteText}>Copy to Write Mode</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Header */}
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.headerTitle}>✉️ Email Writing</Text>
          <Text style={styles.headerSubtitle}>Professional emails made easy</Text>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['browse', 'write', 'improve'] as TabMode[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'browse' ? 'Browse Templates' : tab === 'write' ? 'Write Email' : 'Improve Email'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {activeTab === 'browse' && renderBrowse()}
          {activeTab === 'write' && renderWrite()}
          {activeTab === 'improve' && renderImprove()}
        </ScrollView>
      </KeyboardAvoidingView>

      {renderModal()}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PURPLE = '#667eea';
const PURPLE_DARK = '#764ba2';
const CARD_BG = '#1e1e2e';
const BG = '#12121f';
const TEXT = '#ffffff';
const TEXT_MUTED = '#9ca3af';
const BORDER = '#2d2d44';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: CARD_BG, borderBottomWidth: 1, borderBottomColor: BORDER },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: PURPLE },
  tabText: { fontSize: 12, color: TEXT_MUTED, fontWeight: '500' },
  tabTextActive: { color: PURPLE, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  modeContainer: { padding: 16 },

  // Category Filter
  categoryScroll: { marginBottom: 16 },
  categoryScrollContent: { paddingRight: 16, flexDirection: 'row', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER },
  filterChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterChipText: { fontSize: 13, color: TEXT_MUTED, fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },

  // Template Card
  templateCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  templateCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  templateSubject: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 6 },
  templatePreview: { fontSize: 13, color: TEXT_MUTED, lineHeight: 19, marginBottom: 12 },
  templateActions: { flexDirection: 'row', gap: 10 },
  viewBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: PURPLE, alignItems: 'center' },
  viewBtnText: { fontSize: 13, color: PURPLE, fontWeight: '600' },
  useBtn: { flex: 1, borderRadius: 9, alignItems: 'center' },
  useBtnText: { fontSize: 13, color: '#fff', fontWeight: '600', paddingVertical: 9 },

  // Formality Badge
  formalityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  formalBadge: { backgroundColor: 'rgba(102,126,234,0.2)' },
  semiFormalBadge: { backgroundColor: 'rgba(240,147,251,0.2)' },
  formalityText: { fontSize: 11, fontWeight: '700' },
  formalText: { color: PURPLE },
  semiFormalText: { color: '#f093fb' },

  // Category Tag
  categoryTag: { backgroundColor: 'rgba(118,75,162,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  categoryTagText: { fontSize: 11, color: PURPLE_DARK, fontWeight: '700' },

  // Write Mode
  fieldLabel: { fontSize: 13, color: TEXT_MUTED, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  dropdownBtn: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtnText: { fontSize: 15, color: TEXT, fontWeight: '500' },
  dropdownArrow: { fontSize: 12, color: TEXT_MUTED },
  dropdownMenu: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  dropdownItemActive: { backgroundColor: 'rgba(102,126,234,0.15)' },
  dropdownItemText: { fontSize: 14, color: TEXT_MUTED },
  dropdownItemTextActive: { color: PURPLE, fontWeight: '700' },

  contextInput: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: TEXT, minHeight: 80, marginBottom: 16 },
  generateBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  generateBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },

  generatedCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  generatedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  generatedTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  formalityScore: { backgroundColor: 'rgba(255,214,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  formalityScoreText: { fontSize: 13, color: '#ffd700', fontWeight: '700' },
  subjectRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  subjectLabel: { fontSize: 12, color: PURPLE, fontWeight: '700', textTransform: 'uppercase', paddingTop: 2 },
  subjectValue: { flex: 1, fontSize: 14, color: TEXT, fontWeight: '600' },
  bodyBox: { backgroundColor: '#0d0d1a', borderRadius: 10, padding: 14, marginBottom: 14 },
  bodyText: { fontSize: 13, color: TEXT, lineHeight: 21 },
  teluguBox: { backgroundColor: 'rgba(102,126,234,0.1)', borderRadius: 10, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: PURPLE },
  teluguLabel: { fontSize: 12, color: PURPLE, fontWeight: '700', marginBottom: 6 },
  teluguText: { fontSize: 13, color: TEXT_MUTED, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1a1a2e', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  actionBtnText: { fontSize: 13, color: TEXT, fontWeight: '600' },

  // Improve Mode
  pasteInput: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 14, fontSize: 14, color: TEXT, minHeight: 160, marginBottom: 16 },
  improveButtons: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  improveHalf: { flex: 1 },
  improveBtn: { borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  improveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  comparisonContainer: { gap: 14 },
  comparisonTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 4 },
  beforeBox: { backgroundColor: '#1a0d0d', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#f5576c' },
  beforeLabel: { fontSize: 11, color: '#f5576c', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  beforeText: { fontSize: 13, color: '#ffaaaa', lineHeight: 20 },
  afterBox: { backgroundColor: '#0d1a0d', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#00c853' },
  afterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  afterLabel: { fontSize: 11, color: '#00c853', fontWeight: '700', textTransform: 'uppercase' },
  copySmall: { fontSize: 13, color: '#00c853', fontWeight: '600' },
  afterText: { fontSize: 13, color: '#aaffaa', lineHeight: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: CARD_BG, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: TEXT_MUTED },
  modalTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  modalScroll: { padding: 18 },
  modalMeta: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  modalSubjectBox: { backgroundColor: CARD_BG, borderRadius: 10, padding: 14, marginBottom: 14 },
  modalSubjectLabel: { fontSize: 11, color: PURPLE, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  modalSubject: { fontSize: 16, fontWeight: '700', color: TEXT },
  modalBodyBox: { backgroundColor: '#0d0d1a', borderRadius: 10, padding: 14, marginBottom: 14 },
  modalBody: { fontSize: 14, color: TEXT, lineHeight: 22 },
  keyPhrasesBox: { marginBottom: 20 },
  keyPhrasesTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 10 },
  keyPhraseChip: { backgroundColor: 'rgba(102,126,234,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: PURPLE },
  keyPhraseText: { fontSize: 13, color: '#a5b4fc', fontStyle: 'italic' },
  copyToWriteBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  copyToWriteText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});

export default EmailWritingScreen;
