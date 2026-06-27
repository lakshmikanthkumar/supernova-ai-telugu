import { useTheme } from '../context/ThemeContext'
import type { ThemeSpacing } from '../theme/themeConfig'

export function useThemeSpacing(): ThemeSpacing {
  return useTheme().theme.spacing
}
