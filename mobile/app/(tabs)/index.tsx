import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Sparkles, BookOpen, Quote, Calendar, RefreshCw, Flame } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface UserData {
  id: string;
  username: string;
  tokens_balance: number;
  streak_days: number;
  prayers_count: number;
}

interface BibleQuote {
  text: string;
  reference: string;
  book_name?: string;
  chapter?: number;
  verse?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const { t } = useLanguage();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dailyQuote, setDailyQuote] = useState<BibleQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Always try to load user "test" first
      let userId = 'test';
      
      try {
        const userResponse = await fetch(`${API_URL}/api/users/${userId}`);
        if (userResponse.ok) {
          const user = await userResponse.json();
          setUserData(user);
          await AsyncStorage.setItem('userId', userId);
        } else if (userResponse.status === 404) {
          // User "test" doesn't exist, create it
          const createResponse = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: 'test',
              email: 'test@example.com'
            })
          });
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            await AsyncStorage.setItem('userId', newUser.id);
            setUserData(newUser);
          }
        }
      } catch (userError) {
        console.error('Error with user "test":', userError);
        
        // Fallback: check if there's a stored userId
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId && storedUserId !== 'test') {
          const fallbackResponse = await fetch(`${API_URL}/api/users/${storedUserId}`);
          if (fallbackResponse.ok) {
            const user = await fallbackResponse.json();
            setUserData(user);
          }
        }
      }

      // Load daily quote
      const quoteResponse = await fetch(`${API_URL}/api/bible/short-quote`);
      if (quoteResponse.ok) {
        const quote = await quoteResponse.json();
        setDailyQuote(quote);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshQuote = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${API_URL}/api/bible/random-quote`);
      if (response.ok) {
        const quote = await response.json();
        setDailyQuote(quote);
      }
    } catch (error) {
      console.error('Error refreshing quote:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={styles.loadingText}>Loading your spiritual journey...</Text>
      </View>
    );
  }

  const userName = userData?.username || 'Guest';
  const tokens = userData?.tokens_balance || 0;
  const streak = userData?.streak_days || 0;
  const prayersCount = userData?.prayers_count || 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header with User Info */}
          <Animated.View entering={FadeInUp} style={styles.header}>
            <View style={styles.userSection}>
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{userName}</Text>
              </View>
              <LinearGradient
                colors={['#ffffff', '#fafaf9']}
                style={styles.userAvatar}
              >
                <User size={28} color="#92400e" strokeWidth={2.5} />
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Tokens Card - Hero */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.heroCardWrapper}>
            <LinearGradient
              colors={['#ffffff', '#fafaf9']}
              style={styles.tokensCard}
            >
              <View style={styles.tokensHeader}>
                <LinearGradient
                  colors={['#92400e', '#78350f']}
                  style={styles.logoContainer}
                >
                  <View style={styles.crossWrapper}>
                    <View style={styles.crossVertical} />
                    <View style={styles.crossHorizontal} />
                  </View>
                </LinearGradient>
                <View style={styles.tokensContent}>
                  <Text style={styles.tokensLabel}>Your Balance</Text>
                  <View style={styles.tokensValueRow}>
                    <Text style={styles.tokensValue}>{tokens}</Text>
                    <Text style={styles.tokensUnit}>PRAY</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <View style={styles.statIconWrapper}>
                    <BookOpen size={18} color="#92400e" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.statValue}>{prayersCount}</Text>
                  <Text style={styles.statLabel}>Prayers</Text>
                </View>
                
                <View style={styles.statBox}>
                  <View style={styles.statIconWrapper}>
                    <Flame size={18} color="#ea580c" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.statValue, { color: '#ea580c' }]}>{streak}</Text>
                  <Text style={styles.statLabel}>Day Streak 🔥</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          <View style={styles.content}>
            {/* Daily Quote Card */}
            {dailyQuote && (
              <Animated.View entering={FadeInDown.delay(200)}>
                <LinearGradient
                  colors={['#92400e', '#78350f']}
                  style={styles.quoteCard}
                >
                  <View style={styles.quoteHeader}>
                    <View style={styles.quoteTitle}>
                      <Quote size={18} color="#fcd34d" strokeWidth={2.5} />
                      <Text style={styles.quoteTitleText}>Daily Inspiration</Text>
                    </View>
                    <Pressable onPress={refreshQuote} disabled={refreshing} style={styles.refreshButton}>
                      <RefreshCw 
                        size={18} 
                        color="#fcd34d" 
                        strokeWidth={2.5}
                        style={refreshing ? { opacity: 0.5 } : {}} 
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
                  <Text style={styles.quoteReference}>— {dailyQuote.reference}</Text>
                </LinearGradient>
              </Animated.View>
            )}

            {/* Action Cards */}
            <Text style={styles.sectionTitle}>Explore Scripture</Text>
            <View style={styles.actionsGrid}>
              <ActionCard
                icon={BookOpen}
                title="Daily Reading"
                description="Today's passage"
                gradient={['#d97706', '#92400e']}
                delay={300}
                onPress={() => router.push('/daily-reading')}
                style={styles.halfCard}
              />
              
              <ActionCard
                icon={Quote}
                title="Random Verse"
                description="Get inspired"
                gradient={['#78716c', '#57534e']}
                delay={350}
                onPress={() => router.push('/random-quote')}
                style={styles.halfCard}
              />

              <ActionCard
                icon={Calendar}
                title="Bible Reader"
                description="Read any chapter"
                gradient={['#92400e', '#78350f']}
                delay={400}
                onPress={() => router.push('/bible-reader')}
                style={styles.fullCard}
              />
            </View>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function ActionCard({ icon: Icon, title, description, gradient, delay, onPress, style }: any) {
  return (
    <AnimatedPressable
      entering={FadeInDown.delay(delay)}
      onPress={onPress}
      style={[styles.actionCard, style]}
    >
      <LinearGradient colors={gradient} style={styles.actionGradient}>
        <View style={styles.actionIconWrapper}>
          <Icon size={22} color="#ffffff" strokeWidth={2.5} />
        </View>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#78716c',
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 4,
  },
  userName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroCardWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tokensCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tokensHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  crossWrapper: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossVertical: {
    position: 'absolute',
    width: 7,
    height: 34,
    backgroundColor: '#ffffff',
    borderRadius: 3.5,
  },
  crossHorizontal: {
    position: 'absolute',
    width: 34,
    height: 7,
    backgroundColor: '#ffffff',
    borderRadius: 3.5,
  },
  tokensContent: {
    flex: 1,
  },
  tokensLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokensValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  tokensValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#16a34a',
    letterSpacing: -1,
  },
  tokensUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fafaf9',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  quoteCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  quoteTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quoteTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fcd34d',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#ffffff',
    fontStyle: 'italic',
    marginBottom: 10,
    fontWeight: '500',
  },
  quoteReference: {
    fontSize: 13,
    color: '#fcd34d',
    fontWeight: '600',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  halfCard: {
    width: '48%',
  },
  fullCard: {
    width: '100%',
  },
  actionGradient: {
    padding: 18,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  actionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 3,
  },
  actionDescription: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    fontWeight: '500',
  },
});