import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, TextInput, Keyboard, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LogIn, Mail } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { usePrivy, useLoginWithEmail } from '@privy-io/expo';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginScreen() {
  const { t } = useLanguage();
  const privy = usePrivy() as any;
  const ready = privy.ready ?? true;
  const authenticated = privy.authenticated ?? !!privy.user;
  const user = privy.user;
  const { sendCode, loginWithCode } = useLoginWithEmail();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasRedirectedRef = useRef(false); // ✅ ZMIEŃ na useRef
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Reset ref when component mounts
  useEffect(() => {
    hasRedirectedRef.current = false;
    
    // Reset animation
    fadeAnim.setValue(0);
    
    return () => {
      hasRedirectedRef.current = false;
    };
  }, []);

  // ✅ Pojedyncze przekierowanie po zalogowaniu
  useEffect(() => {
    if (ready && authenticated && user && !hasRedirectedRef.current) {
      console.log('✅ User authenticated, redirecting...');
      hasRedirectedRef.current = true;
      
      // ✅ Małe opóźnienie przed przekierowaniem
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);
    }
  }, [ready, authenticated, user]);

  // ✅ Animacja tylko gdy ready i nie ma użytkownika
  useEffect(() => {
    if (ready && !authenticated && !hasRedirectedRef.current) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [ready, authenticated]);

  const handleSendCode = async () => {
    if (!email.trim()) return;
    
    Keyboard.dismiss();
    
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
    
    Keyboard.dismiss();
    
    try {
      setLoading(true);
      await loginWithCode({ email: email.trim(), code: code.trim() });
      // ✅ Po udanym logowaniu Privy zaktualizuje authenticated
      // i useEffect przekieruje do /(tabs)
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
    }
  };

  // ✅ Loader gdy czekamy na Privy
  if (!ready || hasRedirectedRef.current) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
      </View>
    );
  }

  // ✅ Jeśli zalogowany, pokaż loader podczas przekierowania
  if (authenticated && user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#78350f20', '#44403c30', '#78350f25']}
            style={styles.gradient}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
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
                <Text style={styles.appName}>{t.login.welcome}</Text>
                <Text style={styles.tagline}>{t.login.tagline}</Text>
              </Animated.View>

              {/* Login Form */}
              <Animated.View style={[styles.formSection, { opacity: fadeAnim }]}>
                {/* Single Input - Email lub Code */}
                <View style={styles.inputWrapper}>
                  {codeSent ? (
                    <LogIn size={20} color="#78716c" style={styles.inputIcon} />
                  ) : (
                    <Mail size={20} color="#78716c" style={styles.inputIcon} />
                  )}
                  <TextInput
                    style={styles.input}
                    placeholder={codeSent ? t.login.enterCode : t.login.enterEmail}
                    placeholderTextColor="#a8a29e"
                    value={codeSent ? code : email}
                    onChangeText={codeSent ? setCode : setEmail}
                    autoCapitalize="none"
                    keyboardType={codeSent ? "number-pad" : "email-address"}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (codeSent && code.trim()) {
                        handleLogin();
                      } else if (!codeSent && email.trim()) {
                        handleSendCode();
                      }
                    }}
                    editable={!loading}
                    autoFocus={codeSent}
                  />
                </View>

                {/* Single Action Button */}
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
                        {codeSent ? (
                          <LogIn size={22} color="#ffffff" strokeWidth={2.5} />
                        ) : (
                          <Mail size={22} color="#ffffff" strokeWidth={2.5} />
                        )}
                        <Text style={styles.buttonText}>
                          {codeSent ? t.login.verifyAndSignIn : t.login.sendCode}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Change email link - tylko gdy code sent */}
                {codeSent && (
                  <Pressable 
                    onPress={() => {
                      setCodeSent(false);
                      setCode('');
                      Keyboard.dismiss();
                    }} 
                    style={styles.changeEmailButton}
                    disabled={loading}
                  >
                    <Text style={styles.changeEmailText}>{t.login.changeEmail}</Text>
                  </Pressable>
                )}

                <Text style={styles.termsText}>
                  {t.login.termsAgreement}{'\n'}
                  <Text style={styles.termsLink}>{t.login.termsOfService}</Text> {t.login.and}{' '}
                  <Text style={styles.termsLink}>{t.login.privacyPolicy}</Text>
                </Text>
              </Animated.View>
            </ScrollView>
          </LinearGradient>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 60,
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
  formSection: {
    gap: 16,
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
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
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
  changeEmailButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  changeEmailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  termsText: {
    fontSize: 12,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 16,
  },
  termsLink: {
    color: '#92400e',
    fontWeight: '600',
  },
});