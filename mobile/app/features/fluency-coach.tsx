/**
 * /features/fluency-coach
 *
 * Entry point for the Fluency Coach story selection.
 * On deep link: englishmitraai://fluency-coach
 * Accepts optional param `category` to pre-filter.
 */
import React, { useEffect } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../../src/store'
import { setCategory } from '../../src/features/fluencyCoach/redux/fluencyCoachSlice'
import type { StoryCategory } from '../../src/features/fluencyCoach/types'
import StorySelectionScreen from '../../src/features/fluencyCoach/screens/StorySelectionScreen'

const VALID_CATEGORIES = new Set([
  'beginner', 'daily_conversations', 'office_communication',
  'interviews', 'public_speaking', 'motivational',
  'news_reading', 'pronunciation_practice',
])

export default function FluencyCoachRoute() {
  const dispatch = useDispatch<AppDispatch>()
  const { category } = useLocalSearchParams<{ category?: string }>()

  // Apply deep-linked category filter once on mount
  useEffect(() => {
    if (category && VALID_CATEGORIES.has(category)) {
      dispatch(setCategory(category as StoryCategory))
    }
  }, [category, dispatch])

  return <StorySelectionScreen />
}
