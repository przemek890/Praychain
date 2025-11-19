import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '@/config/api'; // ✅ DODAJ IMPORT

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
  chapters_per_book: Record<string, number>;
}

export interface BibleChapter {
  book_name: string;
  chapter: number;
  verses: Array<{
    verse: number;
    text: string;
  }>;
}

// ✅ POPRAWIONE - useRandomQuote
export function useRandomQuote() {
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
      // ✅ ZMIEŃ: użyj API_CONFIG.BASE_URL
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/bible/random-quote`);
      if (!response.ok) throw new Error('Failed to fetch random quote');
      
      const data = await response.json();
      
      setQuote({
        text: data.text,
        reference: `${data.book_name} ${data.chapter}:${data.verse}`,
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
  }, []);

  const refresh = () => {
    setLoading(true);
    fetchRandomQuote(true);
  };

  return { quote, loading, refreshing, refresh };
}

// ✅ POPRAWIONE - useDailyReading
export function useDailyReading() {
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const fetchReading = async () => {
    setLoading(true);
    setError(null);
    setReading(null);
    
    try {
      // ✅ ZMIEŃ: użyj API_CONFIG.BASE_URL
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/bible/daily-reading`);
      if (!response.ok) throw new Error('Failed to fetch daily reading');
      
      const data = await response.json();
      setReading(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching daily reading:', err);
      setError(`${t.bibleReader.checkConnection}`);
      setReading(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReading();
  }, []);

  const refresh = () => {
    fetchReading();
  };

  return { reading, loading, error, refresh };
}

// ✅ POPRAWIONE - useBibleStructure
export function useBibleStructure() {
  const [structure, setStructure] = useState<BibleStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStructure = async () => {
    setLoading(true);
    setError(null);
    setStructure(null);
    
    try {
      // ✅ ZMIEŃ: użyj API_CONFIG.BASE_URL
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/bible/books`);
      if (response.ok) {
        const data = await response.json();
        setStructure({
          books: data.books,
          chapters_per_book: data.chapters_per_book
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
  }, []);

  return {
    structure,
    loading,
    error,
    refresh: loadStructure,
  };
}

export function useBibleChapter(book: string, chapter: number) {
  const [content, setContent] = useState<BibleChapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (book && chapter) {
      loadChapter();
    }
  }, [book, chapter]);

  const loadChapter = async () => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      setContent(null);

      // ✅ ZMIEŃ: użyj API_CONFIG.BASE_URL
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/bible/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}`
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