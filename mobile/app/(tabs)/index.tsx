import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Settings, BookOpen, Quote, Calendar, RefreshCw, Flame, Globe, FileText, Shield, HelpCircle, Info, LogOut, ChevronRight, ArrowLeft, Coins } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { router, useFocusEffect } from 'expo-router'; // ✅ Dodane useFocusEffect
import { useState, useEffect, useCallback } from 'react'; // ✅ Dodane useCallback
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentUserId } from '@/config/currentUser';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface UserData {
  id: string;
  username: string;
  tokens_balance: number;
  prayers_count: number;
  streak_days: number;
  total_earned: number;
  total_donated: number;
  level?: number;
  experience?: number;
  experience_to_next_level?: number;
}

interface BibleQuote {
  text: string;
  reference: string;
  book_name?: string;
  chapter?: number;
  verse?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Helper function to calculate level and experience
const calculateLevel = (totalEarned: number) => {
  const baseXP = 100; // XP needed for level 1->2
  const multiplier = 1.5; // Each level requires 50% more XP
  
  let level = 1;
  let xpForCurrentLevel = 0;
  let xpForNextLevel = baseXP;
  
  while (totalEarned >= xpForNextLevel) {
    level++;
    xpForCurrentLevel = xpForNextLevel;
    xpForNextLevel += Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }
  
  const currentLevelXP = totalEarned - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const progress = (currentLevelXP / xpNeededForNext) * 100;
  
  return {
    level,
    experience: currentLevelXP,
    experience_to_next_level: xpNeededForNext,
    progress: Math.min(progress, 100)
  };
};

export default function HomeScreen() {
  const { t } = useLanguage();
  const { logout, user, authenticated } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dailyQuote, setDailyQuote] = useState<BibleQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // ✅ NOWE: Odświeżaj dane po powrocie do zakładki
  useFocusEffect(
    useCallback(() => {
      console.log('Home tab focused - refreshing user data');
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      let userId = getCurrentUserId();
      
      try {
        const userResponse = await fetch(`${API_URL}/api/users/${userId}`);
        if (userResponse.ok) {
          const user = await userResponse.json();
          setUserData(user);
          await AsyncStorage.setItem('userId', userId);
        } else if (userResponse.status === 404) {
          const createResponse = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: userId,
              email: `${userId}@example.com`
            })
          });
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            await AsyncStorage.setItem('userId', newUser.id);
            setUserData(newUser);
          }
        }
      } catch (userError) {
        console.error(`Error with user "${userId}":`, userError);
        
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId && storedUserId !== userId) {
          const fallbackResponse = await fetch(`${API_URL}/api/users/${storedUserId}`);
          if (fallbackResponse.ok) {
            const user = await fallbackResponse.json();
            setUserData(user);
          }
        }
      }

      // ✅ ZMIENIONE - Load short quote (z quotes.py)
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
      // ✅ ZMIENIONE - Refresh też używa short-quote
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

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userId');
    await logout();
    setSettingsVisible(false);
    router.replace('../login');
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
  const totalEarned = userData?.total_earned || 0;
  
  // Calculate level
  const levelData = calculateLevel(totalEarned);

  // Settings Screen
  if (settingsVisible) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#78350f20', '#44403c30', '#78350f25']}
          style={styles.gradient}
        >
          <ScrollView 
            style={styles.settingsScrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.settingsScrollContent}
          >
            {/* ✅ Header ze strzałką - wyżej */}
            <Animated.View entering={FadeInDown} style={styles.settingsHeaderSection}>
              <Pressable 
                onPress={() => setSettingsVisible(false)} 
                style={styles.backButtonFloating}
              >
                <ArrowLeft size={24} color="#92400e" strokeWidth={2.5} />
              </Pressable>

              <View style={styles.settingsHeaderContent}>
                <View style={styles.iconContainer}>
                  <Settings size={40} color="#92400e" strokeWidth={2} />
                </View>
                <Text style={styles.settingsTitleLarge}>Settings</Text>
                <Text style={styles.settingsSubtitle}>Manage your preferences</Text>
              </View>
            </Animated.View>

            {/* Settings Items */}
            <View style={styles.settingsItemsContainer}>
              <Animated.View entering={FadeInDown.delay(150)}>
                <SettingItem
                  icon={Globe}
                  title="App Language"
                  subtitle="English"
                  onPress={() => {/* Handle language change */}}
                />
              </Animated.View>
              
              <Animated.View entering={FadeInDown.delay(200)}>
                <SettingItem
                  icon={FileText}
                  title="Terms of Service"
                  onPress={() => {/* Handle terms */}}
                />
              </Animated.View>
              
              <Animated.View entering={FadeInDown.delay(250)}>
                <SettingItem
                  icon={Shield}
                  title="Privacy Policy"
                  onPress={() => {/* Handle privacy */}}
                />
              </Animated.View>
              
              <Animated.View entering={FadeInDown.delay(300)}>
                <SettingItem
                  icon={HelpCircle}
                  title="Help & Support"
                  onPress={() => {/* Handle support */}}
                />
              </Animated.View>
              
              <Animated.View entering={FadeInDown.delay(350)}>
                <SettingItem
                  icon={Info}
                  title="About App"
                  subtitle="Version 1.0.0"
                  onPress={() => {/* Handle about */}}
                />
              </Animated.View>
              
              <Animated.View entering={FadeInDown.delay(400)}>
                <Pressable 
                  onPress={handleLogout}
                  style={styles.logoutButton}
                >
                  <View style={styles.logoutIconWrapper}>
                    <LogOut size={20} color="#dc2626" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.logoutText}>Log Out</Text>
                </Pressable>
              </Animated.View>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  // Main Home Screen
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp} style={styles.header}>
            <View style={styles.userSection}>
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{userName}</Text>
              </View>
              <Pressable onPress={() => setSettingsVisible(true)}>
                <LinearGradient
                  colors={['#ffffff', '#fafaf9']}
                  style={styles.userAvatar}
                >
                  <Settings size={28} color="#92400e" strokeWidth={2.5} />
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>

          {/* USUŃ CAŁY TEN BLOK - stary tokensCard */}
          {/* <Animated.View entering={FadeInDown.delay(100)} style={styles.heroCardWrapper}>
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
          </Animated.View> */}

          {/* ✅ ZOSTAW TYLKO TEN - Compact Balance Card z Level */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.balanceCardCompact}>
            <LinearGradient 
              colors={['#ffffff', '#fafaf9']} 
              style={styles.balanceGradientCompact}
            >
              {/* Balance Row */}
              <View style={styles.balanceRowCompact}>
                <View style={styles.balanceIconCompact}>
                  <Image 
                    source={require('@/components/icons/logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.balanceTextContainer}>
                  <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
                  <View style={styles.balanceAmountRow}>
                    <Text style={styles.balanceAmount}>{tokens}</Text>
                    <Text style={styles.balanceCurrency}>PRAY</Text>
                  </View>
                </View>
              </View>

              {/* Level Progress Bar */}
              <View style={styles.levelContainer}>
                <View style={styles.levelHeader}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Level {levelData.level}</Text>
                  </View>
                  <Text style={styles.levelXPText}>
                    {levelData.experience}/{levelData.experience_to_next_level} XP
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <LinearGradient
                      colors={['#d97706', '#f59e0b']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${levelData.progress}%` }]}
                    />
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Stats Row */}
              <View style={styles.statsRowCompact}>
                <View style={styles.statItemCompact}>
                  <View style={styles.statIconSmall}>
                    <BookOpen size={14} color="#92400e" />
                  </View>
                  <Text style={styles.statValueCompact}>{prayersCount}</Text>
                  <Text style={styles.statLabelCompact}>Prayers</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItemCompact}>
                  <View style={styles.statIconSmall}>
                    <Flame size={14} color="#dc2626" />
                  </View>
                  <Text style={[styles.statValueCompact, { color: '#dc2626' }]}>{streak}</Text>
                  <Text style={styles.statLabelCompact}>Day Streak</Text>
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
                  <Text style={styles.quoteText}>{dailyQuote.text}</Text>
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
                gradient={['#78350f', '#451a03']} // ✅ ZMIENIONE z ['#92400e', '#78350f']
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

function SettingItem({ icon: Icon, title, subtitle, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.settingItem}>
      <View style={styles.settingIconWrapper}>
        <Icon size={20} color="#92400e" strokeWidth={2.5} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <ChevronRight size={20} color="#a8a29e" strokeWidth={2.5} />
    </Pressable>
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
  // ❌ USUŃ te style - już nie potrzebne
  // heroCardWrapper, tokensCard, tokensHeader, logoContainer, 
  // crossWrapper, crossVertical, crossHorizontal, tokensContent,
  // tokensLabel, tokensValueRow, tokensValue, tokensUnit,
  // statsGrid, statBox, statIconWrapper, statValue, statLabel

  // ✅ ZAKTUALIZUJ - dodaj marginesy jak w heroCardWrapper
  balanceCardCompact: {
    paddingHorizontal: 16, // ✅ Dodane
    marginBottom: 20, // ✅ Zmienione z 16 na 20
  },
  balanceGradientCompact: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20, // ✅ Dodane
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14, // ✅ Zwiększone z 12 na 14
    marginBottom: 12,
  },
  balanceIconCompact: {
    width: 56, // ✅ Zwiększone z 48 na 56
    height: 56, // ✅ Zwiększone z 48 na 56
    borderRadius: 16, // ✅ Zwiększone z 12 na 16
    backgroundColor: '#92400e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: 40, // ✅ Nowe
    height: 40, // ✅ Nowe
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 11, // ✅ Zwiększone z 10 na 11
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 1, // ✅ Zwiększone z 0.5 na 1
    marginBottom: 4, // ✅ Zwiększone z 2 na 4
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8, // ✅ Zwiększone z 6 na 8
  },
  balanceAmount: {
    fontSize: 36, // ✅ Zwiększone z 32 na 36
    fontWeight: 'bold',
    color: '#16a34a',
    letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: 18, // ✅ Zwiększone z 16 na 18
    fontWeight: '700',
    color: '#16a34a',
    opacity: 0.7,
  },

  divider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginBottom: 12,
  },

  // Level Progress
  levelContainer: {
    marginBottom: 12,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fbbf24',
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
  },
  levelXPText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716c',
  },
  progressBarContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e7e5e4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  statsRowCompact: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItemCompact: {
    flex: 1,
    flexDirection: 'row', // ✅ Dodane - wszystko w jednej linii
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8, // ✅ Zwiększone z 4 na 8
  },
  statIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueCompact: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  statLabelCompact: {
    fontSize: 11,
    color: '#78716c',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e7e5e4',
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
  // Settings Screen Styles
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
    letterSpacing: -0.5,
  },
  settingsContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  settingsScrollContent: {
    paddingBottom: 40,
  },
  settingsScrollView: {
    flex: 1,
  },
  settingsHeaderSection: {
    paddingTop: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
    position: 'relative',
  },
  backButtonFloating: {
    position: 'absolute',
    top: 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  settingsHeaderContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  settingsTitleLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 6,
    textAlign: 'center',
  },
  settingsSubtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  settingsItemsContainer: {
    paddingHorizontal: 16,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#78716c',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  logoutIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fecaca',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },

  // ❌ USUŃ stare style:
  // settingsHeader, backButton, settingsTitle, settingsContent, settingsScrollContent (stary)
});