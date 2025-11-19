import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, Share, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Quote, ArrowLeft, RefreshCw, Share2, Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useRandomQuote } from '@/hooks/useBible';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RandomQuoteScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);

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

  if (!quote) {
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
                <Quote size={48} color="#92400e" strokeWidth={2} />
                <Text style={styles.errorPromptTitle}>Unable to load quote</Text>
                <Text style={styles.errorPromptSubtitle}>
                 {t.bibleReader.checkConnection}
                </Text>
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

  const handleShare = async () => {
    if (!quote) return;
    try {
      await Share.share({
        message: `"${quote.text}"\n\n- ${quote.reference}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSave = () => {
    setSaved(!saved);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ✅ Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <Pressable 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#1c1917" />
            </Pressable>

            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Quote size={28} color="#92400e" strokeWidth={2} />
                <Text style={styles.title}>{t.quote.randomQuote}</Text>
              </View>
              <Text style={styles.subtitle}>{t.quote.getInspiredByScripture}</Text>
            </View>
          </Animated.View>

          {/* ✅ Quote Card - zaraz pod headerem */}
          {quote && (
            <Animated.View style={[styles.contentSection, { opacity: fadeAnim }]}>
              <View style={styles.quoteCard}>
                <LinearGradient
                  colors={['#ffffff', '#fafaf9']}
                  style={styles.quoteGradient}
                >
                  <Text style={styles.quoteText}>"{quote.text}"</Text>
                  <View style={styles.quoteFooter}>
                    <Text style={styles.quoteReference}>{quote.reference}</Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <Pressable style={styles.actionButton} onPress={handleSave}>
                      <Heart 
                        size={20} 
                        color={saved ? '#dc2626' : '#78716c'} 
                        fill={saved ? '#dc2626' : 'none'}
                      />
                      <Text style={[styles.actionText, saved && styles.actionTextActive]}>
                        {saved ? t.quote.saved : t.quote.save}
                      </Text>
                    </Pressable>

                    <Pressable style={styles.actionButton} onPress={handleShare}>
                      <Share2 size={20} color="#78716c" />
                      <Text style={styles.actionText}>{t.quote.share}</Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          )}
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
  },

  // Header
  header: {
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
  subtitle: {
    fontSize: 13,
    color: '#78716c',
    textAlign: 'center',
  },

  // ✅ Content Section - zaraz pod headerem
  contentSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  quoteCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 16,
  },
  quoteGradient: {
    padding: 32,
  },
  quoteText: {
    fontSize: 22,
    lineHeight: 34,
    color: '#1c1917',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  quoteFooter: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  quoteReference: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },

  // Actions
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fafaf9',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78716c',
  },
  actionTextActive: {
    color: '#dc2626',
  },

  // ✅ Refresh Button - pod kartą
  refreshButtonBottom: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    fontWeight: '700',
    color: '#ffffff',
  },

  // Error State
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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