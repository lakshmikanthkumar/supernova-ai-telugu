import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import CategoryScreen from '../../src/screens/lessons/CategoryScreen'
import LessonScreen from '../../src/screens/lessons/LessonScreen'

export default function LessonOrCategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (id && id.startsWith('cat-')) {
    return <CategoryScreen id={id} />
  }

  return <LessonScreen />
}
