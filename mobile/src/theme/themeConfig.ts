export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeColors {
  // Brand
  primary: string
  primaryLight: string
  primaryDark: string
  secondary: string
  accent: string

  // Backgrounds
  background: string
  surface: string
  surfaceElevated: string
  surfaceOverlay: string

  // Text
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textInverse: string
  textOnPrimary: string

  // Borders
  border: string
  borderLight: string
  divider: string

  // Semantic
  success: string
  successLight: string
  error: string
  errorLight: string
  warning: string
  warningLight: string
  info: string
  infoLight: string

  // Interactive
  inputBackground: string
  inputBorder: string
  inputFocused: string
  placeholder: string

  // Misc
  overlay: string
  shadow: string
  skeleton: string
}

export interface ThemeTypography {
  fontSizeXs: number
  fontSizeSm: number
  fontSizeMd: number
  fontSizeLg: number
  fontSizeXl: number
  fontSize2xl: number
  fontSize3xl: number

  fontWeightRegular: '400'
  fontWeightMedium: '500'
  fontWeightSemibold: '600'
  fontWeightBold: '700'

  lineHeightTight: number
  lineHeightNormal: number
  lineHeightRelaxed: number
}

export interface ThemeSpacing {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  xxl: number
  xxxl: number
}

export interface ThemeBorderRadius {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  full: number
}

export interface Theme {
  mode: 'light' | 'dark'
  colors: ThemeColors
  typography: ThemeTypography
  spacing: ThemeSpacing
  borderRadius: ThemeBorderRadius
}

// ─── Palettes ─────────────────────────────────────────────────────────────────

const lightColors: ThemeColors = {
  primary: '#7B61FF',
  primaryLight: '#EDE9FF',
  primaryDark: '#5B41DF',
  secondary: '#FF6B6B',
  accent: '#FFD93D',

  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceOverlay: 'rgba(255,255,255,0.95)',

  textPrimary: '#1A1A2E',
  textSecondary: '#636E72',
  textTertiary: '#B2BEC3',
  textInverse: '#FFFFFF',
  textOnPrimary: '#FFFFFF',

  border: '#E5E7EB',
  borderLight: '#F0F0F0',
  divider: '#F3F4F6',

  success: '#00B894',
  successLight: '#E6F9F6',
  error: '#E17055',
  errorLight: '#FEF0ED',
  warning: '#FDCB6E',
  warningLight: '#FEF9EC',
  info: '#74B9FF',
  infoLight: '#EEF5FF',

  inputBackground: '#F8F9FA',
  inputBorder: '#E5E7EB',
  inputFocused: '#7B61FF',
  placeholder: '#B2BEC3',

  overlay: 'rgba(0,0,0,0.5)',
  shadow: '#000000',
  skeleton: '#E5E7EB',
}

const darkColors: ThemeColors = {
  primary: '#9B81FF',
  primaryLight: '#2A2150',
  primaryDark: '#7B61FF',
  secondary: '#FF8E8E',
  accent: '#FFE066',

  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#252540',
  surfaceOverlay: 'rgba(26,26,46,0.97)',

  textPrimary: '#F1F2F6',
  textSecondary: '#A0A3B1',
  textTertiary: '#5F6080',
  textInverse: '#1A1A2E',
  textOnPrimary: '#FFFFFF',

  border: '#2D2D4A',
  borderLight: '#252540',
  divider: '#1E1E35',

  success: '#00CFA8',
  successLight: '#0D2E28',
  error: '#FF7675',
  errorLight: '#2E1512',
  warning: '#FDD87E',
  warningLight: '#2E2210',
  info: '#89CCFF',
  infoLight: '#0D1E33',

  inputBackground: '#1E1E35',
  inputBorder: '#2D2D4A',
  inputFocused: '#9B81FF',
  placeholder: '#5F6080',

  overlay: 'rgba(0,0,0,0.7)',
  shadow: '#000000',
  skeleton: '#252540',
}

const typography: ThemeTypography = {
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeMd: 15,
  fontSizeLg: 17,
  fontSizeXl: 20,
  fontSize2xl: 24,
  fontSize3xl: 30,

  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',

  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
}

const spacing: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
}

const borderRadius: ThemeBorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
}

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
}

export function getTheme(mode: 'light' | 'dark'): Theme {
  return mode === 'dark' ? darkTheme : lightTheme
}
