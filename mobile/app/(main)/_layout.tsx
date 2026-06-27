import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { useTheme } from '../../src/context/ThemeContext'
import { Home, BookOpen, Bot, BarChart2, User } from 'lucide-react-native'

function TabIcon({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={styles.tabItem}>
      <View style={[
        styles.tabEmojiWrap,
        focused && { backgroundColor: c.primaryLight }
      ]}>
        <Icon size={20} color={focused ? c.primary : c.textTertiary} />
      </View>
      <Text style={[
        styles.tabLabel,
        focused ? { color: c.primary } : { color: c.textTertiary }
      ]}>{label}</Text>
    </View>
  )
}

export default function MainLayout() {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.textPrimary,
        headerTitleStyle: { fontWeight: 'bold', color: c.textPrimary },
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            shadowColor: c.shadow,
          }
        ],
        tabBarShowLabel: false,
        tabBarItemStyle: { flex: 1, justifyContent: 'center', alignItems: 'center' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Home} label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen} label="Learn" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nova"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={Bot} label="Nova" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={BarChart2} label="Progress" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen name="daily-challenge"    options={{ href: null }} />
      <Tabs.Screen name="learn-hub"          options={{ href: null }} />
      <Tabs.Screen name="notifications"      options={{ href: null }} />
      <Tabs.Screen name="reminder-settings"  options={{ href: null }} />
      <Tabs.Screen name="theme-settings"     options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 82 : 66,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    elevation: 12,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    paddingTop: 9,
  },
  tabItem: { alignItems: 'center', paddingTop: 6, width: 58 },
  tabEmojiWrap: {
    width: 36, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tabLabel: { fontSize: 10, marginTop: 2, fontWeight: '600' },
})
