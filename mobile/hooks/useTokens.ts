import { useState, useEffect, useCallback } from 'react';

const API_HOST = process.env.EXPO_PUBLIC_API_HOST;
const API_PORT = process.env.EXPO_PUBLIC_API_PORT;
const API_URL = `http://${API_HOST}:${API_PORT}`;

export interface UserTokens {
  balance: number;
  total_earned: number;
  total_donated: number;
}

export function useTokens(userId: string) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Użyj useCallback aby funkcja była stabilna
  const fetchBalance = useCallback(async () => {
    if (!userId) {
      console.warn('useTokens: No userId provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching balance for user: ${userId}`);
      
      const response = await fetch(`${API_URL}/api/users/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Balance fetched: ${data.tokens_balance}`);
        setBalance(data.tokens_balance || 0);
      } else {
        console.error(`Failed to fetch balance: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]); // ✅ Zależy tylko od userId

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]); // ✅ Teraz fetchBalance jest stabilne

  return {
    balance,
    loading,
    refresh: fetchBalance,
  };
}