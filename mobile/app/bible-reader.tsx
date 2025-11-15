import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ChevronLeft } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface BibleChapter {
  book_name: string;
  chapter: number;
  verses: Array<{
    verse: number;
    text: string;
  }>;
}

interface BibleStructure {
  books: string[];
  chapters_per_book: { [key: string]: number };
}

export default function BibleReaderScreen() {
  const [bibleStructure, setBibleStructure] = useState<BibleStructure | null>(null);
  const [selectedBook, setSelectedBook] = useState('John');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [content, setContent] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [structureLoading, setStructureLoading] = useState(true);

  useEffect(() => {
    loadBibleStructure();
  }, []);

  useEffect(() => {
    if (bibleStructure) {
      loadChapter();
    }
  }, [selectedBook, selectedChapter, bibleStructure]);

  const loadBibleStructure = async () => {
    try {
      setStructureLoading(true);
      const response = await fetch(`${API_URL}/api/bible/books`);
      if (response.ok) {
        const data = await response.json();
        setBibleStructure({
          books: data.books,
          chapters_per_book: data.chapters_per_book
        });
      }
    } catch (error) {
      console.error('Error loading Bible structure:', error);
    } finally {
      setStructureLoading(false);
    }
  };

  const loadChapter = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/bible/chapter?book=${encodeURIComponent(selectedBook)}&chapter=${selectedChapter}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setContent(data);
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  if (structureLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={styles.loadingText}>Loading Bible...</Text>
      </View>
    );
  }

  if (!bibleStructure) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load Bible structure</Text>
      </View>
    );
  }

  const maxChapters = bibleStructure.chapters_per_book[selectedBook] || 1;
  const chapters = Array.from({ length: maxChapters }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#78350f20', '#44403c30', '#78350f25']} style={styles.gradient}>
        <Animated.View entering={FadeInDown} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1c1917" />
          </Pressable>
          <View style={styles.headerContent}>
            <View style={styles.iconContainer}>
              <BookOpen size={32} color="#92400e" />
            </View>
            <Text style={styles.title}>Bible Reader</Text>
            <Text style={styles.subtitle}>Read any book and chapter</Text>
          </View>
        </Animated.View>

        {/* Selectors */}
        <View style={styles.selectors}>
          <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.selectorCard}>
            <Text style={styles.selectorLabel}>Book</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBook}
                onValueChange={(value) => {
                  setSelectedBook(value);
                  setSelectedChapter(1);
                }}
                style={styles.picker}
              >
                {bibleStructure.books.map((book) => (
                  <Picker.Item key={book} label={book} value={book} />
                ))}
              </Picker>
            </View>
          </LinearGradient>

          <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.selectorCard}>
            <Text style={styles.selectorLabel}>Chapter</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedChapter}
                onValueChange={(value) => setSelectedChapter(value)}
                style={styles.picker}
              >
                {chapters.map((ch) => (
                  <Picker.Item key={ch} label={ch.toString()} value={ch} />
                ))}
              </Picker>
            </View>
          </LinearGradient>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#92400e" />
            </View>
          ) : content ? (
            <Animated.View entering={FadeInDown.delay(100)}>
              <LinearGradient colors={['#ffffff', '#fafaf9']} style={styles.contentCard}>
                <View style={styles.contentHeader}>
                  <Text style={styles.reference}>
                    {content.book_name} {content.chapter}
                  </Text>
                </View>

                <View style={styles.verses}>
                  {content.verses.map((verse, index) => (
                    <View key={index} style={styles.verseContainer}>
                      <Text style={styles.verseNumber}>{verse.verse}</Text>
                      <Text style={styles.verseText}>{verse.text}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </Animated.View>
          ) : null}
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#78716c',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    paddingHorizontal: 32,
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
  selectors: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  selectorCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  reference: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400e',
    textAlign: 'center',
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