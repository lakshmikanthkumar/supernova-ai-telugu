import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { toggleTranslations } from '../../store/slices/uiSlice'

export default function TranslationToggle() {
  const dispatch = useAppDispatch()
  const { showTeluguTranslations } = useAppSelector(s => s.ui)

  return (
    <TouchableOpacity style={styles.btn} onPress={() => dispatch(toggleTranslations())}>
      <Text style={styles.text}>
        {showTeluguTranslations ? '🇮🇳 తెలుగు ON' : '🇬🇧 Telugu OFF'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: { color: 'white', fontSize: 13, fontWeight: '600' },
})
