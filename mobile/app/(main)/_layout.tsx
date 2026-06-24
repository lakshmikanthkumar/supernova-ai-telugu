import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Home, BookOpen, Bot, BarChart2, User } from 'lucide-react-native'
import { Theme } from '../../src/theme'

function TabIcon({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <Icon size={24} color={focused ? Theme.colors.secondary : Theme.colors.textSecondary} strokeWidth={focused ? 2.5 : 2} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  )
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: Theme.colors.background },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold', color: '#fff' },
        tabBarStyle: styles.tabBar,
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
          tabBarIcon: ({ focused }) => <TabIcon Icon={BarChart2} label="Metrics" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon Icon={User} label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="daily-challenge"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="learn-hub"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    elevation: 20,
    shadowColor: Theme.colors.secondary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', paddingTop: 8, minWidth: 60 },
  tabItemFocused: {},
  tabLabel: { fontSize: 10, color: Theme.colors.textSecondary, marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tabLabelFocused: { color: Theme.colors.secondary, fontWeight: '800' },
})
