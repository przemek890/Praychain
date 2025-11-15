import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Quote, ChevronLeft, RefreshCw } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface BibleQuote {
  text: string;
  reference: string;
  book_name: string;
  chapter: number;
  verse: number;
  category?: string;
}

export default function RandomQuoteScreen() {
  const [quote, setQuote] = useState<BibleQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadQuote();
  }, []);

  const loadQuote = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bible/random-quote`);
      if (response.ok) {
        const data = await response.json();
        setQuote(data);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadQuote();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
        <Animated.View entering={FadeInDown} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1c1917" />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <Quote size={32} color="#92400e" />
            </View>
            <Text style={styles.title}>Random Quote</Text>
            <Text style={styles.subtitle}>Get inspired by scripture</Text>
          </View>
        </Animated.View>

        <View style={styles.content}>
          {quote && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.quoteCard}>
                <Text style={styles.quoteText}>"{quote.text}"</Text>
                <Text style={styles.quoteReference}>— {quote.reference}</Text>
                
                {quote.category && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{quote.category}</Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          )}

          <Pressable
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <LinearGradient colors={['#92400e', '#78350f']} style={styles.refreshGradient}>
              <RefreshCw size={20} color="#ffffff" style={refreshing ? { opacity: 0.5 } : {}} />
              <Text style={styles.refreshText}>
                {refreshing ? 'Loading...' : 'New Quote'}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
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
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafaf9',
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#78716c',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  quoteCard: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  quoteText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#44403c',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  quoteReference: {
    fontSize: 14,
    color: '#78716c',
    fontWeight: '600',
    textAlign: 'right',
  },
  categoryBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    textTransform: 'capitalize',
  },
  refreshButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  refreshGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  refreshText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});