import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Quote, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useRandomQuote } from '@/hooks/useBible';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RandomQuoteScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();

  // ✅ Użyj hooka
  const { quote, loading, refreshing, refresh } = useRandomQuote();

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
        <Text style={styles.loadingText}>{t.quote.loadingInspiration}</Text>
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
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <Pressable 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#1c1917" />
            </Pressable>
            
            <Animated.View style={[styles.headerContent, { opacity: fadeAnim }]}>
              <View style={styles.titleRow}>
                <Quote size={28} color="#92400e" strokeWidth={2} />
                <Text style={styles.title}>{t.quote.randomQuote}</Text>
              </View>
              <Text style={styles.subtitle}>{t.quote.getInspiredByScripture}</Text>
            </Animated.View>
          </Animated.View>

          {/* ✅ Quote Card - zaraz pod headerem */}
          <View style={styles.content}>
            {quote && (
              <Animated.View style={{ opacity: fadeAnim }}>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
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