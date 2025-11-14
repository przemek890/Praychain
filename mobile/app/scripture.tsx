import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Check, Heart } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { router } from 'expo-router';
import { useState } from 'react';

export default function ScriptureScreen() {
  const { t } = useLanguage();
  const [isReading, setIsReading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const todaysReading = {
    title: 'Ewangelia według św. Jana',
    reference: 'J 14, 1-6',
    text: `„Niech się nie trwoży serce wasze. Wierzycie w Boga? I we Mnie wierzcie! W domu Ojca mego jest mieszkań wiele. Gdyby tak nie było, to bym wam powiedział. Idę przecież przygotować wam miejsce. A gdy odejdę i przygotuję wam miejsce, przyjdę powtórnie i zabiorę was do siebie, abyście i wy byli tam, gdzie Ja jestem. Znacie drogę, dokąd Ja idę." Odezwał się do Niego Tomasz: „Panie, nie wiemy, dokąd idziesz. Jak więc możemy znać drogę?" Odpowiedział mu Jezus: „Ja jestem drogą i prawdą, i życiem. Nikt nie przychodzi do Ojca inaczej jak tylko przeze Mnie."`,
    date: '14 listopada 2024',
  };

  const handleRead = () => {
    setIsReading(true);
  };

  const handleComplete = () => {
    setIsCompleted(true);
    setTimeout(() => {
      router.back();
    }, 2000);
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
            <BookOpen size={48} color="#92400e" />
            <Text style={styles.title}>{t.scripture.title}</Text>
            <Text style={styles.subtitle}>{todaysReading.date}</Text>
          </Animated.View>

          {/* Reading Card */}
          <Animated.View entering={FadeInDown.delay(100)}>
            <LinearGradient
              colors={['#ffffff', '#fafaf9']}
              style={styles.readingCard}
            >
              <Text style={styles.readingTitle}>{todaysReading.title}</Text>
              <Text style={styles.readingReference}>{todaysReading.reference}</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.readingText}>{todaysReading.text}</Text>
            </LinearGradient>
          </Animated.View>

          {/* Action Buttons */}
          {!isCompleted && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.actions}>
              {!isReading ? (
                <Pressable style={styles.primaryButton} onPress={handleRead}>
                  <LinearGradient
                    colors={['#d97706', '#92400e']}
                    style={styles.buttonGradient}
                  >
                    <BookOpen size={24} color="#ffffff" />
                    <Text style={styles.buttonText}>{t.scripture.startReading}</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable style={styles.primaryButton} onPress={handleComplete}>
                  <LinearGradient
                    colors={['#16a34a', '#15803d']}
                    style={styles.buttonGradient}
                  >
                    <Check size={24} color="#ffffff" />
                    <Text style={styles.buttonText}>{t.scripture.complete}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </Animated.View>
          )}

          {/* Success Message */}
          {isCompleted && (
            <Animated.View entering={FadeInDown} style={styles.successCard}>
              <LinearGradient
                colors={['#dcfce7', '#bbf7d0']}
                style={styles.successGradient}
              >
                <Check size={48} color="#16a34a" />
                <Text style={styles.successTitle}>{t.scripture.completed}</Text>
                <Text style={styles.successPoints}>+2 🪙</Text>
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
  },
  readingCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  readingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 8,
  },
  readingReference: {
    fontSize: 16,
    color: '#92400e',
    fontWeight: '600',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginBottom: 16,
  },
  readingText: {
    fontSize: 16,
    lineHeight: 28,
    color: '#44403c',
  },
  actions: {
    marginBottom: 32,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  successCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
  },
  successGradient: {
    alignItems: 'center',
    padding: 32,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
    marginTop: 16,
    marginBottom: 8,
  },
  successPoints: {
    fontSize: 20,
    fontWeight: '600',
    color: '#15803d',
  },
});