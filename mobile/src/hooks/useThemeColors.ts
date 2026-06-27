import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themeConfig'

export function useThemeColors(): ThemeColors {
  return useTheme().theme.colors
}
