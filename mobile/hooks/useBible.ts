import { useState, useEffect, useRef } from 'react';

const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;
const API_URL = `http://${API_HOST}:${API_PORT}`;

export interface BibleVerse {
  verse: number;
  text: string;
}

export interface BibleChapter {
  book_name: string;
  chapter: number;
  verses: BibleVerse[];
}

export interface BibleStructure {
  books: string[];
  chapters_per_book: { [key: string]: number };
}

export interface BibleQuote {
  text: string;
  reference: string;
  book_name: string;
  chapter: number;
  verse: number;
  category?: string;
}

export interface DailyReading {
  book_name: string;
  chapter: number;
  verses: BibleVerse[];
  date: string;
  reference: string;
}

export function useBibleStructure() {
  const [structure, setStructure] = useState<BibleStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStructure();
  }, []);

  const loadStructure = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/bible/books`);
      if (response.ok) {
        const data = await response.json();
        setStructure({
          books: data.books,
          chapters_per_book: data.chapters_per_book
        });
        setError(null);
      } else {
        setError('Failed to load Bible structure');
      }
    } catch (err) {
      console.error('Error loading Bible structure:', err);
      setError('Failed to load Bible structure');
    } finally {
      setLoading(false);
    }
  };

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

      const response = await fetch(
        `${API_URL}/api/bible/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setContent(data);
      } else {
        setError('Failed to load chapter');
      }
    } catch (err) {
      console.error('Error loading chapter:', err);
      setError('Failed to load chapter');
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

export function useDailyReading() {
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReading();
  }, []);

  const loadReading = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}/api/bible/daily-reading`);
      
      if (response.ok) {
        const data = await response.json();
        setReading(data);
      } else {
        setError(`Failed to load daily reading: ${response.status}`);
      }
    } catch (err) {
      console.error('Error loading daily reading:', err);
      setError(err instanceof Error ? err.message : 'Failed to load daily reading');
    } finally {
      setLoading(false);
    }
  };

  return {
    reading,
    loading,
    error,
    refresh: loadReading,
  };
}

export function useRandomQuote() {
  const [quote, setQuote] = useState<BibleQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuote();
  }, []);

  const loadQuote = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bible/random-quote`);
      if (response.ok) {
        const data = await response.json();
        setQuote(data);
        setError(null);
      } else {
        setError('Failed to load quote');
      }
    } catch (err) {
      console.error('Error loading quote:', err);
      setError('Failed to load quote');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refresh = () => {
    setRefreshing(true);
    loadQuote();
  };

  return {
    quote,
    loading,
    refreshing,
    error,
    refresh,
  };
}