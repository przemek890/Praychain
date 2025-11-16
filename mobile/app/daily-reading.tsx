import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ArrowLeft, Calendar } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface DailyReading {
  book_name: string;
  chapter: number;
  verses: Array<{
    verse: number;
    text: string;
  }>;
  date: string;
  reference: string;
}

export default function DailyReadingScreen() {
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDailyReading();
  }, []);

  const loadDailyReading = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/bible/daily-reading`);
      
      if (!response.ok) {
        throw new Error(`Failed to load daily reading: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Daily reading loaded:', data.reference);
      setReading(data);
    } catch (err) {
      console.error('Error loading daily reading:', err);
      setError(err instanceof Error ? err.message : 'Failed to load daily reading');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={styles.loadingText}>Loading today's passage...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadDailyReading}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.headerSection}>
            <Pressable 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#92400e" strokeWidth={2.5} />
            </Pressable>

            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <BookOpen size={40} color="#92400e" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Daily Reading</Text>
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

          {/* Content */}
          <View style={styles.content}>
            {reading && (
              <>
                {/* Reference Card */}
                <Animated.View entering={FadeInDown.delay(150)}>
                  <LinearGradient 
                    colors={['#d97706', '#b45309']} 
                    style={styles.referenceCard}
                  >
                    <Text style={styles.referenceText}>{reading.reference}</Text>
                    <Text style={styles.verseCountText}>
                      {reading.verses.length} verse{reading.verses.length !== 1 ? 's' : ''}
                    </Text>
                  </LinearGradient>
                </Animated.View>

                {/* Verses Card */}
                <Animated.View entering={FadeInDown.delay(200)}>
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
  headerContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 8,
    textAlign: 'center',
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
});