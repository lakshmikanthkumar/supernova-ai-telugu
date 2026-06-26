import React, { useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { fetchCategories, fetchLessonsByCategory } from '../../store/slices/lessonsSlice'
import TranslationToggle from '../../components/common/TranslationToggle'
import type { Lesson } from '../../types'
import { Colors } from '../../constants/theme'

interface CategoryScreenProps {
  id: string
}

export default function CategoryScreen({ id }: CategoryScreenProps) {
  const dispatch = useAppDispatch()
  const { categories, lessonsByCategory, loading } = useAppSelector(s => s.lessons)
  const { showTeluguTranslations } = useAppSelector(s => s.ui)

  const category = categories.find(c => c.id === id)
  const lessons = lessonsByCategory[id] || []

  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchCategories())
    }
    dispatch(fetchLessonsByCategory(id))
  }, [id, categories.length, dispatch])

  const renderLessonItem = ({ item }: { item: Lesson }) => {
    const isCompleted = item.user_progress?.status === 'completed'
    const isInProgress = item.user_progress?.status === 'in_progress'

    return (
      <TouchableOpacity
        style={styles.lessonCard}
        onPress={() => router.push({ pathname: '/lessons/[id]', params: { id: item.id } })}
      >
        <View style={[styles.accentBar, { backgroundColor: category?.color_hex || Colors.primary }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.lessonTitle}>{item.title}</Text>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Completed ✓</Text>
              </View>
            )}
            {isInProgress && (
              <View style={styles.inProgressBadge}>
                <Text style={styles.inProgressText}>In Progress ⏳</Text>
              </View>
            )}
          </View>

          {showTeluguTranslations && (
            <Text style={styles.lessonTitleTelugu}>{item.title_telugu}</Text>
          )}

          <Text style={styles.lessonDesc} numberOfLines={2}>
            {showTeluguTranslations ? item.description_telugu : item.description}
          </Text>

          <View style={styles.cardMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaItem}>⚡ {item.xp_reward} XP</Text>
              <Text style={styles.metaItem}>⏱ {item.estimated_minutes} min</Text>
              <Text style={styles.metaItem}>{'⭐'.repeat(item.difficulty_level)}</Text>
            </View>
            {item.is_premium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>🔒 Premium</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && lessons.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading topics...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[category?.color_hex || Colors.primary, (category?.color_hex || Colors.primary) + '99']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/home')}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.categoryName}>
            {showTeluguTranslations ? category?.name_telugu : category?.name}
          </Text>
          <Text style={styles.categoryDesc}>
            {showTeluguTranslations ? category?.description_telugu : category?.description}
          </Text>
        </View>
        <TranslationToggle />
      </LinearGradient>

      {/* Lessons List */}
      <FlatList
        data={lessons}
        keyExtractor={(item) => item.id}
        renderItem={renderLessonItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No lessons available in this category yet.</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 64 : 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  backBtnText: { color: 'white', fontSize: 20, fontWeight: '800' },
  headerContent: { flex: 1, marginRight: 12 },
  categoryName: { fontSize: 22, fontWeight: '800', color: 'white' },
  categoryDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 18 },
  listContent: { paddingVertical: 16 },
  lessonCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  accentBar: { width: 6 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lessonTitle: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1, marginRight: 8 },
  completedBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  completedText: { color: '#065F46', fontSize: 11, fontWeight: '700' },
  inProgressBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  inProgressText: { color: '#92400E', fontSize: 11, fontWeight: '700' },
  lessonTitleTelugu: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  lessonDesc: { fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  metaRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  metaItem: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  premiumBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  premiumText: { color: '#991B1B', fontSize: 11, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 12, fontSize: 16, color: Colors.primary, fontWeight: '600' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center', fontWeight: '500' },
})
