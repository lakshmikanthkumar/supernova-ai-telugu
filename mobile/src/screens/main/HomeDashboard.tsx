import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Speech from 'expo-speech'
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Building,
  Check,
  CheckCircle2,
  Flame,
  Mail,
  MessageCircle,
  Mic,
  Rocket,
  Star,
  Target,
  Trophy,
  User,
  Volume2,
  X,
  Zap
} from 'lucide-react-native'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  RefreshControl,
  ScrollView, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { DailyFeed, generateDailyFeed, invalidateDailyFeed } from '../../services/personalization/personalizationEngine'
import {
  getGrammarTipOfTheDay,
  getInterviewQuestionOfTheDay,
  getMotivationalQuote,
  getVocabularyOfTheDay,
} from '../../services/randomization/contentEngine'
import { fetchProfile } from '../../store/slices/authSlice'
import { fetchDailyChallenge, fetchLeaderboard } from '../../store/slices/gamificationSlice'
import { fetchCategories } from '../../store/slices/lessonsSlice'
import { Theme } from '../../theme'


const FEATURED_MODULES = [
  { day: 0, icon: Star, name: 'Daily Greetings', subtitle: 'Start your week with confidence', route: '/features/daily-greetings', gradient: [Theme.colors.background, Theme.colors.primary] },
  { day: 1, icon: Mic, name: 'Self Introduction', subtitle: 'Make a great first impression', route: '/features/self-introduction', gradient: [Theme.colors.background, '#0A1F44'] },
  { day: 2, icon: Building, name: 'Office Conversations', subtitle: 'Excel at workplace English', route: '/features/office-conversations', gradient: [Theme.colors.background, '#0D274A'] },
  { day: 3, icon: Mail, name: 'Email Writing', subtitle: 'Write professional emails', route: '/features/email-writing', gradient: [Theme.colors.background, '#102A45'] },
  { day: 4, icon: Briefcase, name: 'Interview Prep', subtitle: 'Ace your next interview', route: '/features/interview-training', gradient: [Theme.colors.background, '#0A1F44'] },
  { day: 5, icon: Mic, name: 'Public Speaking', subtitle: 'Speak with authority', route: '/features/public-speaking', gradient: [Theme.colors.background, Theme.colors.primary] },
  { day: 6, icon: Bot, name: 'AI Roleplay', subtitle: 'Practice with Nova AI', route: '/ai/roleplay', gradient: [Theme.colors.background, '#001A33'] },
]

const QUICK_ACCESS = [
  { icon: MessageCircle, name: 'Daily Greetings', route: '/features/daily-greetings', difficulty: 1, isNew: false },
  { icon: Mic, name: 'Self Introduction', route: '/features/self-introduction', difficulty: 2, isNew: false },
  { icon: Building, name: 'Office Talks', route: '/features/office-conversations', difficulty: 2, isNew: false },
  { icon: Mail, name: 'Email Writing', route: '/features/email-writing', difficulty: 3, isNew: true },
  { icon: Briefcase, name: 'Interview Prep', route: '/features/interview-training', difficulty: 3, isNew: true },
  { icon: Mic, name: 'Public Speaking', route: '/features/public-speaking', difficulty: 3, isNew: true },
]

