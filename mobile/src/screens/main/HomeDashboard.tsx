import React, { useEffect, useCallback, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions, TextInput, Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Sun, Mic, Briefcase, Mail, MessageSquare, Bot, Bell, User, Flame, Zap, Volume2, ArrowRight, Target, Trophy, BookOpen } from 'lucide-react-native'
import { router } from 'expo-router'
import * as Speech from 'expo-speech'
import { Colors } from '../../constants/theme'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { fetchCategories } from '../../store/slices/lessonsSlice'
import { fetchDailyChallenge, fetchLeaderboard } from '../../store/slices/gamificationSlice'
import { fetchProfile } from '../../store/slices/authSlice'
import { generateDailyFeed, DailyFeed, invalidateDailyFeed } from '../../services/personalization/personalizationEngine'
import {
  getVocabularyOfTheDay,
  getGrammarTipOfTheDay,
  getMotivationalQuote,
  getInterviewQuestionOfTheDay,
} from '../../services/randomization/contentEngine'

const { width } = Dimensions.get('window')

const FEATURED_MODULES = [
  { day: 0, icon: Sun, name: 'Daily Greetings', subtitle: 'Start your week with confidence', route: '/features/daily-greetings', gradient: ['#4F46E5', '#7C3AED'] },
  { day: 1, icon: Mic, name: 'Self Introduction', subtitle: 'Make a great first impression', route: '/features/self-introduction', gradient: ['#0891B2', '#0E7490'] },
  { day: 2, icon: Briefcase, name: 'Office Conversations', subtitle: 'Excel at workplace English', route: '/features/office-conversations', gradient: ['#00D26A', '#34D399'] },
  { day: 3, icon: Mail, name: 'Email Writing', subtitle: 'Write professional emails', route: '/features/email-writing', gradient: ['#D97706', '#B45309'] },
  { day: 4, icon: Briefcase, name: 'Interview Prep', subtitle: 'Ace your next interview', route: '/features/interview-training', gradient: ['#DC2626', '#B91C1C'] },
  { day: 5, icon: Mic, name: 'Public Speaking', subtitle: 'Speak with authority', route: '/features/public-speaking', gradient: ['#7C3AED', '#6D28D9'] },
  { day: 6, icon: Bot, name: 'AI Roleplay', subtitle: 'Practice with Nova AI', route: '/ai/roleplay', gradient: ['#0891B2', '#4F46E5'] },
]

const QUICK_ACCESS = [
  { icon: MessageSquare, name: 'Daily Greetings', route: '/features/daily-greetings', difficulty: 1, isNew: false },
  { icon: Mic, name: 'Self Introduction', route: '/features/self-introduction', difficulty: 2, isNew: false },
  { icon: Briefcase, name: 'Office Talks', route: '/features/office-conversations', difficulty: 2, isNew: false },
  { icon: Mail, name: 'Email Writing', route: '/features/email-writing', difficulty: 3, isNew: true },
  { icon: Briefcase, name: 'Interview Prep', route: '/features/interview-training', difficulty: 3, isNew: true },
  { icon: Mic, name: 'Public Speaking', route: '/features/public-speaking', difficulty: 3, isNew: true },
]

