import { useState } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { getCurrentUserId } from '@/config/currentUser';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface Prayer {
  id: string;
  title: string;
  reference: string;
  text: string;
}

interface BibleQuote {
  text: string;
  reference: string;
  book_name: string;
  chapter: number;
  verse: number;
}

interface AnalysisResult {
  analysis: {
    focus_score: number;
    engagement_score: number;
    text_accuracy: number;
    captcha_accuracy: number;
    emotional_stability: number;
    speech_fluency: number;
    tokens_earned: number;
  };
  captcha_passed: boolean;
  message: string;
  voice_verified: boolean;
  voice_similarity: number;
  is_human: boolean;
  human_confidence: number;
}

interface UserData {
  id: string;
  username: string;
  tokens_balance: number;
  prayers_count: number;
  streak_days: number;
  total_earned: number;
  total_donated: number;
}

export const usePrayerRecording = () => {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [captchaQuote, setCaptchaQuote] = useState<BibleQuote | null>(null);
  
  const [prayerRecording, setPrayerRecording] = useState<Audio.Recording | null>(null);
  const [captchaRecording, setCaptchaRecording] = useState<Audio.Recording | null>(null);
  const [isPrayerRecording, setIsPrayerRecording] = useState(false);
  const [isCaptchaRecording, setIsCaptchaRecording] = useState(false);
  const [prayerTranscriptionId, setPrayerTranscriptionId] = useState<string>('');
  const [captchaTranscriptionId, setCaptchaTranscriptionId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userData, setUserData] = useState<UserData | null>(null);

  const initializeUserId = async () => {
    try {
      let storedUserId = getCurrentUserId(); // ✅ Zmienione
      
      try {
        const response = await fetch(`${API_URL}/api/users/${storedUserId}`);
        
        if (response.ok) {
          const user = await response.json();
          setUserData(user);
          setUserId(storedUserId);
          await AsyncStorage.setItem('userId', storedUserId);
        } else if (response.status === 404) {
          const createResponse = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: storedUserId, // ✅ Zmienione
              email: `${storedUserId}@example.com` // ✅ Zmienione
            })
          });
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            setUserData(newUser);
            setUserId(newUser.id);
            await AsyncStorage.setItem('userId', newUser.id);
          }
        }
      } catch (error) {
        console.error(`Error with user "${storedUserId}":`, error);
        
        const fallbackUserId = await AsyncStorage.getItem('userId');
        if (fallbackUserId) {
          await fetchUserData(fallbackUserId);
          setUserId(fallbackUserId);
        } else {
          const newId = getCurrentUserId(); // ✅ Zmienione
          setUserId(newId);
          await AsyncStorage.setItem('userId', newId);
        }
      }
    } catch (error) {
      console.error('Error initializing user ID:', error);
      const fallbackId = getCurrentUserId(); // ✅ Zmienione
      setUserId(fallbackId);
      await AsyncStorage.setItem('userId', fallbackId);
    }
  };

  const fetchUserData = async (id?: string) => {
    try {
      const uid = id || userId;
      if (!uid) return;
      
      const response = await fetch(`${API_URL}/api/users/${uid}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchPrayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/bible/prayers`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch prayers');
      }
      
      const data = await response.json();
      
      const prayersWithText = await Promise.all(
        data.prayers.map(async (p: any) => {
          try {
            const prayerResponse = await fetch(`${API_URL}/api/bible/prayer/${p.id}`);
            if (prayerResponse.ok) {
              const prayerData = await prayerResponse.json();
              return {
                id: p.id,
                title: prayerData.title,
                reference: prayerData.reference,
                text: prayerData.text
              };
            }
            return null;
          } catch (err) {
            console.error(`Error fetching prayer ${p.id}:`, err);
            return null;
          }
        })
      );
      
      setPrayers(prayersWithText.filter(p => p !== null) as Prayer[]);
    } catch (err) {
      console.error('Error fetching prayers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prayers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaptchaQuote = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bible/random-quote`);
      if (!response.ok) throw new Error('Failed to fetch verification quote');
      
      const data = await response.json();
      setCaptchaQuote({
        text: data.text.trim(),
        reference: data.reference,
        book_name: data.book_name,
        chapter: data.chapter,
        verse: data.verse
      });
    } catch (error) {
      console.error('Error fetching captcha:', error);
    }
  };

  const selectPrayer = async (prayer: Prayer) => {
    setSelectedPrayer(prayer);
    setPrayerTranscriptionId('');
    setCaptchaTranscriptionId('');
    setResult(null);
    await fetchCaptchaQuote();
  };

  const startPrayerRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      });
      
      setPrayerRecording(recording);
      setIsPrayerRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopPrayerRecording = async () => {
    if (!prayerRecording) return;

    setIsPrayerRecording(false);
    setIsProcessing(true);

    try {
      await prayerRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      const uri = prayerRecording.getURI();
      if (!uri) throw new Error('No recording URI');

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/wav',
        name: 'prayer.wav',
      } as any);

      const response = await fetch(`${API_URL}/api/transcribe?audio_type=prayer`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();
      setPrayerTranscriptionId(data.transcription.id);
      
      setPrayerRecording(null);
    } catch (error: any) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startCaptchaRecording = async () => {
    if (!prayerTranscriptionId) {
      console.warn('Please record the prayer first!');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      });
      
      setCaptchaRecording(recording);
      setIsCaptchaRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopCaptchaRecording = async () => {
    if (!captchaRecording || !selectedPrayer || !captchaQuote) return;

    setIsCaptchaRecording(false);
    setIsProcessing(true);

    try {
      await captchaRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      const uri = captchaRecording.getURI();
      if (!uri) throw new Error('No recording URI');

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/wav',
        name: 'captcha.wav',
      } as any);

      const response = await fetch(`${API_URL}/api/transcribe?audio_type=captcha`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();
      setCaptchaTranscriptionId(data.transcription.id);

      await analyzeRecordings(prayerTranscriptionId, data.transcription.id);

      setCaptchaRecording(null);
    } catch (error: any) {
      console.error('Processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeRecordings = async (prayerId: string, captchaId: string) => {
    try {
      const analysisResponse = await fetch(`${API_URL}/api/prayer/analyze-dual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prayer_transcription_id: prayerId,
          captcha_transcription_id: captchaId,
          bible_text: selectedPrayer!.text,
          captcha_text: captchaQuote!.text,
          user_id: userId
        })
      });

      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      setResult(analysisData);
    } catch (error: any) {
      console.error('Analysis error:', error);
    }
  };

  const resetPrayer = () => {
    setSelectedPrayer(null);
    setResult(null);
    setPrayerTranscriptionId('');
    setCaptchaTranscriptionId('');
    setCaptchaQuote(null);
  };

  return {
    prayers,
    loading,
    error,
    selectedPrayer,
    captchaQuote,
    isPrayerRecording,
    isCaptchaRecording,
    prayerTranscriptionId,
    captchaTranscriptionId,
    isProcessing,
    result,
    userId,
    userData,
    initializeUserId,
    fetchUserData,
    fetchPrayers,
    selectPrayer,
    startPrayerRecording,
    stopPrayerRecording,
    startCaptchaRecording,
    stopCaptchaRecording,
    resetPrayer,
  };
};