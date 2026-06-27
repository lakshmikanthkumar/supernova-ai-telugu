import { Tabs } from 'expo-router'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { Colors } from '../../src/constants/theme'
import { Home, BookOpen, Bot, BarChart2, User } from 'lucide-react-native'

function TabIcon({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemFocused]}>
      <View style={[styles.tabEmojiWrap, focused && styles.tabEmojiWrapFocused]}>
        <Icon size={20} color={focused ? Colors.primary : "#9CA3AF"} />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  )
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#FFFFFF' },
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D8',
    height: Platform.OS === 'ios' ? 82 : 66,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    elevation: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    paddingTop: 9,
  },
  tabItem: { alignItems: 'center', paddingTop: 6, width: 58 },
  tabItemFocused: {},
  tabEmojiWrap: {
    width: 36, height: 28, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tabEmojiWrapFocused: {
    backgroundColor: '#FFF0E8',
  },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },
  tabLabelFocused: { color: Colors.primary },
})
