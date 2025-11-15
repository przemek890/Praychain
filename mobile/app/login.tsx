import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LogIn, Mail, Wallet } from 'lucide-react-native';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { login, ready, authenticated, user } = useAuth();

  useEffect(() => {
    if (authenticated && user) {
      router.replace('/(tabs)');
    }
  }, [authenticated, user]);

  const handleEmailLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        {/* Logo Section */}
        <Animated.View entering={FadeInUp} style={styles.logoSection}>
          <LinearGradient
            colors={['#92400e', '#78350f']}
            style={styles.logoContainer}
          >
            <View style={styles.crossWrapper}>
              <View style={styles.crossVertical} />
              <View style={styles.crossHorizontal} />
            </View>
          </LinearGradient>
          <Text style={styles.appName}>PrayChain</Text>
          <Text style={styles.tagline}>Connect through prayer</Text>
        </Animated.View>

        {/* Login Options */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.loginSection}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.subtitleText}>Sign in to continue your spiritual journey</Text>

          <View style={styles.buttonsContainer}>
            {/* Email Login */}
            <Pressable onPress={handleEmailLogin} style={styles.loginButton}>
              <LinearGradient
                colors={['#92400e', '#78350f']}
                style={styles.buttonGradient}
              >
                <Mail size={22} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.buttonText}>Continue with Email</Text>
              </LinearGradient>
            </Pressable>

            {/* Wallet Login */}
            <Pressable onPress={handleEmailLogin} style={styles.loginButton}>
              <LinearGradient
                colors={['#44403c', '#292524']}
                style={styles.buttonGradient}
              >
                <Wallet size={22} color="#ffffff" strokeWidth={2.5} />
                <Text style={styles.buttonText}>Connect Wallet</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.termsText}>
            By continuing, you agree to our{'\n'}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  crossWrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 10,
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 5,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 50,
    height: 10,
    backgroundColor: '#ffffff',
    borderRadius: 5,
  },
  appName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#1c1917',
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#78716c',
    fontWeight: '500',
  },
  loginSection: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1c1917',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#78716c',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  termsText: {
    fontSize: 12,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#92400e',
    fontWeight: '600',
  },
});