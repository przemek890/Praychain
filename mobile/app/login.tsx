import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LogIn, Mail, Wallet, ArrowLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { usePrivy, useLoginWithEmail } from '@privy-io/expo';

export default function LoginScreen() {
  const privy = usePrivy() as any;   // tymczasowy hack
  const ready = privy.ready ?? true;
  const authenticated = privy.authenticated ?? !!privy.user;
  const user = privy.user;
  const { sendCode, loginWithCode } = useLoginWithEmail();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (authenticated && user) {
      router.replace('/(tabs)');
    }
  }, [authenticated, user]);

  useEffect(() => {
    if (ready) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [ready]);

  const handleSendCode = async () => {
    if (!email.trim()) return;
    
    try {
      setLoading(true);
      await sendCode({ email: email.trim() });
      setCodeSent(true);
    } catch (error) {
      console.error('Send code error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!code.trim()) return;
    
    try {
      setLoading(true);
      await loginWithCode({ email: email.trim(), code: code.trim() });
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setCodeSent(false);
    setCode('');
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
        <Animated.View style={[styles.logoSection, { opacity: fadeAnim }]}>
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

        {/* Login Section */}
        <Animated.View style={[styles.loginSection, { opacity: fadeAnim }]}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.subtitleText}>Sign in to continue your spiritual journey</Text>

          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#78716c" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#a8a29e"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!codeSent && !loading}
              />
            </View>

            {/* Code Input (shown after email sent) */}
            {codeSent && (
              <View style={styles.inputWrapper}>
                <LogIn size={20} color="#78716c" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter verification code"
                  placeholderTextColor="#a8a29e"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              {codeSent && (
                <Pressable onPress={handleBack} style={styles.backButton} disabled={loading}>
                  <ArrowLeft size={20} color="#78716c" />
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              )}
              
              <Pressable 
                onPress={codeSent ? handleLogin : handleSendCode} 
                style={styles.loginButton}
                disabled={loading || (!codeSent && !email.trim()) || (codeSent && !code.trim())}
              >
                <LinearGradient
                  colors={['#92400e', '#78350f']}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Mail size={22} color="#ffffff" strokeWidth={2.5} />
                      <Text style={styles.buttonText}>
                        {codeSent ? 'Verify & Sign In' : 'Send Verification Code'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
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
  formContainer: {
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1c1917',
    fontWeight: '500',
  },
  buttonsContainer: {
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78716c',
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