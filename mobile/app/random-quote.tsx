import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Quote, ArrowLeft, RefreshCw } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
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
        <Text style={styles.loadingText}>Loading inspiration...</Text>
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
          {/* ✅ Header - niżej na ekranie */}
          <Animated.View entering={FadeInDown} style={styles.headerSection}>
            <Pressable 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#92400e" strokeWidth={2.5} />
            </Pressable>

            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Quote size={40} color="#92400e" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Random Quote</Text>
              <Text style={styles.subtitle}>Get inspired by scripture</Text>
            </View>
          </Animated.View>

          {/* ✅ Quote Card - zaraz pod headerem */}
          <View style={styles.content}>
            {quote && (
              <Animated.View entering={FadeInDown.delay(200)}>
                <LinearGradient 
                  colors={['#b45309', '#92400e']} 
                  style={styles.quoteCard}
                >
                  <Text style={styles.quoteText}>{quote.text}</Text>
                  
                  <View style={styles.quoteFooter}>
                    <View style={styles.quoteDivider} />
                    <Text style={styles.quoteReference}>{quote.reference}</Text>
                  </View>

                  {quote.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{quote.category}</Text>
                    </View>
                  )}
                </LinearGradient>
              </Animated.View>
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

  // ✅ Header - zwiększony paddingTop
  headerSection: {
    paddingTop: 60, // ✅ ZMIENIONE z 20 na 60
    paddingHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60, // ✅ ZMIENIONE z 20 na 60
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
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },

  // ✅ Content Area - bez justifyContent center
  content: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 20,
  },

  // ✅ Quote Card - jaśniejszy gradient
  quoteCard: {
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  quoteText: {
    fontSize: 18,
    lineHeight: 30,
    color: '#ffffff',
    fontStyle: 'italic',
    fontWeight: '400',
    marginBottom: 24,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  quoteFooter: {
    alignItems: 'flex-end',
  },
  quoteDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#fcd34d',
    marginBottom: 10,
    borderRadius: 1,
    opacity: 0.6,
  },
  quoteReference: {
    fontSize: 15,
    color: '#fcd34d',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryBadge: {
    backgroundColor: 'rgba(252, 211, 77, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(252, 211, 77, 0.3)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fcd34d',
    textTransform: 'capitalize',
  },

  // ✅ Refresh Button - jaśniejszy gradient
  refreshButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#d97706',
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
    paddingVertical: 18,
  },
  refreshText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});