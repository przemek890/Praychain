import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Sparkles, BookOpen, Quote, Calendar, RefreshCw } from 'lucide-react-native';
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
      
      // Load user data
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const userResponse = await fetch(`${API_URL}/api/users/${userId}`);
        if (userResponse.ok) {
          const user = await userResponse.json();
          setUserData(user);
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
      const response = await fetch(`${API_URL}/api/bible/short-quote`);
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
      </View>
    );
  }

  const userName = userData?.username || 'Guest';
  const tokens = userData?.tokens_balance || 0;
  const streak = userData?.streak_days || 0;
  const prayersCount = userData?.prayers_count || 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        {/* Header with User Info */}
        <Animated.View entering={FadeInUp} style={styles.header}>
          <View style={styles.userSection}>
            <LinearGradient
              colors={['#fde68a', '#fcd34d']}
              style={styles.userAvatar}
            >
              <User size={32} color="#44403c" />
            </LinearGradient>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.userName}>{userName} 🙏</Text>
            </View>
          </View>
        </Animated.View>

        {/* Tokens & Stats Card */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={['#ffffff', '#fafaf9']}
            style={styles.statsCard}
          >
            <View style={styles.tokensSection}>
              <View style={styles.tokensHeader}>
                <Sparkles size={24} color="#92400e" />
                <Text style={styles.tokensLabel}>Your Balance</Text>
              </View>
              <Text style={styles.tokensValue}>{tokens} PRAY</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{prayersCount}</Text>
                <Text style={styles.statLabel}>Prayers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{streak} 🔥</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Daily Quote Card */}
        {dailyQuote && (
          <Animated.View entering={FadeInDown.delay(200)}>
            <LinearGradient
              colors={['#fef3c7', '#fde68a']}
              style={styles.quoteCard}
            >
              <View style={styles.quoteHeader}>
                <View style={styles.quoteTitle}>
                  <Quote size={20} color="#92400e" />
                  <Text style={styles.quoteTitleText}>Daily Inspiration</Text>
                </View>
                <Pressable onPress={refreshQuote} disabled={refreshing}>
                  <RefreshCw 
                    size={20} 
                    color="#92400e" 
                    style={refreshing ? { opacity: 0.5 } : {}} 
                  />
                </Pressable>
              </View>
              <Text style={styles.quoteText}>{dailyQuote.text}</Text>
              <Text style={styles.quoteReference}>— {dailyQuote.reference}</Text>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Action Cards */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <ActionCard
            icon={BookOpen}
            title="Daily Reading"
            description="Read today's scripture"
            gradient={['#d97706', '#92400e']}
            emoji="📖"
            delay={300}
            onPress={async () => {
              try {
                const response = await fetch(`${API_URL}/api/bible/daily-reading`);
                if (response.ok) {
                  const reading = await response.json();
                  router.push({
                    pathname: '/daily-reading',
                    params: { data: JSON.stringify(reading) }
                  });
                }
              } catch (error) {
                console.error('Error loading daily reading:', error);
              }
            }}
          />
          
          <ActionCard
            icon={Quote}
            title="Random Quote"
            description="Get inspired by scripture"
            gradient={['#78716c', '#57534e']}
            emoji="✨"
            delay={400}
            onPress={async () => {
              try {
                const response = await fetch(`${API_URL}/api/bible/random-quote`);
                if (response.ok) {
                  const quote = await response.json();
                  router.push({
                    pathname: '/random-quote',
                    params: { data: JSON.stringify(quote) }
                  });
                }
              } catch (error) {
                console.error('Error loading random quote:', error);
              }
            }}
          />

          <ActionCard
            icon={Calendar}
            title="Read Bible"
            description="Choose any book & chapter"
            gradient={['#92400e', '#78350f']}
            emoji="📚"
            delay={500}
            onPress={() => router.push('/bible-reader')}
          />
        </View>

        <View style={{ height: 30 }} />
      </LinearGradient>
    </ScrollView>
  );
}

function ActionCard({ icon: Icon, title, description, gradient, emoji, delay, onPress }: any) {
  return (
    <AnimatedPressable
      entering={FadeInDown.delay(delay)}
      onPress={onPress}
      style={styles.actionCard}
    >
      <LinearGradient colors={gradient} style={styles.actionGradient}>
        <View style={styles.actionContent}>
          <View style={styles.actionHeader}>
            <Icon size={24} color="#ffffff" />
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
  },
  gradient: {
    flex: 1,
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  statsCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokensSection: {
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  tokensHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tokensLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#78716c',
  },
  tokensValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e7e5e4',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  statLabel: {
    fontSize: 12,
    color: '#78716c',
    marginTop: 4,
  },
  quoteCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quoteTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#44403c',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  quoteReference: {
    fontSize: 13,
    color: '#78716c',
    fontWeight: '500',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 12,
  },
  actionsContainer: {
    gap: 12,
  },
  actionCard: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionGradient: {
    padding: 16,
  },
  actionContent: {
    gap: 8,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionDescription: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
  },
});