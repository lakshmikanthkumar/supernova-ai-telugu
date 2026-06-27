export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '')
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean
  const num = parseInt(full, 16)
  if (isNaN(num)) return null
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function adjustBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const clamp = (v: number) => Math.min(255, Math.max(0, v))
  const r = clamp(rgb.r + amount).toString(16).padStart(2, '0')
  const g = clamp(rgb.g + amount).toString(16).padStart(2, '0')
  const b = clamp(rgb.b + amount).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex)
  if (!rgb) return true
  // Relative luminance (WCAG)
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
  return luminance > 128
}

export function getContrastingColor(hex: string, light = '#FFFFFF', dark = '#1A1A2E'): string {
  return isLightColor(hex) ? dark : light
}

export function hexWithOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}