export default function HomeDashboard() {
  const dispatch = useAppDispatch()
  const { profile } = useAppSelector(s => s.auth)
  const { loading } = useAppSelector(s => s.lessons)
  const { dailyChallenge, leaderboard } = useAppSelector(s => s.gamification)
  const [grammarText, setGrammarText] = useState('')
  const [dailyFeed, setDailyFeed] = useState<DailyFeed | null>(null)
  const [feedLoading, setFeedLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const getGreeting = () => {
    const hour = new Date().getHours()
    const name = profile?.full_name?.split(' ')[0] || 'Learner'
    if (hour < 12) return `Good morning, ${name}!`
    if (hour < 17) return `Good afternoon, ${name}!`
    return `Good evening, ${name}!`
  }

  const loadFeed = useCallback(async () => {
    if (profile?.id) {
      const feed = await generateDailyFeed(profile.id)
      setDailyFeed(feed)
    } else {
      setDailyFeed({
        greeting: getGreeting(),
        vocabularyOfDay: getVocabularyOfTheDay('guest'),
        grammarTip: getGrammarTipOfTheDay('guest'),
        interviewQuestion: getInterviewQuestionOfTheDay('guest'),
        motivationalQuote: getMotivationalQuote('guest'),
        dailyChallenges: [],
        recommendedModules: [],
        pronunciationFocus: 'greetings',
        speakingPrompt: 'Describe your day in 2 minutes.',
      })
    }
    setFeedLoading(false)
  }, [profile?.id])

  const loadData = useCallback(async () => {
    if (profile?.id) {
      await Promise.all([
        dispatch(fetchCategories()),
        dispatch(fetchDailyChallenge()),
        dispatch(fetchProfile(profile.id)),
        dispatch(fetchLeaderboard()),
      ])
    }
    await loadFeed()
  }, [profile?.id, loadFeed])

  useEffect(() => { loadData() }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (profile?.id) {
      await invalidateDailyFeed(profile.id)
    }
    await loadData()
    setRefreshing(false)
  }, [profile?.id, loadData])

  // Featured module: prefer from dailyFeed, fallback to day-based
  const fallbackFeatured = FEATURED_MODULES[new Date().getDay()]
  const todayFeatured = dailyFeed?.recommendedModules?.[0]
    ? {
        icon: BookOpen,
        name: dailyFeed.recommendedModules[0].module,
        subtitle: dailyFeed.recommendedModules[0].reason,
        route: dailyFeed.recommendedModules[0].route,
        gradient: fallbackFeatured.gradient,
      }
    : fallbackFeatured

  const FeaturedIcon = todayFeatured.icon

  // Quick access: prefer feed recommendations, fallback to static
  const quickAccessItems =
    dailyFeed?.recommendedModules && dailyFeed.recommendedModules.length >= 3
      ? dailyFeed.recommendedModules.map((m, i) => ({
          icon: BookOpen,
          name: m.module,
          route: m.route,
          difficulty: Math.min(3, Math.max(1, (i % 3) + 1)),
          isNew: i >= 4,
        }))
      : QUICK_ACCESS

  const xpTotal = profile?.xp_total || 1240
  const streak = profile?.streak_current || 5
  const xpToday = profile?.xp_today || 120
  const dailyGoalXP = 200
  const progressPct = Math.min((xpToday / dailyGoalXP) * 100, 100)

  const vocab = dailyFeed?.vocabularyOfDay
  const grammarTip = dailyFeed?.grammarTip
  const interviewQ = dailyFeed?.interviewQuestion
  const quote = dailyFeed?.motivationalQuote
  const speakingPrompt = dailyFeed?.speakingPrompt

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#FFD700'
    if (rank === 2) return '#C0C0C0'
    if (rank === 3) return '#CD7F32'
    return Theme.colors.secondary
  }

  const displayLeaderboard = leaderboard.length > 0
    ? leaderboard.slice(0, 3).map((e, i) => ({
        rank: i + 1,
        name: e.full_name || 'er',
        xp: e.xp_earned,
        color: getRankColor(i + 1),
      }))
    : [
        { rank: 1, name: 'Priya S.', xp: 3240, color: '#FFD700' },
        { rank: 2, name: 'Ravi K.', xp: 2980, color: '#C0C0C0' },
        { rank: 3, name: 'Anitha M.', xp: 2750, color: '#CD7F32' },
      ]

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || loading}
          onRefresh={onRefresh}
          tintColor={Theme.colors.secondary}
        />
      }
    >
      {/* ── Header ── */}
      <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.levelText}>Level {profile?.current_level || 1} • System Ready</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => {
                Alert.alert(
                  "System Notifications",
                  "• Daily Protocol is ready!\n• Practice your Greetings today.\n• You are on a 5-day streak, keep it up!",
                  [{ text: "Acknowledge", style: "cancel" }]
                )
              }}
            >
              <Bell size={20} color={Theme.colors.secondary} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <View style={styles.avatarCircle}>
                <User size={22} color={Theme.colors.text} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak + XP badges */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Flame size={16} color={Theme.colors.text} strokeWidth={2.5} />
            <Text style={styles.badgeText}>{streak} Cycle Streak</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(255, 184, 0, 0.15)', borderColor: Theme.colors.accent, borderWidth: 1 }]}>
            <Zap size={16} color={Theme.colors.accent} strokeWidth={2.5} />
            <Text style={[styles.badgeText, { color: Theme.colors.accent }]}>{xpTotal.toLocaleString()} XP</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Today's Progress Card ── */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Daily Metric</Text>
          <Text style={styles.progressXP}>{xpToday} / {dailyGoalXP} XP</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` as any }]} />
        </View>
        <View style={styles.progressMotivationRow}>
          {progressPct >= 80 ? (
            <CheckCircle2 size={16} color={Theme.colors.secondary} />
          ) : progressPct >= 50 ? (
            <Activity size={16} color={Theme.colors.secondary} />
          ) : (
            <Rocket size={16} color={Theme.colors.secondary} />
          )}
          <Text style={styles.progressMotivation}>
            {progressPct >= 80 ? 'Optimal performance achieved!' : progressPct >= 50 ? 'Connection stable. Keep going!' : 'Initialization complete. Start ing!'}
          </Text>
        </View>
      </View>

      {/* ── Vocabulary of the Day ── */}
      {vocab && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vocabulary Node</Text>
          <View style={styles.vocabCard}>
            <View style={styles.vocabTopRow}>
              <View style={styles.vocabWordRow}>
                <BookOpen size={20} color={Theme.colors.secondary} />
                <Text style={styles.vocabWord}>{vocab.word}</Text>
              </View>
              <View style={styles.difficultyBadge}>
                <Text style={styles.difficultyBadgeText}>{vocab.category || 'General'}</Text>
              </View>
            </View>
            <Text style={styles.vocabMeaning}>{vocab.meaning_telugu}</Text>
            <Text style={styles.vocabExample}>"{vocab.example}"</Text>
            <TouchableOpacity
              style={styles.hearBtn}
              onPress={() => Speech.speak(vocab.word, { language: 'en-IN', rate: 0.85 })}
            >
              <Volume2 size={16} color={Theme.colors.text} />
              <Text style={styles.hearBtnText}>Transmit Audio</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Featured Module ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Directive</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(todayFeatured.route as any)}
        >
          <LinearGradient colors={todayFeatured.gradient as [string, string]} style={styles.featuredCard}>
            <View style={styles.featuredIconWrap}>
               <FeaturedIcon size={36} color={Theme.colors.text} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredLabel}>TODAY'S DIRECTIVE</Text>
              <Text style={styles.featuredName}>{todayFeatured.name}</Text>
              <Text style={styles.featuredSubtitle}>{todayFeatured.subtitle}</Text>
            </View>
            <Text style={styles.featuredArrow}>Execute →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Today's Speaking Prompt ── */}
      {speakingPrompt && (
        <View style={styles.section}>
          <View style={styles.speakCard}>
            <View style={styles.speakTopRow}>
              <View style={styles.speakTitleRow}>
                <Mic size={20} color={Theme.colors.text} />
                <Text style={styles.speakTitle}>Audio Interface Challenge</Text>
              </View>
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>2 min</Text>
              </View>
            </View>
            <Text style={styles.speakPrompt}>{speakingPrompt}</Text>
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={() => router.push('/features/public-speaking' as any)}
            >
              <Text style={styles.speakBtnText}>Initialize Mic →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Grammar Tip of the Day ── */}
      {grammarTip && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Syntax Optimization</Text>
          <View style={styles.grammarTipCard}>
            <View style={styles.grammarTipTopRow}>
              <View style={styles.grammarTopicBadge}>
                <Text style={styles.grammarTopicBadgeText}>{grammarTip.topic}</Text>
              </View>
            </View>
            <Text style={styles.grammarTipText}>{grammarTip.tip}</Text>
            <View style={styles.grammarExampleRow}>
              <View style={styles.grammarExampleBlock}>
                <View style={styles.grammarExampleLabelRow}>
                  <Check size={14} color="#00E676" strokeWidth={3} />
                  <Text style={styles.grammarExampleLabel}>Valid Syntax</Text>
                </View>
                <Text style={[styles.grammarExampleText, { color: '#00E676' }]}>{grammarTip.example_correct}</Text>
              </View>
              <View style={styles.grammarExampleBlock}>
                <View style={styles.grammarExampleLabelRow}>
                  <X size={14} color={Theme.colors.error} strokeWidth={3} />
                  <Text style={styles.grammarExampleLabel}>Invalid Syntax</Text>
                </View>
                <Text style={[styles.grammarExampleText, { color: Theme.colors.error }]}>{grammarTip.example_wrong}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.practiceTipBtn}
              onPress={() => router.push('/features/grammar-engine' as any)}
            >
              <Text style={styles.practiceTipBtnText}>Compile & Practice →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Quick Access Grid ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Modules</Text>
        <View style={styles.quickGrid}>
          {quickAccessItems.map((item) => {
            const IconComp = item.icon
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.quickCard}
                activeOpacity={0.8}
                onPress={() => router.push(item.route as any)}
              >
                {item.isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
                <View style={styles.quickIconWrap}>
                  <IconComp size={28} color={Theme.colors.secondary} strokeWidth={1.5} />
                </View>
                <Text style={styles.quickName}>{item.name}</Text>
                <View style={styles.difficultyRow}>
                  {[1, 2, 3].map(d => (
                    <View key={d} style={[styles.diffDot, { backgroundColor: d <= item.difficulty ? Theme.colors.secondary : 'rgba(255,255,255,0.1)' }]} />
                  ))}
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* ── AI Nova Section ── */}
      <View style={styles.section}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/ai/chat' as any)}>
          <LinearGradient colors={[Theme.colors.surface, '#0F2E5C']} style={styles.novaCard}>
            <View style={styles.novaAvatarWrap}>
              <LinearGradient colors={['#00C2FF', '#4F46E5']} style={styles.novaAvatar}>
                 <Bot size={28} color="#FFF" />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.novaTitle}>Interface with Nova</Text>
              <Text style={styles.novaSubtitle}>Connect to your personal AI companion</Text>
            </View>
            <Text style={styles.novaArrow}>Connect →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Daily Challenge ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Protocol</Text>
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <View style={styles.challengeIconWrap}>
               <Target size={32} color={Theme.colors.secondary} strokeWidth={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>
                {dailyChallenge?.title || 'Workplace Protocol'}
              </Text>
              <Text style={styles.challengeDesc}>
                {dailyChallenge?.description || 'Complete 3 office conversation exercises'}
              </Text>
            </View>
            <View style={styles.xpReward}>
              <Text style={styles.xpRewardText}>+50 XP</Text>
            </View>
          </View>
          <View style={styles.challengeProgress}>
            <Text style={styles.challengeProgressText}>Execution: 0 / 3 tasks</Text>
            <View style={styles.challengeProgressBar}>
              <View style={[styles.challengeProgressFill, { width: '0%' }]} />
            </View>
          </View>
          <TouchableOpacity
            style={styles.challengeBtn}
            onPress={() => router.push('/daily-challenge' as any)}
          >
            <Text style={styles.challengeBtnText}>Execute Protocol</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Interview Question of the Day ── */}
      {interviewQ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interview Node</Text>
          <View style={styles.interviewCard}>
            <View style={styles.interviewTopRow}>
              <View style={[styles.categoryBadge, { backgroundColor: interviewQ.category === 'Technical' ? 'rgba(0, 194, 255, 0.1)' : 'rgba(255, 184, 0, 0.1)' }]}>
                <Text style={[styles.categoryBadgeText, { color: interviewQ.category === 'Technical' ? Theme.colors.secondary : Theme.colors.accent }]}>
                  {interviewQ.category}
                </Text>
              </View>
            </View>
            <Text style={styles.interviewQuestion}>{interviewQ.question}</Text>
            {interviewQ.tips && interviewQ.tips.length > 0 && (
              <View style={styles.tipsContainer}>
                {interviewQ.tips.slice(0, 3).map((tip, i) => (
                  <Text key={i} style={styles.tipText}>• {tip}</Text>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={styles.answerBtn}
              onPress={() => router.push('/features/interview-training' as any)}
            >
              <Text style={styles.answerBtnText}>Generate Response →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Continue ing ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Processes</Text>
        <TouchableOpacity
          style={styles.continueCard}
          activeOpacity={0.85}
          onPress={() => router.push('/lessons/office-conversations' as any)}
        >
          <View style={styles.continueLeft}>
            <Building size={32} color={Theme.colors.secondary} strokeWidth={1.5} />
            <View style={{ marginLeft: 16, flex: 1 }}>
              <Text style={styles.continueName}>Office Conversations</Text>
              <Text style={styles.continueProgress}>45% extracted</Text>
              <View style={styles.continueBarBg}>
                <View style={[styles.continueBarFill, { width: '45%' }]} />
              </View>
            </View>
          </View>
          <Text style={styles.continueArrow}>Resume →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Grammar Check Widget ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Syntax Diagnostics</Text>
        <View style={styles.grammarCard}>
          <Text style={styles.grammarHint}>Run diagnostic on your text</Text>
          <View style={styles.grammarInputRow}>
            <TextInput
              style={styles.grammarInput}
              placeholder="Input query string..."
              placeholderTextColor={Theme.colors.textSecondary}
              value={grammarText}
              onChangeText={setGrammarText}
              multiline={false}
            />
            <TouchableOpacity
              style={styles.grammarBtn}
              onPress={() => {
                if (grammarText.trim()) {
                  router.push({ pathname: '/features/grammar-engine', params: { text: grammarText } });
                } else {
                  router.push('/features/grammar-engine');
                }
              }}
            >
              <Text style={styles.grammarBtnText}>Analyze →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Motivational Quote ── */}
      {quote && (
        <View style={styles.section}>
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{quote.quote}"</Text>
            <Text style={styles.quoteAuthor}>— {quote.author}</Text>
            {quote.telugu ? (
              <Text style={styles.quoteTelugu}>{quote.telugu}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* ── Leaderboard Preview ── */}
      <View style={styles.section}>
        <View style={styles.leaderHeader}>
          <Text style={styles.sectionTitle}>Global Network Rank</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/progress', params: { tab: 'leaderboard' } } as any)}>
            <Text style={styles.viewAll}>View All Nodes →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.leaderCard}>
          {displayLeaderboard.map(item => (
            <View key={item.rank} style={styles.leaderRow}>
              <View style={styles.leaderIconWrap}>
                 <Trophy size={20} color={item.color} />
              </View>
              <Text style={styles.leaderName}>{item.name}</Text>
              <Text style={styles.leaderXP}>{item.xp.toLocaleString()} XP</Text>
            </View>
          ))}
          <View style={[styles.leaderRow, styles.leaderYouRow]}>
            <View style={styles.leaderIconWrap}>
               <Bot size={20} color={Theme.colors.secondary} />
            </View>
            <Text style={[styles.leaderName, { color: Theme.colors.secondary, fontWeight: '700' }]}>
              {profile?.full_name?.split(' ')[0] || 'You'} (Local)
            </Text>
            <Text style={styles.leaderXP}>{xpTotal.toLocaleString()} XP</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },

  // Header
  header: { padding: 24, paddingTop: 52, paddingBottom: 32 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 20, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  levelText: { fontSize: 12, color: Theme.colors.secondary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,194,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,194,255,0.2)',
  },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Theme.colors.secondary,
    shadowColor: Theme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeRow: { flexDirection: 'row', gap: 10 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  badgeText: { color: Theme.colors.text, fontWeight: '700', fontSize: 13 },

  // Progress card
  progressCard: {
    margin: 16, marginTop: -20,
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: Theme.colors.text, textTransform: 'uppercase', letterSpacing: 1 },
  progressXP: { fontSize: 13, color: Theme.colors.secondary, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: Theme.colors.secondary, borderRadius: 4, shadowColor: Theme.colors.secondary, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  progressMotivationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  progressMotivation: { fontSize: 12, color: Theme.colors.textSecondary, fontStyle: 'italic' },

  // Section
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1.5 },

  // Vocabulary of the Day
  vocabCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  vocabTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  vocabWordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vocabWord: { fontSize: 26, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  difficultyBadge: { backgroundColor: 'rgba(0,194,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(0,194,255,0.3)' },
  difficultyBadgeText: { fontSize: 11, color: Theme.colors.secondary, fontWeight: '800', textTransform: 'uppercase' },
  vocabMeaning: { fontSize: 15, color: Theme.colors.secondary, fontWeight: '600', marginBottom: 8 },
  vocabExample: { fontSize: 14, color: Theme.colors.textSecondary, fontStyle: 'italic', marginBottom: 16 },
  hearBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: Theme.colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  hearBtnText: { color: Theme.colors.text, fontWeight: '700', fontSize: 13 },

  // Speaking Prompt
  speakCard: {
    backgroundColor: '#0A1F44', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.secondary,
    shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 15, elevation: 6,
  },
  speakTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  speakTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speakTitle: { fontSize: 14, fontWeight: '800', color: Theme.colors.text, textTransform: 'uppercase', letterSpacing: 1 },
  durationBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  durationBadgeText: { fontSize: 11, color: Theme.colors.text, fontWeight: '700' },
  speakPrompt: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 16, lineHeight: 22 },
  speakBtn: {
    backgroundColor: Theme.colors.secondary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  speakBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  // Grammar Tip of the Day
  grammarTipCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  grammarTipTopRow: { marginBottom: 12 },
  grammarTopicBadge: { backgroundColor: 'rgba(255,184,0,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)' },
  grammarTopicBadgeText: { fontSize: 11, color: Theme.colors.accent, fontWeight: '800', textTransform: 'uppercase' },
  grammarTipText: { fontSize: 15, color: Theme.colors.text, marginBottom: 16, lineHeight: 22 },
  grammarExampleRow: { flexDirection: 'column', gap: 10, marginBottom: 16 },
  grammarExampleBlock: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Theme.colors.border },
  grammarExampleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  grammarExampleLabel: { fontSize: 11, fontWeight: '800', color: Theme.colors.textSecondary, textTransform: 'uppercase' },
  grammarExampleText: { fontSize: 14, fontWeight: '600' },
  practiceTipBtn: {
    backgroundColor: 'rgba(255,184,0,0.1)', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.accent,
  },
  practiceTipBtnText: { color: Theme.colors.accent, fontWeight: '800', fontSize: 14 },

  // Featured
  featuredCard: {
    borderRadius: 18, padding: 20, flexDirection: 'column',
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 6, gap: 4,
  },
  featuredIconWrap: { marginBottom: 12 },
  featuredLabel: { fontSize: 11, color: Theme.colors.secondary, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  featuredName: { fontSize: 24, fontWeight: '800', color: Theme.colors.text, marginTop: 4, letterSpacing: 0.5 },
  featuredSubtitle: { fontSize: 14, color: Theme.colors.textSecondary, marginTop: 6 },
  featuredArrow: { fontSize: 14, color: Theme.colors.text, fontWeight: '800', marginTop: 16, alignSelf: 'flex-start' },

  // Quick Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  quickCard: {
    width: '31%',
    backgroundColor: Theme.colors.surface, borderRadius: 14, padding: 14,
    alignItems: 'center', elevation: 4,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 6, position: 'relative',
  },
  newBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: Theme.colors.accent, borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  newBadgeText: { color: '#000', fontSize: 9, fontWeight: '800' },
  quickIconWrap: { marginBottom: 12, marginTop: 4 },
  quickName: { fontSize: 11, fontWeight: '800', color: Theme.colors.text, textAlign: 'center', marginBottom: 8 },
  difficultyRow: { flexDirection: 'row', gap: 4 },
  diffDot: { width: 8, height: 8, borderRadius: 4 },

  // Nova
  novaCard: {
    borderRadius: 18, padding: 18, flexDirection: 'row',
    alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: Theme.colors.secondary,
    shadowColor: Theme.colors.secondary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 15, elevation: 6,
  },
  novaAvatarWrap: { borderRadius: 14, overflow: 'hidden' },
  novaAvatar: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  novaTitle: { fontSize: 17, fontWeight: '800', color: Theme.colors.text },
  novaSubtitle: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4 },
  novaArrow: { fontSize: 12, color: Theme.colors.secondary, fontWeight: '800', textTransform: 'uppercase' },

  // Daily Challenge
  challengeCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  challengeIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,194,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  challengeTitle: { fontSize: 16, fontWeight: '800', color: Theme.colors.text, letterSpacing: 0.5 },
  challengeDesc: { fontSize: 13, color: Theme.colors.textSecondary, marginTop: 4, lineHeight: 18 },
  xpReward: { backgroundColor: 'rgba(255,184,0,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)' },
  xpRewardText: { color: Theme.colors.accent, fontWeight: '800', fontSize: 13 },
  challengeProgress: { marginBottom: 16 },
  challengeProgressText: { fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  challengeProgressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  challengeProgressFill: { height: 8, backgroundColor: Theme.colors.secondary, borderRadius: 4, shadowColor: Theme.colors.secondary, shadowOpacity: 1, shadowRadius: 10 },
  challengeBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: Theme.colors.secondary,
  },
  challengeBtnText: { color: Theme.colors.secondary, fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },

  // Interview Question
  interviewCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  interviewTopRow: { marginBottom: 12 },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  interviewQuestion: { fontSize: 16, fontWeight: '700', color: Theme.colors.text, marginBottom: 14, lineHeight: 24 },
  tipsContainer: { marginBottom: 16, gap: 6 },
  tipText: { fontSize: 13, color: Theme.colors.textSecondary, lineHeight: 20 },
  answerBtn: {
    backgroundColor: Theme.colors.secondary, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  answerBtnText: { color: '#000', fontWeight: '800', fontSize: 14, textTransform: 'uppercase' },

  // Continue Learning
  continueCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  continueLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  continueName: { fontSize: 16, fontWeight: '800', color: Theme.colors.text },
  continueProgress: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 4, marginBottom: 8 },
  continueBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  continueBarFill: { height: 6, backgroundColor: '#00E676', borderRadius: 3, shadowColor: '#00E676', shadowOpacity: 1, shadowRadius: 5 },
  continueArrow: { fontSize: 13, color: Theme.colors.secondary, fontWeight: '800', textTransform: 'uppercase' },

  // Grammar Check
  grammarCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  grammarHint: { fontSize: 13, color: Theme.colors.textSecondary, marginBottom: 14 },
  grammarInputRow: { flexDirection: 'row', gap: 12 },
  grammarInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10,
    borderWidth: 1, borderColor: Theme.colors.border,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: Theme.colors.text,
  },
  grammarBtn: {
    backgroundColor: Theme.colors.secondary, borderRadius: 10,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  grammarBtnText: { color: '#000', fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },

  // Motivational Quote
  quoteCard: {
    backgroundColor: 'rgba(0,194,255,0.05)', borderRadius: 16, padding: 20,
    borderLeftWidth: 4, borderLeftColor: Theme.colors.secondary,
    borderWidth: 1, borderColor: Theme.colors.border,
  },
  quoteText: { fontSize: 16, fontStyle: 'italic', color: Theme.colors.text, lineHeight: 26, marginBottom: 10 },
  quoteAuthor: { fontSize: 13, fontWeight: '800', color: Theme.colors.secondary, textTransform: 'uppercase' },
  quoteTelugu: { fontSize: 12, color: Theme.colors.textSecondary, marginTop: 6, fontStyle: 'italic' },

  // Leaderboard
  leaderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  viewAll: { fontSize: 12, color: Theme.colors.secondary, fontWeight: '800', textTransform: 'uppercase' },
  leaderCard: {
    backgroundColor: Theme.colors.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 14 },
  leaderYouRow: { borderTopWidth: 1, borderTopColor: Theme.colors.border, marginTop: 6, paddingTop: 16 },
  leaderIconWrap: { width: 32, alignItems: 'center' },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '700', color: Theme.colors.text },
  leaderXP: { fontSize: 14, color: Theme.colors.secondary, fontWeight: '800' },
})
