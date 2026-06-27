import { useMemo } from 'react'
import { StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import type { Theme } from '../theme/themeConfig'

export function useThemeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T
): T {
  const { theme } = useTheme()
  return useMemo(() => StyleSheet.create(factory(theme)), [theme])
}
