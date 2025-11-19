import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pl } from '../locales/pl';
import { en } from '../locales/en';
import { es } from '../locales/es';

export type Language = 'pl' | 'en' | 'es';

type Translations = typeof pl;

const translations: Record<Language, Translations> = {
  pl,
  en,
  es,
};

const LANGUAGE_KEY = '@praychain_language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Załaduj zapisany język przy starcie
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLanguage && (savedLanguage === 'pl' || savedLanguage === 'en' || savedLanguage === 'es')) {
          setLanguageState(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguage();
  }, []);

  // Funkcja do zmiany języka z zapisem
  const setLanguage = async (lang: Language) => {
    try {
      console.log('Setting language to:', lang);
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
      console.log('Language saved successfully');
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const value = {
    language,
    setLanguage,
    t: translations[language],
  };

  if (isLoading) {
    return null; // lub loading screen
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}