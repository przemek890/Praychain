import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto'; // ✅ Zmienione z uuid
import { API_CONFIG, ENDPOINTS } from '@/config/api';

interface PrayerContent {
  text: string;
  reference: string;
  title?: string;
  captcha?: string;  // ✅ NOWE - losowy cytat jako captcha
}

interface AnalysisResult {
  analysis: {
    focus_score: number;
    engagement_score: number;
    sentiment: string;
    text_accuracy: number;
    captcha_accuracy: number;  // ✅ NOWE
    emotional_stability: number;
    speech_fluency: number;
  };
  captcha_passed: boolean;  // ✅ NOWE
  message: string;
}

type ReadingType = 'our_father' | 'hail_mary' | 'glory_be' | 'apostles_creed';

const PRAYERS: { [key in ReadingType]: { title: string; emoji: string } } = {
  our_father: { title: 'Our Father', emoji: '🙏' },
  hail_mary: { title: 'Hail Mary', emoji: '✨' },
  glory_be: { title: 'Glory Be', emoji: '🌟' },
  apostles_creed: { title: "Apostles' Creed", emoji: '📖' },
};

// ✅ Krótkie cytaty na CAPTCHA (łatwe do zapamiętania)
const CAPTCHA_QUOTES = [
  "Be still, and know that I am God.",
  "I can do all things through Christ.",
  "The Lord is my shepherd.",
  "Trust in the Lord with all your heart.",
  "Cast all your anxiety on him.",
  "The Lord is my light and my salvation.",
  "Come to me, all you who are weary.",
  "This is the day the Lord has made.",
];

