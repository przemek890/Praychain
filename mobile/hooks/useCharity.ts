import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { API_CONFIG } from '@/config/api';

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

interface Donor {
  user_id: string;
  username: string;
  total_donated: number;
  donation_count: number;
  last_donation: string;
}

export function useCharity() {
  const [charities, setCharities] = useState<CharityAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  useEffect(() => {
    fetchCharities();
  }, [language]);

  const fetchCharities = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/charity/actions?lang=${language}`
      );
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
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/charity/donate`, {
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
      await fetchCharities();
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

export function useCharityDonors(charityId: string | null) {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDonors = async () => {
    if (!charityId) {
      setDonors([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/api/charity/actions/${charityId}/donors`
      );
      
      if (response.ok) {
        const data = await response.json();
        setDonors(data.donors || []);
      } else {
        console.error('Failed to fetch donors:', response.status);
        setDonors([]);
      }
    } catch (error) {
      console.error('Error fetching donors:', error);
      setDonors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [charityId]);

  return { donors, loading, refresh: fetchDonors };
}