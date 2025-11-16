import { useState, useEffect } from 'react';

const API_HOST = process.env.EXPO_PUBLIC_API_HOST || 'localhost';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';
const API_URL = `http://${API_HOST}:${API_PORT}`;

export interface UserTokens {
  balance: number;
  total_earned: number;
  total_donated: number;
}

export function useTokens(userId: string) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    if (!userId) {
      console.warn('useTokens: No userId provided');
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching balance for user: ${userId}`); // ✅ Debug log
      
      const response = await fetch(`${API_URL}/api/users/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Balance fetched: ${data.tokens_balance}`); // ✅ Debug log
        setBalance(data.tokens_balance || 0);
      } else {
        console.error(`Failed to fetch balance: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  return {
    balance,
    loading,
    refresh: fetchBalance, // ✅ Zwraca funkcję odświeżania
  };
}