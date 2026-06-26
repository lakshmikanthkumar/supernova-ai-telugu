import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme } from '../../theme'

const { width } = Dimensions.get('window')

import { Bot, Layers, Zap, Mic } from 'lucide-react-native'

const STORAGE_KEY = '@englishmitra:onboarding_data_v1'
const SESSION_KEY = '@englishmitra:session'

// ---------- Data Definitions ----------

type Goal = 'career' | 'education' | 'travel' | 'conversation'
type Level = 'beginner' | 'elementary' | 'intermediate' | 'advanced'
type DailyGoal = '5' | '15' | '30' | '60'
type FocusArea = 'speaking' | 'writing' | 'vocabulary' | 'grammar' | 'interviews'

interface OnboardingData {
  name: string
  goal: Goal | null
  level: Level | null
  dailyGoal: DailyGoal | null
  focusAreas: FocusArea[]
  completedAt: string
}

const GOALS: { id: Goal; icon: string; label: string; telugu: string }[] = [
  { id: 'career',       icon: '💼', label: 'Job / Career',        telugu: 'కెరీర్ కోసం' },
  { id: 'education',    icon: '🎓', label: 'Education',            telugu: 'చదువు కోసం' },
  { id: 'travel',       icon: '✈️', label: 'Travel',               telugu: 'ట్రావెల్ కోసం' },
  { id: 'conversation', icon: '🗣️', label: 'Daily Conversation',   telugu: 'రోజువారీ కోసం' },
]

const LEVELS: { id: Level; icon: string; label: string; subtitle: string; telugu: string }[] = [
  { id: 'beginner',     icon: '🌱', label: 'Beginner',     subtitle: 'I know very basic English',           telugu: 'మొదటి అడుగులు' },
  { id: 'elementary',   icon: '📚', label: 'Elementary',   subtitle: 'I can handle simple conversations',   telugu: 'సాధారణ సంభాషణ' },
  { id: 'intermediate', icon: '💬', label: 'Intermediate', subtitle: 'I can hold conversations',            telugu: 'సంభాషణ చేయగలను' },
  { id: 'advanced',     icon: '🚀', label: 'Advanced',     subtitle: "I'm comfortable but want to improve", telugu: 'మెరుగు చేయాలి' },
]

const DAILY_GOALS: { id: DailyGoal; icon: string; label: string; subtitle: string; telugu: string; recommended?: boolean }[] = [
  { id: '5',  icon: '⚡', label: '5 minutes',  subtitle: 'Quick practice',     telugu: 'శీఘ్ర అభ్యాసం' },
  { id: '15', icon: '🔥', label: '15 minutes', subtitle: 'Recommended',        telugu: 'సిఫారసు చేయబడింది', recommended: true },
  { id: '30', icon: '💪', label: '30 minutes', subtitle: 'Serious learner',    telugu: 'తీవ్ర అభ్యాసకుడు' },
  { id: '60', icon: '🏆', label: '60 minutes', subtitle: 'Power learner',      telugu: 'శక్తివంతమైన అభ్యాసకుడు' },
]

const FOCUS_AREAS: { id: FocusArea; icon: string; label: string; telugu: string }[] = [
  { id: 'speaking',    icon: '🎤', label: 'Speaking',    telugu: 'మాట్లాడడం' },
  { id: 'writing',     icon: '✍️', label: 'Writing',     telugu: 'రాయడం' },
  { id: 'vocabulary',  icon: '📖', label: 'Vocabulary',  telugu: 'పదజాలం' },
  { id: 'grammar',     icon: '📝', label: 'Grammar',     telugu: 'వ్యాకరణం' },
  { id: 'interviews',  icon: '👔', label: 'Interviews',  telugu: 'ఇంటర్వ్యూలు' },
]

const TOTAL_STEPS = 6

// ---------- Main Component ----------

