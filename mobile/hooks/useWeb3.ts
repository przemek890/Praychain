import { useState, useCallback, useEffect } from 'react';
import { usePrivy, useEmbeddedWallet } from '@privy-io/expo';
import { createPublicClient, http, parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { celo, PRAY_TOKEN_ADDRESS, PRAY_TOKEN_ABI, CHARITY_WALLET_ADDRESS } from '@/config/blockchain';

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

  useEffect(() => {
    if (!isReady || !user) {
      setIsWalletReady(false);
      setWalletAddress(null);
      return;
    }

    if (userWalletAddress) {
      console.log('✅ Using wallet from database:', userWalletAddress);
      setWalletAddress(userWalletAddress);
      setIsWalletReady(true);
      return;
    }

    if (embeddedWallet?.account?.address) {
      console.log('✅ Found Privy embedded wallet:', embeddedWallet.account.address);
      setWalletAddress(embeddedWallet.account.address);
      setIsWalletReady(true);
    } else {
      console.warn('⚠️ No wallet found');
      setIsWalletReady(false);
      setWalletAddress(null);
    }
  }, [user, isReady, userWalletAddress, embeddedWallet]);

  const publicClient = createPublicClient({
    chain: celo,
    transport: http(),
  });

  const sendPrayTokens = useCallback(async (amount: number): Promise<string> => {
    if (!isWalletReady || !walletAddress) {
      throw new Error('Wallet not ready. Please wait and try again.');
    }

    if (!embeddedWallet?.account) {
      throw new Error('Embedded wallet not initialized');
    }

    setSending(true);
    setError(null);

    try {
      console.log('🎯 Starting PRAY token transfer...');
      console.log('Amount:', amount, 'PRAY');
      console.log('From:', walletAddress);
      console.log('To:', CHARITY_WALLET_ADDRESS);
      console.log('Network: Celo (chainId:', celo.id, ')');

      const amountInWei = parseUnits(amount.toString(), 18);
      console.log('Amount in Wei:', amountInWei.toString());

      const data = encodeFunctionData({
        abi: PRAY_TOKEN_ABI,
        functionName: 'transfer',
        args: [CHARITY_WALLET_ADDRESS, amountInWei],
      });

      console.log('📝 Encoded transaction data:', data);

      // ✅ Symuluj transakcję
      console.log('🔍 Simulating transaction...');
      
      await publicClient.simulateContract({
        address: PRAY_TOKEN_ADDRESS,
        abi: PRAY_TOKEN_ABI,
        functionName: 'transfer',
        args: [CHARITY_WALLET_ADDRESS, amountInWei],
        account: walletAddress as `0x${string}`,
      });

      console.log('✅ Simulation successful');

      // ✅ Pobierz provider
      console.log('🔗 Getting provider from embedded wallet...');
      
      const provider = await embeddedWallet.getProvider();
      
      if (!provider) {
        throw new Error('Failed to get provider from embedded wallet');
      }

      console.log('✅ Provider obtained');

      // ✅ Transakcja BEZ gas - niech node sam oszacuje
      const txParams = {
        from: walletAddress,
        to: PRAY_TOKEN_ADDRESS,
        data: data,
        value: '0x0',
      };

      console.log('📤 Sending transaction (gas will be auto-estimated)...');
      console.log('Transaction params:', txParams);

      // ✅ Wyślij transakcję - RPC node automatycznie oszacuje gas
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      console.log('✅ Transaction broadcasted!');
      console.log('Hash:', txHash);
      console.log(`🔗 View on explorer: https://celoscan.io/tx/${txHash}`);

      // ✅ Czekaj na potwierdzenie
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        confirmations: 1,
      });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction was reverted on blockchain');
      }

      console.log('✅ Transaction confirmed!');
      console.log('Block number:', receipt.blockNumber.toString());
      console.log('Gas used:', receipt.gasUsed.toString());

      return txHash as string;

    } catch (err: any) {
      console.error('❌ Transaction failed:', err);

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
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);

    } finally {
      setSending(false);
    }
  }, [embeddedWallet, walletAddress, isWalletReady, publicClient]);

  const getOnChainBalance = useCallback(async (): Promise<string> => {
    if (!walletAddress) {
      return '0';
    }

    try {
      const balance = await publicClient.readContract({
        address: PRAY_TOKEN_ADDRESS,
        abi: PRAY_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      return formatUnits(balance as bigint, 18);
    } catch (err) {
      console.error('❌ Error fetching balance:', err);
      return '0';
    }
  }, [walletAddress, publicClient]);

  const getNativeBalance = useCallback(async (): Promise<string> => {
    if (!walletAddress) {
      return '0';
    }

    try {
      const balance = await publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });

      return formatUnits(balance, 18);
    } catch (err) {
      console.error('Error fetching native balance:', err);
      return '0';
    }
  }, [walletAddress, publicClient]);

  return {
    sendPrayTokens,
    getOnChainBalance,
    getNativeBalance,
    sending,
    error,
    walletAddress,
    isWalletReady,
    isFromDatabase: !!userWalletAddress,
  };
}