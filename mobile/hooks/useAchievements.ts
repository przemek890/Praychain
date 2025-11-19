import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  color: string;
  percentUnlocked: number;
  emoji: string;
}

export function useAchievements() {
  const { t } = useLanguage(); // ✅ DODAJ
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, [t]); // ✅ Dodaj zależność od t

  const loadAchievements = () => {
    setLoading(true);
    
    const mockAchievements: Achievement[] = [
      {
        id: '1',
        title: t.achievements.firstPrayer.title,
        description: t.achievements.firstPrayer.description,
        progress: 1,
        maxProgress: 1,
        unlocked: true,
        color: '#fbbf24',
        percentUnlocked: 95,
        emoji: '🙏',
      },
      {
        id: '2',
        title: t.achievements.streak7.title,
        description: t.achievements.streak7.description,
        progress: 4,
        maxProgress: 7,
        unlocked: false,
        color: '#f59e0b',
        percentUnlocked: 45,
        emoji: '🔥',
      },
      {
        id: '3',
        title: t.achievements.prayers50.title,
        description: t.achievements.prayers50.description,
        progress: 47,
        maxProgress: 50,
        unlocked: false,
        color: '#d97706',
        percentUnlocked: 12,
        emoji: '📿',
      },
      {
        id: '4',
        title: t.achievements.rosary10.title,
        description: t.achievements.rosary10.description,
        progress: 3,
        maxProgress: 10,
        unlocked: false,
        color: '#92400e',
        percentUnlocked: 8,
        emoji: '🌹',
      },
      {
        id: '5',
        title: t.achievements.earlyBird.title,
        description: t.achievements.earlyBird.description,
        progress: 0,
        maxProgress: 1,
        unlocked: false,
        color: '#78716c',
        percentUnlocked: 25,
        emoji: '🌅',
      },
    ];

    setAchievements(mockAchievements);
    setLoading(false);
  };

  return {
    achievements,
    loading,
    refresh: loadAchievements,
  };
}