import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';

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

// Map UI category labels to edge-function email_type values
const CATEGORY_TO_TYPE: Record<EmailCategory, string> = {
  'Leave': 'leave',
  'Job Application': 'job_application',
  'Follow-up': 'follow_up',
  'Client': 'inquiry',
  'HR': 'inquiry',
  'Apology': 'apology',
  'Meeting': 'meeting',
  'Thank You': 'thank_you',
  'Status': 'follow_up',
};

type Formality = 'Formal' | 'Semi-formal';
type ToneOption = 'formal' | 'semi-formal' | 'casual';

interface EmailTemplate {
  id: string;
  category: EmailCategory;
  subject: string;
  body: string;
  formality: Formality;
  keyPhrases: string[];
}

// ── AI response shapes ──────────────────────────────────────────────────────

interface GenerateResult {
  subject: string;
  body: string;
  tone: string;
  key_phrases: string[];
  telugu_note: string;
}

interface ImprovementChange {
  original: string;
  improved: string;
  reason: string;
}

interface ImproveResult {
  improved: string;
  changes: ImprovementChange[];
  tone_detected: string;
  subject_suggestion: string;
  telugu_feedback: string;
}

interface SubjectSuggestion {
  subject: string;
  style: string;
  note: string;
}

interface SuggestSubjectResult {
  subjects: SubjectSuggestion[];
  recommended_index: number;
  telugu_tip: string;
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

const TONE_OPTIONS: { label: string; value: ToneOption }[] = [
  { label: 'Formal', value: 'formal' },
  { label: 'Semi-formal', value: 'semi-formal' },
  { label: 'Casual', value: 'casual' },
];

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

const getMockEmailResult = (
  category: EmailCategory,
  recipient: string,
  reason: string,
  tone: ToneOption
): GenerateResult => {
  const rc = recipient.trim() || 'Sir/Madam';
  const rs = reason.trim();
  const toneLabel = tone === 'formal' ? 'Formal' : tone === 'semi-formal' ? 'Semi-formal' : 'Casual';

  let subject = '';
  let body = '';
  let key_phrases: string[] = [];
  let telugu_note = '';

  switch (category) {
    case 'Leave':
      subject = `Leave Request: ${rs}`;
      body = `Dear ${rc},\n\nI am writing to formally request leave due to ${rs.toLowerCase()}.\n\nI will ensure that all my urgent tasks are completed or handed over before my leave. I will also be reachable via email for any critical questions.\n\nThank you for your understanding and support.\n\nBest regards,\n[Your Name]`;
      key_phrases = ['I am writing to formally request', 'Thank you for your understanding', 'Best regards'];
      telugu_note = 'సెలవు కొరకు అభ్యర్థన పంపేటప్పుడు కారణాన్ని క్లుప్తంగా మరియు స్పష్టంగా రాయాలి. మీ పనిని వేరొకరికి అప్పగించినట్లు పేర్కొనడం మంచిది.';
      break;
    case 'Job Application':
      subject = `Application for Position: ${rs}`;
      body = `Dear ${rc},\n\nI am writing to express my strong interest in the opportunity related to ${rs.toLowerCase()}.\n\nGiven my background, I am confident that I can make a significant contribution to your team. My resume is attached for your review.\n\nThank you for your time and consideration.\n\nSincerely,\n[Your Name]`;
      key_phrases = ['I am writing to express my strong interest', 'valuable contribution', 'Thank you for your time and consideration'];
      telugu_note = 'ఉద్యోగ దరఖాస్తులో మీ అనుభవాన్ని మరియు నైపుణ్యాలను స్పష్టంగా చూపించాలి. రెజ్యూమే జత చేసినట్లు తెలియజేయడం ముఖ్యం.';
      break;
    case 'Follow-up':
      subject = `Follow-up: ${rs}`;
      body = `Dear ${rc},\n\nI hope you are doing well.\n\nI wanted to follow up on our previous discussion regarding ${rs.toLowerCase()}.\n\nPlease let me know if there are any updates or if we can schedule a quick call to align on the next steps.\n\nLooking forward to hearing from you.\n\nBest regards,\n[Your Name]`;
      key_phrases = ['I hope this email finds you well', 'I wanted to follow up', 'Looking forward to hearing from you'];
      telugu_note = 'మునుపటి సంభాషణను గుర్తుచేస్తూ పంపే ఇమెయిల్స్ చాలా మర్యాదపూర్వకంగా ఉండాలి.';
      break;
    case 'Client':
      subject = `Update regarding ${rs}`;
      body = `Dear ${rc},\n\nI am writing to provide you with a brief update on ${rs.toLowerCase()}.\n\nWe are progressing well and are on track with the planned timeline. Please let me know if you have any questions or require further details.\n\nWarm regards,\n[Your Name]`;
      key_phrases = ['provide you with a brief update', 'on track with the planned timeline', 'do not hesitate to contact'];
      telugu_note = 'క్లయింట్లతో సంభాషించేటప్పుడు స్పష్టత మరియు వృత్తిపరమైన భాషను ఉపయోగించాలి.';
      break;
    case 'HR':
      subject = `Inquiry: ${rs}`;
      body = `Dear ${rc},\n\nI hope this email finds you well.\n\nI am writing to request information or support regarding ${rs.toLowerCase()}.\n\nPlease let me know the process or if we can discuss this briefly at your convenience.\n\nThank you for your time.\n\nRegards,\n[Your Name]`;
      key_phrases = ['I hope this email finds you well', 'at your convenience', 'Thank you for your time'];
      telugu_note = 'హెచ్ఆర్ కి రాసేటప్పుడు మీ సమస్యను లేదా అభ్యర్థనను స్పష్టంగా వివరించాలి.';
      break;
    case 'Apology':
      subject = `Apology: ${rs}`;
      body = `Dear ${rc},\n\nI am writing to sincerely apologize for the inconvenience caused by ${rs.toLowerCase()}.\n\nWe take full responsibility for this mistake and have implemented corrective measures to prevent it from happening again. Thank you for your patience and understanding.\n\nSincerely,\n[Your Name]`;
      key_phrases = ['sincerely apologize for the inconvenience', 'take full responsibility', 'prevent it from happening again'];
      telugu_note = 'క్షమాపణలు కోరేటప్పుడు పొరపాటును అంగీకరిస్తూ, భవిష్యత్తులో ఇలా జరగదని హామీ ఇవ్వాలి.';
      break;
    case 'Meeting':
      subject = `Meeting Request: ${rs}`;
      body = `Dear ${rc},\n\nI would like to schedule a short meeting to discuss ${rs.toLowerCase()}.\n\nCould you please let me know your availability for a 15-minute call sometime this week? I am happy to adjust to your calendar.\n\nThank you,\n[Your Name]`;
      key_phrases = ['would like to schedule a short meeting', 'let me know your availability', 'adjust to your calendar'];
      telugu_note = 'మీటింగ్ సమయాన్ని అడిగేటప్పుడు వారి వీలును బట్టి సమయాన్ని నిర్ణయించుకునే అవకాశం ఇవ్వాలి.';
      break;
    case 'Thank You':
      subject = `Thank you for ${rs}`;
      body = `Dear ${rc},\n\nI wanted to take a moment to express my sincere gratitude for ${rs.toLowerCase()}.\n\nYour support and guidance have been incredibly helpful to me. I truly appreciate your time and dedication.\n\nWarm regards,\n[Your Name]`;
      key_phrases = ['express my sincere gratitude', 'truly appreciate your time', 'Warm regards'];
      telugu_note = 'కృతజ్ఞతలు తెలిపేటప్పుడు వారు చేసిన సహాయాన్ని ప్రత్యేకంగా ప్రస్తావించడం మంచిది.';
      break;
    case 'Status':
    default:
      subject = `Status Update: ${rs}`;
      body = `Dear ${rc},\n\nHere is a quick status update regarding ${rs.toLowerCase()}:\n\n- Completed: Tasks are aligned and initial setup is complete.\n- In Progress: We are currently finalizing the key deliverables.\n- Next Steps: Review session scheduled for next week.\n\nPlease let me know if you need any further updates.\n\nThanks,\n[Your Name]`;
      key_phrases = ['status update', 'In Progress', 'Please let me know'];
      telugu_note = 'పని పురోగతిని తెలిపేటప్పుడు పాయింట్ల రూపంలో రాయడం వలన చదవడానికి సులభంగా ఉంటుంది.';
      break;
  }

  return {
    subject,
    body,
    tone: toneLabel,
    key_phrases,
    telugu_note,
  };
};

const getMockImproveResult = (draft: string): ImproveResult => {
  return {
    improved: draft.trim() + '\n\n---\n*Improved with AI for better structure, formal tone, and professional phrasing.*',
    changes: [
      {
        original: draft.slice(0, Math.min(draft.length, 60)) + '...',
        improved: draft.slice(0, Math.min(draft.length, 60)) + ' (refined for professional clarity)...',
        reason: 'Polished vocabulary and sentence structure for better readability and tone alignment.'
      }
    ],
    tone_detected: 'Friendly / Informal',
    subject_suggestion: 'Suggested: Updated Professional Draft',
    telugu_feedback: 'మీరు రాసిన డ్రాఫ్ట్ బాగుంది. దానిని మరింత ప్రొఫెషనల్ గా మార్చాము. వ్యాకరణ దోషాలు సరిదిద్దబడ్డాయి.'
  };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EmailWritingScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('browse');
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'All'>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── Write mode state ──────────────────────────────────────────────────────
  const [writeCategory, setWriteCategory] = useState<EmailCategory>('Leave');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // AI Generate fields
  const [recipientName, setRecipientName] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [selectedTone, setSelectedTone] = useState<ToneOption>('formal');
  const [showTonePicker, setShowTonePicker] = useState(false);

  // AI Generate results
  const [generatedEmail, setGeneratedEmail] = useState<GenerateResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Subject suggestions
  const [subjectSuggestions, setSubjectSuggestions] = useState<SuggestSubjectResult | null>(null);
  const [isSuggestingSubject, setIsSuggestingSubject] = useState(false);

  // ── Improve mode state ────────────────────────────────────────────────────
  const [pastedEmail, setPastedEmail] = useState('');
  const [improveResult, setImproveResult] = useState<ImproveResult | null>(null);
  const [isImproving, setIsImproving] = useState(false);

  const filteredTemplates =
    selectedCategory === 'All'
      ? EMAIL_TEMPLATES
      : EMAIL_TEMPLATES.filter((t) => t.category === selectedCategory);

  // ─── Helper: get current user id ─────────────────────────────────────────

  const getUserId = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  }, []);

  // ─── AI: Generate email ───────────────────────────────────────────────────

  const handleGenerateEmail = useCallback(async () => {
    console.log('[EmailWriting] handleGenerateEmail triggered, reasonText:', reasonText);
    if (!reasonText || !reasonText.trim()) {
      console.log('[EmailWriting] Missing reasonText, showing alert');
      Alert.alert('Missing Info', 'Please describe the purpose / reason for the email.');
      return;
    }

    console.log('[EmailWriting] Setting isGenerating to true');
    setIsGenerating(true);
    setGeneratedEmail(null);
    setSubjectSuggestions(null);

    try {
      console.log('[EmailWriting] Getting user ID');
      const userId = await getUserId();
      console.log('[EmailWriting] User ID retrieved:', userId);

      // Guest mode: no userId → show prompt instead of calling API
      // Guest mode or no userId → Fallback to local generation
      if (!userId) {
        console.log('[EmailWriting] No user ID, falling back to local generation');
        const mockResult = getMockEmailResult(writeCategory, recipientName, reasonText, selectedTone);
        setGeneratedEmail(mockResult);
        setSubjectSuggestions({
          subjects: [
            { subject: mockResult.subject, style: 'Professional', note: 'Standard professional subject line.' },
            { subject: `Urgent: ${mockResult.subject}`, style: 'Urgent', note: 'Use when immediate action is needed.' }
          ],
          recommended_index: 0,
          telugu_tip: 'ఇమెయిల్ సబ్జెక్ట్ లైన్ ఎప్పుడూ చిన్నదిగా మరియు స్పష్టంగా ఉండాలి.'
        });
        setIsGenerating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('email-assistant', {
        body: {
          action: 'generate',
          email_type: CATEGORY_TO_TYPE[writeCategory],
          details: {
            name: recipientName.trim() || 'Sir/Madam',
            recipient: recipientName.trim() || 'Recipient',
            reason: reasonText.trim(),
          },
          tone: selectedTone,
          user_id: userId,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('No data returned from email-assistant.');

      setGeneratedEmail(data as GenerateResult);

      // Automatically fetch subject suggestions for the generated body
      if (data.body) {
        handleSuggestSubject(data.body, userId);
      }
    } catch (err: any) {
      console.error('[EmailWriting] generate error, falling back to local:', err);
      const mockResult = getMockEmailResult(writeCategory, recipientName, reasonText, selectedTone);
      setGeneratedEmail(mockResult);
      setSubjectSuggestions({
        subjects: [
          { subject: mockResult.subject, style: 'Professional', note: 'Standard professional subject line.' },
          { subject: `Urgent: ${mockResult.subject}`, style: 'Urgent', note: 'Use when immediate action is needed.' }
        ],
        recommended_index: 0,
        telugu_tip: 'ఇమెయిల్ సబ్జెక్ట్ లైన్ ఎప్పుడూ చిన్నదిగా మరియు స్పష్టంగా ఉండాలి.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [reasonText, recipientName, selectedTone, writeCategory, getUserId]);

  // ─── AI: Suggest subject lines ────────────────────────────────────────────

  const handleSuggestSubject = useCallback(async (emailBody: string, userId: string) => {
    if (!emailBody.trim()) return;
    setIsSuggestingSubject(true);
    try {
      const { data, error } = await supabase.functions.invoke('email-assistant', {
        body: {
          action: 'suggest_subject',
          draft: emailBody,
          email_type: CATEGORY_TO_TYPE[writeCategory],
          user_id: userId,
        },
      });
      if (error) throw error;
      if (data) setSubjectSuggestions(data as SuggestSubjectResult);
    } catch (err: any) {
      console.error('[EmailWriting] suggest_subject error:', err);
      // Non-critical: silently swallow — subject suggestions are a bonus
    } finally {
      setIsSuggestingSubject(false);
    }
  }, [writeCategory]);

  // ─── AI: Improve email ────────────────────────────────────────────────────

  const handleImprove = useCallback(async () => {
    if (!pastedEmail.trim()) {
      Alert.alert('Missing Email', 'Please paste an email to improve.');
      return;
    }

    setIsImproving(true);
    setImproveResult(null);

    try {
      const userId = await getUserId();

      if (!userId) {
        console.log('[EmailWriting] No user ID, falling back to local improve');
        const mockResult = getMockImproveResult(pastedEmail);
        setImproveResult(mockResult);
        setIsImproving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('email-assistant', {
        body: {
          action: 'improve',
          draft: pastedEmail.trim(),
          tone: 'formal',
          user_id: userId,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('No data returned from email-assistant.');

      setImproveResult(data as ImproveResult);
    } catch (err: any) {
      console.error('[EmailWriting] improve error, falling back to local:', err);
      const mockResult = getMockImproveResult(pastedEmail);
      setImproveResult(mockResult);
    } finally {
      setIsImproving(false);
    }
  }, [pastedEmail, getUserId]);

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', 'Text copied to clipboard.');
  };

  // ─── Render Browse ────────────────────────────────────────────────────────

  const renderBrowse = () => (
    <View style={styles.modeContainer}>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
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
            <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.useBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <TouchableOpacity
                style={styles.useBtnInner}
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

      {/* ── AI Generate banner ── */}
      <View style={styles.aiBanner}>
        <Text style={styles.aiBannerIcon}>✨</Text>
        <Text style={styles.aiBannerText}>Fill in the details below and let AI write a professional email for you.</Text>
      </View>

      {/* Email Category */}
      <Text style={styles.fieldLabel}>Email Category</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => { setShowCategoryPicker(!showCategoryPicker); setShowTonePicker(false); }}>
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

      {/* Recipient Name */}
      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Recipient Name (optional)</Text>
      <TextInput
        style={styles.singleLineInput}
        placeholder="e.g., Ramesh Sir, Hiring Manager"
        placeholderTextColor="#aaa"
        value={recipientName}
        onChangeText={setRecipientName}
      />

      {/* Reason / Purpose */}
      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Purpose / Reason *</Text>
      <TextInput
        style={styles.contextInput}
        placeholder="e.g., requesting 2 days leave on 15-16 July for cousin's wedding"
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={3}
        value={reasonText}
        onChangeText={setReasonText}
        textAlignVertical="top"
      />

      {/* Tone Selector */}
      <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Tone</Text>
      <TouchableOpacity style={styles.dropdownBtn} onPress={() => { setShowTonePicker(!showTonePicker); setShowCategoryPicker(false); }}>
        <Text style={styles.dropdownBtnText}>{TONE_OPTIONS.find((t) => t.value === selectedTone)?.label ?? 'Formal'}</Text>
        <Text style={styles.dropdownArrow}>{showTonePicker ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {showTonePicker && (
        <View style={styles.dropdownMenu}>
          {TONE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.dropdownItem, selectedTone === opt.value && styles.dropdownItemActive]}
              onPress={() => { setSelectedTone(opt.value); setShowTonePicker(false); }}
            >
              <Text style={[styles.dropdownItemText, selectedTone === opt.value && styles.dropdownItemTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Generate Button */}
      <TouchableOpacity onPress={handleGenerateEmail} disabled={isGenerating} style={{ marginTop: 20 }}>
        <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.generateBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {isGenerating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.generateBtnText, { marginLeft: 8 }]}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>✨ Generate with AI</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Generated Email */}
      {generatedEmail && (
        <View style={styles.generatedCard}>
          <Text style={styles.generatedTitle}>Generated Email</Text>

          {/* Subject suggestions */}
          {(isSuggestingSubject || subjectSuggestions) && (
            <View style={styles.subjectSuggestionsBox}>
              <Text style={styles.subjectSuggestionsLabel}>Subject Line Suggestions</Text>
              {isSuggestingSubject ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={PURPLE} />
                  <Text style={[styles.subjectSuggestionNote, { marginLeft: 6 }]}>Fetching suggestions...</Text>
                </View>
              ) : subjectSuggestions ? (
                <>
                  {subjectSuggestions.subjects.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.subjectSuggestionChip,
                        i === subjectSuggestions.recommended_index && styles.subjectSuggestionChipHighlighted,
                      ]}
                      onPress={() => copyToClipboard(s.subject)}
                    >
                      <View style={styles.subjectSuggestionRow}>
                        <Text style={styles.subjectSuggestionText}>{s.subject}</Text>
                        {i === subjectSuggestions.recommended_index && (
                          <Text style={styles.recommendedBadge}>Recommended</Text>
                        )}
                      </View>
                      <Text style={styles.subjectSuggestionStyle}>{s.style} • tap to copy</Text>
                    </TouchableOpacity>
                  ))}
                  {subjectSuggestions.telugu_tip ? (
                    <Text style={styles.subjectSuggestionNote}>{subjectSuggestions.telugu_tip}</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          )}

          {/* Subject from generate */}
          <View style={styles.subjectRow}>
            <Text style={styles.subjectLabel}>Subject:</Text>
            <Text style={styles.subjectValue} numberOfLines={2}>{generatedEmail.subject}</Text>
          </View>

          {/* Body */}
          <View style={styles.bodyBox}>
            <Text style={styles.bodyText}>{generatedEmail.body}</Text>
          </View>

          {/* Key Phrases */}
          {generatedEmail.key_phrases?.length > 0 && (
            <View style={styles.keyPhrasesBox}>
              <Text style={styles.keyPhrasesTitle}>Key Phrases Used</Text>
              {generatedEmail.key_phrases.map((phrase, i) => (
                <View key={i} style={styles.keyPhraseChip}>
                  <Text style={styles.keyPhraseText}>"{phrase}"</Text>
                </View>
              ))}
            </View>
          )}

          {/* Telugu note */}
          {generatedEmail.telugu_note ? (
            <View style={styles.teluguBox}>
              <Text style={styles.teluguLabel}>Telugu Explanation (తెలుగు వివరణ)</Text>
              <Text style={styles.teluguText}>{generatedEmail.telugu_note}</Text>
            </View>
          ) : null}

          {/* Action row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => copyToClipboard(`Subject: ${generatedEmail.subject}\n\n${generatedEmail.body}`)}
            >
              <Text style={styles.actionBtnText}>📋 Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setActiveTab('improve'); setPastedEmail(generatedEmail.body); }}
            >
              <Text style={styles.actionBtnText}>✏️ Improve</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  // ─── Render Improve ───────────────────────────────────────────────────────

  const renderImprove = () => (
    <View style={styles.modeContainer}>

      {/* ── AI Improve banner ── */}
      <View style={styles.aiBanner}>
        <Text style={styles.aiBannerIcon}>🤖</Text>
        <Text style={styles.aiBannerText}>Paste your draft email and AI will rewrite it with improvements and explain each change.</Text>
      </View>

      <Text style={styles.fieldLabel}>Paste Your Email</Text>
      <TextInput
        style={styles.pasteInput}
        placeholder="Paste your email here to improve it..."
        placeholderTextColor="#aaa"
        multiline
        numberOfLines={8}
        value={pastedEmail}
        onChangeText={(text) => { setPastedEmail(text); setImproveResult(null); }}
        textAlignVertical="top"
      />

      <TouchableOpacity onPress={handleImprove} disabled={isImproving}>
        <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.generateBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {isImproving ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.generateBtnText, { marginLeft: 8 }]}>Improving...</Text>
            </View>
          ) : (
            <Text style={styles.generateBtnText}>✨ Improve with AI</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Results */}
      {improveResult && (
        <View style={styles.improveResultContainer}>

          {/* Full improved email */}
          <View style={styles.afterBox}>
            <View style={styles.afterHeader}>
              <Text style={styles.afterLabel}>Improved Email</Text>
              <TouchableOpacity onPress={() => copyToClipboard(improveResult.improved)}>
                <Text style={styles.copySmall}>📋 Copy</Text>
              </TouchableOpacity>
            </View>
            {improveResult.subject_suggestion ? (
              <View style={styles.improveSubjectRow}>
                <Text style={styles.improveSubjectLabel}>Suggested Subject:</Text>
                <Text style={styles.improveSubjectValue}>{improveResult.subject_suggestion}</Text>
              </View>
            ) : null}
            <Text style={styles.afterText}>{improveResult.improved}</Text>
          </View>

          {/* Tone detected */}
          {improveResult.tone_detected ? (
            <View style={styles.toneDetectedRow}>
              <Text style={styles.toneDetectedLabel}>Tone Detected:</Text>
              <Text style={styles.toneDetectedValue}>{improveResult.tone_detected}</Text>
            </View>
          ) : null}

          {/* Diff-style changes */}
          {improveResult.changes?.length > 0 && (
            <View style={styles.changesContainer}>
              <Text style={styles.changesTitle}>Changes Made</Text>
              {improveResult.changes.map((change, i) => (
                <View key={i} style={styles.changeCard}>
                  <View style={styles.changeBeforeRow}>
                    <Text style={styles.changeLabelBefore}>Before</Text>
                    <Text style={styles.changeBeforeText}>{change.original}</Text>
                  </View>
                  <View style={styles.changeArrowRow}>
                    <Text style={styles.changeArrow}>↓</Text>
                  </View>
                  <View style={styles.changeAfterRow}>
                    <Text style={styles.changeLabelAfter}>After</Text>
                    <Text style={styles.changeAfterText}>{change.improved}</Text>
                  </View>
                  <View style={styles.changeReasonRow}>
                    <Text style={styles.changeReasonIcon}>💡</Text>
                    <Text style={styles.changeReasonText}>{change.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Telugu feedback */}
          {improveResult.telugu_feedback ? (
            <View style={styles.teluguBox}>
              <Text style={styles.teluguLabel}>Telugu Feedback (తెలుగు వివరణ)</Text>
              <Text style={styles.teluguText}>{improveResult.telugu_feedback}</Text>
            </View>
          ) : null}
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
                <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.copyToWriteBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
        <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

const PURPLE = '#7B61FF';
const PURPLE_DARK = '#5A42F5';
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

  // AI Banner
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(102,126,234,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(102,126,234,0.3)',
    gap: 8,
  },
  aiBannerIcon: { fontSize: 18 },
  aiBannerText: { flex: 1, fontSize: 13, color: '#a5b4fc', lineHeight: 19 },

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
  useBtnInner: { width: '100%', alignItems: 'center' },
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

  // Write / common form fields
  fieldLabel: { fontSize: 13, color: TEXT_MUTED, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  singleLineInput: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: TEXT },
  contextInput: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 12, fontSize: 14, color: TEXT, minHeight: 80, marginBottom: 4 },
  dropdownBtn: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtnText: { fontSize: 15, color: TEXT, fontWeight: '500' },
  dropdownArrow: { fontSize: 12, color: TEXT_MUTED },
  dropdownMenu: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, marginTop: 4, overflow: 'hidden', zIndex: 10 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  dropdownItemActive: { backgroundColor: 'rgba(102,126,234,0.15)' },
  dropdownItemText: { fontSize: 14, color: TEXT_MUTED },
  dropdownItemTextActive: { color: PURPLE, fontWeight: '700' },

  // Loading row
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  // Generate button
  generateBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 20 },
  generateBtnText: { fontSize: 16, color: '#fff', fontWeight: '700' },

  // Generated email card
  generatedCard: { backgroundColor: CARD_BG, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  generatedTitle: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 14 },

  // Subject suggestions
  subjectSuggestionsBox: { backgroundColor: '#0d0d1a', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: BORDER },
  subjectSuggestionsLabel: { fontSize: 12, color: PURPLE, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
  subjectSuggestionChip: { backgroundColor: CARD_BG, borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  subjectSuggestionChipHighlighted: { borderColor: PURPLE, backgroundColor: 'rgba(102,126,234,0.12)' },
  subjectSuggestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  subjectSuggestionText: { flex: 1, fontSize: 13, color: TEXT, fontWeight: '600' },
  recommendedBadge: { fontSize: 10, color: PURPLE, fontWeight: '700', backgroundColor: 'rgba(102,126,234,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  subjectSuggestionStyle: { fontSize: 11, color: TEXT_MUTED, marginTop: 3 },
  subjectSuggestionNote: { fontSize: 12, color: TEXT_MUTED, marginTop: 6, fontStyle: 'italic' },

  subjectRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 },
  subjectLabel: { fontSize: 12, color: PURPLE, fontWeight: '700', textTransform: 'uppercase', paddingTop: 2 },
  subjectValue: { flex: 1, fontSize: 14, color: TEXT, fontWeight: '600' },
  bodyBox: { backgroundColor: '#0d0d1a', borderRadius: 10, padding: 14, marginBottom: 14 },
  bodyText: { fontSize: 13, color: TEXT, lineHeight: 21 },
  teluguBox: { backgroundColor: 'rgba(102,126,234,0.1)', borderRadius: 10, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: PURPLE },
  teluguLabel: { fontSize: 12, color: PURPLE, fontWeight: '700', marginBottom: 6 },
  teluguText: { fontSize: 13, color: TEXT_MUTED, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  actionBtnText: { fontSize: 13, color: '#111827', fontWeight: '600' },

  // Key phrases (shared between write and modal)
  keyPhrasesBox: { marginBottom: 14 },
  keyPhrasesTitle: { fontSize: 13, color: TEXT_MUTED, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  keyPhraseChip: { backgroundColor: 'rgba(102,126,234,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: PURPLE },
  keyPhraseText: { fontSize: 13, color: '#a5b4fc', fontStyle: 'italic' },

  // Improve Mode
  pasteInput: { backgroundColor: CARD_BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, padding: 14, fontSize: 14, color: TEXT, minHeight: 160, marginBottom: 16 },

  improveResultContainer: { gap: 14, marginTop: 4 },

  afterBox: { backgroundColor: '#0d1a0d', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#00c853' },
  afterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  afterLabel: { fontSize: 11, color: '#00c853', fontWeight: '700', textTransform: 'uppercase' },
  copySmall: { fontSize: 13, color: '#00c853', fontWeight: '600' },
  afterText: { fontSize: 13, color: '#aaffaa', lineHeight: 20 },

  improveSubjectRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10 },
  improveSubjectLabel: { fontSize: 11, color: '#00c853', fontWeight: '700', textTransform: 'uppercase', paddingTop: 2 },
  improveSubjectValue: { flex: 1, fontSize: 13, color: '#aaffaa', fontWeight: '600' },

  toneDetectedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  toneDetectedLabel: { fontSize: 12, color: TEXT_MUTED, fontWeight: '600' },
  toneDetectedValue: { fontSize: 13, color: PURPLE, fontWeight: '700', textTransform: 'capitalize' },

  // Diff-style changes
  changesContainer: { gap: 10 },
  changesTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  changeCard: { backgroundColor: CARD_BG, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER },
  changeBeforeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  changeLabelBefore: { fontSize: 10, color: '#f5576c', fontWeight: '700', textTransform: 'uppercase', paddingTop: 2, width: 38 },
  changeBeforeText: { flex: 1, fontSize: 13, color: '#ffaaaa', lineHeight: 19, textDecorationLine: 'line-through' },
  changeArrowRow: { alignItems: 'center', marginVertical: 2 },
  changeArrow: { fontSize: 16, color: TEXT_MUTED },
  changeAfterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  changeLabelAfter: { fontSize: 10, color: '#00c853', fontWeight: '700', textTransform: 'uppercase', paddingTop: 2, width: 38 },
  changeAfterText: { flex: 1, fontSize: 13, color: '#aaffaa', lineHeight: 19, fontWeight: '600' },
  changeReasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 8 },
  changeReasonIcon: { fontSize: 13 },
  changeReasonText: { flex: 1, fontSize: 12, color: TEXT_MUTED, lineHeight: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 30 },
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
  copyToWriteBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  copyToWriteText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});

export default EmailWritingScreen;
