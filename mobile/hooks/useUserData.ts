import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from '@/config/currentUser';
import { useFocusEffect } from '@react-navigation/native';
import { useUserDataRefresh } from '@/contexts/UserDataContext';

const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;
const API_URL = `http://${API_HOST}:${API_PORT}`;

export interface UserData {
  id: string;
  username: string;
  tokens_balance: number;
  prayers_count: number;
  streak_days: number;
  total_earned: number;
  total_donated: number;
  level?: number;
  experience?: number;
  experience_to_next_level?: number;
}

export interface BibleQuote {
  text: string;
  reference: string;
  book_name?: string;
  chapter?: number;
  verse?: number;
}

export function useUserData(autoRefreshOnFocus: boolean = false) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dailyQuote, setDailyQuote] = useState<BibleQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isLoadingRef = useRef(false);
  
  const { refreshTrigger } = useUserDataRefresh();

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('loadData already in progress, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      let userId = getCurrentUserId();
      
      try {
        const userResponse = await fetch(`${API_URL}/api/users/${userId}`);
        if (userResponse.ok) {
          const user = await userResponse.json();
          setUserData(user);
          await AsyncStorage.setItem('userId', userId);
        } else if (userResponse.status === 404) {
          const createResponse = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: userId,
              email: `${userId}@example.com`
            })
          });
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            await AsyncStorage.setItem('userId', newUser.id);
            setUserData(newUser);
          }
        }
      } catch (userError) {
        console.error(`Error with user "${userId}":`, userError);
        
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId && storedUserId !== userId) {
          const fallbackResponse = await fetch(`${API_URL}/api/users/${storedUserId}`);
          if (fallbackResponse.ok) {
            const user = await fallbackResponse.json();
            setUserData(user);
          }
        }
      }

      const quoteResponse = await fetch(`${API_URL}/api/bible/short-quote`);
      if (quoteResponse.ok) {
        const quote = await quoteResponse.json();
        setDailyQuote(quote);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  const refreshQuote = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`${API_URL}/api/bible/short-quote`);
      if (response.ok) {
        const quote = await response.json();
        setDailyQuote(quote);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ Odświeżaj gdy zmienia się refreshTrigger
  useEffect(() => {
    if (refreshTrigger > 0 && !isLoadingRef.current) {
      console.log('Refresh triggered from context');
      loadData();
    }
  }, [refreshTrigger, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (autoRefreshOnFocus && !isLoadingRef.current) {
        console.log('Home tab focused - refreshing user data');
        loadData();
      }
    }, [autoRefreshOnFocus, loadData])
  );

  return {
    userData,
    dailyQuote,
    loading,
    refreshing,
    refreshQuote,
    refresh: loadData,
  };
}