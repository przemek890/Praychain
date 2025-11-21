import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { API_CONFIG, apiFetch } from '@/config/api';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { language } = useLanguage();
  const [userId, setUserId] = useState<string>('');
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
  const [userData, setUserData] = useState<UserData | null>(null);

  const initializeUserId = async (userIdParam: string) => {
    try {
      console.log('Initializing user ID:', userIdParam);
      setUserId(userIdParam);
    } catch (error) {
      console.error('Error initializing user ID:', error);
    }
  };

  const fetchUserData = async (id?: string) => {
    try {
      const uid = id || userId;
      if (!uid) return;
      
      const response = await apiFetch(`${API_CONFIG.BASE_URL}/api/users/${uid}`);
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
      
      console.log(`Fetching prayers in ${language}`);
      const response = await apiFetch(`${API_CONFIG.BASE_URL}/api/bible/prayers?lang=${language}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch prayers: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Prayers response:', data);
      
      if (!data.prayers || data.prayers.length === 0) {
        console.warn('No prayers returned from API');
        setError('No prayers available');
        return;
      }
      
      const prayersWithText = await Promise.all(
        data.prayers.map(async (p: any) => {
          try {
            console.log(`Fetching prayer details: ${p.id}`);
            const prayerResponse = await apiFetch(`${API_CONFIG.BASE_URL}/api/bible/prayer/${p.id}?lang=${language}`);
            
            if (prayerResponse.ok) {
              const prayerData = await prayerResponse.json();
              console.log(`Prayer ${p.id} data:`, prayerData);
              
              return {
                id: p.id,
                title: prayerData.title,
                reference: prayerData.reference,
                text: prayerData.text
              };
            } else {
              console.error(`Failed to fetch prayer ${p.id}: ${prayerResponse.status}`);
              return null;
            }
          } catch (err) {
            console.error(`Error fetching prayer ${p.id}:`, err);
            return null;
          }
        })
      );
      
      const validPrayers = prayersWithText.filter(p => p !== null) as Prayer[];
      console.log(`✅ Loaded ${validPrayers.length} prayers in ${language}`);
      
      if (validPrayers.length === 0) {
        setError('Failed to load prayer details');
      }
      
      setPrayers(validPrayers);
    } catch (err) {
      console.error('Error fetching prayers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prayers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaptchaQuote = async () => {
    try {
      const response = await apiFetch(`${API_CONFIG.BASE_URL}/api/bible/random-quote?lang=${language}`);
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

      const response = await apiFetch(`${API_CONFIG.BASE_URL}/api/transcribe?audio_type=prayer&lang=${language}`, {
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

      const response = await apiFetch(`${API_CONFIG.BASE_URL}/api/transcribe?audio_type=captcha&lang=${language}`, {
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
      const analysisResponse = await apiFetch(`${API_CONFIG.BASE_URL}/api/prayer/analyze-dual`, {
        method: 'POST',
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

  useEffect(() => {
    if (userId) {
      console.log(`🌍 Language changed to ${language}, reloading prayers`);
      fetchPrayers();
      
      if (selectedPrayer) {
        resetPrayer();
      }
    }
  }, [language, userId]);

  return {
    userId,
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
    initializeUserId,
    fetchPrayers,
    selectPrayer,
    startPrayerRecording,
    stopPrayerRecording,
    startCaptchaRecording,
    stopCaptchaRecording,
    resetPrayer,
  };
};