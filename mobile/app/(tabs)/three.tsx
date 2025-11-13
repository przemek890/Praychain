import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, ENDPOINTS } from '@/config/api';

interface TokenBalance {
  user_id: string;
  total_earned: number;
  total_spent: number;
  current_balance: number;
  last_updated: string;
}

interface Transaction {
  _id: string;
  type: string; // "earn" or "spend"
  amount: number;
  source: string;
  created_at: string;
  charity_title?: string;
}

interface DonationBreakdown {
  charity_id: string;
  charity_title: string;
  total_tokens: number;
  donations_count: number;
}

interface UserDonationStats {
  user_id: string;
  total_tokens_donated: number;
  total_donations: number;
  charities_supported: number;
  breakdown: DonationBreakdown[];
}

export default function StatsScreen() {
  const [userId, setUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [donationStats, setDonationStats] = useState<UserDonationStats | null>(null);
  const [userName, setUserName] = useState<string>('');

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
    const getUserName = async () => {
      const storedName = await SecureStore.getItemAsync('user_name');
      if (storedName) {
        setUserName(storedName);
      }
    };
    getUserName();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAllStats();
    }
  }, [userId]);

  const fetchAllStats = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchTokenBalance(),
        fetchTransactions(),
        fetchDonationStats(),
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTokenBalance = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.TOKEN_BALANCE(userId)}`);
      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.TOKEN_TRANSACTIONS(userId)}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchDonationStats = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${ENDPOINTS.CHARITY_USER_DONATIONS(userId)}`);
      if (response.ok) {
        const data = await response.json();
        setDonationStats(data);
      }
    } catch (error) {
      console.error('Error fetching donation stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllStats();
    setRefreshing(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string): string => {
    return type === 'earn' ? '⬆️' : '⬇️';
  };

  const getTransactionColor = (type: string): string => {
    return type === 'earn' ? '#4CAF50' : '#FF9800';
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
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
        <Text style={styles.title}>
          {userName ? `${userName}'s Stats` : 'Your Statistics'}
        </Text>
        <Text style={styles.subtitle}>Track your prayer journey</Text>
      </View>

      {/* Token Balance Overview */}
      {tokenBalance && (
        <View style={styles.balanceSection}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceTitle}>Current Balance</Text>
            <Text style={styles.balanceAmount}>{tokenBalance.current_balance} 🪙</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{tokenBalance.total_earned}</Text>
              <Text style={styles.statsLabel}>Total Earned</Text>
            </View>
            <View style={styles.statsCard}>
              <Text style={styles.statsValue}>{tokenBalance.total_spent}</Text>
              <Text style={styles.statsLabel}>Total Spent</Text>
            </View>
          </View>
        </View>
      )}

      {/* Donation Statistics */}
      {donationStats && donationStats.total_donations > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💖 Charity Impact</Text>
          
          <View style={styles.impactCard}>
            <View style={styles.impactRow}>
              <View style={styles.impactItem}>
                <Text style={styles.impactValue}>{donationStats.total_tokens_donated}</Text>
                <Text style={styles.impactLabel}>Tokens Donated</Text>
              </View>
              <View style={styles.impactItem}>
                <Text style={styles.impactValue}>{donationStats.charities_supported}</Text>
                <Text style={styles.impactLabel}>Charities Helped</Text>
              </View>
            </View>
          </View>

          {/* Breakdown by Charity */}
          <Text style={styles.breakdownTitle}>Donations Breakdown:</Text>
          {donationStats.breakdown.map((charity) => (
            <View key={charity.charity_id} style={styles.charityBreakdownCard}>
              <View style={styles.charityBreakdownHeader}>
                <Text style={styles.charityBreakdownTitle}>{charity.charity_title}</Text>
                <Text style={styles.charityBreakdownTokens}>{charity.total_tokens} 🪙</Text>
              </View>
              <Text style={styles.charityBreakdownCount}>
                {charity.donations_count} donation{charity.donations_count > 1 ? 's' : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Recent Activity</Text>
        
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Start reading prayers to earn tokens!</Text>
          </View>
        ) : (
          transactions.slice(0, 15).map((transaction) => (
            <View key={transaction._id} style={styles.transactionCard}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionIcon}>
                  {getTransactionIcon(transaction.type)}
                </Text>
                <View>
                  <Text style={styles.transactionType}>
                    {transaction.type === 'earn' ? 'Earned' : 'Donated'}
                  </Text>
                  <Text style={styles.transactionSource}>
                    {transaction.charity_title || 
                     (transaction.source.startsWith('prayer:') ? 'Prayer Reading' : transaction.source)}
                  </Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: getTransactionColor(transaction.type) },
                ]}
              >
                {transaction.type === 'earn' ? '+' : '-'}
                {transaction.amount}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Prayer Consistency */}
      {tokenBalance && tokenBalance.total_earned > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🙏 Prayer Stats</Text>
          
          <View style={styles.prayerStatsCard}>
            <View style={styles.prayerStatRow}>
              <Text style={styles.prayerStatLabel}>Average per Prayer:</Text>
              <Text style={styles.prayerStatValue}>
                {Math.round(tokenBalance.total_earned / Math.max(1, transactions.filter(t => t.type === 'earn').length))} tokens
              </Text>
            </View>
            <View style={styles.prayerStatRow}>
              <Text style={styles.prayerStatLabel}>Total Prayers:</Text>
              <Text style={styles.prayerStatValue}>
                {transactions.filter(t => t.type === 'earn').length}
              </Text>
            </View>
            <View style={styles.prayerStatRow}>
              <Text style={styles.prayerStatLabel}>Giving Rate:</Text>
              <Text style={styles.prayerStatValue}>
                {tokenBalance.total_earned > 0 
                  ? Math.round((tokenBalance.total_spent / tokenBalance.total_earned) * 100) 
                  : 0}%
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Keep praying to earn more tokens! 🙏</Text>
      </View>
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
  },
  balanceSection: {
    padding: 15,
  },
  balanceCard: {
    backgroundColor: '#4A90E2',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  balanceTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: 'white',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  impactCard: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactItem: {
    alignItems: 'center',
  },
  impactValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  impactLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  charityBreakdownCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  charityBreakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  charityBreakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  charityBreakdownTokens: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  charityBreakdownCount: {
    fontSize: 12,
    color: '#999',
  },
  transactionCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionSource: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  prayerStatsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  prayerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prayerStatLabel: {
    fontSize: 16,
    color: '#666',
  },
  prayerStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
});