import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'
import type { ThemeMode } from '../../theme/themeConfig'

interface ThemeOption {
  mode: ThemeMode
  label: string
  description: string
  icon: string
}

const OPTIONS: ThemeOption[] = [
  { mode: 'light', label: 'Light', description: 'Bright and clean', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', description: 'Easy on the eyes', icon: 'moon-outline' },
  { mode: 'system', label: 'System', description: 'Follows your device setting', icon: 'phone-portrait-outline' },
]

export const ThemeSettingsScreen: React.FC = () => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme()
  const c = theme.colors
  const s = theme.spacing
  const r = theme.borderRadius

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={{ padding: s.md }}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Appearance</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Choose how EnglishMitraAI looks to you.
        </Text>

        {/* Option cards */}
        <View style={{ marginTop: s.lg, gap: s.sm }}>
          {OPTIONS.map((opt) => {
            const selected = themeMode === opt.mode
            return (
              <TouchableOpacity
                key={opt.mode}
                onPress={() => setThemeMode(opt.mode)}
                activeOpacity={0.8}
                style={[
                  styles.card,
                  {
                    backgroundColor: c.surface,
                    borderRadius: r.lg,
                    borderWidth: 2,
                    borderColor: selected ? c.primary : c.border,
                    padding: s.md,
                  },
                ]}
              >
                <View style={[
                  styles.iconBox,
                  { backgroundColor: selected ? c.primaryLight : c.surfaceElevated, borderRadius: r.md },
                ]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={26}
                    color={selected ? c.primary : c.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: s.md }}>
                  <Text style={[styles.optLabel, { color: c.textPrimary }]}>{opt.label}</Text>
                  <Text style={[styles.optDesc, { color: c.textSecondary }]}>{opt.description}</Text>
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={24} color={c.primary} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Live preview */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary, marginTop: s.xl }]}>
          PREVIEW
        </Text>
        <View style={[
          styles.preview,
          { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border },
        ]}>
          <View style={[styles.previewHeader, { backgroundColor: c.primary, borderRadius: r.md }]}>
            <Text style={[styles.previewHeaderText, { color: c.textOnPrimary }]}>
              EnglishMitraAI
            </Text>
          </View>
          <View style={{ padding: s.md, gap: s.sm }}>
            <View style={[styles.previewLine, { backgroundColor: c.skeleton, width: '70%' }]} />
            <View style={[styles.previewLine, { backgroundColor: c.skeleton, width: '50%' }]} />
            <View style={[
              styles.previewChip,
              { backgroundColor: c.primaryLight, borderRadius: r.full },
            ]}>
              <Text style={{ color: c.primary, fontSize: 12, fontWeight: '600' }}>
                Practice now
              </Text>
            </View>
          </View>
        </View>

        {/* Current mode info */}
        <View style={[
          styles.infoBox,
          { backgroundColor: c.primaryLight, borderRadius: r.md, marginTop: s.lg, padding: s.md },
        ]}>
          <Ionicons name="information-circle-outline" size={18} color={c.primary} />
          <Text style={[styles.infoText, { color: c.primary }]}>
            {isDark ? 'Dark mode is active' : 'Light mode is active'}
            {themeMode === 'system' ? ' (following system setting)' : ''}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 6, lineHeight: 22 },
  card: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  optLabel: { fontSize: 16, fontWeight: '600' },
  optDesc: { fontSize: 13, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 10 },
  preview: { borderWidth: 1, overflow: 'hidden' },
  previewHeader: { margin: 12, padding: 14, alignItems: 'center' },
  previewHeaderText: { fontSize: 16, fontWeight: '700' },
  previewLine: { height: 12, borderRadius: 6 },
  previewChip: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, fontWeight: '500', flex: 1 },
})
