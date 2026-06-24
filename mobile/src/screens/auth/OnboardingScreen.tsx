import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Animated, useWindowDimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme } from '../../theme'

import { Bot, Layers, Zap, Mic } from 'lucide-react-native'

const slides = [
  {
    id: '1',
    icon: Bot,
    title: 'Your AI English Tutor',
    titleTelugu: 'మీ వ్యక్తిగత AI ట్యూటర్',
    description: 'Practice speaking with Nova, your intelligent AI companion. Get real-time feedback on pronunciation.',
    descriptionTelugu: 'మన AI ట్యూటర్ నోవాతో మాట్లాడటం అభ్యాసం చేయండి.',
    glowColor: Theme.colors.secondary,
  },
  {
    id: '2',
    icon: Layers,
    title: '100+ Lessons in Telugu',
    titleTelugu: '100+ తెలుగు పాఠాలు',
    description: 'Learn effectively with concepts explained in Telugu. From daily conversations to job interviews.',
    descriptionTelugu: 'రోజువారీ సంభాషణల నుండి జాబ్ ఇంటర్వ్యూ వరకు అన్నీ తెలుగులో.',
    glowColor: '#9D4EDD',
  },
  {
    id: '3',
    icon: Zap,
    title: 'Gamified Learning',
    titleTelugu: 'ఆడుతూ నేర్చుకోండి',
    description: 'Stay motivated with streaks, futuristic achievements, and weekly leaderboards.',
    descriptionTelugu: 'స్ట్రీక్స్, అచీవ్‌మెంట్స్ మరియు లీడర్‌బోర్డ్‌తో ప్రేరణ పొందండి.',
    glowColor: Theme.colors.accent,
  },
  {
    id: '4',
    icon: Mic,
    title: 'AI Roleplay Scenarios',
    titleTelugu: 'AI రోల్‌ప్లే అభ్యాసం',
    description: 'Immerse yourself in real scenarios: interviews, shopping, hospitals, and restaurants.',
    descriptionTelugu: 'ఇంటర్వ్యూలు, షాపింగ్, ఆసుపత్రులు, రెస్టారెంట్లు - అన్నీ అభ్యాసం చేయండి.',
    glowColor: '#00E676',
  },
]

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions()
  const [activeIndex, setActiveIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const scrollX = useRef(new Animated.Value(0)).current

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('onboarded', 'true')
    router.replace('/login')
  }

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      const nextIndex = activeIndex + 1
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true })
      setActiveIndex(nextIndex)
    } else {
      handleGetStarted()
    }
  }

  const getItemLayout = (_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  })

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const xOffset = event.nativeEvent.contentOffset.x
        const index = Math.round(xOffset / width)
        if (index >= 0 && index < slides.length) {
          setActiveIndex(index)
        }
      }
    }
  )

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        renderItem={({ item, index }) => {
          // Dynamic glow effect based on scroll position
          const glowScale = scrollX.interpolate({
            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
            outputRange: [0.8, 1.2, 0.8],
            extrapolate: 'clamp'
          })
          const glowOpacity = scrollX.interpolate({
            inputRange: [(index - 1) * width, index * width, (index + 1) * width],
            outputRange: [0, 0.4, 0],
            extrapolate: 'clamp'
          })

          const IconComponent = item.icon
          return (
            <LinearGradient colors={[Theme.colors.background, Theme.colors.primary]} style={[styles.slide, { width, height }]}>
              <Animated.View style={[
                styles.glowBackground, 
                { width: width * 0.9, height: width * 0.9, borderRadius: width * 0.45, backgroundColor: item.glowColor, transform: [{ scale: glowScale }], opacity: glowOpacity }
              ]} />
              
              <View style={styles.slideContent}>
                <View style={[styles.iconContainer, { shadowColor: item.glowColor }]}>
                  <IconComponent size={64} color={Theme.colors.text} />
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.titleTelugu}>{item.titleTelugu}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.descriptionTelugu}>{item.descriptionTelugu}</Text>
              </View>
            </LinearGradient>
          )
        }}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [8, 32, 8],
                  extrapolate: 'clamp',
                }),
                backgroundColor: scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [Theme.colors.surface, Theme.colors.secondary, Theme.colors.surface],
                  extrapolate: 'clamp',
                }),
                shadowOpacity: scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [0, 0.8, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleGetStarted} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleNext} style={styles.nextButton} activeOpacity={0.8}>
          <LinearGradient 
            colors={[Theme.colors.secondary, '#0096FF']} 
            start={{x: 0, y: 0}} end={{x: 1, y: 1}}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextText}>
              {activeIndex === slides.length - 1 ? "Initialize 🚀" : "Next →"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  slide: { paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
  glowBackground: {
    position: 'absolute',
    top: '20%',
    filter: 'blur(50px)',
  },
  slideContent: { alignItems: 'center', paddingBottom: 100, zIndex: 10 },
  iconContainer: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
    shadowOpacity: 0.5,
  },
  title: { fontSize: 28, fontWeight: '800', color: Theme.colors.text, textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },
  titleTelugu: { fontSize: 18, color: Theme.colors.secondary, textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  description: { fontSize: 16, color: Theme.colors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  descriptionTelugu: { fontSize: 14, color: 'rgba(160, 179, 214, 0.7)', textAlign: 'center', lineHeight: 22 },
  dotsContainer: { position: 'absolute', bottom: 130, alignSelf: 'center', flexDirection: 'row', gap: 8 },
  dot: { 
    height: 8, borderRadius: 4, 
    shadowColor: Theme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    elevation: 4,
  },
  buttonRow: {
    position: 'absolute', bottom: 50, left: 32, right: 32,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  skipButton: { padding: 12 },
  skipText: { color: Theme.colors.textSecondary, fontSize: 16, fontWeight: '600' },
  nextButton: {
    borderRadius: 30,
    shadowColor: Theme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  nextButtonGradient: {
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 30,
  },
  nextText: { color: '#000000', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
})
