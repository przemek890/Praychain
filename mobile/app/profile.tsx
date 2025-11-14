import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Globe, LogOut, ChevronRight, User } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { router } from 'expo-router';
import { useState } from 'react';

export default function ProfileScreen() {
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  const userStats = {
    name: 'Anna',
    level: 12,
    tokens: 245,
    totalPrayers: 47,
    streak: 4,
    joinDate: 'Wrzesień 2024',
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        {/* Back Button */}
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>

        {/* Profile Header */}
        <Animated.View entering={FadeInDown} style={styles.profileHeader}>
          <LinearGradient
            colors={['#fde68a', '#fcd34d']}
            style={styles.avatar}
          >
            <User size={48} color="#44403c" />
          </LinearGradient>
          <Text style={styles.userName}>{userStats.name}</Text>
          <Text style={styles.joinDate}>{t.profile.memberSince} {userStats.joinDate}</Text>
        </Animated.View>

        {/* Level & Tokens Card */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={['#ffffff', '#fafaf9']}
            style={styles.card}
          >
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{userStats.level}</Text>
                <Text style={styles.statLabel}>{t.profile.level}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{userStats.tokens}</Text>
                <Text style={styles.statLabel}>{t.profile.tokens}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Settings Options */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.settingsContainer}>
          <Pressable
            style={styles.settingItem}
            onPress={() => setShowLanguageSelector(!showLanguageSelector)}
          >
            <View style={styles.settingLeft}>
              <Globe size={24} color="#92400e" />
              <Text style={styles.settingText}>{t.profile.language}</Text>
            </View>
            <ChevronRight size={20} color="#78716c" />
          </Pressable>

          {showLanguageSelector && (
            <View style={styles.languageSelector}>
              <LanguageOption
                label="Polski"
                code="pl"
                isActive={language === 'pl'}
                onSelect={() => setLanguage('pl')}
              />
              <LanguageOption
                label="English"
                code="en"
                isActive={language === 'en'}
                onSelect={() => setLanguage('en')}
              />
              <LanguageOption
                label="Español"
                code="es"
                isActive={language === 'es'}
                onSelect={() => setLanguage('es')}
              />
            </View>
          )}
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <Pressable style={styles.logoutButton}>
            <LogOut size={20} color="#dc2626" />
            <Text style={styles.logoutText}>{t.profile.logout}</Text>
          </Pressable>
        </Animated.View>
      </LinearGradient>
    </ScrollView>
  );
}

function LanguageOption({ label, code, isActive, onSelect }: any) {
  return (
    <Pressable
      style={[styles.languageOption, isActive && styles.languageOptionActive]}
      onPress={onSelect}
    >
      <Text style={[styles.languageText, isActive && styles.languageTextActive]}>
        {label}
      </Text>
      {isActive && <Text style={styles.checkmark}>✓</Text>}
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
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backText: {
    fontSize: 24,
    color: '#1c1917',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: '#78716c',
  },
  card: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e7e5e4',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#78716c',
  },
  settingsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#1c1917',
    fontWeight: '500',
  },
  languageSelector: {
    borderTopWidth: 1,
    borderTopColor: '#e7e5e4',
    paddingVertical: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingLeft: 52,
  },
  languageOptionActive: {
    backgroundColor: '#fef3c7',
  },
  languageText: {
    fontSize: 15,
    color: '#44403c',
  },
  languageTextActive: {
    fontWeight: '600',
    color: '#92400e',
  },
  checkmark: {
    fontSize: 18,
    color: '#92400e',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 16,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
});