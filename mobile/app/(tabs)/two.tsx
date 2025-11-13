import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  RefreshControl,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, ENDPOINTS } from '@/config/api';

interface CharityAction {
  _id: string;  // ✅ Zmień z 'id' na '_id'
  title: string;
  description: string;
  cost_tokens: number;
  category: string;
  organization: string;
  impact_description: string;
  image_url: string;
  is_active: boolean;
  total_supported: number;
  total_tokens_raised?: number;  // ✅ Opcjonalne (może nie być w starych danych)
}

interface CharityStats {
  charity_id: string;
  title: string;
  total_tokens_raised: number;
  total_supporters: number;
}

export default function CharityScreen() {
  const [charities, setCharities] = useState<CharityAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [selectedCharity, setSelectedCharity] = useState<CharityAction | null>(null);
  const [donationAmount, setDonationAmount] = useState<string>('');
  const [isDonating, setIsDonating] = useState(false);

  useEffect(() => {
    const getUserId = async () => {
      const storedUserId = await SecureStore.getItemAsync('user_id');
      if (storedUserId) {
        setUserId(storedUserId);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTokenBalance();
      fetchCharities();
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
      console.error('Error fetching balance:', error);
    }
  };

  const fetchCharities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.CHARITY_ACTIONS}`);
      if (response.ok) {
        const data = await response.json();
        setCharities(data.actions || []);
      }
    } catch (error) {
      console.error('Error fetching charities:', error);
      Alert.alert('Error', 'Failed to load charity actions');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCharities();
    await fetchTokenBalance();
    setRefreshing(false);
  };

  const handleDonate = async () => {
    if (!selectedCharity) return;

    const amount = parseInt(donationAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid token amount');
      return;
    }

    if (amount > tokenBalance) {
      Alert.alert(
        'Insufficient Tokens',
        `You have ${tokenBalance} tokens, but tried to donate ${amount}`
      );
      return;
    }

    setIsDonating(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.CHARITY_DONATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          charity_id: selectedCharity._id,  // ✅ Zmień na _id
          tokens_amount: amount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        Alert.alert(
          'Success! 🎉',
          `You donated ${amount} tokens to ${selectedCharity.title}!\n\nNew balance: ${data.new_balance} tokens`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedCharity(null);
                setDonationAmount('');
                fetchTokenBalance();
                fetchCharities();
              },
            },
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Failed to donate');
      }
    } catch (error: any) {
      console.error('Donation error:', error);
      Alert.alert('Error', 'Failed to process donation');
    } finally {
      setIsDonating(false);
    }
  };

  const getCategoryEmoji = (category: string): string => {
    const emojis: { [key: string]: string } = {
      health: '🏥',
      education: '📚',
      environment: '🌍',
      humanitarian: '❤️',
      animals: '🐾',
      children: '👶',
    };
    return emojis[category] || '💖';
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading charities...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Support Charities</Text>
        <Text style={styles.subtitle}>Use your tokens to make a difference</Text>
        
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Tokens:</Text>
          <Text style={styles.balanceValue}>{tokenBalance} 🪙</Text>
        </View>
      </View>

      {charities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No charity actions available</Text>
        </View>
      ) : (
        charities.map((charity) => (
          <View key={charity._id} style={styles.charityCard}>
            <View style={styles.charityHeader}>
              <Text style={styles.charityEmoji}>{getCategoryEmoji(charity.category)}</Text>
              <View style={styles.charityTitleContainer}>
                <Text style={styles.charityTitle}>{charity.title}</Text>
                <Text style={styles.charityOrg}>{charity.organization}</Text>
              </View>
            </View>

            <Text style={styles.charityDescription}>{charity.description}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{charity.total_tokens_raised || 0}</Text>
                <Text style={styles.statLabel}>Tokens Raised</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{charity.total_supported || 0}</Text>
                <Text style={styles.statLabel}>Supporters</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.donateButton}
              onPress={() => setSelectedCharity(charity)}
            >
              <Text style={styles.donateButtonText}>Donate Tokens</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Donation Modal */}
      {selectedCharity && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Donate to {selectedCharity.title}</Text>
            
            <Text style={styles.modalBalance}>
              Available: {tokenBalance} tokens
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter token amount"
              keyboardType="numeric"
              value={donationAmount}
              onChangeText={setDonationAmount}
            />

            <View style={styles.quickAmounts}>
              {[10, 25, 50, 100].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.quickAmountButton}
                  onPress={() => setDonationAmount(amount.toString())}
                  disabled={amount > tokenBalance}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      amount > tokenBalance && styles.quickAmountDisabled,
                    ]}
                  >
                    {amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setSelectedCharity(null);
                  setDonationAmount('');
                }}
                disabled={isDonating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleDonate}
                disabled={isDonating || !donationAmount}
              >
                {isDonating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Donate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  balanceCard: {
    backgroundColor: '#FFD700',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  charityCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  charityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  charityEmoji: {
    fontSize: 40,
    marginRight: 15,
  },
  charityTitleContainer: {
    flex: 1,
  },
  charityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  charityOrg: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  charityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  donateButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  donateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  modalBalance: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  quickAmountButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  quickAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  quickAmountDisabled: {
    color: '#ccc',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
