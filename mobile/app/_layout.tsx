import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { LanguageProvider } from '@/contexts/LanguageContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="profile" 
          options={{ 
            headerShown: false, 
            presentation: 'modal',
            animation: 'slide_from_bottom'
          }} 
        />
        <Stack.Screen 
          name="quote" 
          options={{ 
            headerShown: false, 
            presentation: 'modal',
            animation: 'slide_from_right'
          }} 
        />
        <Stack.Screen 
          name="scripture" 
          options={{ 
            headerShown: false, 
            presentation: 'modal',
            animation: 'slide_from_right'
          }} 
        />
      </Stack>
    </LanguageProvider>
  );
}