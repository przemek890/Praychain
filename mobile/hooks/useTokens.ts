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
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalDonated, setTotalDonated] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchBalance();
    }
  }, [userId]);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      setBalance(data.tokens_balance || 0);
      setTotalEarned(data.total_earned || 0);
      setTotalDonated(data.total_donated || 0);
      setError(null);
    } catch (err) {
      setError('Failed to fetch balance');
      console.error('Error fetching balance:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    balance,
    totalEarned,
    totalDonated,
    loading,
    error,
    refresh: fetchBalance,
  };
}