import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '../store'
import { loadTheme, saveTheme } from '../store/slices/uiSlice'
import { getTheme, Theme, ThemeMode } from '../theme/themeConfig'

interface ThemeContextValue {
  theme: Theme
  themeMode: ThemeMode
  isDark: boolean
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()
  const systemScheme = useColorScheme()
  const themeMode = useSelector((s: RootState) => s.ui.themeMode)

  // Load saved theme on mount
  useEffect(() => {
    dispatch(loadTheme())
  }, [dispatch])

  const resolvedMode = useMemo((): 'light' | 'dark' => {
    if (themeMode === 'system') return systemScheme === 'dark' ? 'dark' : 'light'
    return themeMode as 'light' | 'dark'
  }, [themeMode, systemScheme])

  const theme = useMemo(() => getTheme(resolvedMode), [resolvedMode])

  function setThemeMode(mode: ThemeMode) {
    dispatch(saveTheme(mode))
  }

  function toggleTheme() {
    const next = resolvedMode === 'dark' ? 'light' : 'dark'
    dispatch(saveTheme(next))
  }

  const value = useMemo(
    () => ({ theme, themeMode, isDark: resolvedMode === 'dark', setThemeMode, toggleTheme }),
    [theme, themeMode, resolvedMode]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
