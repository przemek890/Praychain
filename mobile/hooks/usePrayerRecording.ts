import { useState } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const API_HOST = process.env.EXPO_PUBLIC_API_HOST || 'localhost';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '8000';
const API_URL = `http://${API_HOST}:${API_PORT}`;

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
    sentiment: string;
    text_accuracy: number;
    captcha_accuracy: number;
    emotional_stability: number;
    speech_fluency: number;
    tokens_earned: number;
  };
  captcha_passed: boolean;
  message: string;
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

  const initializeUserId = async () => {
    try {
      let storedUserId = await SecureStore.getItemAsync('user_id');
      if (!storedUserId) {
        storedUserId = Crypto.randomUUID();
        await SecureStore.setItemAsync('user_id', storedUserId);
      }
      setUserId(storedUserId);
    } catch (error) {
      console.error('Error managing user ID:', error);
      setUserId(Crypto.randomUUID());
    }
  };

  const fetchPrayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/bible/prayers`);
      
      if (!response.ok) throw new Error('Failed to fetch prayers');
      
      const data = await response.json();
      
      const prayersWithText = await Promise.all(
        data.prayers.map(async (p: any) => {
          try {
            const prayerResponse = await fetch(`${API_URL}/api/bible/prayer/${p.id}`);
            if (prayerResponse.ok) {
              const prayerData = await prayerResponse.json();
              return {
                id: p.id,
                title: p.title,
                reference: p.reference,
                text: prayerData.text
              };
            }
          } catch (err) {
            console.error(`Error fetching prayer ${p.id}:`, err);
          }
          return null;
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
      Alert.alert('Error', 'Failed to load verification quote. Please try again.');
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

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setPrayerRecording(recording);
      setIsPrayerRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording');
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
        type: 'audio/m4a',
        name: 'prayer.m4a',
      } as any);

      const response = await fetch(`${API_URL}/api/transcribe?audio_type=prayer`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();
      setPrayerTranscriptionId(data.transcription.id);
      
      Alert.alert('Success! ✅', 'Prayer recorded! Now read the verification verse.');
      setPrayerRecording(null);
    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert('Error', `Failed to process: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const startCaptchaRecording = async () => {
    if (!prayerTranscriptionId) {
      Alert.alert('Error', 'Please record the prayer first!');
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setCaptchaRecording(recording);
      setIsCaptchaRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording');
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
        type: 'audio/m4a',
        name: 'captcha.m4a',
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
      Alert.alert('Error', `Failed to process: ${error.message}`);
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

      const tokensEarned = analysisData.analysis.tokens_earned || 0;

      if (analysisData.captcha_passed) {
        Alert.alert(
          'Success! 🎉',
          `You earned ${tokensEarned} tokens!\n\nPrayer Accuracy: ${(analysisData.analysis.text_accuracy * 100).toFixed(0)}%\nVerse Verification: ${(analysisData.analysis.captcha_accuracy * 100).toFixed(0)}%`,
          [{ text: 'Continue', style: 'default' }]
        );
      } else {
        Alert.alert(
          'Verification Failed ❌',
          `Verse accuracy: ${(analysisData.analysis.captcha_accuracy * 100).toFixed(0)}%\n\nRequired: 50%+\n\nPlease read the verse more carefully and try again.`,
          [{ text: 'Try Again', style: 'default' }]
        );
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      Alert.alert('Error', `Failed to analyze: ${error.message}`);
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