const RANK_EMOJI: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }

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

  const displayLeaderboard = leaderboard.length > 0
    ? leaderboard.slice(0, 3).map((e, i) => ({
        rank: i + 1,
        name: e.full_name || 'Learner',
        xp: e.xp_earned,
        emoji: RANK_EMOJI[i + 1] || '🏅',
      }))
    : [
        { rank: 1, name: 'Priya S.', xp: 3240, emoji: '#FFD700' },
        { rank: 2, name: 'Ravi K.', xp: 2980, emoji: '#C0C0C0' },
        { rank: 3, name: 'Anitha M.', xp: 2750, emoji: '#CD7F32' },
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
      <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.levelText}>Level {profile?.current_level || 1} • English Learner</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => {
                router.push('/(main)/notifications')
              }}
            >
              <Bell size={20} color='white' />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <View style={styles.avatarCircle}>
                <User size={22} color='white' />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak + XP badges */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Flame size={14} color='white' style={{marginRight: 4}} /><Text style={styles.badgeText}>{streak} Day Streak</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(251,191,36,0.25)' }]}>
            <Flame size={14} color='white' style={{marginRight: 4}} /><Text style={styles.badgeText}>{xpTotal.toLocaleString()} XP</Text>
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
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Volume2 size={16} color='#7B61FF' style={{marginRight: 6}} /><Text style={styles.hearBtnText}>Hear it</Text></View>
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
            <View style={styles.featuredContentRow}>
              <View style={styles.featuredTextContent}>
                <Text style={styles.featuredLabel}>TODAY'S FOCUS</Text>
                <Text style={styles.featuredName}>{todayFeatured.name}</Text>
                <Text style={styles.featuredSubtitle}>{todayFeatured.subtitle}</Text>
              </View>
              <View style={styles.featuredIconContainer}>
                <todayFeatured.icon size={36} color='white' />
              </View>
            </View>
            <View style={styles.featuredActionRow}>
              <Text style={styles.featuredActionText}>Start Learning</Text>
              <ArrowRight size={16} color='white' />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Today's Speaking Prompt ── */}
      {speakingPrompt && (
        <View style={styles.section}>
          <View style={styles.speakCard}>
            <View style={styles.speakTopRow}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}><Mic size={18} color='#000' style={{marginRight: 8}} /><Text style={styles.speakTitle}>Today's Speaking Challenge</Text></View>
              <View style={styles.durationBadge}>
                <Text style={styles.durationBadgeText}>2 min</Text>
              </View>
            </View>
            <Text style={styles.speakPrompt}>{speakingPrompt}</Text>
            <TouchableOpacity
              style={styles.speakBtn}
              onPress={() => router.push('/features/public-speaking' as any)}
            >
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}><Text style={styles.speakBtnText}>Start Speaking</Text><ArrowRight size={16} color='white' style={{marginLeft: 4}}/></View>
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
                <Text style={[styles.grammarExampleText, { color: '#00D26A' }]}>{grammarTip.example_correct}</Text>
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
              <item.icon size={28} color='#111827' style={{ marginBottom: 6 }} />
              <Text style={styles.quickName}>{item.name}</Text>
              <View style={styles.difficultyRow}>
                {[1, 2, 3].map(d => (
                  <View key={d} style={[styles.diffDot, { backgroundColor: d <= item.difficulty ? '#7B61FF' : '#E5E7EB' }]} />
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── AI Nova Section ── */}
      <View style={styles.section}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/ai/chat' as any)}>
          <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.novaCard}>
            <View style={styles.novaAvatarWrap}>
              <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.novaAvatar}>
                <Bot size={28} color='white' />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.novaTitle}>Chat with Nova</Text>
              <Text style={styles.novaSubtitle}>Practice any topic with your AI tutor</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={styles.novaArrow}>Start Chatting</Text><ArrowRight size={14} color='#ffffffff' style={{marginLeft: 4}}/></View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── Daily Challenge ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Challenge</Text>
        <View style={styles.challengeCard}>
          <View style={styles.challengeHeader}>
            <View style={{width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center'}}><Target size={24} color='#7B61FF' /></View>
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
              <View style={[styles.categoryBadge, { backgroundColor: interviewQ.category === 'Technical' ? '#FFF3EE' : '#FEF3C7' }]}>
                <Text style={[styles.categoryBadgeText, { color: interviewQ.category === 'Technical' ? '#7B61FF' : '#D97706' }]}>
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
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}><Text style={styles.answerBtnText}>Answer This</Text><ArrowRight size={16} color='white' style={{marginLeft: 4}}/></View>
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
            <View style={{width: 54, height: 54, borderRadius: 16, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center'}}><Briefcase size={28} color='#00D26A' /></View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.continueName}>Office Conversations</Text>
              <Text style={styles.continueProgress}>45% complete</Text>
              <View style={styles.continueBarBg}>
                <View style={[styles.continueBarFill, { width: '45%' }]} />
              </View>
            </View>
          </View>
          <ArrowRight size={20} color='#7B61FF' />
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
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}><Text style={styles.grammarBtnText}>Check</Text><ArrowRight size={14} color='white' style={{marginLeft: 4}}/></View>
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
            <View style={{flexDirection: 'row', alignItems: 'center'}}><Text style={styles.viewAll}>View All</Text><ArrowRight size={14} color='#7B61FF' style={{marginLeft: 2}}/></View>
          </TouchableOpacity>
        </View>
        <View style={styles.leaderCard}>
          {displayLeaderboard.map(item => (
            <View key={item.rank} style={styles.leaderRow}>
              <View style={{ width: 32, alignItems: 'center' }}><Trophy size={22} color={item.emoji} /></View>
              <Text style={styles.leaderName}>{item.name}</Text>
              <Text style={styles.leaderXP}>{item.xp.toLocaleString()} XP</Text>
            </View>
          ))}
          <View style={[styles.leaderRow, styles.leaderYouRow]}>
            <View style={{ width: 32, alignItems: 'center' }}><User size={22} color='#7B61FF' /></View>
            <Text style={[styles.leaderName, { color: '#7B61FF', fontWeight: '700' }]}>
              {profile?.full_name?.split(' ')[0] || 'You'} (You)
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
    borderWidth: 1, borderColor: 'rgba(0,194,255,0.2)',
  },
  avatarEmoji: { fontSize: 20, color: 'white', fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 10 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
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
  progressXP: { fontSize: 13, color: '#7B61FF', fontWeight: '700' },
  progressBarBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: 10, backgroundColor: '#7B61FF', borderRadius: 5 },
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
  difficultyBadge: { backgroundColor: '#FFF3EE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  difficultyBadgeText: { fontSize: 11, color: '#7B61FF', fontWeight: '700' },
  vocabMeaning: { fontSize: 15, color: '#00D26A', fontWeight: '600', marginBottom: 8 },
  vocabExample: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 12 },
  hearBtn: {
    backgroundColor: '#FFF3EE', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  hearBtnText: { color: '#7B61FF', fontWeight: '700', fontSize: 13 },

  // Speaking Prompt
  speakCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 6,
  },
  speakTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  speakTitle: { fontSize: 14, fontWeight: '700', color: '#000', flex: 1 },
  durationBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  durationBadgeText: { fontSize: 11, color: '#000', fontWeight: '600' },
  speakPrompt: { fontSize: 15, color: 'rgba(0, 0, 0, 0.85)', marginBottom: 14, lineHeight: 22 },
  speakBtn: {
    backgroundColor: '#7B61FF', borderRadius: 10,
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
    borderRadius: 18, padding: 20,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  featuredContentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  featuredTextContent: { flex: 1, marginRight: 16 },
  featuredIconContainer: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  featuredLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 1 },
  featuredName: { fontSize: 22, fontWeight: '800', color: 'white', marginTop: 2 },
  featuredSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  featuredActionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  featuredActionText: { color: 'white', fontWeight: '700', fontSize: 14, marginRight: 4 },

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
  novaArrow: { fontSize: 12, color: '#ffffffff', fontWeight: '700' },

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
  challengeProgressFill: { height: 8, backgroundColor: '#7B61FF', borderRadius: 4 },
  challengeBtn: {
    backgroundColor: '#7B61FF', borderRadius: 12,
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
    backgroundColor: '#7B61FF', borderRadius: 10,
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
  continueBarFill: { height: 6, backgroundColor: '#00D26A', borderRadius: 3 },
  continueArrow: { fontSize: 13, color: '#7B61FF', fontWeight: '700' },

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
    backgroundColor: '#7B61FF', borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  grammarBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Motivational Quote
  quoteCard: {
    backgroundColor: '#FFF8F0', borderRadius: 16, padding: 20,
    borderLeftWidth: 4, borderLeftColor: '#7B61FF',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  quoteText: { fontSize: 15, fontStyle: 'italic', color: '#374151', lineHeight: 24, marginBottom: 8 },
  quoteAuthor: { fontSize: 13, fontWeight: '700', color: '#7B61FF' },
  quoteTelugu: { fontSize: 12, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' },

  // Leaderboard
  leaderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAll: { fontSize: 13, color: '#7B61FF', fontWeight: '700' },
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
