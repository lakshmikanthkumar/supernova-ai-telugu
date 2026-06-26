export const Colors = {
  primary: '#FF6B35',      // Warm orange
  primaryDark: '#E85A2B',
  secondary: '#0047AB',    // Deep blue
  secondaryLight: '#1A5DC8',
  accent: '#F7931E',       // Gold
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  background: '#FFF8F0',   // Warm white
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  textLight: '#9CA3AF',
  border: '#E8E0D8',
  gradient: ['#FF6B35', '#F7931E'] as [string, string],
  gradientSecondary: ['#0047AB', '#1A5DC8'] as [string, string],
  gradientDark: ['#2D3436', '#EEF2FF'] as [string, string],
  indigo: '#4F46E5',   // Keep for backwards compat
  purple: '#7C3AED',   // Keep for backwards compat
}

export const Typography = {
  heading1: { fontSize: 28, fontWeight: '800' as const },
  heading2: { fontSize: 22, fontWeight: '700' as const },
  heading3: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 15, fontWeight: '700' as const },
}

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
}

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, round: 50,
}

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  heavy: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
}
