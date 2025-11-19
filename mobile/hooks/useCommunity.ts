import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PrayerRequest {
  id: string;
  user: string;
  request: string;
  prayers: number;
  time: string;
}

export interface TopUser {
  id: string;
  name: string;
  points: number;
  streak: number;
  rank: number;
}

export function useCommunity() {
  const { t } = useLanguage();
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommunityData();
  }, [t]);

  const loadCommunityData = () => {
    setLoading(true);

    const mockRequests: PrayerRequest[] = [
      {
        id: '1',
        user: 'Maria K.',
        request: t.community.request1,
        prayers: 24,
        time: t.community.hoursAgo.replace('{hours}', '2'),
      },
      {
        id: '2',
        user: 'Jan P.',
        request: t.community.request2,
        prayers: 18,
        time: t.community.hoursAgo.replace('{hours}', '4'),
      },
      {
        id: '3',
        user: 'Anna W.',
        request: t.community.request3,
        prayers: 12,
        time: t.community.hoursAgo.replace('{hours}', '6'),
      },
      {
        id: '4',
        user: 'Tomasz B.',
        request: t.community.request4,
        prayers: 8,
        time: t.community.hoursAgo.replace('{hours}', '8'),
      },
      {
        id: '5',
        user: 'Ewa M.',
        request: t.community.request5,
        prayers: 5,
        time: t.community.hoursAgo.replace('{hours}', '12'),
      },
    ];

    const mockTopUsers: TopUser[] = [
      { id: '1', name: 'Piotr M.', points: 1250, streak: 45, rank: 1 },
      { id: '2', name: 'Kasia L.', points: 1180, streak: 38, rank: 2 },
      { id: '3', name: 'Marek S.', points: 1050, streak: 32, rank: 3 },
    ];

    setPrayerRequests(mockRequests);
    setTopUsers(mockTopUsers);
    setLoading(false);
  };

  const addPrayerRequest = (request: string, username: string) => {
    const newRequest: PrayerRequest = {
      id: Date.now().toString(),
      user: username,
      request: request.trim(),
      prayers: 0,
      time: t.community.justNow,
    };
    setPrayerRequests([newRequest, ...prayerRequests]);
  };

  const sendPrayer = (requestId: string) => {
    setPrayerRequests(prev =>
      prev.map(req =>
        req.id === requestId
          ? { ...req, prayers: req.prayers + 1 }
          : req
      )
    );
  };

  return {
    prayerRequests,
    topUsers,
    loading,
    addPrayerRequest,
    sendPrayer,
    refresh: loadCommunityData,
  };
}