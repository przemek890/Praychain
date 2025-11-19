import { useState, useEffect, useCallback, useRef } from 'react';
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
  if (!user?.linked_accounts) return null;
  
  // 1. PRIORYTET 1: Embedded Ethereum wallet
  const ethWallet = user.linked_accounts.find(
    (account: any) => 
      account.type === 'wallet' && 
      account.chain_type === 'ethereum' &&
      account.connector_type === 'embedded'
  );
  
  if (ethWallet?.address) return ethWallet.address;
  
  // 2. PRIORYTET 2: Embedded Solana wallet
  const solWallet = user.linked_accounts.find(
    (account: any) => 
      account.type === 'wallet' && 
      account.chain_type === 'solana' &&
      account.connector_type === 'embedded'
  );
  
  if (solWallet?.address) return solWallet.address;
  
  // 3. PRIORYTET 3: Cross-app embedded wallet
  const crossAppAccount = user.linked_accounts.find(
    (account: any) => account.type === 'cross_app'
  );
  
  if (crossAppAccount?.embedded_wallets?.[0]?.address) {
    return crossAppAccount.embedded_wallets[0].address;
  }
  
  // 4. FALLBACK: Jakikolwiek wallet
  const anyWallet = user.linked_accounts.find(
    (account: any) => account.type === 'wallet' && account.address
  );
  
  return anyWallet?.address || null;
};

export function useUserData() {
  const { user, isReady } = usePrivy();
  const wallet = useEmbeddedWallet();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dailyQuote, setDailyQuote] = useState<BibleQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ FLAGA - zapobiega wielokrotnym wywołaniom
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchUserData = useCallback(async () => {
    // ✅ Jeśli już fetchujemy, przerwij
    if (isFetchingRef.current) {
      console.log('⚠️ Already fetching user data, skipping...');
      return;
    }

    if (!user) {
      console.log('User not authenticated');
      setLoading(false);
      return;
    }

    const email = getEmailFromPrivyUser(user);
    
    if (!email) {
      console.error('No email found');
      setLoading(false);
      return;
    }

    // ✅ Ustaw flagę
    isFetchingRef.current = true;

    try {
      console.log('🔄 Fetching user data for:', email);
      
      let userResponse = await fetch(
        `${API_CONFIG.BASE_URL}${ENDPOINTS.USER_BY_EMAIL(email)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (userResponse.status === 404) {
        console.log('User not found, creating...');
        
        // ✅ Spróbuj uzyskać wallet przed utworzeniem użytkownika
        let walletAddress = getWalletFromPrivyUser(user);
        
        if (!walletAddress && wallet) {
          console.log('Creating embedded wallet...');
          try {
            await wallet.create();
            await new Promise(resolve => setTimeout(resolve, 1000));
            walletAddress = wallet.address;
            console.log('✅ Wallet created:', walletAddress);
          } catch (error) {
            console.error('Wallet creation failed:', error);
          }
        }
        
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
          throw new Error('Failed to create user');
        }

        const newUser = await createResponse.json();
        console.log('✅ New user created:', newUser.username);
        setUserData(newUser);
        return;
      }

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await userResponse.json();
      console.log('✅ User data loaded:', userData.username);
      
      // ✅ Aktualizuj wallet tylko jeśli jest nowy i użytkownik już istnieje
      let walletAddress = getWalletFromPrivyUser(user);
      
      if (!walletAddress && wallet && !wallet.address) {
        console.log('Creating wallet for existing user...');
        try {
          await wallet.create();
          await new Promise(resolve => setTimeout(resolve, 1000));
          walletAddress = wallet.address;
        } catch (error) {
          console.error('Wallet creation failed:', error);
        }
      } else if (wallet?.address) {
        walletAddress = wallet.address;
      }
      
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
          console.log('✅ Wallet address updated');
        }
      }
      
      setUserData(userData);

    } catch (error) {
      console.error('❌ Error fetching user data:', error);
    } finally {
      setLoading(false);
      // ✅ Zwolnij flagę
      isFetchingRef.current = false;
    }
  }, [user]); // ✅ USUŃ wallet z dependencies!

  const fetchDailyQuote = useCallback(async () => {
    try {
      const endpoint = `${API_CONFIG.BASE_URL}/api/bible/random-quote`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setDailyQuote(data);
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
    console.log('🔄 Manual refresh triggered');
    setLoading(true);
    await Promise.all([
      fetchUserData(),
      fetchDailyQuote()
    ]);
    setLoading(false);
  }, [fetchUserData, fetchDailyQuote]);

  // ✅ GŁÓWNY EFFECT - tylko raz po zalogowaniu
  useEffect(() => {
    if (isReady && user && !hasInitializedRef.current) {
      console.log('🚀 Initial data load');
      hasInitializedRef.current = true;
      
      const loadData = async () => {
        await Promise.all([
          fetchUserData(),
          fetchDailyQuote()
        ]);
      };
      
      loadData();
    }
    
    // ✅ Reset przy wylogowaniu
    if (!user) {
      hasInitializedRef.current = false;
      isFetchingRef.current = false;
      setUserData(null);
      setDailyQuote(null);
    }
  }, [isReady, user]); // ✅ Tylko isReady i user!

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