import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import { API_CONFIG, ENDPOINTS, apiFetch } from '@/config/api';

export interface Quote {
  text: string;
  reference: string;
  category?: string;
}

export interface DailyReading {
  reference: string;
  verses: Array<{
    chapter: number;
    verse: number;
    text: string;
  }>;
  book_name: string;
}

export interface BibleVerse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleStructure {
  books: string[];
  books_with_names?: Array<{ id: string; name: string; chapters: number }>;
  chapters_per_book: { [key: string]: number };
}

export interface BibleChapter {
  book_name: string;
  chapter: number;
  verses: Array<{
    verse: number;
    text: string;
  }>;
}

export function useRandomQuote() {
  const { language } = useLanguage();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRandomQuote = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      setQuote(null);
    } else {
      setLoading(true);
    }

    try {
      const response = await apiFetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.BIBLE_RANDOM_QUOTE}?lang=${language}`
      );
      if (!response.ok) throw new Error('Failed to fetch random quote');
      
      const data = await response.json();
      
      setQuote({
        text: data.text,
        reference: data.reference,
        category: data.category,
      });
    } catch (error) {
      console.error('Error fetching random quote:', error);
      setQuote(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRandomQuote();
  }, [language]);

  const refresh = () => {
    fetchRandomQuote(true);
  };

  return { quote, loading, refreshing, refresh };
}

export function useDailyReading() {
  const { language, t } = useLanguage();
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReading = async () => {
    setLoading(true);
    setError(null);
    setReading(null);
    
    try {
      const response = await apiFetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.BIBLE_DAILY_READING}?lang=${language}`
      );
      if (!response.ok) throw new Error('Failed to fetch daily reading');
      
      const data = await response.json();
      setReading(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching daily reading:', err);
      setError(t.bibleReader.checkConnection);
      setReading(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReading();
  }, [language]);

  const refresh = () => {
    fetchReading();
  };

  return { reading, loading, error, refresh };
}

export function useBibleStructure() {
  const { language } = useLanguage();
  const [structure, setStructure] = useState<BibleStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStructure = async () => {
    setLoading(true);
    setError(null);
    setStructure(null);
    
    try {
      const response = await apiFetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.BIBLE_BOOKS}?lang=${language}`
      );
      if (response.ok) {
        const data = await response.json();
        
        const booksWithChapters = data.books.map((book: any) => ({
          id: book.id,
          name: book.name,
          chapters: book.chapters || 1
        }));
        
        setStructure({ 
          books: booksWithChapters.map((b: any) => b.id),
          books_with_names: booksWithChapters,
          chapters_per_book: Object.fromEntries(
            booksWithChapters.map((b: any) => [b.id, b.chapters])
          )
        });
        setError(null);
      } else {
        setError('Failed to load Bible structure');
        setStructure(null);
      }
    } catch (err) {
      console.error('Error loading Bible structure:', err);
      setError('Failed to load Bible structure');
      setStructure(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStructure();
  }, [language]);

  return {
    structure,
    loading,
    error,
    refresh: loadStructure,
  };
}

export function useBibleChapter(book: string, chapter: number) {
  const { language } = useLanguage();
  const [content, setContent] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (book && chapter) {
      loadChapter();
    }
  }, [book, chapter, language]);

  const loadChapter = async () => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      setContent(null);

      const response = await apiFetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.BIBLE_CHAPTER}?book=${encodeURIComponent(book)}&chapter=${chapter}&lang=${language}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setContent(data);
        setError(null);
      } else {
        setError('Failed to load chapter');
        setContent(null);
      }
    } catch (err) {
      console.error('Error loading chapter:', err);
      setError('Failed to load chapter');
      setContent(null);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  return {
    content,
    loading,
    error,
    refresh: loadChapter,
  };
}