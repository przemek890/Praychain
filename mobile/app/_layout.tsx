import '../polyfills';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, useRef } from 'react';
import { ErrorBoundary } from 'expo-router';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UserDataProvider } from '@/contexts/UserDataContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PrivyProvider, usePrivy } from '@privy-io/expo';
import { View, Text, ActivityIndicator } from 'react-native';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { user, isReady } = usePrivy();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === 'login';

    // Prevent multiple redirects
    if (hasNavigatedRef.current) return;

    if (user && inAuthGroup) {
      // User logged in trying to access login
      console.log('User logged in, redirecting to tabs');
      hasNavigatedRef.current = true;
      setIsNavigating(true);
      
      setTimeout(() => {
        router.replace('/(tabs)');
        setTimeout(() => setIsNavigating(false), 100);
      }, 100);
    } else if (!user && !inAuthGroup && segments.length > 0) {
      // User not logged in trying to access protected page
      console.log('User not logged in, redirecting to login');
      hasNavigatedRef.current = true;
      setIsNavigating(true);
      
      setTimeout(() => {
        router.replace('/login');
        setTimeout(() => setIsNavigating(false), 100);
      }, 100);
    }
  }, [user, isReady, segments]);

  // Reset flag on logout
  useEffect(() => {
    if (!user) {
      hasNavigatedRef.current = false;
    }
  }, [user]);

  // Show loader during navigation or when Privy is not ready
  if (!isReady || isNavigating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafaf9' }}>
        <ActivityIndicator size="large" color="#92400e" />
      </View>
    );
  }

  return <>{children}</>;
}

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

  // Check for required environment variables
  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_PRIVY_APP_ID) {
      setPrivyError('Missing EXPO_PUBLIC_PRIVY_APP_ID');
      console.error('EXPO_PUBLIC_PRIVY_APP_ID is not set');
    }
    if (!process.env.EXPO_PUBLIC_PRIVY_CLIENT_ID) {
      setPrivyError('Missing EXPO_PUBLIC_PRIVY_CLIENT_ID');
      console.error('EXPO_PUBLIC_PRIVY_CLIENT_ID is not set');
    }
  }, []);

  if (!loaded) {
    return null;
  }

  // Display error if configuration is missing
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
            <NavigationGuard>
              <Stack screenOptions={{ headerShown: false }} />
            </NavigationGuard>
          </UserDataProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </PrivyProvider>
  );
}