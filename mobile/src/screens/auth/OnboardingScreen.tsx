import React, { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated, ViewToken,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width, height } = Dimensions.get('window')

const slides = [
  {
    id: '1',
    emoji: '🎤',
    title: 'Speak English Confidently',
    titleTelugu: 'ఆత్మవిశ్వాసంతో ఇంగ్లీష్ మాట్లాడండి',
    description: 'Practice speaking with our AI tutor Nova. Get real-time pronunciation feedback.',
    descriptionTelugu: 'మన AI ట్యూటర్ నోవాతో మాట్లాడటం అభ్యాసం చేయండి.',
    gradient: ['#4F46E5', '#7C3AED'],
  },
  {
    id: '2',
    emoji: '📚',
    title: '100+ Lessons in Telugu',
    titleTelugu: '100+ తెలుగు పాఠాలు',
    description: 'All lessons explained in Telugu. From daily conversations to job interviews.',
    descriptionTelugu: 'రోజువారీ సంభాషణల నుండి జాబ్ ఇంటర్వ్యూ వరకు అన్నీ తెలుగులో.',
    gradient: ['#0891B2', '#0E7490'],
  },
  {
    id: '3',
    emoji: '🏆',
    title: 'Earn XP & Badges',
    titleTelugu: 'XP & బ్యాడ్జ్‌లు సంపాదించండి',
    description: 'Stay motivated with streaks, achievements, and weekly leaderboards.',
    descriptionTelugu: 'స్ట్రీక్స్, అచీవ్‌మెంట్స్ మరియు లీడర్‌బోర్డ్‌తో ప్రేరణ పొందండి.',
    gradient: ['#D97706', '#B45309'],
  },
  {
    id: '4',
    emoji: '🎭',
    title: 'AI Roleplay Practice',
    titleTelugu: 'AI రోల్‌ప్లే అభ్యాసం',
    description: 'Practice real scenarios: interviews, shopping, hospitals, restaurants.',
    descriptionTelugu: 'ఇంటర్వ్యూలు, షాపింగ్, ఆసుపత్రులు, రెస్టారెంట్లు - అన్నీ అభ్యాసం చేయండి.',
    gradient: ['#059669', '#047857'],
  },
]

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const scrollX = useRef(new Animated.Value(0)).current

  const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) setActiveIndex(viewableItems[0].index || 0)
  }).current

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('onboarded', 'true')
    router.replace('/login')
  }

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 })
    } else {
      handleGetStarted()
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.gradient as [string, string]} style={styles.slide}>
            <View style={styles.slideContent}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.titleTelugu}>{item.titleTelugu}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.descriptionTelugu}>{item.descriptionTelugu}</Text>
            </View>
          </LinearGradient>
        )}
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
                  outputRange: [8, 24, 8],
                  extrapolate: 'clamp',
                }),
                opacity: scrollX.interpolate({
                  inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                  outputRange: [0.4, 1, 0.4],
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
        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <Text style={styles.nextText}>
            {activeIndex === slides.length - 1 ? "Get Started 🚀" : "Next →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1F2937' },
  slide: { width, height, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
  slideContent: { alignItems: 'center', paddingBottom: 100 },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: 'white', textAlign: 'center', marginBottom: 8 },
  titleTelugu: { fontSize: 18, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20 },
  description: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  descriptionTelugu: { fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 22 },
  dotsContainer: { position: 'absolute', bottom: 120, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4, backgroundColor: 'white' },
  buttonRow: {
    position: 'absolute', bottom: 50, left: 32, right: 32,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  skipButton: { padding: 12 },
  skipText: { color: 'rgba(255,255,255,0.6)', fontSize: 16 },
  nextButton: {
    backgroundColor: 'white', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 30, elevation: 4,
  },
  nextText: { color: '#4F46E5', fontWeight: '700', fontSize: 16 },
})