export default function OnboardingScreen() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [level, setLevel] = useState<Level | null>(null)
  const [dailyGoal, setDailyGoal] = useState<DailyGoal | null>(null)
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([])

  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  // Animate step transitions
  const animateToStep = (nextStep: number) => {
    const direction = nextStep > step ? 40 : -40
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: direction, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep)
      slideAnim.setValue(-direction)
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    })
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) animateToStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) animateToStep(step - 1)
  }

  const handleSkip = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ skipped: true, completedAt: new Date().toISOString() }))
    router.replace('/login')
  }

  const handleComplete = async () => {
    const data: OnboardingData = {
      name,
      goal,
      level,
      dailyGoal,
      focusAreas,
      completedAt: new Date().toISOString(),
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data))

    // Check if user already has a session
    const session = await AsyncStorage.getItem(SESSION_KEY)
    if (session) {
      router.replace('/(main)/home')
    } else {
      router.replace('/login')
    }
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 1: return name.trim().length >= 1
      case 2: return goal !== null
      case 3: return level !== null
      case 4: return dailyGoal !== null
      case 5: return focusAreas.length >= 1
      case 6: return true
      default: return false
    }
  }

  const toggleFocusArea = (area: FocusArea) => {
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#7B61FF" />

      {/* Header Gradient */}
      <LinearGradient
        colors={['#7B61FF', '#E85D20']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Progress Dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < step ? styles.dotCompleted : i === step - 1 ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step {step} of {TOTAL_STEPS}</Text>
      </LinearGradient>

      {/* Step Content */}
      <KeyboardAvoidingView
        style={styles.contentWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.animatedContent,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {step === 1 && (
            <StepName name={name} setName={setName} />
          )}
          {step === 2 && (
            <StepGoal selected={goal} onSelect={setGoal} />
          )}
          {step === 3 && (
            <StepLevel selected={level} onSelect={setLevel} />
          )}
          {step === 4 && (
            <StepDailyGoal selected={dailyGoal} onSelect={setDailyGoal} />
          )}
          {step === 5 && (
            <StepFocusAreas selected={focusAreas} onToggle={toggleFocusArea} />
          )}
          {step === 6 && (
            <StepWelcome
              name={name}
              goal={goal}
              level={level}
              dailyGoal={dailyGoal}
              focusAreas={focusAreas}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          {step > 1 ? (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.navPlaceholder} />
          )}
        </View>

        <View style={styles.navRight}>
          {step < TOTAL_STEPS && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}
          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canProceed()}
              style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            >
              <Text style={styles.nextBtnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleComplete} style={styles.startBtn}>
              <LinearGradient
                colors={['#7B61FF', '#E85D20']}
                style={styles.startBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.startBtnText}>Start Learning 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

// ---------- Step 1: Name ----------

function StepName({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer} keyboardShouldPersistTaps="handled">
      <Text style={styles.stepEmoji}>👋</Text>
      <Text style={styles.stepTitle}>What should we call you?</Text>
      <Text style={styles.stepSubtitleTelugu}>మీ పేరు ఏమిటి?</Text>
      <Text style={styles.stepHint}>Enter your first name to personalise your experience</Text>

      <View style={styles.nameInputWrapper}>
        <TextInput
          style={styles.nameInput}
          placeholder="Your name…"
          placeholderTextColor="#C5A89A"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={40}
          returnKeyType="done"
        />
      </View>

      {name.trim().length > 0 && (
        <Text style={styles.namePreview}>
          Nice to meet you, <Text style={styles.namePreviewBold}>{name.trim()}</Text>! 😊
        </Text>
      )}
    </ScrollView>
  )
}

// ---------- Step 2: Learning Goal ----------

function StepGoal({ selected, onSelect }: { selected: Goal | null; onSelect: (v: Goal) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <Text style={styles.stepEmoji}>🎯</Text>
      <Text style={styles.stepTitle}>Why are you learning English?</Text>
      <Text style={styles.stepSubtitleTelugu}>మీరు ఇంగ్లీష్ ఎందుకు నేర్చుకుంటున్నారు?</Text>
      <Text style={styles.stepHint}>Choose one that best fits you</Text>

      <View style={styles.optionsGrid}>
        {GOALS.map(item => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.optionCard, selected === item.id && styles.optionCardSelected]}
            activeOpacity={0.75}
          >
            <Text style={styles.optionIcon}>{item.icon}</Text>
            <Text style={[styles.optionLabel, selected === item.id && styles.optionLabelSelected]}>
              {item.label}
            </Text>
            <Text style={[styles.optionTelugu, selected === item.id && styles.optionTeluguSelected]}>
              {item.telugu}
            </Text>
            {selected === item.id && <View style={styles.optionCheckmark}><Text style={styles.checkmarkText}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

// ---------- Step 3: Current Level ----------

function StepLevel({ selected, onSelect }: { selected: Level | null; onSelect: (v: Level) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <Text style={styles.stepEmoji}>📊</Text>
      <Text style={styles.stepTitle}>What's your current English level?</Text>
      <Text style={styles.stepSubtitleTelugu}>మీ ప్రస్తుత ఇంగ్లీష్ స్థాయి?</Text>
      <Text style={styles.stepHint}>Be honest — we'll tailor lessons to your level</Text>

      <View style={styles.optionsList}>
        {LEVELS.map(item => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.listCard, selected === item.id && styles.listCardSelected]}
            activeOpacity={0.75}
          >
            <Text style={styles.listIcon}>{item.icon}</Text>
            <View style={styles.listCardText}>
              <View style={styles.listCardRow}>
                <Text style={[styles.listLabel, selected === item.id && styles.listLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={[styles.listTelugu, selected === item.id && styles.listTeluguSelected]}>
                  {item.telugu}
                </Text>
              </View>
              <Text style={[styles.listSubtitle, selected === item.id && styles.listSubtitleSelected]}>
                {item.subtitle}
              </Text>
            </View>
            {selected === item.id && <Text style={styles.listCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

// ---------- Step 4: Daily Goal ----------

function StepDailyGoal({ selected, onSelect }: { selected: DailyGoal | null; onSelect: (v: DailyGoal) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <Text style={styles.stepEmoji}>⏱️</Text>
      <Text style={styles.stepTitle}>How much time can you practice daily?</Text>
      <Text style={styles.stepSubtitleTelugu}>రోజూ ఎంత సమయం అభ్యాసం చేయగలరు?</Text>
      <Text style={styles.stepHint}>Consistency matters more than duration</Text>

      <View style={styles.optionsList}>
        {DAILY_GOALS.map(item => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[styles.listCard, selected === item.id && styles.listCardSelected]}
            activeOpacity={0.75}
          >
            <Text style={styles.listIcon}>{item.icon}</Text>
            <View style={styles.listCardText}>
              <View style={styles.listCardRow}>
                <Text style={[styles.listLabel, selected === item.id && styles.listLabelSelected]}>
                  {item.label}
                </Text>
                {item.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.listSubtitle, selected === item.id && styles.listSubtitleSelected]}>
                {item.telugu}
              </Text>
            </View>
            {selected === item.id && <Text style={styles.listCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

// ---------- Step 5: Focus Areas ----------

function StepFocusAreas({
  selected,
  onToggle,
}: {
  selected: FocusArea[]
  onToggle: (v: FocusArea) => void
}) {
  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <Text style={styles.stepEmoji}>🎨</Text>
      <Text style={styles.stepTitle}>What do you want to focus on?</Text>
      <Text style={styles.stepSubtitleTelugu}>మీరు దేనిపై దృష్టి పెట్టాలనుకుంటున్నారు?</Text>
      <Text style={styles.stepHint}>Pick as many as you like</Text>

      <View style={styles.focusGrid}>
        {FOCUS_AREAS.map(item => {
          const isSelected = selected.includes(item.id)
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onToggle(item.id)}
              style={[styles.focusCard, isSelected && styles.focusCardSelected]}
              activeOpacity={0.75}
            >
              {isSelected && <View style={styles.focusCheckmark}><Text style={styles.checkmarkText}>✓</Text></View>}
              <Text style={styles.focusIcon}>{item.icon}</Text>
              <Text style={[styles.focusLabel, isSelected && styles.focusLabelSelected]}>{item.label}</Text>
              <Text style={[styles.focusTelugu, isSelected && styles.focusTeluguSelected]}>{item.telugu}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {selected.length > 0 && (
        <Text style={styles.selectionCount}>{selected.length} selected</Text>
      )}
    </ScrollView>
  )
}

// ---------- Step 6: Welcome ----------

function StepWelcome({
  name,
  goal,
  level,
  dailyGoal,
  focusAreas,
}: {
  name: string
  goal: Goal | null
  level: Level | null
  dailyGoal: DailyGoal | null
  focusAreas: FocusArea[]
}) {
  const displayName = name.trim() || 'Learner'
  const goalData = GOALS.find(g => g.id === goal)
  const levelData = LEVELS.find(l => l.id === level)
  const dailyData = DAILY_GOALS.find(d => d.id === dailyGoal)
  const focusData = FOCUS_AREAS.filter(f => focusAreas.includes(f.id))

  return (
    <ScrollView contentContainerStyle={styles.stepContainer}>
      <Text style={styles.welcomeEmoji}>🎉</Text>
      <Text style={styles.welcomeTitle}>Welcome, {displayName}!</Text>
      <Text style={styles.welcomeSubtitle}>
        Based on your goals, we've created a personalized plan for you
      </Text>
      <Text style={styles.welcomeSubtitleTelugu}>మీ లక్ష్యాల ఆధారంగా మేము మీకు అనుగుణమైన ప్రణాళిక రూపొందించాము</Text>

      <View style={styles.planCard}>
        <Text style={styles.planCardTitle}>Your Learning Plan</Text>

        {goalData && (
          <View style={styles.planRow}>
            <Text style={styles.planRowIcon}>{goalData.icon}</Text>
            <View>
              <Text style={styles.planRowLabel}>Goal</Text>
              <Text style={styles.planRowValue}>{goalData.label}</Text>
              <Text style={styles.planRowTelugu}>{goalData.telugu}</Text>
            </View>
          </View>
        )}

        {levelData && (
          <View style={styles.planRow}>
            <Text style={styles.planRowIcon}>{levelData.icon}</Text>
            <View>
              <Text style={styles.planRowLabel}>Starting Level</Text>
              <Text style={styles.planRowValue}>{levelData.label}</Text>
              <Text style={styles.planRowTelugu}>{levelData.telugu}</Text>
            </View>
          </View>
        )}

        {dailyData && (
          <View style={styles.planRow}>
            <Text style={styles.planRowIcon}>{dailyData.icon}</Text>
            <View>
              <Text style={styles.planRowLabel}>Daily Practice</Text>
              <Text style={styles.planRowValue}>{dailyData.label} per day</Text>
              <Text style={styles.planRowTelugu}>{dailyData.telugu}</Text>
            </View>
          </View>
        )}

        {focusData.length > 0 && (
          <View style={styles.planRow}>
            <Text style={styles.planRowIcon}>🎯</Text>
            <View style={styles.planFocusAreaContent}>
              <Text style={styles.planRowLabel}>Focus Areas</Text>
              <View style={styles.planFocusTags}>
                {focusData.map(f => (
                  <View key={f.id} style={styles.planFocusTag}>
                    <Text style={styles.planFocusTagText}>{f.icon} {f.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      <Text style={styles.welcomeReadyText}>You're all set! Let's begin your journey 🌟</Text>
    </ScrollView>
  )
}

// ---------- Styles ----------

const PRIMARY = '#7B61FF'
const PRIMARY_DARK = '#E85D20'
const SECONDARY = '#00D26A'
const WHITE = '#FFFFFF'
const LIGHT_BG = '#FFF8F5'
const TEXT_PRIMARY = '#1A1A1A'
const TEXT_SECONDARY = '#5C4033'
const TEXT_MUTED = '#9E7E6E'
const BORDER = '#F0D9CF'
const SELECTED_BG = '#FFF0E8'

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: WHITE,
  },
  dotCompleted: {
    width: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Content area
  contentWrapper: {
    flex: 1,
  },
  animatedContent: {
    flex: 1,
  },

  // Step shared
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    alignItems: 'center',
  },
  stepEmoji: {
    fontSize: 56,
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 30,
  },
  stepSubtitleTelugu: {
    fontSize: 15,
    color: PRIMARY_DARK,
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '500',
  },
  stepHint: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Name input
  nameInputWrapper: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER,
    backgroundColor: WHITE,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  nameInput: {
    fontSize: 20,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlign: 'center',
  },
  namePreview: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  namePreviewBold: {
    fontWeight: '700',
    color: PRIMARY,
  },

  // Options grid (2-column for goal/focus)
  optionsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  optionCard: {
    width: (width - 72) / 2,
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  optionCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: SELECTED_BG,
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: PRIMARY_DARK,
  },
  optionTelugu: {
    fontSize: 12,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  optionTeluguSelected: {
    color: PRIMARY,
  },
  optionCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: WHITE,
    fontSize: 11,
    fontWeight: '800',
  },

  // Options list (for level & daily goal)
  optionsList: {
    width: '100%',
    gap: 10,
  },
  listCard: {
    width: '100%',
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  listCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: SELECTED_BG,
  },
  listIcon: {
    fontSize: 28,
    marginRight: 14,
    width: 36,
    textAlign: 'center',
  },
  listCardText: {
    flex: 1,
  },
  listCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  listLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  listLabelSelected: {
    color: PRIMARY_DARK,
  },
  listTelugu: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontStyle: 'italic',
  },
  listTeluguSelected: {
    color: PRIMARY,
  },
  listSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  listSubtitleSelected: {
    color: TEXT_SECONDARY,
  },
  listCheck: {
    fontSize: 18,
    color: PRIMARY,
    fontWeight: '800',
    marginLeft: 8,
  },
  recommendedBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Focus areas grid
  focusGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 8,
  },
  focusCard: {
    width: (width - 82) / 3,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BORDER,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  focusCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: SELECTED_BG,
  },
  focusCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  focusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 2,
  },
  focusLabelSelected: {
    color: PRIMARY_DARK,
  },
  focusTelugu: {
    fontSize: 10,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  focusTeluguSelected: {
    color: PRIMARY,
  },
  selectionCount: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    marginTop: 4,
  },

  // Welcome step
  welcomeEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  welcomeSubtitleTelugu: {
    fontSize: 13,
    color: PRIMARY_DARK,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  planCard: {
    width: '100%',
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    padding: 20,
    elevation: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    marginBottom: 20,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 12,
  },
  planRowIcon: {
    fontSize: 24,
    width: 30,
    textAlign: 'center',
    marginTop: 2,
  },
  planRowLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 2,
  },
  planRowValue: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  planRowTelugu: {
    fontSize: 12,
    color: PRIMARY_DARK,
    marginTop: 1,
  },
  planFocusAreaContent: {
    flex: 1,
  },
  planFocusTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  planFocusTag: {
    backgroundColor: SELECTED_BG,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  planFocusTagText: {
    fontSize: 12,
    color: PRIMARY_DARK,
    fontWeight: '600',
  },
  welcomeReadyText: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Navigation bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  navLeft: {
    minWidth: 80,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navPlaceholder: {
    width: 80,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  backBtnText: {
    fontSize: 15,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  skipBtnText: {
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: '500',
  },
  nextBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 30,
    elevation: 3,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  nextBtnDisabled: {
    backgroundColor: '#E8C4B0',
    elevation: 0,
    shadowOpacity: 0,
  },
  nextBtnText: {
    color: WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  startBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  startBtnGradient: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startBtnText: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
})
