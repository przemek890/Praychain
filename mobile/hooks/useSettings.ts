import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/expo';
import { router } from 'expo-router';

interface SettingsData {
  email: string | null;
  username: string;
  walletAddress: string | null;
  walletChain: string | null;
}

export function useSettings() {
  const { logout, user } = usePrivy();
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Wyciągnij email
  const getEmail = useCallback(() => {
    if (!user?.linked_accounts) return null;
    const emailAccount = user.linked_accounts.find(
      (account: any) => account.type === 'email'
    );
    return emailAccount?.address || null;
  }, [user]);

  // Wyciągnij wallet info
  const getWalletInfo = useCallback((): { address: string | null; chain: string | null } => {
    if (!user?.linked_accounts) return { address: null, chain: null };

    // Priorytet 1: Ethereum embedded
    const ethWallet = user.linked_accounts.find(
      (account: any) => 
        account.type === 'wallet' && 
        account.chain_type === 'ethereum' &&
        account.connector_type === 'embedded'
    );
    if (ethWallet?.address) {
      return { address: ethWallet.address, chain: ethWallet.chain_id || 'ethereum' };
    }

    // Priorytet 2: Solana embedded
    const solWallet = user.linked_accounts.find(
      (account: any) => 
        account.type === 'wallet' && 
        account.chain_type === 'solana' &&
        account.connector_type === 'embedded'
    );
    if (solWallet?.address) {
      return { address: solWallet.address, chain: 'solana' };
    }

    // Priorytet 3: Cross-app
    const crossAppAccount = user.linked_accounts.find(
      (account: any) => account.type === 'cross_app'
    );
    if (crossAppAccount?.embedded_wallets?.[0]?.address) {
      return { 
        address: crossAppAccount.embedded_wallets[0].address, 
        chain: crossAppAccount.embedded_wallets[0].chain_id || null 
      };
    }

    // Fallback: any wallet
    const anyWallet = user.linked_accounts.find(
      (account: any) => account.type === 'wallet' && account.address
    );
    if (anyWallet?.address) {
      return { address: anyWallet.address, chain: anyWallet.chain_id || null };
    }

    return { address: null, chain: null };
  }, [user]);

  // Przygotuj dane ustawień
  const getSettingsData = useCallback((): SettingsData => {
    const email = getEmail();
    const { address, chain } = getWalletInfo();
    const username = email ? email.split('@')[0] : 'Guest';

    return {
      email,
      username,
      walletAddress: address,
      walletChain: chain,
    };
  }, [getEmail, getWalletInfo]);

  const handleLogout = useCallback(async () => {
    await logout();
    setSettingsVisible(false);
    router.replace('../login');
  }, [logout]);

  const openSettings = useCallback(() => {
    setSettingsVisible(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsVisible(false);
  }, []);

  return {
    settingsVisible,
    settingsData: getSettingsData(),
    openSettings,
    closeSettings,
    handleLogout,
  };
}