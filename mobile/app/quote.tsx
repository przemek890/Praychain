import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Quote as QuoteIcon, Heart, Share2, Check } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { router } from 'expo-router';
import { useState } from 'react';

export default function QuoteScreen() {
  const { t } = useLanguage();
  const [isSaved, setIsSaved] = useState(false);
  const [showReward, setShowReward] = useState(false);

  const dailyQuote = {
    text: t.quote.text,
    source: t.quote.source,
    author: t.quote.author,
  };

  const handleSave = () => {
    setIsSaved(true);
    if (!showReward) {
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2000);
    }
  };

  const handleShare = () => {
    if (!showReward) {
      setShowReward(true);
      setTimeout(() => setShowReward(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
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

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={FadeInDown} style={styles.header}>
            <QuoteIcon size={48} color="#92400e" />
            <Text style={styles.title}>{t.quote.dailyQuote}</Text>
            <Text style={styles.subtitle}>{t.quote.subtitle}</Text>
          </Animated.View>

          {/* Quote Card */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <LinearGradient
              colors={['#ffffff', '#fafaf9']}
              style={styles.quoteCard}
            >
              <QuoteIcon size={32} color="#d97706" style={styles.quoteIcon} />
              <Text style={styles.quoteText}>{dailyQuote.text}</Text>
              <View style={styles.divider} />
              <Text style={styles.quoteSource}>{dailyQuote.source}</Text>
              <Text style={styles.quoteAuthor}>{dailyQuote.author}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.actions}>
            <Pressable
              style={[styles.actionButton, isSaved && styles.actionButtonActive]}
              onPress={handleSave}
            >
              <LinearGradient
                colors={isSaved ? ['#16a34a', '#15803d'] : ['#d97706', '#92400e']}
                style={styles.actionGradient}
              >
                {isSaved ? (
                  <Check size={24} color="#ffffff" />
                ) : (
                  <Heart size={24} color="#ffffff" />
                )}
                <Text style={styles.actionText}>
                  {isSaved ? t.quote.saved : t.quote.save}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.actionButton} onPress={handleShare}>
              <LinearGradient
                colors={['#78716c', '#57534e']}
                style={styles.actionGradient}
              >
                <Share2 size={24} color="#ffffff" />
                <Text style={styles.actionText}>{t.quote.share}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Reward Message */}
          {showReward && (
            <Animated.View entering={FadeIn} style={styles.rewardCard}>
              <LinearGradient
                colors={['#dcfce7', '#bbf7d0']}
                style={styles.rewardGradient}
              >
                <Check size={32} color="#16a34a" />
                <Text style={styles.rewardText}>+1 🪙</Text>
              </LinearGradient>
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
  scrollView: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1c1917',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },
  quoteCard: {
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    position: 'relative',
  },
  quoteIcon: {
    position: 'absolute',
    top: 16,
    left: 16,
    opacity: 0.2,
  },
  quoteText: {
    fontSize: 22,
    lineHeight: 36,
    color: '#1c1917',
    fontWeight: '500',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  divider: {
    height: 2,
    backgroundColor: '#d97706',
    width: 60,
    marginBottom: 16,
  },
  quoteSource: {
    fontSize: 16,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 4,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#78716c',
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonActive: {
    shadowOpacity: 0.25,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  rewardCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  rewardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  rewardText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
  },
});