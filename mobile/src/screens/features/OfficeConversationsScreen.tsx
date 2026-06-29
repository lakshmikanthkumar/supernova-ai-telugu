import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { supabase } from '../../services/supabase';
import { Colors } from '../../constants/theme';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = Colors.primary; // #7B61FF
const PRIMARY_DARK = Colors.primaryDark; // #4A32D5
const BG = '#12121f';
const CARD_BG = '#1e1e2e';
const TEXT = '#ffffff';
const TEXT_MUTED = '#9ca3af';
const BORDER = '#2d2d44';
const TEAL = '#4facfe';
const SUCCESS = '#43e97b';

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen = 'list' | 'dialogue' | 'roleplay' | 'feedback';

interface DialogueLine {
  role: 'A' | 'B';
  speaker: string;
  text: string;
}

interface Scenario {
  id: string;
  emoji: string;
  title: string;
  difficulty: 1 | 2 | 3;
  description: string;
  roleA: string;
  roleB: string;
  dialogue: DialogueLine[];
  keyPhrases: string[];
  culturalNote: string;
  teluguTip: string;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

// ─── Scenario Data ────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: 'first_day',
    emoji: '👋',
    title: 'First Day at Work',
    difficulty: 1,
    description: 'Meeting colleagues and introducing yourself professionally on your first day.',
    roleA: 'New Employee (You)',
    roleB: 'Colleague',
    dialogue: [
      { role: 'B', speaker: 'Colleague', text: 'Hi! Are you the new joiner? Welcome aboard! I am Priya from the product team.' },
      { role: 'A', speaker: 'New Employee', text: 'Thank you, Priya! I am Arjun. I am joining as a software engineer in the backend team. Really happy to be here.' },
      { role: 'B', speaker: 'Colleague', text: 'Great! Which city are you from, if you do not mind me asking?' },
      { role: 'A', speaker: 'New Employee', text: 'I am originally from Hyderabad. I moved here specifically for this role. I have heard great things about the company culture.' },
      { role: 'B', speaker: 'Colleague', text: 'Oh, you will love it here. The team is very supportive. Do you know where your desk is?' },
      { role: 'A', speaker: 'New Employee', text: 'HR pointed me towards the third floor. I am still getting my bearings, honestly. Could you perhaps show me around when you have a moment?' },
      { role: 'B', speaker: 'Colleague', text: 'Of course! I am free after 11 AM. Let us grab a coffee and I will introduce you to the rest of the team.' },
      { role: 'A', speaker: 'New Employee', text: 'That would be wonderful. Thank you so much for being so welcoming. I really appreciate it.' },
    ],
    keyPhrases: [
      'Welcome aboard',
      'I am joining as a...',
      'I am still getting my bearings',
      'Could you perhaps show me around?',
      'I really appreciate it',
    ],
    culturalNote: 'In Indian offices, it is common and appreciated to introduce yourself proactively. Using "Sir" or "Ma\'am" for seniors shows respect. Accepting offers of tea or coffee builds goodwill.',
    teluguTip: 'మొదటి రోజు మీరు "I am excited to be here" లేదా "I look forward to working with you" అంటే చాలా professional గా అనిపిస్తుంది. Colleagues పేర్లు గుర్తుపెట్టుకోవడానికి try చేయండి — ఇది చాలా positive impression ఇస్తుంది.',
  },
  {
    id: 'team_meeting',
    emoji: '💡',
    title: 'Team Meeting Contribution',
    difficulty: 2,
    description: 'Sharing your ideas and opinions professionally during a team meeting.',
    roleA: 'Team Member (You)',
    roleB: 'Team Lead',
    dialogue: [
      { role: 'B', speaker: 'Team Lead', text: 'Alright everyone, we need ideas on how to reduce the customer drop-off rate. Does anyone have suggestions?' },
      { role: 'A', speaker: 'Team Member', text: 'If I may, I would like to suggest something. I have noticed that most drop-offs happen during the payment step. A simpler checkout flow could help.' },
      { role: 'B', speaker: 'Team Lead', text: 'That is an interesting observation, Arjun. Do you have any data to back that up?' },
      { role: 'A', speaker: 'Team Member', text: 'Yes, I pulled the analytics last week. Around 42% of users abandon the cart on the payment page. I can share the report after this meeting.' },
      { role: 'B', speaker: 'Team Lead', text: 'Please do. What kind of changes are you proposing exactly?' },
      { role: 'A', speaker: 'Team Member', text: 'I would recommend reducing the number of form fields and adding UPI as a one-tap payment option. Similar companies saw a 15-20% improvement with this approach.' },
      { role: 'B', speaker: 'Team Lead', text: 'Good thinking. Let us put this on the agenda for next sprint planning. Can you prepare a brief proposal?' },
      { role: 'A', speaker: 'Team Member', text: 'Absolutely. I will have a one-page summary ready by Thursday. Should I send it to the full team or just to you first?' },
    ],
    keyPhrases: [
      'If I may, I would like to suggest...',
      'I have noticed that...',
      'Do you have any data to back that up?',
      'I would recommend...',
      'Let us put this on the agenda',
    ],
    culturalNote: 'Speaking up in meetings is valued but must be done respectfully. Always ask "If I may" or "May I add something?" before interrupting. Back your ideas with data — numbers command respect in Indian corporate settings.',
    teluguTip: 'Meeting లో మాట్లాడటానికి భయంగా అనిపిస్తే, ముందు "I agree with what was said, and I would like to add..." అని start చేయండి. ఇది confident గా అనిపిస్తుంది మరియు directly disagree చేయకుండా మీ point చెప్పవచ్చు.',
  },
  {
    id: 'asking_help',
    emoji: '🤝',
    title: 'Asking for Help from Colleague',
    difficulty: 1,
    description: 'Making polite requests for assistance without seeming incompetent.',
    roleA: 'You',
    roleB: 'Senior Colleague',
    dialogue: [
      { role: 'A', speaker: 'You', text: 'Hi Ramesh, I am sorry to disturb you. Do you have a couple of minutes? I am stuck on something and thought you might be able to guide me.' },
      { role: 'B', speaker: 'Senior Colleague', text: 'Of course! What is the problem?' },
      { role: 'A', speaker: 'You', text: 'I am trying to configure the database connection for the staging environment, but I keep getting a timeout error. I have already checked the firewall rules and the credentials seem fine.' },
      { role: 'B', speaker: 'Senior Colleague', text: 'Ah, that is a common issue. Did you whitelist the staging server IP in the database security group?' },
      { role: 'A', speaker: 'You', text: 'I did not think of that, honestly. That could definitely be it. Could you walk me through how to do that, or point me to the documentation?' },
      { role: 'B', speaker: 'Senior Colleague', text: 'Sure, let me share my screen. It only takes a minute. Next time you can do it yourself.' },
      { role: 'A', speaker: 'You', text: 'Thank you so much, Ramesh. I really appreciate you taking the time. I will make sure to note this down so I do not bother you with the same thing again.' },
      { role: 'B', speaker: 'Senior Colleague', text: 'No bother at all! That is what the team is for. You can always come to me.' },
    ],
    keyPhrases: [
      'I am sorry to disturb you',
      'Do you have a couple of minutes?',
      'I am stuck on something',
      'Could you walk me through how to...?',
      'I really appreciate you taking the time',
    ],
    culturalNote: 'In Indian offices, asking for help is perfectly normal but always acknowledge the person\'s time. Saying "I am sorry to disturb you" and "Thank you for your time" shows respect. Seniors generally enjoy mentoring — do not hesitate to ask.',
    teluguTip: '"Can you help me?" కంటే "Would you be able to guide me?" అనడం చాలా better. "Guide" అనే word use చేయడం వలన మీరు learn చేయాలని ఉందని show అవుతుంది, మీకు work చేయడం రాదని కాదు.',
  },
  {
    id: 'project_update',
    emoji: '📊',
    title: 'Giving Project Update to Manager',
    difficulty: 2,
    description: 'Communicating project status, blockers, and timelines professionally to your manager.',
    roleA: 'Team Member (You)',
    roleB: 'Manager',
    dialogue: [
      { role: 'B', speaker: 'Manager', text: 'Arjun, can you give me a quick update on the payment integration project? The client was asking.' },
      { role: 'A', speaker: 'Team Member', text: 'Of course. We are currently at 70% completion. The backend API integration is done and tested. We are now working on the front-end UI components.' },
      { role: 'B', speaker: 'Manager', text: 'That sounds good. Are you on track for the Friday deadline?' },
      { role: 'A', speaker: 'Team Member', text: 'For the most part, yes. However, I want to flag one potential blocker. We are waiting on the SSL certificate from the client\'s IT team. If that comes in by Wednesday, we are absolutely on track.' },
      { role: 'B', speaker: 'Manager', text: 'I see. What happens if it does not come by Wednesday?' },
      { role: 'A', speaker: 'Team Member', text: 'In that case, we can deliver everything except the production deployment. The code will be 100% ready and we can deploy within an hour of receiving the certificate.' },
      { role: 'B', speaker: 'Manager', text: 'Alright. I will follow up with the client directly about the certificate. Is there anything else you need from my side?' },
      { role: 'A', speaker: 'Team Member', text: 'That would be very helpful. Also, if you could approve the cloud resource request I raised yesterday, that would allow us to start the load testing in parallel.' },
    ],
    keyPhrases: [
      'We are currently at X% completion',
      'I want to flag a potential blocker',
      'For the most part, yes. However...',
      'In that case, we can deliver...',
      'Is there anything else you need from my side?',
    ],
    culturalNote: 'When giving updates to Indian managers, always lead with positive progress before mentioning problems. Never say "I do not know" — say "Let me check and come back to you." Always have a mitigation plan ready when you flag a risk.',
    teluguTip: 'Manager కి update ఇచ్చేటప్పుడు "What I have done, What I am doing, What I need" అనే structure follow చేయండి. Problems చెప్పేటప్పుడు solution కూడా ready గా ఉంచుకోండి — ఇది మీరు proactive గా ఉన్నారని చూపిస్తుంది.',
  },
  {
    id: 'difficult_customer',
    emoji: '😤',
    title: 'Handling a Difficult Customer',
    difficulty: 3,
    description: 'De-escalating an angry customer while maintaining professionalism and finding solutions.',
    roleA: 'Customer Support Rep (You)',
    roleB: 'Angry Customer',
    dialogue: [
      { role: 'B', speaker: 'Customer', text: 'This is absolutely unacceptable! I have been waiting for my refund for three weeks now. Three weeks! What kind of service is this?' },
      { role: 'A', speaker: 'Support Rep', text: 'I completely understand your frustration, and I sincerely apologize for this delay. Three weeks is far too long, and I take full responsibility for resolving this today.' },
      { role: 'B', speaker: 'Customer', text: 'Sorry is not good enough. I want my money back NOW. Can you do that or not?' },
      { role: 'A', speaker: 'Support Rep', text: 'Absolutely. Let me pull up your account right now. Could I get your order number so I can prioritize this immediately? I want to make sure this is resolved before our call ends.' },
      { role: 'B', speaker: 'Customer', text: 'It is ORD-45823. And I also want to know why this happened in the first place.' },
      { role: 'A', speaker: 'Support Rep', text: 'Thank you. I can see your account now. It appears there was a processing error on our system — this was entirely our fault, not yours. I am initiating the refund right now as we speak.' },
      { role: 'B', speaker: 'Customer', text: 'How long will it take this time?' },
      { role: 'A', speaker: 'Support Rep', text: 'You will see it in your account within 24 to 48 hours. I am also adding a 10% discount voucher to your account as an apology for the inconvenience. I will send you a confirmation email in the next five minutes.' },
    ],
    keyPhrases: [
      'I completely understand your frustration',
      'I sincerely apologize for...',
      'I take full responsibility for...',
      'Let me prioritize this immediately',
      'This was entirely our fault',
    ],
    culturalNote: 'Never argue with a customer or get defensive. In Indian business culture, a customer who feels heard and respected will become loyal even after a bad experience. Always offer something extra — a discount, a voucher, or a follow-up call — to show you genuinely care.',
    teluguTip: 'Customer angry గా ఉన్నప్పుడు మీరు కూడా defensive గా మాట్లాడితే situation worse అవుతుంది. "I understand" మరియు "I apologize" అని చెప్పిన వెంటనే solution వైపు move అవ్వండి. Customer కి వినబడటానికి ఇష్టంగా ఉంటుంది, argument చేయడానికి కాదు.',
  },
  {
    id: 'deadline_extension',
    emoji: '📅',
    title: 'Negotiating Deadline Extension',
    difficulty: 3,
    description: 'Requesting more time for a project using persuasive and professional communication.',
    roleA: 'You',
    roleB: 'Manager',
    dialogue: [
      { role: 'A', speaker: 'You', text: 'Hi Kavitha Ma\'am, do you have ten minutes? I would like to discuss the project deadline and propose a revised timeline.' },
      { role: 'B', speaker: 'Manager', text: 'Sure, come in. Is there a problem with the Friday deadline?' },
      { role: 'A', speaker: 'You', text: 'I want to be transparent with you. We encountered an unexpected technical issue with the third-party API integration that has taken two additional days to resolve. We are back on track now, but I believe a two-day extension would ensure we deliver the best quality.' },
      { role: 'B', speaker: 'Manager', text: 'Two days? The client is expecting delivery on Friday. This puts me in a difficult position.' },
      { role: 'A', speaker: 'You', text: 'I fully understand, and I would not ask if it were not necessary. I am proposing we deliver the core features by Friday as planned, and the remaining two enhancement modules by Monday morning. This way the client gets functional software on time.' },
      { role: 'B', speaker: 'Manager', text: 'That is actually a reasonable approach. What caused the delay exactly?' },
      { role: 'A', speaker: 'You', text: 'The payment gateway API documentation had outdated authentication parameters. We only discovered this during integration testing. I have documented the issue and the fix so this does not happen on future projects.' },
      { role: 'B', speaker: 'Manager', text: 'Good that you documented it. Alright, I will explain the phased delivery to the client. But the core features must be ready Friday — no excuses.' },
    ],
    keyPhrases: [
      'I want to be transparent with you',
      'I would not ask if it were not necessary',
      'I am proposing a phased delivery',
      'I fully understand the position this puts you in',
      'I have documented the issue and the fix',
    ],
    culturalNote: 'When asking for extensions, always come with a plan, not just a problem. In Indian corporate culture, managers respect honesty and preparedness. Never ask for an extension via message — always ask in person or on a call. Own the mistake and show what you have learned.',
    teluguTip: '"I need more time" కంటే "I would like to propose a revised approach that ensures quality delivery" అనడం చాలా effective. Problem చెప్పేటప్పుడు solution కూడా తీసుకొని వెళ్ళండి — ఇది మీరు responsible గా ఉన్నారని prove చేస్తుంది.',
  },
  {
    id: 'stakeholder_presentation',
    emoji: '🎤',
    title: 'Presenting to Stakeholders',
    difficulty: 3,
    description: 'Delivering a formal presentation to senior leadership and handling Q&A confidently.',
    roleA: 'Presenter (You)',
    roleB: 'Senior Stakeholder',
    dialogue: [
      { role: 'A', speaker: 'Presenter', text: 'Good afternoon, everyone. Thank you for making time for this presentation. Today I will walk you through the Q3 performance metrics and our proposed strategy for Q4.' },
      { role: 'B', speaker: 'Stakeholder', text: 'Thank you. Please go ahead.' },
      { role: 'A', speaker: 'Presenter', text: 'As you can see on slide two, we achieved a 23% increase in user acquisition compared to Q2. However, I want to draw your attention to the retention numbers, which require our focus going into Q4.' },
      { role: 'B', speaker: 'Stakeholder', text: 'The retention drop is concerning. What is causing it, in your analysis?' },
      { role: 'A', speaker: 'Presenter', text: 'That is an excellent question. Based on our exit survey data and cohort analysis, the primary driver is onboarding friction — new users are not reaching the "aha moment" quickly enough. I will cover our proposed solution on slide five.' },
      { role: 'B', speaker: 'Stakeholder', text: 'What is your confidence level in the proposed solution?' },
      { role: 'A', speaker: 'Presenter', text: 'We have moderate-to-high confidence based on benchmarks from similar products. We are proposing a 30-day pilot to validate assumptions before full rollout, which limits our risk exposure.' },
      { role: 'B', speaker: 'Stakeholder', text: 'I like the measured approach. What resources do you need to kick this off?' },
    ],
    keyPhrases: [
      'I would like to draw your attention to...',
      'That is an excellent question',
      'Based on our analysis...',
      'We are proposing a pilot to validate...',
      'This limits our risk exposure',
    ],
    culturalNote: 'With senior leadership, always structure your presentation as Situation → Complication → Resolution. Never say "I do not know" — say "I will get back to you with the exact data." Indians in leadership roles appreciate humility with confidence — own your analysis but acknowledge uncertainty.',
    teluguTip: 'Presentation లో nervous గా అనిపిస్తే, ముందు ఒక strong statement తో start చేయండి. "Today I will show you how we can grow by 30%" లాంటి specific outcome తో మొదలుపెడితే attention వెంటనే వస్తుంది. Questions కి "Great question" లేదా "That is an important point" అని acknowledge చేయడం forget చేయకండి.',
  },
  {
    id: 'networking',
    emoji: '🍹',
    title: 'Networking at Office Event',
    difficulty: 2,
    description: 'Making professional small talk and building meaningful connections at a company event.',
    roleA: 'You',
    roleB: 'Senior Professional',
    dialogue: [
      { role: 'A', speaker: 'You', text: 'Hi! I do not think we have met. I am Arjun from the engineering team. I joined about three months ago.' },
      { role: 'B', speaker: 'Senior Professional', text: 'Welcome! I am Sunita Rao — I head the strategy team. How are you finding it here so far?' },
      { role: 'A', speaker: 'You', text: 'It has been fantastic, honestly. The pace is exciting. I have been learning a lot from the projects we have been working on. What does the strategy team focus on?' },
      { role: 'B', speaker: 'Senior Professional', text: 'We work on market expansion and partnership deals, mostly. Are you enjoying the engineering side of things?' },
      { role: 'A', speaker: 'You', text: 'Very much so. I am particularly interested in the intersection of product and engineering — how technical decisions affect business outcomes. It is something I want to develop more expertise in.' },
      { role: 'B', speaker: 'Senior Professional', text: 'That is a smart career focus. Have you connected with the product team yet?' },
      { role: 'A', speaker: 'You', text: 'Not extensively. I would love to learn more about how strategy informs product decisions here. Would you be open to a brief coffee catch-up sometime next week?' },
      { role: 'B', speaker: 'Senior Professional', text: 'Absolutely, I appreciate the initiative. Send me a calendar invite — I am usually free Wednesday afternoons.' },
    ],
    keyPhrases: [
      'I do not think we have met',
      'How are you finding it here?',
      'I am particularly interested in...',
      'Would you be open to a brief coffee catch-up?',
      'I appreciate the initiative',
    ],
    culturalNote: 'At Indian office events, senior professionals appreciate juniors who show intellectual curiosity — not just those who are trying to impress. Ask questions about their work before talking about yours. Always follow up within 24 hours after promising a coffee meeting.',
    teluguTip: 'Networking లో important thing — మీ గురించి చెప్పే ముందు, "What do you work on?" లేదా "What has been the most interesting part of your role?" అని ask చేయండి. People తమ గురించి మాట్లాడడానికి ఇష్టపడతారు మరియు మీరు good listener అని feel అవుతారు.',
  },
  {
    id: 'receiving_feedback',
    emoji: '🪞',
    title: 'Receiving Constructive Feedback',
    difficulty: 2,
    description: 'Accepting critical feedback gracefully and turning it into a growth opportunity.',
    roleA: 'You',
    roleB: 'Manager',
    dialogue: [
      { role: 'B', speaker: 'Manager', text: 'Arjun, I wanted to chat with you about the client presentation last week. Do you have a moment?' },
      { role: 'A', speaker: 'You', text: 'Of course, please go ahead. I am always open to feedback.' },
      { role: 'B', speaker: 'Manager', text: 'Your technical analysis was excellent — really thorough. But I noticed you were reading off the slides quite a bit, and the client seemed to lose engagement around the middle.' },
      { role: 'A', speaker: 'You', text: 'You are absolutely right, and thank you for pointing that out. I was nervous and fell back on the slides as a crutch. I realise that affected the energy in the room.' },
      { role: 'B', speaker: 'Manager', text: 'It is a natural thing early in your career. The content was strong — it is really just about the delivery. Have you considered presentation skills training?' },
      { role: 'A', speaker: 'You', text: 'I have actually been thinking about it. Would you be able to recommend any internal resources or courses? I am committed to improving this area before the next client meeting.' },
      { role: 'B', speaker: 'Manager', text: 'I like your attitude. I will share a few resources with you. Also, you could practise with the team before the next client call — we are all happy to give you feedback.' },
      { role: 'A', speaker: 'You', text: 'That would mean a lot to me. Thank you for taking the time to give me this feedback constructively. I will definitely act on it.' },
    ],
    keyPhrases: [
      'I am always open to feedback',
      'You are absolutely right',
      'Thank you for pointing that out',
      'I am committed to improving...',
      'I will definitely act on it',
    ],
    culturalNote: 'In Indian workplace culture, receiving feedback gracefully sets you apart. Never become defensive or make excuses. Thank the person genuinely — they invested time to help you. Act on the feedback visibly so your manager sees the improvement.',
    teluguTip: 'Feedback receive చేసేటప్పుడు defensive గా respond అవ్వకండి. "You are right, I will work on it" అని sincerely చెప్పడం వలన మీ manager కి confidence వస్తుంది. Feedback తర్వాత ఒక specific action plan తో follow up చేయడం మీ professionalism ని demonstrate చేస్తుంది.',
  },
  {
    id: 'performance_review',
    emoji: '📋',
    title: 'Giving Performance Review',
    difficulty: 3,
    description: 'Delivering constructive feedback to a team member during their performance review.',
    roleA: 'Manager (You)',
    roleB: 'Team Member',
    dialogue: [
      { role: 'A', speaker: 'Manager', text: 'Hi Ravi, thanks for coming. I have been looking forward to this conversation. Let us start with what you feel has gone well this year.' },
      { role: 'B', speaker: 'Team Member', text: 'I think I have delivered all my projects on time, and the client feedback on the mobile app was positive.' },
      { role: 'A', speaker: 'Manager', text: 'Absolutely, and I want to acknowledge that. Your technical delivery has been consistently strong, and the client specifically mentioned your responsiveness. That reflects well on the whole team.' },
      { role: 'B', speaker: 'Team Member', text: 'Thank you. Are there areas where you feel I could do better?' },
      { role: 'A', speaker: 'Manager', text: 'Yes, and I appreciate you asking that directly. I have noticed that in team discussions, you tend to wait to be asked before sharing your views. Your insights are valuable — I would love to see you contribute more proactively.' },
      { role: 'B', speaker: 'Team Member', text: 'That is fair. I sometimes hold back because I am not sure if my idea is fully formed yet.' },
      { role: 'A', speaker: 'Manager', text: 'That is understandable, but in our environment, a half-formed idea shared openly often sparks the best discussions. I would encourage you to speak up even when you are uncertain — frame it as "I am thinking out loud here."' },
      { role: 'B', speaker: 'Team Member', text: 'That is helpful framing. I will make a conscious effort to do that. What would success look like for me in the next six months?' },
    ],
    keyPhrases: [
      'I want to acknowledge that...',
      'I have noticed that...',
      'Your insights are valuable',
      'I would encourage you to...',
      'What would success look like for you?',
    ],
    culturalNote: 'In Indian companies, feedback is often given indirectly to preserve harmony. As a manager, be direct but kind — use the "sandwich" approach: positive, development area, positive. Always end with a forward-looking goal so the employee feels motivated, not judged.',
    teluguTip: 'Performance review లో feedback ఇచ్చేటప్పుడు "You always do this wrong" అనే బదులు "I have noticed that in some situations..." అని say చేయండి. Specific examples తో మాట్లాడండి మరియు improvement కి clear path ఇవ్వండి. Employee ని motivate చేసి meeting end అవ్వాలి.',
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

const OfficeConversationsScreen: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [tipVisible, setTipVisible] = useState(false);
  const [teluguVisible, setTeluguVisible] = useState(false);
  const [speakingLine, setSpeakingLine] = useState<number | null>(null);

  // Roleplay state
  const [roleplayRole, setRoleplayRole] = useState<'A' | 'B' | null>(null);
  const [roleplayMessages, setRoleplayMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [sessionId] = useState(`session_${Date.now()}`);
  const scrollRef = useRef<ScrollView>(null);

  // ─── TTS ─────────────────────────────────────────────────────────────────

  const speakLine = useCallback(async (text: string, lineIndex: number) => {
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
        if (speakingLine === lineIndex) {
          setSpeakingLine(null);
          return;
        }
      }
      setSpeakingLine(lineIndex);
      Speech.speak(text, {
        language: 'en-IN',
        pitch: 1.0,
        rate: 0.85,
        onDone: () => setSpeakingLine(null),
        onError: () => setSpeakingLine(null),
      });
    } catch {
      setSpeakingLine(null);
    }
  }, [speakingLine]);

  const stopSpeech = useCallback(async () => {
    await Speech.stop();
    setSpeakingLine(null);
  }, []);

  // ─── Roleplay AI call ─────────────────────────────────────────────────────

  const sendRoleplayMessage = useCallback(async () => {
    if (!inputText.trim() || !selectedScenario || !roleplayRole || isAiThinking) return;

    const userText = inputText.trim();
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setRoleplayMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

    try {
      const aiRole = roleplayRole === 'A' ? selectedScenario.roleB : selectedScenario.roleA;
      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: {
          session_type: 'roleplay',
          message: userText,
          session_id: sessionId,
          scenario_id: selectedScenario.id,
          scenario_title: selectedScenario.title,
          ai_role: aiRole,
          user_role: roleplayRole === 'A' ? selectedScenario.roleA : selectedScenario.roleB,
          context: `This is a workplace English roleplay. The scenario is: ${selectedScenario.description}. The AI is playing the role of "${aiRole}". Respond naturally and professionally, staying in character. Keep responses concise (2-4 sentences).`,
        },
      });

      if (error) throw error;

      const aiText =
        data?.message ||
        data?.response ||
        data?.reply ||
        'I see. Could you elaborate on that a bit more?';

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'ai',
        text: aiText,
        timestamp: new Date(),
      };

      setRoleplayMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);

      // Auto-speak AI response
      Speech.speak(aiText, {
        language: 'en-IN',
        pitch: 1.0,
        rate: 0.85,
      });
    } catch {
      const fallbackMsg: ChatMessage = {
        id: `ai_err_${Date.now()}`,
        role: 'ai',
        text: 'I understand. Please go on — I am listening.',
        timestamp: new Date(),
      };
      setRoleplayMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAiThinking(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [inputText, selectedScenario, roleplayRole, isAiThinking, sessionId]);

  // ─── Navigation helpers ───────────────────────────────────────────────────

  const openScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    stopSpeech();
    setScreen('dialogue');
  };

  const startRoleplay = (role: 'A' | 'B') => {
    if (!selectedScenario) return;
    setRoleplayRole(role);
    setRoleplayMessages([]);
    setInputText('');

    const aiRole = role === 'A' ? selectedScenario.roleB : selectedScenario.roleA;
    // Determine starter message based on scenario and which role the AI plays
    const aiStarter = role === 'A'
      ? selectedScenario.dialogue.find((d) => d.role === 'B')?.text ?? 'Hello! Shall we begin?'
      : selectedScenario.dialogue.find((d) => d.role === 'A')?.text ?? 'Hello! Shall we begin?';

    const starterMsg: ChatMessage = {
      id: 'ai_start',
      role: 'ai',
      text: aiStarter,
      timestamp: new Date(),
    };
    setRoleplayMessages([starterMsg]);
    setScreen('roleplay');

    setTimeout(() => {
      Speech.speak(aiStarter, { language: 'en-IN', pitch: 1.0, rate: 0.85 });
    }, 400);
  };

  const goBack = () => {
    stopSpeech();
    if (screen === 'roleplay') { setScreen('dialogue'); return; }
    if (screen === 'dialogue') { setScreen('list'); return; }
    setScreen('list');
  };

  // ─── Difficulty label ─────────────────────────────────────────────────────

  const difficultyLabel = (d: 1 | 2 | 3) => {
    if (d === 1) return { label: 'Beginner', color: SUCCESS };
    if (d === 2) return { label: 'Intermediate', color: '#ffd700' };
    return { label: 'Advanced', color: '#ff6b6b' };
  };

  // ─── Render: Scenario List ────────────────────────────────────────────────

  const renderList = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[PRIMARY, PRIMARY_DARK]} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.headerTitle}>🏢 Office Conversations</Text>
        <Text style={styles.headerSubtitle}>Master real workplace English</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{SCENARIOS.length} Scenarios · AI Roleplay</Text>
        </View>
      </LinearGradient>

      <View style={styles.listContainer}>
        {SCENARIOS.map((scenario, index) => {
          const diff = difficultyLabel(scenario.difficulty);
          return (
            <TouchableOpacity
              key={scenario.id}
              style={styles.scenarioCard}
              onPress={() => openScenario(scenario)}
              activeOpacity={0.85}
            >
              <View style={styles.scenarioCardLeft}>
                <View style={styles.scenarioNumberBadge}>
                  <Text style={styles.scenarioNumberText}>{index + 1}</Text>
                </View>
              </View>
              <View style={styles.scenarioCardBody}>
                <View style={styles.scenarioCardTop}>
                  <Text style={styles.scenarioEmoji}>{scenario.emoji}</Text>
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                </View>
                <Text style={styles.scenarioDescription} numberOfLines={2}>{scenario.description}</Text>
                <View style={styles.scenarioMeta}>
                  <View style={[styles.difficultyBadge, { backgroundColor: diff.color + '22' }]}>
                    <Text style={[styles.difficultyText, { color: diff.color }]}>{diff.label}</Text>
                  </View>
                  <Text style={styles.dialogueCount}>💬 {scenario.dialogue.length} lines</Text>
                  <Text style={styles.rolesLabel}>🎭 Roleplay</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  // ─── Render: Dialogue View ────────────────────────────────────────────────

  const renderDialogue = () => {
    if (!selectedScenario) return null;
    const diff = difficultyLabel(selectedScenario.difficulty);

    return (
      <View style={styles.flex}>
        {/* Top bar */}
        <View style={styles.dialogueTopBar}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.dialogueTopBarTitle} numberOfLines={1}>{selectedScenario.emoji} {selectedScenario.title}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: diff.color + '22' }]}>
            <Text style={[styles.difficultyText, { color: diff.color }]}>{diff.label}</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Description card */}
          <View style={styles.descCard}>
            <Text style={styles.descText}>{selectedScenario.description}</Text>
            <View style={styles.rolesRow}>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipLabel}>Role A</Text>
                <Text style={styles.roleChipValue}>{selectedScenario.roleA}</Text>
              </View>
              <View style={[styles.roleChip, styles.roleChipB]}>
                <Text style={styles.roleChipLabel}>Role B</Text>
                <Text style={styles.roleChipValue}>{selectedScenario.roleB}</Text>
              </View>
            </View>
          </View>

          {/* Dialogue */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>FULL DIALOGUE</Text>
            {selectedScenario.dialogue.map((line, i) => (
              <View key={i} style={[styles.dialogueLine, line.role === 'A' ? styles.dialogueLineA : styles.dialogueLineB]}>
                <View style={styles.dialogueLineHeader}>
                  <View style={[styles.roleDot, { backgroundColor: line.role === 'A' ? PRIMARY : TEAL }]} />
                  <Text style={styles.dialogueSpeaker}>{line.speaker}</Text>
                  <TouchableOpacity onPress={() => speakLine(line.text, i)} style={styles.ttsBtn}>
                    <Text style={styles.ttsBtnText}>{speakingLine === i ? '⏸' : '🔊'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.dialogueText}>{line.text}</Text>
              </View>
            ))}
          </View>

          {/* Key phrases */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>KEY PHRASES</Text>
            <View style={styles.phrasesGrid}>
              {selectedScenario.keyPhrases.map((phrase, i) => (
                <View key={i} style={styles.phraseChip}>
                  <Text style={styles.phraseText}>"{phrase}"</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cultural note & Telugu tip */}
          <TouchableOpacity style={styles.noteCard} onPress={() => setTipVisible(true)}>
            <Text style={styles.noteCardIcon}>🌐</Text>
            <View style={styles.noteCardBody}>
              <Text style={styles.noteCardTitle}>Cultural Note</Text>
              <Text style={styles.noteCardPreview} numberOfLines={2}>{selectedScenario.culturalNote}</Text>
            </View>
            <Text style={styles.noteCardChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.noteCard, styles.teluguCard]} onPress={() => setTeluguVisible(true)}>
            <Text style={styles.noteCardIcon}>🇮🇳</Text>
            <View style={styles.noteCardBody}>
              <Text style={[styles.noteCardTitle, { color: PRIMARY }]}>Telugu Tip (తెలుగు)</Text>
              <Text style={styles.noteCardPreview} numberOfLines={2}>{selectedScenario.teluguTip}</Text>
            </View>
            <Text style={styles.noteCardChevron}>›</Text>
          </TouchableOpacity>

          {/* Roleplay CTA */}
          <View style={styles.roleplayCTA}>
            <Text style={styles.roleplayCTATitle}>Ready to practice?</Text>
            <Text style={styles.roleplayCTASubtitle}>Choose a role and practice with AI</Text>
            <View style={styles.roleplayBtnsRow}>
              <TouchableOpacity onPress={() => startRoleplay('A')} style={styles.roleplayRoleBtn} activeOpacity={0.85}>
                <LinearGradient colors={[PRIMARY, PRIMARY_DARK]} style={styles.roleplayRoleBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.roleplayRoleBtnText}>🎭 Play Role A</Text>
                  <Text style={styles.roleplayRoleBtnSub}>{selectedScenario.roleA}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => startRoleplay('B')} style={styles.roleplayRoleBtn} activeOpacity={0.85}>
                <LinearGradient colors={[TEAL, '#00b4d8']} style={styles.roleplayRoleBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.roleplayRoleBtnText}>🎭 Play Role B</Text>
                  <Text style={styles.roleplayRoleBtnSub}>{selectedScenario.roleB}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Cultural note modal */}
        <Modal visible={tipVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🌐 Cultural Note</Text>
              <ScrollView style={styles.modalScrollBody}>
                <Text style={styles.modalBody}>{selectedScenario.culturalNote}</Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setTipVisible(false)}>
                <Text style={styles.modalCloseBtnText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Telugu tip modal */}
        <Modal visible={teluguVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>🇮🇳 Telugu Tip</Text>
              <ScrollView style={styles.modalScrollBody}>
                <Text style={styles.modalBody}>{selectedScenario.teluguTip}</Text>
              </ScrollView>
              <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: PRIMARY }]} onPress={() => setTeluguVisible(false)}>
                <Text style={styles.modalCloseBtnText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ─── Render: Roleplay Chat ────────────────────────────────────────────────

  const renderRoleplay = () => {
    if (!selectedScenario || !roleplayRole) return null;
    const myRole = roleplayRole === 'A' ? selectedScenario.roleA : selectedScenario.roleB;
    const aiRole = roleplayRole === 'A' ? selectedScenario.roleB : selectedScenario.roleA;

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Header */}
        <View style={styles.chatTopBar}>
          <TouchableOpacity onPress={goBack} style={styles.backSmall}>
            <Text style={styles.backSmallText}>←</Text>
          </TouchableOpacity>
          <View style={styles.chatTopBarCenter}>
            <Text style={styles.chatTopBarTitle} numberOfLines={1}>{selectedScenario.emoji} {selectedScenario.title}</Text>
            <Text style={styles.chatTopBarSub}>You: {myRole} · AI: {aiRole}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: PRIMARY + '33' }]}>
            <Text style={[styles.roleBadgeText, { color: PRIMARY }]}>Role {roleplayRole}</Text>
          </View>
        </View>

        {/* Hint banner */}
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>
            💡 You are playing <Text style={{ color: PRIMARY, fontWeight: '700' }}>{myRole}</Text>.
            AI plays <Text style={{ color: TEAL, fontWeight: '700' }}>{aiRole}</Text>. Type your lines naturally.
          </Text>
        </View>

        {/* Chat */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {roleplayMessages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}
            >
              {msg.role === 'ai' && (
                <Text style={styles.aiLabel}>{aiRole}</Text>
              )}
              <Text style={[styles.messageText, msg.role === 'user' ? styles.userText : styles.aiText]}>
                {msg.text}
              </Text>
              <View style={styles.msgFooter}>
                <Text style={styles.messageTime}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {msg.role === 'ai' && (
                  <TouchableOpacity
                    onPress={() => Speech.speak(msg.text, { language: 'en-IN', rate: 0.85 })}
                    style={styles.msgTtsBtn}
                  >
                    <Text style={styles.msgTtsBtnText}>🔊</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {isAiThinking && (
            <View style={[styles.messageBubble, styles.aiBubble, styles.thinkingBubble]}>
              <Text style={styles.aiLabel}>{aiRole}</Text>
              <View style={styles.thinkingDots}>
                <ActivityIndicator size="small" color={TEAL} />
                <Text style={styles.thinkingText}>  thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Key phrases quick-insert */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickPhraseBar}
          contentContainerStyle={styles.quickPhraseContent}
        >
          {selectedScenario.keyPhrases.map((phrase, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickPhraseChip}
              onPress={() => setInputText((prev) => prev ? `${prev} ${phrase}` : phrase)}
            >
              <Text style={styles.quickPhraseText}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.chatInput}
            placeholder={`Type as ${myRole}...`}
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={400}
            editable={!isAiThinking}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isAiThinking) && styles.sendBtnDisabled]}
            onPress={sendRoleplayMessage}
            disabled={!inputText.trim() || isAiThinking}
          >
            <LinearGradient
              colors={inputText.trim() && !isAiThinking ? [PRIMARY, PRIMARY_DARK] : ['#333', '#333']}
              style={styles.sendBtnGradient}
            >
              <Text style={styles.sendBtnText}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        {screen === 'list' && renderList()}
        {screen === 'dialogue' && renderDialogue()}
        {screen === 'roleplay' && renderRoleplay()}
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Header (list screen)
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  headerBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  headerBadgeText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // Scenario list
  listContainer: { padding: 16 },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  scenarioCardLeft: { marginRight: 12 },
  scenarioNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioNumberText: { fontSize: 13, fontWeight: '800', color: PRIMARY },
  scenarioCardBody: { flex: 1 },
  scenarioCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  scenarioEmoji: { fontSize: 20 },
  scenarioTitle: { fontSize: 15, fontWeight: '700', color: TEXT, flex: 1 },
  scenarioDescription: { fontSize: 12, color: TEXT_MUTED, lineHeight: 18, marginBottom: 8 },
  scenarioMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  difficultyText: { fontSize: 11, fontWeight: '700' },
  dialogueCount: { fontSize: 11, color: TEXT_MUTED },
  rolesLabel: { fontSize: 11, color: TEXT_MUTED },
  chevron: { fontSize: 22, color: TEXT_MUTED, marginLeft: 4 },

  // Dialogue top bar
  dialogueTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 10,
  },
  backBtn: { paddingVertical: 4, paddingRight: 6 },
  backBtnText: { fontSize: 15, color: PRIMARY, fontWeight: '600' },
  dialogueTopBarTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: TEXT },

  // Description card
  descCard: { margin: 16, backgroundColor: CARD_BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  descText: { fontSize: 14, color: TEXT_MUTED, lineHeight: 21, marginBottom: 12 },
  rolesRow: { flexDirection: 'row', gap: 10 },
  roleChip: { flex: 1, backgroundColor: PRIMARY + '18', borderRadius: 10, padding: 10 },
  roleChipB: { backgroundColor: TEAL + '18' },
  roleChipLabel: { fontSize: 10, fontWeight: '700', color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 2 },
  roleChipValue: { fontSize: 13, fontWeight: '600', color: TEXT },

  // Dialogue lines
  sectionBlock: { marginHorizontal: 16, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  dialogueLine: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  dialogueLineA: { backgroundColor: '#32252f', borderColor: PRIMARY + '44', marginRight: 24 },
  dialogueLineB: { backgroundColor: '#101828', borderColor: TEAL + '44', marginLeft: 24 },
  dialogueLineHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  dialogueSpeaker: { fontSize: 11, fontWeight: '700', color: TEXT_MUTED, flex: 1, textTransform: 'uppercase' },
  ttsBtn: { padding: 4 },
  ttsBtnText: { fontSize: 16 },
  dialogueText: { fontSize: 14, color: TEXT, lineHeight: 22 },

  // Key phrases
  phrasesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phraseChip: {
    backgroundColor: PRIMARY + '18',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: PRIMARY + '44',
  },
  phraseText: { fontSize: 13, color: PRIMARY, fontWeight: '600' },

  // Note cards
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  teluguCard: { borderLeftWidth: 3, borderLeftColor: PRIMARY },
  noteCardIcon: { fontSize: 22 },
  noteCardBody: { flex: 1 },
  noteCardTitle: { fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 2 },
  noteCardPreview: { fontSize: 12, color: TEXT_MUTED, lineHeight: 18 },
  noteCardChevron: { fontSize: 20, color: TEXT_MUTED },

  // Roleplay CTA
  roleplayCTA: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
  },
  roleplayCTATitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 4 },
  roleplayCTASubtitle: { fontSize: 13, color: TEXT_MUTED, marginBottom: 16 },
  roleplayBtnsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  roleplayRoleBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  roleplayRoleBtnGrad: { paddingVertical: 14, alignItems: 'center', paddingHorizontal: 8 },
  roleplayRoleBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  roleplayRoleBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, textAlign: 'center' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#1e1e2e', borderRadius: 20, padding: 22, width: '100%', maxHeight: '70%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#ffd700', marginBottom: 14 },
  modalScrollBody: { maxHeight: 200, marginBottom: 16 },
  modalBody: { fontSize: 14, color: TEXT, lineHeight: 23 },
  modalCloseBtn: { backgroundColor: TEAL, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCloseBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  // Roleplay chat
  chatTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 10,
  },
  backSmall: { padding: 6 },
  backSmallText: { fontSize: 20, color: PRIMARY, fontWeight: '700' },
  chatTopBarCenter: { flex: 1 },
  chatTopBarTitle: { fontSize: 14, fontWeight: '700', color: TEXT },
  chatTopBarSub: { fontSize: 11, color: TEXT_MUTED, marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },

  hintBanner: { backgroundColor: '#18182b', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  hintText: { fontSize: 12, color: TEXT_MUTED, lineHeight: 18 },

  chatScroll: { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 10 },
  messageBubble: { maxWidth: '82%', marginBottom: 14, borderRadius: 16, padding: 12 },
  aiBubble: { backgroundColor: CARD_BG, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: BORDER },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4, backgroundColor: PRIMARY },
  aiLabel: { fontSize: 11, color: TEAL, fontWeight: '700', marginBottom: 4 },
  messageText: { fontSize: 14, lineHeight: 21 },
  aiText: { color: TEXT },
  userText: { color: '#fff' },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 8 },
  messageTime: { fontSize: 10, color: TEXT_MUTED },
  msgTtsBtn: { padding: 2 },
  msgTtsBtnText: { fontSize: 14 },
  thinkingBubble: { paddingVertical: 14 },
  thinkingDots: { flexDirection: 'row', alignItems: 'center' },
  thinkingText: { fontSize: 13, color: TEXT_MUTED, fontStyle: 'italic' },

  quickPhraseBar: { maxHeight: 46, borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#0e0e1c' },
  quickPhraseContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  quickPhraseChip: {
    backgroundColor: PRIMARY + '22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PRIMARY + '55',
  },
  quickPhraseText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sendBtn: { width: 44, height: 44 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnGradient: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: '#fff' },
});

export default OfficeConversationsScreen;
