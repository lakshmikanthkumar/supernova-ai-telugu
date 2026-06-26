import { Stack, router } from 'expo-router';
import { TouchableOpacity, Platform } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

export default function FeaturesLayout() {
  const backButton = () => (
    <TouchableOpacity
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(main)/home');
        }
      }}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginLeft: 0,
        marginRight: 8,
      }}
    >
      <ArrowLeft size={24} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#7B61FF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: backButton,
      }}
    >
      <Stack.Screen name="office-conversations" options={{ title: 'Office Conversations' }} />
      <Stack.Screen name="grammar-engine" options={{ title: 'Grammar Engine' }} />
      <Stack.Screen name="business-communication" options={{ title: 'Business Communication' }} />
      <Stack.Screen name="daily-greetings" options={{ title: 'Daily Greetings' }} />
      <Stack.Screen name="email-writing" options={{ title: 'Email Writing' }} />
      <Stack.Screen name="interview-training" options={{ title: 'Interview Training' }} />
      <Stack.Screen name="phone-simulator" options={{ title: 'Phone Simulator' }} />
      <Stack.Screen name="public-speaking" options={{ title: 'Public Speaking' }} />
      <Stack.Screen name="self-introduction" options={{ title: 'Self Introduction' }} />
    </Stack>
  );
}
