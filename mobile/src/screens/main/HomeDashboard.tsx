import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Speech from 'expo-speech'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

const { width } = Dimensions.get('window')

const FEATURED_MODULES = [
  { day: 0, icon: '🙏', name: 'Daily Greetings', subtitle: 'Start your week with confidence', route: '/features/daily-greetings', gradient: ['#4F46E5', '#7C3AED'] },
  { day: 1, icon: '🎤', name: 'Self Introduction', subtitle: 'Make a great first impression', route: '/features/self-introduction', gradient: ['#0891B2', '#0E7490'] },
  { day: 2, icon: '🏢', name: 'Office Conversations', subtitle: 'Excel at workplace English', route: '/features/office-conversations', gradient: ['#059669', '#047857'] },
  { day: 3, icon: '📧', name: 'Email Writing', subtitle: 'Write professional emails', route: '/features/email-writing', gradient: ['#D97706', '#B45309'] },
  { day: 4, icon: '💼', name: 'Interview Prep', subtitle: 'Ace your next interview', route: '/features/interview-training', gradient: ['#DC2626', '#B91C1C'] },
  { day: 5, icon: '🎙️', name: 'Public Speaking', subtitle: 'Speak with authority', route: '/features/public-speaking', gradient: ['#7C3AED', '#6D28D9'] },
  { day: 6, icon: '🤖', name: 'AI Roleplay', subtitle: 'Practice with Nova AI', route: '/ai/roleplay', gradient: ['#0891B2', '#4F46E5'] },
]

const QUICK_ACCESS = [
  { icon: '💬', name: 'Daily Greetings', route: '/features/daily-greetings', difficulty: 1, isNew: false },
  { icon: '🎤', name: 'Self Introduction', route: '/features/self-introduction', difficulty: 2, isNew: false },
  { icon: '🏢', name: 'Office Talks', route: '/features/office-conversations', difficulty: 2, isNew: false },
  { icon: '📧', name: 'Email Writing', route: '/features/email-writing', difficulty: 3, isNew: true },
  { icon: '💼', name: 'Interview Prep', route: '/features/interview-training', difficulty: 3, isNew: true },
  { icon: '🎙️', name: 'Public Speaking', route: '/features/public-speaking', difficulty: 3, isNew: true },
]

