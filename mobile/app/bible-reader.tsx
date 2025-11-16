import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ArrowLeft, ChevronDown, X } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';

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
  
  // ✅ NOWE - Modal states
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [chapterModalVisible, setChapterModalVisible] = useState(false);

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

  // ✅ NOWE - Handle book selection
  const handleBookSelect = (book: string) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setBookModalVisible(false);
  };

  // ✅ NOWE - Handle chapter selection
  const handleChapterSelect = (chapter: number) => {
    setSelectedChapter(chapter);
    setChapterModalVisible(false);
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
              <Text style={styles.title}>Bible Reader</Text>
              <Text style={styles.subtitle}>Read any book and chapter</Text>
            </View>
          </Animated.View>

          {/* ✅ NOWE Selectors - clickable cards */}
          <View style={styles.selectorsContainer}>
            <Animated.View entering={FadeInDown.delay(150)} style={styles.selectorWrapper}>
              <Pressable onPress={() => setBookModalVisible(true)}>
                <LinearGradient 
                  colors={['#d97706', '#b45309']} 
                  style={styles.selectorCard}
                >
                  <Text style={styles.selectorLabel}>BOOK</Text>
                  <View style={styles.selectorValueRow}>
                    <Text style={styles.selectorValue} numberOfLines={1}>
                      {selectedBook}
                    </Text>
                    <ChevronDown size={20} color="#ffffff" strokeWidth={2.5} />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200)} style={styles.selectorWrapper}>
              <Pressable onPress={() => setChapterModalVisible(true)}>
                <LinearGradient 
                  colors={['#d97706', '#b45309']} 
                  style={styles.selectorCard}
                >
                  <Text style={styles.selectorLabel}>CHAPTER</Text>
                  <View style={styles.selectorValueRow}>
                    <Text style={styles.selectorValue}>{selectedChapter}</Text>
                    <ChevronDown size={20} color="#ffffff" strokeWidth={2.5} />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {loading ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#92400e" />
                <Text style={styles.loadingText}>Loading chapter...</Text>
              </View>
            ) : content ? (
              <Animated.View entering={FadeInDown.delay(250)}>
                <View style={styles.contentCard}>
                  <View style={styles.referenceHeader}>
                    <Text style={styles.reference}>
                      {content.book_name} {content.chapter}
                    </Text>
                    <Text style={styles.verseCount}>
                      {content.verses.length} verse{content.verses.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <View style={styles.verses}>
                    {content.verses.map((verse, index) => (
                      <View key={index} style={styles.verseRow}>
                        <View style={styles.verseNumberCircle}>
                          <Text style={styles.verseNumber}>{verse.verse}</Text>
                        </View>
                        <Text style={styles.verseText}>{verse.text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            ) : null}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* ✅ NOWY Book Selection Modal */}
      <Modal
        visible={bookModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBookModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Book</Text>
              <Pressable onPress={() => setBookModalVisible(false)} style={styles.closeButton}>
                <X size={24} color="#1c1917" strokeWidth={2} />
              </Pressable>
            </View>
            
            <FlatList
              data={bibleStructure.books}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.modalItem,
                    selectedBook === item && styles.modalItemSelected
                  ]}
                  onPress={() => handleBookSelect(item)}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedBook === item && styles.modalItemTextSelected
                  ]}>
                    {item}
                  </Text>
                  {selectedBook === item && (
                    <View style={styles.selectedIndicator} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ✅ NOWY Chapter Selection Modal */}
      <Modal
        visible={chapterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChapterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Chapter</Text>
              <Pressable onPress={() => setChapterModalVisible(false)} style={styles.closeButton}>
                <X size={24} color="#1c1917" strokeWidth={2} />
              </Pressable>
            </View>
            
            <View style={styles.chaptersGrid}>
              {chapters.map((chapter) => (
                <Pressable
                  key={chapter}
                  style={[
                    styles.chapterButton,
                    selectedChapter === chapter && styles.chapterButtonSelected
                  ]}
                  onPress={() => handleChapterSelect(chapter)}
                >
                  <Text style={[
                    styles.chapterButtonText,
                    selectedChapter === chapter && styles.chapterButtonTextSelected
                  ]}>
                    {chapter}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    paddingHorizontal: 32,
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
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
  },

  // Selectors
  selectorsContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  selectorWrapper: {
    flex: 1,
  },
  selectorCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 80,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  selectorValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
  },

  // Content
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  referenceHeader: {
    paddingBottom: 16,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e7e5e4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reference: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  verseCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716c',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  verses: {
    gap: 20,
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

  // ✅ NOWE Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1c1917',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemSelected: {
    backgroundColor: '#fef3c7',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1c1917',
    fontWeight: '500',
  },
  modalItemTextSelected: {
    fontWeight: '700',
    color: '#92400e',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#92400e',
  },

  // ✅ Chapters Grid
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  chapterButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chapterButtonSelected: {
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  chapterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78716c',
  },
  chapterButtonTextSelected: {
    fontWeight: '800',
    color: '#92400e',
  },
});