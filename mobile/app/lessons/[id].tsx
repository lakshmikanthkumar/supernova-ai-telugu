import { Redirect, useLocalSearchParams } from 'expo-router'
import React from 'react'
import CategoryScreen from '../../src/screens/lessons/CategoryScreen'
import LessonScreen from '../../src/screens/lessons/LessonScreen'

export default function LessonOrCategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  if (id && id.startsWith('cat-')) {
    return <CategoryScreen id={id} />
  }

  const featureRoutes: Record<string, string> = {
    'daily-greetings': '/features/daily-greetings',
    'self-introduction': '/features/self-introduction',
    'office-conversations': '/features/office-conversations',
    'email-writing': '/features/email-writing',
    'interview-prep': '/features/interview-training',
    'public-speaking': '/features/public-speaking',
  }

  if (id && featureRoutes[id]) {
    return <Redirect href={featureRoutes[id] as any} />
  }

  return <LessonScreen />
}