const RANK_EMOJI: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

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
    if (hour < 12) return `Good morning, ${name}! 👋`
    if (hour < 17) return `Good afternoon, ${name}! 👋`
    return `Good evening, ${name}! 👋`
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
        icon: dailyFeed.recommendedModules[0].icon || '📚',
        name: dailyFeed.recommendedModules[0].module,
        subtitle: dailyFeed.recommendedModules[0].reason,
        route: dailyFeed.recommendedModules[0].route,
        gradient: fallbackFeatured.gradient,
      }
    : fallbackFeatured

  // Quick access: prefer feed recommendations, fallback to static
  const quickAccessItems =
    dailyFeed?.recommendedModules && dailyFeed.recommendedModules.length >= 3
      ? dailyFeed.recommendedModules.map((m, i) => ({
          icon: m.icon || '📚',
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

  const displayLeaderboard = leaderboard.length > 0
    ? leaderboard.slice(0, 3).map((e, i) => ({
        rank: i + 1,
        name: e.full_name || 'Learner',
        xp: e.xp_earned,
        emoji: RANK_EMOJI[i + 1] || '🏅',
      }))
    : [
        { rank: 1, name: 'Priya S.', xp: 3240, emoji: '🥇' },
        { rank: 2, name: 'Ravi K.', xp: 2980, emoji: '🥈' },
        { rank: 3, name: 'Anitha M.', xp: 2750, emoji: '🥉' },
      ]

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || loading}
          onRefresh={onRefresh}
        />
      }
    >
      {/* ── Header ── */}
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.levelText}>Level {profile?.current_level || 1} • English Learner</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => {
                Alert.alert(
                  "Notifications 🔔",
                  "• 🎯 Daily Challenge is ready!\n• 💬 Practice your Greetings today.\n• 📈 You are on a 5-day streak, keep it up!",
                  [{ text: "Close", style: "cancel" }]
                )
              }}
            >
              <Text style={styles.notifIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>
                  {profile?.full_name?.charAt(0).toUpperCase() || '👤'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak + XP badges */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔥 {streak} Day Streak</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(251,191,36,0.25)' }]}>
            <Text style={styles.badgeText}>⚡ {xpTotal.toLocaleString()} XP</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Today's Progress Card ── */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Today's Progress</Text>
          <Text style={styles.progressXP}>{xpToday} / {dailyGoalXP} XP</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressMotivation}>
          {progressPct >= 80 ? '🎉 Almost there! You\'re crushing it!' : progressPct >= 50 ? '💪 Keep going! Almost there!' : '🚀 Great start! Keep the momentum!'}
        </Text>
      </View>

      {/* ── Vocabulary of the Day ── */}
      {vocab && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vocabulary of the Day</Text>
          <View style={styles.vocabCard}>
            <View style={styles.vocabTopRow}>
              <Text style={styles.vocabWord}>{vocab.word}</Text>
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
              <Text style={styles.hearBtnText}>🔊 Hear it</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Featured Module ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Focus</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push(todayFeatured.route as any)}
        >
          <LinearGradient colors={todayFeatured.gradient as [string, string]} style={styles.featuredCard}>
            <Text style={styles.featuredIcon}>{todayFeatured.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featuredLabel}>TODAY'S FOCUS</Text>
              <Text style={styles.featuredName}>{todayFeatured.name}</Text>
              <Text style={styles.featuredSubtitle}>{todayFeatured.subtitle}</Text>
            </View>
            <Text style={styles.featuredArrow}>Start Learning →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Today's Speaking Prompt ── */}
      {speakingPrompt && (
        <View style={styles.section}>
          <View style={styles.speakCard}>
            <View style={styles.speakTopRow}>
              <Text style={styles.speakTitle}>🎤 Today's Speaking Challenge</Text>
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>2 min</Text>
              </View>
            </View>
            <Text style={styles.speakPrompt}>{speakingPrompt}</Text>
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={() => router.push('/features/public-speaking' as any)}
            >
              <Text style={styles.speakBtnText}>Start Speaking →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Grammar Tip of the Day ── */}
      {grammarTip && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grammar Tip of the Day</Text>
          <View style={styles.grammarTipCard}>
            <View style={styles.grammarTipTopRow}>
              <View style={styles.grammarTopicBadge}>
                <Text style={styles.grammarTopicBadgeText}>{grammarTip.topic}</Text>
              </View>
            </View>
            <Text style={styles.grammarTipText}>{grammarTip.tip}</Text>
            <View style={styles.grammarExampleRow}>
              <View style={styles.grammarExampleBlock}>
                <Text style={styles.grammarExampleLabel}>✅ Correct</Text>
                <Text style={[styles.grammarExampleText, { color: '#059669' }]}>{grammarTip.example_correct}</Text>
              </View>
              <View style={styles.grammarExampleBlock}>
                <Text style={styles.grammarExampleLabel}>❌ Wrong</Text>
                <Text style={[styles.grammarExampleText, { color: '#DC2626' }]}>{grammarTip.example_wrong}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.practiceTipBtn}
              onPress={() => router.push('/features/grammar-engine' as any)}
            >
              <Text style={styles.practiceTipBtnText}>Practice This →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Quick Access Grid ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {quickAccessItems.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
            >
              {item.isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickName}>{item.name}</Text>
              <View style={styles.difficultyRow}>
                {[1, 2, 3].map(d => (
                  <View key={d} style={[styles.diffDot, { backgroundColor: d <= item.difficulty ? '#4F46E5' : '#E5E7EB' }]} />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── AI Nova Section ── */}
      <View style={styles.section}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/ai/chat' as any)}>
          <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.novaCard}>
            <View style={styles.novaAvatarWrap}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.novaAvatar}>
                <Text style={{ fontSize: 28 }}>🤖</Text>
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.novaTitle}>Chat with Nova</Text>
              <Text style={styles.novaSubtitle}>Practice any topic with your AI tutor</Text>
            </View>
            <Text style={styles.novaArrow}>Start Chatting →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Daily Challenge ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Challenge</Text>
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <Text style={styles.challengeEmoji}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>
                {dailyChallenge?.title || 'Workplace Warrior'}
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
            <Text style={styles.challengeProgressText}>Progress: 0 / 3 tasks</Text>
            <View style={styles.challengeProgressBar}>
              <View style={[styles.challengeProgressFill, { width: '0%' }]} />
            </View>
          </View>
          <TouchableOpacity
            style={styles.challengeBtn}
            onPress={() => router.push('/daily-challenge' as any)}
          >
            <Text style={styles.challengeBtnText}>Accept Challenge</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Interview Question of the Day ── */}
      {interviewQ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interview Question of the Day</Text>
          <View style={styles.interviewCard}>
            <View style={styles.interviewTopRow}>
              <View style={[styles.categoryBadge, { backgroundColor: interviewQ.category === 'Technical' ? '#EEF2FF' : '#FEF3C7' }]}>
                <Text style={[styles.categoryBadgeText, { color: interviewQ.category === 'Technical' ? '#4F46E5' : '#D97706' }]}>
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
              <Text style={styles.answerBtnText}>Answer This →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Continue Learning ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Continue Learning</Text>
        <TouchableOpacity
          style={styles.continueCard}
          activeOpacity={0.85}
          onPress={() => router.push('/lessons/office-conversations' as any)}
        >
          <View style={styles.continueLeft}>
            <Text style={{ fontSize: 32 }}>🏢</Text>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.continueName}>Office Conversations</Text>
              <Text style={styles.continueProgress}>45% complete</Text>
              <View style={styles.continueBarBg}>
                <View style={[styles.continueBarFill, { width: '45%' }]} />
              </View>
            </View>
          </View>
          <Text style={styles.continueArrow}>Continue →</Text>
        </TouchableOpacity>
      </View>

      {/* ── Grammar Check Widget ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Grammar Check</Text>
        <View style={styles.grammarCard}>
          <Text style={styles.grammarHint}>Check your grammar instantly</Text>
          <View style={styles.grammarInputRow}>
            <TextInput
              style={styles.grammarInput}
              placeholder="Type a sentence to check..."
              placeholderTextColor="#9CA3AF"
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
              <Text style={styles.grammarBtnText}>Check →</Text>
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
          <Text style={styles.sectionTitle}>This Week's Top Learners</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/progress', params: { tab: 'leaderboard' } } as any)}>
            <Text style={styles.viewAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.leaderCard}>
          {displayLeaderboard.map(item => (
            <View key={item.rank} style={styles.leaderRow}>
              <Text style={styles.leaderEmoji}>{item.emoji}</Text>
              <Text style={styles.leaderName}>{item.name}</Text>
              <Text style={styles.leaderXP}>⚡ {item.xp.toLocaleString()} XP</Text>
            </View>
          ))}
          <View style={[styles.leaderRow, styles.leaderYouRow]}>
            <Text style={styles.leaderEmoji}>👤</Text>
            <Text style={[styles.leaderName, { color: '#4F46E5', fontWeight: '700' }]}>
              {profile?.full_name?.split(' ')[0] || 'You'} (You)
            </Text>
            <Text style={styles.leaderXP}>⚡ {xpTotal.toLocaleString()} XP</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },

  // Header
  header: { padding: 24, paddingTop: 52, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: '800', color: 'white' },
  levelText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifIcon: { fontSize: 18 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 20, color: 'white', fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 10 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  badgeText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Progress card
  progressCard: {
    margin: 16, marginTop: 16,
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  progressXP: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },
  progressBarBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: 10, backgroundColor: '#4F46E5', borderRadius: 5 },
  progressMotivation: { fontSize: 13, color: '#6B7280', marginTop: 8 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },

  // Vocabulary of the Day
  vocabCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  vocabTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  vocabWord: { fontSize: 26, fontWeight: '800', color: '#111827' },
  difficultyBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  difficultyBadgeText: { fontSize: 11, color: '#4F46E5', fontWeight: '700' },
  vocabMeaning: { fontSize: 15, color: '#7C3AED', fontWeight: '600', marginBottom: 8 },
  vocabExample: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 12 },
  hearBtn: {
    backgroundColor: '#EEF2FF', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  hearBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },

  // Speaking Prompt
  speakCard: {
    backgroundColor: '#1E1B4B', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6,
  },
  speakTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  speakTitle: { fontSize: 14, fontWeight: '700', color: 'white', flex: 1 },
  durationBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  durationBadgeText: { fontSize: 11, color: 'white', fontWeight: '600' },
  speakPrompt: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 14, lineHeight: 22 },
  speakBtn: {
    backgroundColor: '#4F46E5', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  speakBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Grammar Tip of the Day
  grammarTipCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  grammarTipTopRow: { marginBottom: 10 },
  grammarTopicBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  grammarTopicBadgeText: { fontSize: 11, color: '#D97706', fontWeight: '700' },
  grammarTipText: { fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 21 },
  grammarExampleRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  grammarExampleBlock: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10 },
  grammarExampleLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  grammarExampleText: { fontSize: 13, fontWeight: '600' },
  practiceTipBtn: {
    backgroundColor: '#FEF3C7', borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
  },
  practiceTipBtnText: { color: '#D97706', fontWeight: '700', fontSize: 14 },

  // Featured
  featuredCard: {
    borderRadius: 18, padding: 20, flexDirection: 'column',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, gap: 4,
  },
  featuredIcon: { fontSize: 40, marginBottom: 8 },
  featuredLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 1 },
  featuredName: { fontSize: 22, fontWeight: '800', color: 'white', marginTop: 2 },
  featuredSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  featuredArrow: { fontSize: 14, color: 'white', fontWeight: '700', marginTop: 14, alignSelf: 'flex-start' },

  // Quick Grid
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: {
    width: (width - 56) / 3,
    backgroundColor: 'white', borderRadius: 14, padding: 14,
    alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, position: 'relative',
  },
  newBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#EF4444', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  newBadgeText: { color: 'white', fontSize: 9, fontWeight: '800' },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickName: { fontSize: 11, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 },
  difficultyRow: { flexDirection: 'row', gap: 3 },
  diffDot: { width: 7, height: 7, borderRadius: 4 },

  // Nova
  novaCard: {
    borderRadius: 18, padding: 18, flexDirection: 'row',
    alignItems: 'center', gap: 14,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6,
  },
  novaAvatarWrap: { borderRadius: 14, overflow: 'hidden' },
  novaAvatar: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  novaTitle: { fontSize: 17, fontWeight: '800', color: 'white' },
  novaSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  novaArrow: { fontSize: 12, color: '#A5B4FC', fontWeight: '700' },

  // Daily Challenge
  challengeCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  challengeEmoji: { fontSize: 32 },
  challengeTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  challengeDesc: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  xpReward: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  xpRewardText: { color: '#D97706', fontWeight: '800', fontSize: 13 },
  challengeProgress: { marginBottom: 14 },
  challengeProgressText: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  challengeProgressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  challengeProgressFill: { height: 8, backgroundColor: '#4F46E5', borderRadius: 4 },
  challengeBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  challengeBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },

  // Interview Question
  interviewCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  interviewTopRow: { marginBottom: 10 },
  categoryBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  categoryBadgeText: { fontSize: 11, fontWeight: '700' },
  interviewQuestion: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 12, lineHeight: 22 },
  tipsContainer: { marginBottom: 14, gap: 4 },
  tipText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  answerBtn: {
    backgroundColor: '#4F46E5', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  answerBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  // Continue Learning
  continueCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  continueLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  continueName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  continueProgress: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 6 },
  continueBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  continueBarFill: { height: 6, backgroundColor: '#059669', borderRadius: 3 },
  continueArrow: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },

  // Grammar Check
  grammarCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  grammarHint: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  grammarInputRow: { flexDirection: 'row', gap: 10 },
  grammarInput: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  grammarBtn: {
    backgroundColor: '#4F46E5', borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  grammarBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Motivational Quote
  quoteCard: {
    backgroundColor: '#F5F3FF', borderRadius: 16, padding: 20,
    borderLeftWidth: 4, borderLeftColor: '#7C3AED',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  quoteText: { fontSize: 15, fontStyle: 'italic', color: '#374151', lineHeight: 24, marginBottom: 8 },
  quoteAuthor: { fontSize: 13, fontWeight: '700', color: '#7C3AED' },
  quoteTelugu: { fontSize: 12, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' },

  // Leaderboard
  leaderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { fontSize: 13, color: '#4F46E5', fontWeight: '700' },
  leaderCard: {
    backgroundColor: 'white', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  leaderYouRow: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4 },
  leaderEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  leaderName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  leaderXP: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
})
