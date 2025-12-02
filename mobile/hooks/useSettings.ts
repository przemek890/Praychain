import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/expo';
import { router } from 'expo-router';

interface SettingsData {
  email: string | null;
  username: string;
  walletAddress: string | null;
  walletChain: string | null;
}

// Helper for parsing chainId from format "eip155:42220" or "42220"
const parseChainId = (chainId: string | number | null): string | null => {
  if (!chainId) return null;
  
  const chainIdStr = String(chainId);
  
  // If it's in the format "eip155:42220", extract the number
  if (chainIdStr.includes(':')) {
    return chainIdStr.split(':')[1];
  }
  
  return chainIdStr;
};

// Helper for mapping chainId to network name
const getChainName = (chainId: string | number | null): string => {
  const parsedChainId = parseChainId(chainId);
  
  if (!parsedChainId) return '-';
  
  // Celo networks
  if (parsedChainId === '42220' || parsedChainId === '0xa4ec') return 'Celo';
  if (parsedChainId === '44787' || parsedChainId === '0xaef3') return 'Celo Alfajores';
  
  // Other networks
  if (parsedChainId === '1' || parsedChainId === '0x1') return 'Ethereum';
  if (parsedChainId === '137' || parsedChainId === '0x89') return 'Polygon';
  if (parsedChainId === '8453' || parsedChainId === '0x2105') return 'Base';
  
  return '-';
};

export function useSettings() {
  const { logout, user } = usePrivy();
  const [settingsVisible, setSettingsVisible] = useState(false);

  const getEmail = useCallback(() => {
    if (!user?.linked_accounts) return null;
    const emailAccount = user.linked_accounts.find(
      (account: any) => account.type === 'email'
    );
    return emailAccount?.address || null;
  }, [user]);

  // Updated function - parses chainId and returns a readable name
  const getWalletInfo = useCallback((): { address: string | null; chain: string | null } => {
    if (!user?.linked_accounts) return { address: null, chain: null };

    // Priority 1: Ethereum embedded
    const ethWallet = user.linked_accounts.find(
      (account: any) => 
        account.type === 'wallet' && 
        account.chain_type === 'ethereum' &&
        account.connector_type === 'embedded'
    );
    if (ethWallet?.address) {
      const chainName = getChainName(ethWallet.chain_id);
      console.log('Found ETH wallet:', ethWallet.address, 'Raw chain_id:', ethWallet.chain_id, 'Parsed:', chainName);
      return { 
        address: ethWallet.address, 
        chain: chainName 
      };
    }

    // Priority 2: Solana embedded
    const solWallet = user.linked_accounts.find(
      (account: any) => 
        account.type === 'wallet' && 
        account.chain_type === 'solana' &&
        account.connector_type === 'embedded'
    );
    if (solWallet?.address) {
      return { address: solWallet.address, chain: 'Solana' };
    }

    // Priority 3: Cross-app
    const crossAppAccount = user.linked_accounts.find(
      (account: any) => account.type === 'cross_app'
    );
    if (crossAppAccount?.embedded_wallets?.[0]?.address) {
      const chainName = getChainName(crossAppAccount.embedded_wallets[0].chain_id);
      return { 
        address: crossAppAccount.embedded_wallets[0].address, 
        chain: chainName 
      };
    }

    // Fallback: any wallet
    const anyWallet = user.linked_accounts.find(
      (account: any) => account.type === 'wallet' && account.address
    );
    if (anyWallet?.address) {
      const chainName = getChainName(anyWallet.chain_id);
      return { address: anyWallet.address, chain: chainName };
    }

    return { address: null, chain: null };
  }, [user]);

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