export default function HomeScreen() {
  const [prayer, setPrayer] = useState<PrayerContent | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [tokensEarned, setTokensEarned] = useState<number>(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [userId, setUserId] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [readingType, setReadingType] = useState<ReadingType>('our_father');
  const [prayerRecording, setPrayerRecording] = useState<Audio.Recording | null>(null);
  const [captchaRecording, setCaptchaRecording] = useState<Audio.Recording | null>(null);
  const [isPrayerRecording, setIsPrayerRecording] = useState(false);
  const [isCaptchaRecording, setIsCaptchaRecording] = useState(false);
  const [prayerTranscriptionId, setPrayerTranscriptionId] = useState<string>('');
  const [captchaTranscriptionId, setCaptchaTranscriptionId] = useState<string>('');

  // Połączenie przez ENV
  useEffect(() => {
    const connectToBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        const response = await fetch(API_CONFIG.HEALTH_URL, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          console.log('Backend connected:', API_CONFIG.BASE_URL);
        }
      } catch (error: any) {
        console.error('Connection failed:', error);
        Alert.alert('Connection Failed', 'Cannot reach backend');
      }
    };
    connectToBackend();
  }, []);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permissions to use this app');
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    const getUserId = async () => {
      try {
        let storedUserId = await SecureStore.getItemAsync('user_id');
        if (!storedUserId) {
          // ✅ Użyj expo-crypto zamiast uuid
          storedUserId = Crypto.randomUUID();
          await SecureStore.setItemAsync('user_id', storedUserId);
        }
        setUserId(storedUserId);
        
        await SecureStore.setItemAsync('user_name', 'test');
      } catch (error) {
        console.error('Error managing user ID:', error);
        // ✅ Użyj expo-crypto
        const newUserId = Crypto.randomUUID();
        setUserId(newUserId);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTokenBalance();
    }
  }, [userId]);

  const fetchTokenBalance = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.TOKEN_BALANCE(userId)}`);
      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data.current_balance);
      }
    } catch (error) {
      console.error('Error fetching token balance:', error);
    }
  };

  const fetchPrayer = async () => {
    setIsLoading(true);
    setResult(null);
    setPrayer(null);
    setTokensEarned(0);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.BIBLE_PRAYER(readingType)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const randomCaptcha = CAPTCHA_QUOTES[Math.floor(Math.random() * CAPTCHA_QUOTES.length)];
      
      setPrayer({
        text: data.text,
        reference: data.reference,
        title: data.title,
        captcha: randomCaptcha,
      });
    } catch (error: any) {
      console.error('Fetch error:', error);
      Alert.alert('Error', `Failed to fetch prayer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording || !prayer) return;

    setIsRecording(false);
    setIsLoading(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI');

      // 1. Upload audio
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'prayer.m4a',
      } as any);

      const uploadResponse = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.TRANSCRIBE}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const transcriptionData = await uploadResponse.json();

      // 2. Analyze (bez przyznawania tokenów)
      const analysisResponse = await fetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.PRAYER_ANALYZE(transcriptionData.id)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bible_text: prayer.text,
            captcha_text: prayer.captcha,  // ✅ CAPTCHA
            user_id: userId
          })
        }
      );

      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      setResult(analysisData);

      // 3. ✅ Przyznaj tokeny (jeśli captcha passed)
      if (analysisData.captcha_passed) {
        const tokenResponse = await fetch(`${API_CONFIG.BASE_URL}/api/tokens/award`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            transcription_id: transcriptionData.id,
            text_accuracy: analysisData.analysis.text_accuracy,
            emotional_stability: analysisData.analysis.emotional_stability,
            speech_fluency: analysisData.analysis.speech_fluency,
            captcha_accuracy: analysisData.analysis.captcha_accuracy,
            focus_score: analysisData.analysis.focus_score,
          })
        });

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          setTokensEarned(tokenData.tokens_earned);
          
          Alert.alert(
            'Success! 🎉',
            `You earned ${tokenData.tokens_earned} tokens!`,
            [{ text: 'OK' }]
          );
        }
      } else {
        setTokensEarned(0);
        Alert.alert(
          'Captcha Failed ❌',
          `Captcha accuracy: ${(analysisData.analysis.captcha_accuracy * 100).toFixed(0)}%\n\nRequired: 50%+\n\nYou earned 0 tokens.`,
          [{ text: 'Try Again' }]
        );
      }

      setRecording(null);
    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert('Error', `Failed to process: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
    setIsLoading(true);

    try {
      await prayerRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = prayerRecording.getURI();
      if (!uri) throw new Error('No recording URI');

      // Upload prayer
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'prayer.m4a',
      } as any);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.TRANSCRIBE}?audio_type=prayer`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();
      setPrayerTranscriptionId(data.transcription.id);
      
      Alert.alert('Success', 'Prayer recorded! Now read the CAPTCHA quote.');
      setPrayerRecording(null);
    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert('Error', `Failed to process: ${error.message}`);
    } finally {
      setIsLoading(false);
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
    if (!captchaRecording || !prayer) return;

    setIsCaptchaRecording(false);
    setIsLoading(true);

    try {
      await captchaRecording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = captchaRecording.getURI();
      if (!uri) throw new Error('No recording URI');

      // Upload captcha
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'captcha.m4a',
      } as any);

      const response = await fetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.TRANSCRIBE}?audio_type=captcha`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

      const data = await response.json();
      setCaptchaTranscriptionId(data.transcription.id);

      // ✅ Teraz wywołaj analizę z OBOMA ID
      await analyzeWithBothTranscriptions(prayerTranscriptionId, data.transcription.id);

      setCaptchaRecording(null);
    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert('Error', `Failed to process: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeWithBothTranscriptions = async (
    prayerId: string,
    captchaId: string
  ) => {
    try {
      const analysisResponse = await fetch(
        `${API_CONFIG.BASE_URL}/api/prayer/analyze-dual`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prayer_transcription_id: prayerId,
            captcha_transcription_id: captchaId,
            bible_text: prayer!.text,
            captcha_text: prayer!.captcha,
            user_id: userId || 'test'
          })
        }
      );

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.text();
        throw new Error(`Analysis failed: ${analysisResponse.status} - ${errorData}`);
      }

      const analysisData = await analysisResponse.json();
      console.log('Analysis result:', analysisData);
      
      setResult(analysisData);

      // ✅ Tokeny już przyznane przez backend!
      const tokensEarned = analysisData.analysis.tokens_earned || 0;
      setTokensEarned(tokensEarned);

      if (analysisData.captcha_passed) {
        Alert.alert(
          'Success! 🎉',
          `You earned ${tokensEarned} tokens!\n\nAccuracy: ${(analysisData.analysis.text_accuracy * 100).toFixed(0)}%\nCaptcha: ${(analysisData.analysis.captcha_accuracy * 100).toFixed(0)}%`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Captcha Failed ❌',
          `Captcha accuracy: ${(analysisData.analysis.captcha_accuracy * 100).toFixed(0)}%\n\nRequired: 50%+\n\nYou earned 0 tokens.`,
          [{ text: 'Try Again' }]
        );
      }
      
      // Odśwież saldo
      fetchTokenBalance();
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      Alert.alert('Error', `Failed to analyze: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ✅ UPROSZCZONE - bez przycisku edycji nazwy */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello, test! 🙏</Text>
          </View>
          <Text style={styles.userAvatar}>🙏</Text>
        </View>

        <Text style={styles.title}>PrayChain</Text>
        <Text style={styles.subtitle}>Read. Pray. Earn Tokens.</Text>
        
        <View style={styles.tokenBalanceContainer}>
          <Text style={styles.tokenBalanceLabel}>Your Balance:</Text>
          <Text style={styles.tokenBalanceValue}>{tokenBalance} 🪙</Text>
        </View>

        {!prayer && (
          <View style={styles.readingTypeSection}>
            <Text style={styles.sectionTitle}>Choose a prayer:</Text>
            
            {(Object.keys(PRAYERS) as ReadingType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  readingType === type && styles.typeButtonActive
                ]}
                onPress={() => setReadingType(type)}
              >
                <View style={styles.typeContent}>
                  <Text style={styles.typeEmoji}>{PRAYERS[type].emoji}</Text>
                  <Text style={[styles.typeTitle, readingType === type && styles.typeTextActive]}>
                    {PRAYERS[type].title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!prayer ? (
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={fetchPrayer}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Loading...' : 'Get Prayer'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.quoteContainer}>
            <Text style={styles.prayerTitle}>{prayer.title}</Text>
            <Text style={styles.quoteText}>{prayer.text}</Text>
            <Text style={styles.reference}>— {prayer.reference}</Text>

            {/* STEP 1: Record Prayer */}
            <View style={styles.step}>
              <Text style={styles.stepTitle}>
                ✅ Step 1: Record the prayer
              </Text>
              
              {isPrayerRecording && (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording prayer...</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isPrayerRecording && styles.recordButtonActive,
                  prayerTranscriptionId && styles.recordButtonDisabled,
                ]}
                onPress={isPrayerRecording ? stopPrayerRecording : startPrayerRecording}
                disabled={isLoading || !!prayerTranscriptionId}
              >
                <Text style={styles.recordButtonText}>
                  {prayerTranscriptionId 
                    ? '✅ Prayer Recorded' 
                    : isPrayerRecording 
                    ? 'Stop Recording' 
                    : 'Start Recording Prayer'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* STEP 2: Record CAPTCHA */}
            {prayerTranscriptionId && (
              <View style={styles.captchaSection}>
                <Text style={styles.captchaTitle}>📝 Step 2: Now read this quote:</Text>
                <Text style={styles.captchaText}>{prayer.captcha}</Text>

                {isCaptchaRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>Recording CAPTCHA...</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isCaptchaRecording && styles.recordButtonActive,
                  ]}
                  onPress={isCaptchaRecording ? stopCaptchaRecording : startCaptchaRecording}
                  disabled={isLoading}
                >
                  <Text style={styles.recordButtonText}>
                    {isCaptchaRecording ? 'Stop Recording' : 'Start Recording CAPTCHA'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.newQuoteButton, isLoading && styles.buttonDisabled]}
              onPress={() => {
                setPrayer(null);
                setPrayerTranscriptionId('');
                setCaptchaTranscriptionId('');
                fetchPrayer();
              }}
              disabled={isLoading || isPrayerRecording || isCaptchaRecording}
            >
              <Text style={styles.buttonText}>New Prayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && !isRecording && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}

        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>
              {result.captcha_passed ? 'Success! ✅' : 'Captcha Failed ❌'}
            </Text>
            <Text style={styles.tokensEarned}>
              {tokensEarned > 0 ? `+${tokensEarned}` : '0'} Tokens
            </Text>

            <View style={styles.breakdown}>
              <Text style={styles.breakdownTitle}>Performance:</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Prayer Accuracy:</Text>
                <Text style={styles.breakdownValue}>{(result.analysis.text_accuracy * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Captcha Accuracy:</Text>
                <Text style={[
                  styles.breakdownValue,
                  { color: result.captcha_passed ? '#4CAF50' : '#E74C3C' }
                ]}>
                  {(result.analysis.captcha_accuracy * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Emotional Stability:</Text>
                <Text style={styles.breakdownValue}>{(result.analysis.emotional_stability * 100).toFixed(0)}%</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                setResult(null);
                setPrayer(null);
                fetchTokenBalance();
              }}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userAvatar: {
    fontSize: 32,
  },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#666' },
  tokenBalanceContainer: {
    backgroundColor: '#FFD700',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenBalanceLabel: { fontSize: 18, fontWeight: '600', color: '#333' },
  tokenBalanceValue: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  quoteContainer: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  quoteText: { fontSize: 18, lineHeight: 28, marginBottom: 15, color: '#333' },
  reference: { fontSize: 14, fontStyle: 'italic', color: '#666', marginBottom: 20 },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, padding: 10, backgroundColor: '#ffe6e6', borderRadius: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E74C3C', marginRight: 8 },
  recordingText: { color: '#E74C3C', fontWeight: 'bold' },
  recordButton: { backgroundColor: '#E74C3C', padding: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  recordButtonActive: { backgroundColor: '#C0392B' },
  recordButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  newQuoteButton: { backgroundColor: '#95A5A6', padding: 12, borderRadius: 10, alignItems: 'center' },
  loadingContainer: { padding: 20, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  resultContainer: { backgroundColor: '#E8F5E9', padding: 20, borderRadius: 15, marginTop: 20 },
  resultTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  tokensEarned: { fontSize: 36, fontWeight: 'bold', color: '#4CAF50', textAlign: 'center', marginBottom: 20 },
  breakdown: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15 },
  breakdownTitle: { fontWeight: 'bold', marginBottom: 10, fontSize: 16 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownLabel: { color: '#666', fontSize: 15 },
  breakdownValue: { fontWeight: 'bold', color: '#4CAF50', fontSize: 15 },
  continueButton: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 10, alignItems: 'center' },

  readingTypeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  typeButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  typeButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#E3F2FD',
  },
  typeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  typeTextContainer: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  typeTextActive: {
    color: '#4A90E2',
  },
  typeDescription: {
    fontSize: 14,
    color: '#999',
  },
  typeDescActive: {
    color: '#1976D2',
  },
  prayerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4A90E2',
    marginBottom: 15,
  },
  captchaSection: {
    backgroundColor: '#FFF9C4',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
    borderWidth: 2,
    borderColor: '#FFD54F',
  },
  captchaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 10,
    textAlign: 'center',
  },
  captchaText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  captchaHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  step: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  recordButtonDisabled: {
    backgroundColor: '#4CAF50',
    opacity: 0.7,
  },
});
