import { Tabs, router } from 'expo-router';
import { Home, Heart, Trophy, Users, Coins } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrivy } from '@privy-io/expo';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { t } = useLanguage();
  const privy = usePrivy() as any; // tymczasowy hack
  const ready = privy.ready ?? true;          // default: true, żeby nie blokować
  const authenticated = privy.authenticated ?? !!privy.user;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('../login');
    }
  }, [ready, authenticated]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafaf9' }}>
        <ActivityIndicator size="large" color="#92400e" />
      </View>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#92400e',
        tabBarInactiveTintColor: '#78716c',
        tabBarStyle: {
          backgroundColor: '#fafaf9',
          borderTopColor: '#e7e5e4',
          height: 50 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.home,
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: t.nav.prayer,
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: t.nav.achievements,
          tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t.nav.community,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tokens"
        options={{
          title: t.nav.tokens,
          tabBarIcon: ({ color, size }) => <Coins size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}