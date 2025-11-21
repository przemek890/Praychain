import { useState, useCallback, useEffect } from 'react';
import { usePrivy, useEmbeddedWallet } from '@privy-io/expo';
import { createWalletClient, createPublicClient, http, custom, parseUnits, formatUnits } from 'viem';
import { celoSepolia, PRAY_TOKEN_ADDRESS, PRAY_TOKEN_ABI, CHARITY_WALLET_ADDRESS } from '@/config/blockchain';

interface UseWeb3Props {
  userWalletAddress?: string | null;
}

export function useWeb3({ userWalletAddress }: UseWeb3Props = {}) {
  const { user, isReady } = usePrivy();
  const embeddedWallet = useEmbeddedWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // ✅ Znajdź wallet address
  useEffect(() => {
    if (!isReady || !user) {
      setIsWalletReady(false);
      setWalletAddress(null);
      return;
    }

    // Priorytet 1: Wallet z bazy danych
    if (userWalletAddress) {
      console.log('✅ Using wallet from database:', userWalletAddress);
      setWalletAddress(userWalletAddress);
      setIsWalletReady(true);
      return;
    }

    // Priorytet 2: Embedded wallet z Privy
    if (embeddedWallet?.address) {
      console.log('✅ Found Privy embedded wallet:', embeddedWallet.address);
      setWalletAddress(embeddedWallet.address);
      setIsWalletReady(true);
    } else {
      console.warn('⚠️ No wallet found');
      setIsWalletReady(false);
      setWalletAddress(null);
    }
  }, [user, isReady, userWalletAddress, embeddedWallet]);

  // ✅ Public client do odczytu
  const publicClient = createPublicClient({
    chain: celoSepolia,
    transport: http(),
  });

  // ✅ Funkcja do wysyłania tokenów PRAY
  const sendPrayTokens = useCallback(async (amount: number): Promise<string> => {
    if (!isWalletReady || !walletAddress) {
      throw new Error('Wallet not ready. Please wait and try again.');
    }

    if (!embeddedWallet) {
      throw new Error('Embedded wallet not initialized');
    }

    setSending(true);
    setError(null);

    try {
      console.log('🎯 Starting PRAY token transfer...');
      console.log('Amount:', amount, 'PRAY');
      console.log('From:', walletAddress);
      console.log('To:', CHARITY_WALLET_ADDRESS);
      console.log('Network: Celo Sepolia (chainId:', celoSepolia.id, ')');

      // ✅ KROK 1: Stwórz provider bezpośrednio z embeddedWallet
      console.log('🔗 Creating Ethereum provider...');
      
      // Użyj embedded wallet jako providera bezpośrednio
      const provider = {
        request: async ({ method, params }: any) => {
          console.log('🔧 Provider request:', method);
          
          // Deleguj do embedded wallet
          if (method === 'eth_sendTransaction') {
            // Użyj metody send z embedded wallet
            const txParams = params[0];
            console.log('📤 Sending transaction via embedded wallet...');
            
            // Embedded wallet powinien mieć metodę do wysyłania transakcji
            if (embeddedWallet.provider?.request) {
              return await embeddedWallet.provider.request({ method, params });
            }
            
            throw new Error('Embedded wallet provider not available');
          }
          
          // Inne metody
          if (embeddedWallet.provider?.request) {
            return await embeddedWallet.provider.request({ method, params });
          }
          
          throw new Error(`Method ${method} not supported`);
        }
      };

      console.log('✅ Provider created');

      // ✅ KROK 2: Stwórz Wallet Client z custom transport
      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain: celoSepolia,
        transport: custom(provider),
      });

      console.log('✅ Wallet client created');

      // ✅ KROK 3: Konwertuj kwotę na Wei (18 decimals)
      const amountInWei = parseUnits(amount.toString(), 18);
      console.log('Amount in Wei:', amountInWei.toString());

      // ✅ KROK 4: Symuluj transakcję
      console.log('🔍 Simulating transaction...');
      
      const { request } = await publicClient.simulateContract({
        address: PRAY_TOKEN_ADDRESS,
        abi: PRAY_TOKEN_ABI,
        functionName: 'transfer',
        args: [CHARITY_WALLET_ADDRESS, amountInWei],
        account: walletAddress as `0x${string}`,
      });

      console.log('✅ Simulation successful');

      // ✅ KROK 5: Wyślij transakcję
      console.log('📤 Sending transaction to blockchain...');
      
      const txHash = await walletClient.writeContract(request);

      console.log('✅ Transaction broadcasted!');
      console.log('Hash:', txHash);
      console.log(`🔗 View on explorer: https://celo-sepolia.blockscout.com/tx/${txHash}`);

      // ✅ KROK 6: Czekaj na potwierdzenie
      console.log('⏳ Waiting for confirmation (1 block)...');
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
      });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction was reverted on blockchain');
      }

      console.log('✅ Transaction confirmed!');
      console.log('Block number:', receipt.blockNumber.toString());
      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('Status:', receipt.status);

      return txHash;

    } catch (err: any) {
      console.error('❌ Transaction failed:', err);

      // Mapuj błędy
      let errorMessage = 'Transaction failed';

      if (err.message?.includes('transfer amount exceeds balance')) {
        errorMessage = 'Insufficient PRAY token balance';
      } else if (err.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient CELO for gas fees';
      } else if (err.message?.includes('user rejected') || err.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection';
      } else if (err.message?.includes('nonce')) {
        errorMessage = 'Transaction conflict. Please try again';
      } else if (err.message?.includes('gas')) {
        errorMessage = 'Gas estimation failed. Check token balance';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);

    } finally {
      setSending(false);
    }
  }, [embeddedWallet, walletAddress, isWalletReady, publicClient]);

  // ✅ Funkcja do pobierania on-chain balansu PRAY
  const getOnChainBalance = useCallback(async (): Promise<string> => {
    if (!walletAddress) {
      console.warn('No wallet address to check balance');
      return '0';
    }

    try {
      console.log('💰 Fetching on-chain PRAY balance for:', walletAddress);

      const balance = await publicClient.readContract({
        address: PRAY_TOKEN_ADDRESS,
        abi: PRAY_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      const formattedBalance = formatUnits(balance as bigint, 18);
      console.log('✅ On-chain balance:', formattedBalance, 'PRAY');

      return formattedBalance;

    } catch (err) {
      console.error('❌ Error fetching on-chain balance:', err);
      return '0';
    }
  }, [walletAddress, publicClient]);

  // ✅ Funkcja do sprawdzania balansu CELO (gas)
  const getNativeBalance = useCallback(async (): Promise<string> => {
    if (!walletAddress) {
      return '0';
    }

    try {
      const balance = await publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });

      const formattedBalance = formatUnits(balance, 18);
      console.log('💎 Native CELO balance:', formattedBalance);

      return formattedBalance;

    } catch (err) {
      console.error('Error fetching native balance:', err);
      return '0';
    }
  }, [walletAddress, publicClient]);

  return {
    // Actions
    sendPrayTokens,
    getOnChainBalance,
    getNativeBalance,
    
    // State
    sending,
    error,
    walletAddress,
    isWalletReady,
    isFromDatabase: !!userWalletAddress,
  };
}