import { useState, useEffect, useCallback } from 'react';
import { usePrivy, useEmbeddedWallet } from '@privy-io/expo';
import { API_CONFIG, ENDPOINTS } from '@/config/api';

interface UserData {
  id: string;
  username: string;
  email: string;
  wallet_address?: string | null;
  tokens_balance: number;
  prayers_count: number;
  streak_days: number;
  total_earned: number;
  total_donated: number;
  level: number;
  experience: number;
  experience_to_next_level: number;
}

interface BibleQuote {
  text: string;
  reference: string;
  book_name?: string;
  chapter?: number;
  verse?: number;
  category?: string;
}

// ✅ Wyciąga EMAIL z linked_accounts
const getEmailFromPrivyUser = (user: any): string | null => {
  if (!user?.linked_accounts) return null;
  
  const emailAccount = user.linked_accounts.find(
    (account: any) => account.type === 'email'
  );
  
  return emailAccount?.address || null;
};

// ✅ Wyciąga WALLET ADDRESS z linked_accounts
const getWalletFromPrivyUser = (user: any): string | null => {
  if (!user?.linked_accounts) {
    console.log('No linked accounts found');
    return null;
  }
  
  console.log('Searching for wallet in', user.linked_accounts.length, 'linked accounts');
  console.log('Linked accounts:', JSON.stringify(user.linked_accounts, null, 2));
  
  // 1. PRIORYTET 1: Embedded Ethereum wallet
  const ethWallet = user.linked_accounts.find(
    (account: any) => 
      account.type === 'wallet' && 
      account.chain_type === 'ethereum' &&
      account.connector_type === 'embedded'
  );
  
  if (ethWallet?.address) {
    console.log('✅ Found Ethereum embedded wallet:', ethWallet.address);
    return ethWallet.address;
  }
  
  // 2. PRIORYTET 2: Embedded Solana wallet
  const solWallet = user.linked_accounts.find(
    (account: any) => 
      account.type === 'wallet' && 
      account.chain_type === 'solana' &&
      account.connector_type === 'embedded'
  );
  
  if (solWallet?.address) {
    console.log('✅ Found Solana embedded wallet:', solWallet.address);
    return solWallet.address;
  }
  
  // 3. PRIORYTET 3: Cross-app embedded wallet
  const crossAppAccount = user.linked_accounts.find(
    (account: any) => account.type === 'cross_app'
  );
  
  if (crossAppAccount?.embedded_wallets?.[0]?.address) {
    console.log('✅ Found cross-app embedded wallet:', crossAppAccount.embedded_wallets[0].address);
    return crossAppAccount.embedded_wallets[0].address;
  }
  
  // 4. FALLBACK: Jakikolwiek wallet
  const anyWallet = user.linked_accounts.find(
    (account: any) => account.type === 'wallet' && account.address
  );
  
  if (anyWallet?.address) {
    console.log('✅ Found wallet:', anyWallet.address);
    return anyWallet.address;
  }
  
  console.log('❌ No wallet found');
  return null;
};

export function useUserData() {
  const { user, isReady } = usePrivy();
  const wallet = useEmbeddedWallet();  // ✅ POPRAWKA
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dailyQuote, setDailyQuote] = useState<BibleQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      console.log('User not authenticated');
      setLoading(false);
      return;
    }

    const email = getEmailFromPrivyUser(user);
    let walletAddress = getWalletFromPrivyUser(user);
    
    // ✅ Jeśli nie ma wallet, utwórz go
    if (!walletAddress && wallet) {
      console.log('No wallet found - creating embedded wallet...');
      try {
        await wallet.create();  // ✅ Utwórz wallet
        // Odczekaj chwilę na synchronizację
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Sprawdź ponownie
        walletAddress = getWalletFromPrivyUser(user) || wallet.address;
        console.log('✅ Wallet created:', walletAddress);
      } catch (error) {
        console.error('Failed to create wallet:', error);
      }
    }
    
    if (!email) {
      console.error('No email found in user linked accounts');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching user data for email:', email);
      if (walletAddress) {
        console.log('Wallet address:', walletAddress);
      }
      
      let userResponse = await fetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.USER_BY_EMAIL(email)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (userResponse.status === 404) {
        console.log('User not found, creating new user...');
        
        const username = email.split('@')[0];
        const createResponse = await fetch(
          `${API_CONFIG.BASE_URL}${ENDPOINTS.USERS}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username,
              email,
              wallet_address: walletAddress
            }),
          }
        );

        if (!createResponse.ok) {
          console.error('Failed to create user:', createResponse.status);
          const errorText = await createResponse.text();
          console.error('Error details:', errorText);
          throw new Error('Failed to create user');
        }

        const newUser = await createResponse.json();
        console.log('New user created:', newUser.username);
        setUserData(newUser);
        return;
      }

      if (!userResponse.ok) {
        console.error('Failed to fetch user:', userResponse.status);
        const errorText = await userResponse.text();
        console.error('Error details:', errorText);
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      console.log('User data loaded:', userData.username);
      
      // ✅ Aktualizuj wallet address jeśli się zmienił lub nie istnieje
      if (walletAddress && userData.wallet_address !== walletAddress) {
        console.log('Updating wallet address...');
        const updateResponse = await fetch(
          `${API_CONFIG.BASE_URL}/api/users/${userData.id}/wallet`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: walletAddress }),
          }
        );
        
        if (updateResponse.ok) {
          userData.wallet_address = walletAddress;
          console.log('Wallet address updated');
        }
      }
      
      setUserData(userData);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, wallet]);

  const fetchDailyQuote = useCallback(async () => {
    try {
      const endpoint = `${API_CONFIG.BASE_URL}/api/bible/short-quote`;
      console.log('Fetching daily quote from:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Daily quote loaded');
        setDailyQuote(data);
      } else {
        console.error('Failed to fetch daily quote:', response.status);
      }
    } catch (error) {
      console.error('Error fetching daily quote:', error);
    }
  }, []);

  const refreshQuote = useCallback(async () => {
    setRefreshing(true);
    await fetchDailyQuote();
    setRefreshing(false);
  }, [fetchDailyQuote]);

  const refresh = useCallback(async () => {
    console.log('Refreshing user data and quote...');
    setLoading(true);
    await Promise.all([
      fetchUserData(),
      fetchDailyQuote()
    ]);
    setLoading(false);
  }, [fetchUserData, fetchDailyQuote]);

  useEffect(() => {
    if (isReady && user) {
      console.log('User authenticated, loading data...');
      refresh();
    }
  }, [isReady, user, refresh]);

  const email = getEmailFromPrivyUser(user);
  const username = userData?.username || (email ? email.split('@')[0] : 'Guest');

  return {
    userData,
    dailyQuote,
    loading,
    refreshing,
    refreshQuote,
    refresh,
    userId: userData?.id || null,
    username,
    walletAddress: userData?.wallet_address || null,
  };
}