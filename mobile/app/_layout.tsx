import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UserDataProvider } from '@/contexts/UserDataContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrivyProvider } from '@privy-io/expo';
import { View, Text, ActivityIndicator } from 'react-native';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [privyError, setPrivyError] = useState<string | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // ✅ Sprawdź czy mamy wymagane zmienne środowiskowe
  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_PRIVY_APP_ID) {
      setPrivyError('Missing EXPO_PUBLIC_PRIVY_APP_ID');
      console.error('❌ EXPO_PUBLIC_PRIVY_APP_ID is not set');
    }
    if (!process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID) {
      setPrivyError('Missing EXPO_PUBLIC_PRIVY_CLIENT_ID');
      console.error('❌ EXPO_PUBLIC_PRIVY_CLIENT_ID is not set');
    }
  }, []);

  if (!loaded) {
    return null;
  }

  // ✅ Wyświetl błąd jeśli brakuje konfiguracji
  if (privyError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginBottom: 10 }}>
          Configuration Error
        </Text>
        <Text style={{ fontSize: 14, color: '#78716c', textAlign: 'center' }}>
          {privyError}
        </Text>
        <Text style={{ fontSize: 12, color: '#a8a29e', textAlign: 'center', marginTop: 10 }}>
          Please check your .env file or app.json configuration
        </Text>
      </View>
    );
  }

  return (
    <PrivyProvider
      appId={process.env.EXPO_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID!}
    >
      <SafeAreaProvider>
        <LanguageProvider>
          <UserDataProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </UserDataProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </PrivyProvider>
  );
}