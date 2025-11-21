import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Settings as SettingsIcon, BookOpen, Quote, Calendar, RefreshCw, Flame } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { useSettings } from '@/hooks/useSettings';
import Settings from '../settings';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();
  
  const { userData, dailyQuote, loading, refreshing, refreshQuote, refresh, username } = useUserData();
  const { 
    settingsVisible, 
    settingsData, 
    openSettings, 
    closeSettings, 
    handleLogout 
  } = useSettings();

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

  // ✅ NOWY LOADING SCREEN - wyśrodkowany z gradientem
  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#78350f20', '#44403c30', '#78350f25']}
          style={styles.gradient}
        >
            <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#92400e" />
            </View>
        </LinearGradient>
      </View>
    );
  }

  if (settingsVisible) {
    return (
      <Settings
        visible={settingsVisible}
        onClose={closeSettings}
        onLogout={handleLogout}
        email={settingsData.email}
        username={settingsData.username}
        walletAddress={settingsData.walletAddress}
        walletChain={settingsData.walletChain}
        fadeAnim={fadeAnim}
      />
    );
  }

  const displayName = username || 'Guest';
  const tokens = userData?.tokens_balance || 0;
  const streak = userData?.streak_days || 0;
  const prayersCount = userData?.prayers_count || 0;
  const totalEarned = userData?.total_earned || 0;
  
  const levelData = calculateLevel(totalEarned);

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
                <Text style={styles.greeting}>{t.home.welcomeBack}</Text>
                <Text style={styles.userName}>{displayName}</Text>
              </View>
              <Pressable onPress={openSettings}>
                <LinearGradient
                  colors={['#ffffff', '#fafaf9']}
                  style={styles.userAvatar}
                >
                  <SettingsIcon size={28} color="#92400e" strokeWidth={2.5} />
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
                  <Text style={styles.balanceLabel}>{t.home.yourBalance}</Text>
                  <View style={styles.balanceAmountRow}>
                    <Text style={styles.balanceAmount}>{tokens}</Text>
                    <Text style={styles.balanceCurrency}>{t.home.pray}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.levelContainer}>
                <View style={styles.levelHeader}>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>{t.home.level} {levelData.level}</Text>
                  </View>
                  <Text style={styles.levelXPText}>
                    {levelData.experience}/{levelData.experience_to_next_level} {t.home.xp}
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
                  <Text style={styles.statLabelCompact}>{t.home.prayers}</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItemCompact}>
                  <View style={styles.statIconSmall}>
                    <Flame size={14} color="#dc2626" />
                  </View>
                  <Text style={[styles.statValueCompact, { color: '#dc2626' }]}>{streak}</Text>
                  <Text style={styles.statLabelCompact}>{t.home.dayStreak}</Text>
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
                      <Text style={styles.quoteTitleText}>{t.home.dailyInspiration}</Text>
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

            <Text style={styles.sectionTitle}>{t.home.exploreScripture}</Text>
            <View style={styles.actionsGrid}>
              <ActionCard
                icon={BookOpen}
                title={t.home.dailyReading}
                description={t.home.todaysPassage}
                gradient={['#d97706', '#92400e']}
                onPress={() => router.push('/daily-reading')}
                style={styles.halfCard}
              />
              
              <ActionCard
                icon={Quote}
                title={t.home.randomVerse}
                description={t.home.getInspired}
                gradient={['#78716c', '#57534e']}
                onPress={() => router.push('/random-quote')}
                style={styles.halfCard}
              />

              <ActionCard
                icon={Calendar}
                title={t.home.bibleReader}
                description={t.home.readAnyChapter}
                gradient={['#78350f', '#451a03']}
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

function ActionCard({ icon: Icon, title, description, gradient, onPress, style }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.actionCard, style]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
  },
  // ✅ NOWE STYLE - wyśrodkowany loading
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#78716c',
    fontWeight: '500',
  },
  // ✅ USUNIĘTE stare style
  // loadingContainer: {
  //   flex: 1,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   backgroundColor: '#fafaf9',
  //   gap: 12,
  // },
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
});