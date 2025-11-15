import { useState, useEffect } from 'react';

export interface CharityAction {
  _id: string;
  title: string;
  description: string;
  cost_tokens: number;
  category: string;
  organization: string;
  impact_description: string;
  image_url: string;
  is_active: boolean;
  total_supported: number;
  total_tokens_raised: number;
  goal_tokens?: number;
  tokens_remaining?: number;
  deadline?: string;
  created_at: string;
}

const API_HOST = process.env.EXPO_PUBLIC_API_HOST || 'localhost';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';
const API_URL = `http://${API_HOST}:${API_PORT}`;

export function useCharity() {
  const [charities, setCharities] = useState<CharityAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCharities();
  }, []);

  const fetchCharities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/charity/actions`);
      const data = await response.json();
      setCharities(data.actions || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch charities');
      console.error('Error fetching charities:', err);
    } finally {
      setLoading(false);
    }
  };

  const donateToCharity = async (userId: string, charityId: string, amount: number) => {
    try {
      const response = await fetch(`${API_URL}/api/charity/donate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          charity_id: charityId,
          tokens_amount: amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Donation failed');
      }

      const result = await response.json();
      await fetchCharities(); // Refresh data
      return result;
    } catch (err) {
      throw err;
    }
  };

  return {
    charities,
    loading,
    error,
    donateToCharity,
    refresh: fetchCharities,
  };
}