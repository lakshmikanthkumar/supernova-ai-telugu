// ============================================================
// Fluency Coach — Story Selection Screen
// Category filter → Difficulty filter → Story cards list
// ============================================================

import React, { useEffect, useCallback, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, RefreshControl, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { BookOpen, ChevronRight, Clock, Star, ArrowLeft } from 'lucide-react-native'
import type { AppDispatch, RootState } from '../../../store'
import type { Story, StoryCategory, DifficultyLevel } from '../types'
import {
  fetchStories, setCategory, setDifficulty, selectStory,
  selectFilteredStories,
} from '../redux/fluencyCoachSlice'
import {
  CATEGORY_META, DIFFICULTY_LABELS, DIFFICULTY_COLORS,
} from '../constants'

// ── STORY CARD ────────────────────────────────────────────────

const StoryCard = React.memo(({ item, onPress }: { item: Story; onPress: () => void }) => {
  const diffColor = DIFFICULTY_COLORS[item.difficulty]
  const progress  = item.user_progress?.completion_percent ?? 0

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${DIFFICULTY_LABELS[item.difficulty].en} difficulty. ${Math.round(item.estimated_time / 60)} minute read. ${progress > 0 ? `${progress}% completed.` : 'Not started.'}`}
    >
      {/* Difficulty badge */}
      <View style={[styles.diffBadge, { backgroundColor: diffColor }]}>
        <Text style={styles.diffBadgeText}>{DIFFICULTY_LABELS[item.difficulty].en}</Text>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.cardPreview} numberOfLines={2}>{item.preview}</Text>

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Clock size={13} color="#9CA3AF" />
          <Text style={styles.metaText}>{Math.round(item.estimated_time / 60)} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Star size={13} color="#F59E0B" />
          <Text style={styles.metaText}>{item.xp_reward} XP</Text>
        </View>
        <View style={styles.metaItem}>
          <BookOpen size={13} color="#9CA3AF" />
          <Text style={styles.metaText}>{item.word_count} words</Text>
        </View>
      </View>

      {/* Progress bar */}
      {progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% done</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.startText}>{progress > 0 ? 'Continue Reading' : 'Start Reading'}</Text>
        <ChevronRight size={16} color="#7B61FF" />
      </View>
    </TouchableOpacity>
  )
})
StoryCard.displayName = 'StoryCard'

// ── SCREEN ────────────────────────────────────────────────────

export default function StorySelectionScreen() {
  const dispatch    = useDispatch<AppDispatch>()
  const loading     = useSelector((s: RootState) => s.fluencyCoach.storiesLoading)
  const error       = useSelector((s: RootState) => s.fluencyCoach.storiesError)
  const stories     = useSelector(selectFilteredStories)
  const selCategory = useSelector((s: RootState) => s.fluencyCoach.selectedCategory)
  const selDiff     = useSelector((s: RootState) => s.fluencyCoach.selectedDifficulty)

  useEffect(() => {
    dispatch(fetchStories())
  }, [dispatch])

  const handleStoryPress = useCallback((story: Story) => {
    dispatch(selectStory(story))
    router.push('/features/fluency-reader')
  }, [dispatch])

  const handleRefresh = useCallback(() => {
    dispatch(fetchStories())
  }, [dispatch])

  const renderStory = useCallback(({ item }: { item: Story }) => (
    <StoryCard item={item} onPress={() => handleStoryPress(item)} />
  ), [handleStoryPress])

  const keyExtractor = useCallback((item: Story) => item.id, [])

  const ListHeader = useMemo(() => (
    <View>
      {/* Category horizontal scroll */}
      <Text style={styles.sectionLabel}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <TouchableOpacity
          style={[styles.chip, selCategory === 'all' && styles.chipActive]}
          onPress={() => dispatch(setCategory('all'))}
          accessibilityRole="button"
          accessibilityState={{ selected: selCategory === 'all' }}
        >
          <Text style={[styles.chipText, selCategory === 'all' && styles.chipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {CATEGORY_META.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, selCategory === cat.id && styles.chipActive, { borderColor: cat.color }]}
            onPress={() => dispatch(setCategory(cat.id as StoryCategory))}
            accessibilityRole="button"
            accessibilityState={{ selected: selCategory === cat.id }}
            accessibilityLabel={`${cat.label} category`}
          >
            <Text style={styles.chipEmoji}>{cat.icon}</Text>
            <Text style={[styles.chipText, selCategory === cat.id && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Difficulty filter */}
      <Text style={styles.sectionLabel}>Difficulty</Text>
      <View style={styles.diffRow}>
        {(['all', 'easy', 'medium', 'hard'] as const).map(d => {
          const isActive = selDiff === d
          const color = d === 'all' ? '#7B61FF' : DIFFICULTY_COLORS[d]
          return (
            <TouchableOpacity
              key={d}
              style={[styles.diffPill, isActive && { backgroundColor: color }]}
              onPress={() => dispatch(setDifficulty(d as DifficultyLevel | 'all'))}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.diffPillText, isActive && styles.diffPillTextActive]}>
                {d === 'all' ? 'All' : DIFFICULTY_LABELS[d].en}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={styles.storiesCount}>
        {stories.length} {stories.length === 1 ? 'story' : 'stories'}
      </Text>
    </View>
  ), [selCategory, selDiff, stories.length, dispatch])

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <LinearGradient colors={['#7B61FF', '#5A42F5']} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📖 Fluency Coach</Text>
          <Text style={styles.headerSubtitle}>Read aloud. Improve every day.</Text>
        </View>
      </LinearGradient>

      {/* Error banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ Using offline stories. {error}</Text>
        </View>
      )}

      {loading && !stories.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B61FF" />
          <Text style={styles.loadingText}>Loading stories...</Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          renderItem={renderStory}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              colors={['#7B61FF']}
              tintColor="#7B61FF"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>No stories found for these filters.</Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  dispatch(setCategory('all'))
                  dispatch(setDifficulty('all'))
                }}
              >
                <Text style={styles.resetBtnText}>Show All Stories</Text>
              </TouchableOpacity>
            </View>
          }
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 8, paddingBottom: 20, paddingHorizontal: 16,
  },
  backBtn:   { padding: 4, marginRight: 12 },
  headerCenter: { flex: 1 },
  headerTitle:    { color: 'white', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  errorBanner:  { backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 8 },
  errorText:    { color: '#E65100', fontSize: 12, fontWeight: '600' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:      { color: '#6B7280', fontSize: 14 },

  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 20, marginBottom: 10 },

  chipRow:  { gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  chipActive:     { backgroundColor: '#7B61FF', borderColor: '#7B61FF' },
  chipEmoji:      { fontSize: 14 },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: 'white' },

  diffRow: { flexDirection: 'row', gap: 8 },
  diffPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  diffPillText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  diffPillTextActive: { color: 'white' },

  storiesCount: { fontSize: 12, color: '#9CA3AF', marginTop: 16, marginBottom: 8 },

  card: {
    backgroundColor: 'white', borderRadius: 16,
    padding: 16, marginVertical: 6,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  diffBadge: {
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  diffBadgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardPreview: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 10 },
  cardMeta:    { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  progressTrack: { flex: 1, height: 4, backgroundColor: '#F3F4F6', borderRadius: 2 },
  progressFill:  { height: 4, backgroundColor: '#7B61FF', borderRadius: 2 },
  progressText:  { fontSize: 11, color: '#7B61FF', fontWeight: '600' },

  cardFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  startText:   { fontSize: 13, fontWeight: '700', color: '#7B61FF' },

  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:  { fontSize: 48 },
  emptyText:  { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  resetBtn: {
    backgroundColor: '#7B61FF', borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginTop: 8,
  },
  resetBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
})
