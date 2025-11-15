import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Calendar, ChevronLeft } from 'lucide-react-native';
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
}

export default function DailyReadingScreen() {
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDailyReading();
  }, []);

  const loadDailyReading = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bible/daily-reading`);
      if (response.ok) {
        const data = await response.json();
        setReading(data);
      }
    } catch (error) {
      console.error('Error loading daily reading:', error);
    } finally {
      setLoading(false);
    }
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
              <Calendar size={32} color="#92400e" />
            </View>
            <Text style={styles.title}>Daily Reading</Text>
            <Text style={styles.subtitle}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
        </Animated.View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {reading && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.card}>
                <View style={styles.cardHeader}>
                  <BookOpen size={20} color="#92400e" />
                  <Text style={styles.reference}>
                    {reading.book_name} {reading.chapter}
                  </Text>
                </View>

                <View style={styles.verses}>
                  {reading.verses.map((verse, index) => (
                    <View key={index} style={styles.verseContainer}>
                      <Text style={styles.verseNumber}>{verse.verse}</Text>
                      <Text style={styles.verseText}>{verse.text}</Text>
                    </View>
                  ))}
                </View>
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
    marginBottom: 20,
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
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  reference: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400e',
  },
  verses: {
    gap: 16,
  },
  verseContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  verseNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    minWidth: 28,
    textAlign: 'center',
  },
  verseText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: '#44403c',
  },
});