import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Lock, Star, Award } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useRef } from 'react';
import { useAchievements, Achievement } from '@/hooks/useAchievements';
import { ActivityIndicator } from 'react-native';

export default function AchievementsScreen() {
  const { t } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { achievements, loading } = useAchievements();

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={styles.loadingText}>{t.achievements.loading}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#78350f20', '#44403c30', '#78350f25']}
        style={styles.gradient}
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.titleRow}>
            <Trophy size={32} color="#92400e" strokeWidth={2} />
            <Text style={styles.title}>{t.nav.achievements}</Text>
          </View>
          <Text style={styles.subtitle}>{t.achievements.subtitle}</Text>
        </Animated.View>

        {/* Achievements List */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <View style={styles.sectionHeader}>
              <Award size={20} color="#92400e" />
              <Text style={styles.sectionTitle}>{t.achievements.yourAchievements}</Text>
            </View>

            {achievements.map((achievement) => (
              <View key={achievement.id}>
                <AchievementCard achievement={achievement} />
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { t } = useLanguage();
  const progressPercent = (achievement.progress / achievement.maxProgress) * 100;

  return (
    <LinearGradient
      colors={['#ffffff', '#fafaf9']}
      style={[
        styles.achievementCard,
        achievement.unlocked && styles.achievementCardUnlocked
      ]}
    >
      <View style={styles.achievementContent}>
        <View style={styles.achievementLeft}>
          <View style={[
            styles.emojiContainer,
            { backgroundColor: achievement.unlocked ? achievement.color : '#e7e5e4' }
          ]}>
            {achievement.unlocked ? (
              <Text style={styles.emoji}>{achievement.emoji}</Text>
            ) : (
              <Lock size={28} color="#78716c" />
            )}
          </View>
        </View>

        <View style={styles.achievementRight}>
          <View style={styles.achievementHeader}>
            <Text style={styles.achievementTitle}>{achievement.title}</Text>
            {achievement.unlocked && (
              <View style={styles.unlockedBadge}>
                <Text style={styles.unlockedText}>✓</Text>
              </View>
            )}
          </View>

          <Text style={styles.achievementDescription}>{achievement.description}</Text>

          {/* Progress Bar */}
          {!achievement.unlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <LinearGradient
                  colors={[achievement.color, achievement.color + '80']}
                  style={[styles.progressFill, { width: `${progressPercent}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressText}>
                {achievement.progress}/{achievement.maxProgress}
              </Text>
            </View>
          )}

          {/* Stats Badge */}
          <View style={styles.statBadge}>
            <Star size={12} color="#92400e" fill="#92400e" />
            <Text style={styles.statText}>
              {achievement.percentUnlocked}% {t.achievements.playersUnlocked}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
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
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#78716c',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
    flex: 1,
  },
  achievementCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementCardUnlocked: {
    borderWidth: 2,
    borderColor: '#fbbf2420',
  },
  achievementContent: {
    flexDirection: 'row',
    gap: 12,
  },
  achievementLeft: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emoji: {
    fontSize: 32,
  },
  achievementRight: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    flex: 1,
  },
  unlockedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '700',
  },
  achievementDescription: {
    fontSize: 13,
    color: '#78716c',
    lineHeight: 18,
    marginBottom: 10,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e7e5e4',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#78716c',
    textAlign: 'right',
    fontWeight: '600',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
});