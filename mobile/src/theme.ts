export const Theme = {
  colors: {
    primary: '#0A1F44',       // Deep Blue
    secondary: '#00C2FF',     // Electric Blue
    accent: '#FFB800',        // Gold/Orange
    background: '#020914',    // Dark Navy Gradient base
    surface: '#122B59',       // Slightly lighter blue for cards/surface
    text: '#FFFFFF',          // White
    textSecondary: '#A0B3D6', // Soft Gray/Blue
    success: '#00E676',
    error: '#FF3B30',
    border: '#1E3A70',
    neonGlow: 'rgba(0, 194, 255, 0.4)',
  },
  typography: {
    h1: { fontSize: 32, fontWeight: 'bold' as const, color: '#FFFFFF' },
    h2: { fontSize: 24, fontWeight: 'bold' as const, color: '#FFFFFF' },
    h3: { fontSize: 20, fontWeight: '600' as const, color: '#FFFFFF' },
    body: { fontSize: 16, color: '#A0B3D6' },
    caption: { fontSize: 14, color: '#A0B3D6' },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 16,
    lg: 24,
    round: 9999,
  },
  shadows: {
    neon: {
      shadowColor: '#00C2FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 10,
    },
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }
  }
}
