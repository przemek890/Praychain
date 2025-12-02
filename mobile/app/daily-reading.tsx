import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ArrowLeft, Calendar, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useDailyReading } from '@/hooks/useBible';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DailyReadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  const { reading, loading, error, refresh } = useDailyReading();

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
        <Text style={styles.loadingText}>{t.dailyReading.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
          <Pressable 
            onPress={() => router.back()} 
            style={styles.backButtonFloat}
          >
            <ArrowLeft size={24} color="#1c1917" />
          </Pressable>

          <View style={styles.centerContent}>
            <View style={styles.errorPromptCard}>
              <LinearGradient
                colors={['#ffffff', '#fafaf9']}
                style={styles.errorPromptGradient}
              >
                <BookOpen size={48} color="#92400e" strokeWidth={2} />
                <Text style={styles.errorPromptTitle}>{t.dailyReading.error}</Text>
                <Text style={styles.errorPromptSubtitle}>{error}</Text>
                <Pressable style={styles.retryButtonError} onPress={refresh}>
                  <LinearGradient colors={['#92400e', '#78350f']} style={styles.retryButtonGradient}>
                    <RefreshCw size={16} color="#ffffff" />
                    <Text style={styles.retryButtonText}>{t.dailyReading.retry}</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
        <ScrollView>
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <Pressable 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#1c1917" />
            </Pressable>

            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <BookOpen size={28} color="#92400e" strokeWidth={2} />
                <Text style={styles.title}>{t.dailyReading.title}</Text>
              </View>
              <View style={styles.dateContainer}>
                <Calendar size={14} color="#78716c" />
                <Text style={styles.subtitle}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={styles.content}>
            {reading && (
              <>
                <Animated.View style={{ opacity: fadeAnim }}>
                  <LinearGradient colors={['#d97706', '#b45309']} style={styles.referenceCard}>
                    <Text style={styles.referenceText}>{reading.reference}</Text>
                    <Text style={styles.verseCountText}>
                      {reading.verses.length} {reading.verses.length === 1 ? t.dailyReading.verse : t.dailyReading.verses}
                    </Text>
                  </LinearGradient>
                </Animated.View>

                {/* Verses Card */}
                <Animated.View style={{ opacity: fadeAnim }}>
                  <View style={styles.versesCard}>
                    {reading.verses.map((verse, index) => (
                      <View key={index} style={styles.verseRow}>
                        <View style={styles.verseNumberCircle}>
                          <Text style={styles.verseNumber}>{verse.verse}</Text>
                        </View>
                        <Text style={styles.verseText}>{verse.text}</Text>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              </>
            )}
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#92400e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Header
  headerSection: {
    paddingTop: 60,
    paddingHorizontal: 16,
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
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
  backButtonFloat: {
    position: 'absolute',
    top: 60,
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
  headerContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 16,
  },

  // Reference Card - kompaktowa, pomarańczowa
  referenceCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  referenceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  verseCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Verses Card - białe tło, czytelne
  versesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  verseRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  verseNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fcd34d',
    marginTop: 2,
  },
  verseNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    color: '#1c1917',
    letterSpacing: 0.1,
  },
  errorPromptCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 400,
  },
  errorPromptGradient: {
    padding: 32,
    alignItems: 'center',
  },
  errorPromptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorPromptSubtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButtonError: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});