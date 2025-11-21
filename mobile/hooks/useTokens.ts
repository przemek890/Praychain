import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG, apiFetch } from '@/config/api';

export interface UserTokens {
  balance: number;
  total_earned: number;
  total_donated: number;
}

export function useTokens(userId: string) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      console.warn('useTokens: No userId provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`Fetching balance for user: ${userId}`);
      
      const response = await apiFetch(`${API_CONFIG.BASE_URL}/api/users/${userId}`);
      
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
  }, [userId]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    refresh: fetchBalance,
  };
}