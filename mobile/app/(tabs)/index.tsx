import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Settings, BookOpen, Quote, Calendar, RefreshCw, Flame, Globe, FileText, Shield, HelpCircle, Info, LogOut, ChevronRight, ArrowLeft, Wallet } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/expo';
import { useUserData } from '@/hooks/useUserData';

const calculateLevel = (totalEarned: number) => {
  const baseXP = 100;
  const multiplier = 1.5;
  
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
  const { logout, user } = usePrivy();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { userData, dailyQuote, loading, refreshing, refreshQuote, refresh, username } = useUserData();

  useFocusEffect(
    useCallback(() => {
      console.log('Home tab focused - refreshing user data');
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const handleLogout = async () => {
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

  // ✅ Użyj username z hooka (pierwsze część emaila przed @)
  const displayName = username || 'Guest';
  const tokens = userData?.tokens_balance || 0;
  const streak = userData?.streak_days || 0;
  const prayersCount = userData?.prayers_count || 0;
  const totalEarned = userData?.total_earned || 0;
  
  const levelData = calculateLevel(totalEarned);

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
            <Animated.View style={[styles.settingsHeaderSection, { opacity: fadeAnim }]}>
              <Pressable 
                onPress={() => setSettingsVisible(false)} 
                style={styles.backButtonFloating}
              >
                <ArrowLeft size={24} color="#92400e" strokeWidth={2.5} />
              </Pressable>

              <View style={styles.settingsHeaderContent}>
                <View style={styles.titleRow}>
                  <Settings size={32} color="#92400e" strokeWidth={2} />
                  <Text style={styles.settingsTitleLarge}>Settings</Text>
                </View>
                <Text style={styles.settingsSubtitle}>Manage your preferences</Text>
              </View>
            </Animated.View>

            <View style={styles.settingsItemsContainer}>
              {/* Wallet Info */}
              {user?.wallet && (
                <View>
                  <View style={styles.walletCard}>
                    <View style={styles.walletHeader}>
                      <View style={styles.walletIconWrapper}>
                        <Wallet size={20} color="#92400e" strokeWidth={2.5} />
                      </View>
                      <View style={styles.walletContent}>
                        <Text style={styles.walletTitle}>Connected Wallet</Text>
                        <Text style={styles.walletAddress}>
                          {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                        </Text>
                        {user.wallet.chainId && (
                          <Text style={styles.walletChain}>
                            Chain ID: {user.wallet.chainId}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Email Info */}
              {user?.email && (
                <View>
                  <View style={styles.emailCard}>
                    <View style={styles.emailHeader}>
                      <View style={styles.emailIconWrapper}>
                        <User size={20} color="#92400e" strokeWidth={2.5} />
                      </View>
                      <View style={styles.emailContent}>
                        <Text style={styles.emailTitle}>Email</Text>
                        <Text style={styles.emailAddress}>{user.email.address}</Text>
                        <Text style={styles.usernameText}>Username: {displayName}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <View>
                <SettingItem
                  icon={Globe}
                  title="App Language"
                  subtitle="English"
                  onPress={() => {}}
                />
              </View>
              
              <View>
                <SettingItem
                  icon={FileText}
                  title="Terms of Service"
                  onPress={() => {}}
                />
              </View>
              
              <View>
                <SettingItem
                  icon={Shield}
                  title="Privacy Policy"
                  onPress={() => {}}
                />
              </View>
              
              <View>
                <SettingItem
                  icon={HelpCircle}
                  title="Help & Support"
                  onPress={() => {}}
                />
              </View>
              
              <View>
                <SettingItem
                  icon={Info}
                  title="About App"
                  subtitle="Version 1.0.0"
                  onPress={() => {}}
                />
              </View>
              
              <View>
                <Pressable 
                  onPress={handleLogout}
                  style={styles.logoutButton}
                >
                  <View style={styles.logoutIconWrapper}>
                    <LogOut size={20} color="#dc2626" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.logoutText}>Log Out</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.userSection}>
              <View style={styles.userInfo}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.userName}>{displayName}</Text>
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

          <Animated.View style={[styles.balanceCardCompact, { opacity: fadeAnim }]}>
            <LinearGradient 
              colors={['#ffffff', '#fafaf9']} 
              style={styles.balanceGradientCompact}
            >
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

              <View style={styles.divider} />

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
            {dailyQuote && (
              <Animated.View style={{ opacity: fadeAnim }}>
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
                gradient={['#78350f', '#451a03']}
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
    <Pressable
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
    </Pressable>
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
  balanceCardCompact: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  balanceGradientCompact: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  balanceIconCompact: {
    width: 56,
    height: 56,
    borderRadius: 16,
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
    width: 40,
    height: 40,
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#16a34a',
    letterSpacing: -1,
  },
  balanceCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16a34a',
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginBottom: 12,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  settingsScrollView: {
    flex: 1,
  },
  settingsScrollContent: {
    paddingBottom: 40,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  walletCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#fef3c7',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  walletContent: {
    flex: 1,
  },
  walletTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1917',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  walletChain: {
    fontSize: 12,
    color: '#a8a29e',
    fontWeight: '500',
  },
  emailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#e0e7ff',
  },
  emailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emailContent: {
    flex: 1,
  },
  emailTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  emailAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 12,
    color: '#78716c',
    fontWeight: '500',
  },
});