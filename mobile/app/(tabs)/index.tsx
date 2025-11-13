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
  TextInput,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';
import { API_CONFIG, ENDPOINTS } from '@/config/api';

interface BibleQuote {
  text: string;
  reference: string;
  book_name: string;
  chapter: number;
  verse: number;
}

interface AnalysisResult {
  tokens_earned: number;
  analysis: {
    focus_score: number;
    engagement_score: number;
    sentiment: string;
    text_accuracy: number;
    emotional_stability: number;
    speech_fluency: number;
  };
  breakdown: {
    accuracy_points: number;
    stability_points: number;
    fluency_points: number;
    focus_points: number;
  };
}

type ReadingType = 'prayer' | 'short_quote' | 'random_verse';

export default function HomeScreen() {
  const [quote, setQuote] = useState<BibleQuote | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [userId, setUserId] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [readingType, setReadingType] = useState<ReadingType>('prayer');
  const [availablePrayers, setAvailablePrayers] = useState<string[]>([]);

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
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please enable microphone access');
      }
    })();
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
    const getUserData = async () => {
      try {
        let storedUserId = await SecureStore.getItemAsync('user_id');
        if (!storedUserId) {
          storedUserId = uuidv4();
          await SecureStore.setItemAsync('user_id', storedUserId);
        }
        setUserId(storedUserId);

        const storedName = await SecureStore.getItemAsync('user_name');
        if (storedName) {
          setUserName(storedName);
        } else {
          setShowNameModal(true);
        }
      } catch (error) {
        console.error('Error managing user data:', error);
        setUserId(uuidv4());
      }
    };
    getUserData();
  }, []);

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

  useEffect(() => {
    if (userId) {
      fetchTokenBalance();
    }
  }, [userId]);

  useEffect(() => {
    if (result) {
      fetchTokenBalance();
    }
  }, [result]);

  const saveUserName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    try {
      await SecureStore.setItemAsync('user_name', tempName.trim());
      setUserName(tempName.trim());
      setShowNameModal(false);
      Alert.alert('Welcome!', `Nice to meet you, ${tempName.trim()}! 🙏`);
    } catch (error) {
      console.error('Error saving name:', error);
      Alert.alert('Error', 'Failed to save your name');
    }
  };

  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/bible/prayers`);
        if (response.ok) {
          const data = await response.json();
          setAvailablePrayers(data.prayers.map((p: any) => p.id));
        }
      } catch (error) {
        console.error('Error fetching prayers:', error);
      }
    };
    fetchPrayers();
  }, []);

  const fetchQuote = async () => {
    setIsLoading(true);
    setResult(null);
    setQuote(null);

    try {
      let endpoint = '';
      
      switch (readingType) {
        case 'prayer':
          const randomPrayer = availablePrayers[Math.floor(Math.random() * availablePrayers.length)] || 'our_father';
          endpoint = `/bible/prayer/${randomPrayer}`;
          break;
        case 'short_quote':
          endpoint = '/bible/short-quote';
          break;
        case 'random_verse':
          endpoint = '/bible/random-quote';
          break;
      }

      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setQuote({
        text: data.text,
        reference: data.reference,
        book_name: data.title || data.reference,
        chapter: 0,
        verse: 0
      });
    } catch (error: any) {
      console.error('Fetch error:', error);
      Alert.alert('Error', `Failed to fetch: ${error.message}`);
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
    if (!recording) return;

    setIsRecording(false);
    setIsLoading(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      
      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI');

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

      const analysisResponse = await fetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.PRAYER_ANALYZE(transcriptionData.id)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bible_text: quote?.text || '',
            user_id: userId
          })
        }
      );

      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      setResult(analysisData);
      setRecording(null);

      Alert.alert(
        'Success!',
        `You earned ${analysisData.tokens_earned} tokens!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Processing error:', error);
      Alert.alert('Error', `Failed to process: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>
              {userName ? `Hello, ${userName}!` : 'Welcome!'}
            </Text>
            {!userName && (
              <TouchableOpacity onPress={() => setShowNameModal(true)}>
                <Text style={styles.addNameLink}>+ Add your name</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.avatarButton}
            onPress={() => {
              setTempName(userName);
              setShowNameModal(true);
            }}
          >
            <Text style={styles.userAvatar}>🙏</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>PrayChain</Text>
        <Text style={styles.subtitle}>Read. Pray. Earn Tokens.</Text>
        
        <View style={styles.tokenBalanceContainer}>
          <Text style={styles.tokenBalanceLabel}>Your Balance:</Text>
          <Text style={styles.tokenBalanceValue}>{tokenBalance} 🪙</Text>
        </View>

        {!quote && (
          <View style={styles.readingTypeSection}>
            <Text style={styles.sectionTitle}>Choose what to read:</Text>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                readingType === 'prayer' && styles.typeButtonActive
              ]}
              onPress={() => setReadingType('prayer')}
            >
              <View style={styles.typeContent}>
                <Text style={styles.typeEmoji}>🙏</Text>
                <View style={styles.typeTextContainer}>
                  <Text style={[styles.typeTitle, readingType === 'prayer' && styles.typeTextActive]}>
                    Classic Prayers
                  </Text>
                  <Text style={[styles.typeDescription, readingType === 'prayer' && styles.typeDescActive]}>
                    Our Father, Hail Mary...
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                readingType === 'short_quote' && styles.typeButtonActive
              ]}
              onPress={() => setReadingType('short_quote')}
            >
              <View style={styles.typeContent}>
                <Text style={styles.typeEmoji}>✨</Text>
                <View style={styles.typeTextContainer}>
                  <Text style={[styles.typeTitle, readingType === 'short_quote' && styles.typeTextActive]}>
                    Short Bible Quote
                  </Text>
                  <Text style={[styles.typeDescription, readingType === 'short_quote' && styles.typeDescActive]}>
                    Inspiring verse for today
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                readingType === 'random_verse' && styles.typeButtonActive
              ]}
              onPress={() => setReadingType('random_verse')}
            >
              <View style={styles.typeContent}>
                <Text style={styles.typeEmoji}>📖</Text>
                <View style={styles.typeTextContainer}>
                  <Text style={[styles.typeTitle, readingType === 'random_verse' && styles.typeTextActive]}>
                    Random Bible Verse
                  </Text>
                  <Text style={[styles.typeDescription, readingType === 'random_verse' && styles.typeDescActive]}>
                    Discover God's word
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {!quote ? (
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={fetchQuote}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Loading...' : 'Get Reading'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>{quote.text}</Text>
            <Text style={styles.reference}>— {quote.reference}</Text>

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>
                  Recording: {formatDuration(recordingDuration)}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stop Reading' : 'Start Reading'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.newQuoteButton, isLoading && styles.buttonDisabled]}
              onPress={fetchQuote}
              disabled={isLoading || isRecording}
            >
              <Text style={styles.buttonText}>New Reading</Text>
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
            <Text style={styles.resultTitle}>Analysis Complete!</Text>
            <Text style={styles.tokensEarned}>
              +{result.tokens_earned} Tokens
            </Text>

            <View style={styles.breakdown}>
              <Text style={styles.breakdownTitle}>Performance:</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Accuracy:</Text>
                <Text style={styles.breakdownValue}>{(result.analysis.text_accuracy * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Stability:</Text>
                <Text style={styles.breakdownValue}>{(result.analysis.emotional_stability * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Fluency:</Text>
                <Text style={styles.breakdownValue}>{(result.analysis.speech_fluency * 100).toFixed(0)}%</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => {
                setResult(null);
                setQuote(null);
              }}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showNameModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (userName) {
            setShowNameModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContent}>
            <Text style={styles.profileModalTitle}>
              {userName ? 'Edit Your Name' : 'Welcome to PrayChain! 🙏'}
            </Text>
            <Text style={styles.profileModalSubtitle}>
              {userName ? 'Update your name' : "What should we call you?"}
            </Text>

            <TextInput
              style={styles.profileInput}
              placeholder="Enter your name"
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              maxLength={30}
            />

            <View style={styles.profileModalButtons}>
              {userName && (
                <TouchableOpacity
                  style={[styles.profileModalButton, styles.cancelButton]}
                  onPress={() => setShowNameModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.profileModalButton,
                  styles.saveButton,
                  !userName && styles.saveButtonFull,
                ]}
                onPress={saveUserName}
              >
                <Text style={styles.saveButtonText}>
                  {userName ? 'Save' : "Let's Start!"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20, paddingTop: 60 },
  
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userInfo: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  addNameLink: { fontSize: 14, color: '#4A90E2', marginTop: 5 },
  avatarButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: { fontSize: 30 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  profileModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  profileModalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  profileInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
  },
  profileModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileModalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: { backgroundColor: '#f0f0f0' },
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#4A90E2' },
  saveButtonFull: { marginHorizontal: 0 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

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
});
