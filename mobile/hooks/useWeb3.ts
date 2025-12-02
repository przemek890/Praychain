import { useState, useCallback, useEffect } from 'react';
import { usePrivy, useEmbeddedWallet } from '@privy-io/expo';
import { createPublicClient, http, parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { 
  celo, 
  PRAY_TOKEN_ADDRESS, 
  PRAY_TOKEN_ABI, 
  CHARITY_WALLET_ADDRESS,
  BLOCKCHAIN_ENABLED,
  logBlockchainStatus
} from '@/config/blockchain';

interface UseWeb3Props {
  userWalletAddress?: string | null;
}

const generateFakeTransactionHash = (): string => {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

export function useWeb3({ userWalletAddress }: UseWeb3Props = {}) {
  const { user, isReady } = usePrivy();
  const embeddedWallet = useEmbeddedWallet();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWalletReady, setIsWalletReady] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Log blockchain status on mount
  useEffect(() => {
    logBlockchainStatus();
  }, []);

  useEffect(() => {
    if (!isReady || !user) {
      setIsWalletReady(false);
      setWalletAddress(null);
      return;
    }

    if (userWalletAddress) {
      console.log('Using wallet from database:', userWalletAddress);
      setWalletAddress(userWalletAddress);
      setIsWalletReady(true);
      return;
    }

    if (embeddedWallet?.account?.address) {
      console.log('Found Privy embedded wallet:', embeddedWallet.account.address);
      setWalletAddress(embeddedWallet.account.address);
      setIsWalletReady(true);
    } else {
      console.warn('No wallet found');
      setIsWalletReady(false);
      setWalletAddress(null);
    }
  }, [user, isReady, userWalletAddress, embeddedWallet]);

  const publicClient = createPublicClient({
    chain: celo,
    transport: http(),
  });

  // NEW FUNCTION - transaction simulation
  const simulateTransaction = useCallback(async (amount: number): Promise<string> => {
    console.log('===============================================');
    console.log('SIMULATION MODE - No real blockchain transaction');
    console.log('===============================================');
    console.log('Would transfer:', amount, 'PRAY');
    console.log('From:', walletAddress);
    console.log('To:', CHARITY_WALLET_ADDRESS);
    console.log('Token:', PRAY_TOKEN_ADDRESS);
    console.log('Network: Celo (chainId:', celo.id, ')');
    
    // Simulate transaction delay (1-2 seconds)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    const fakeTxHash = generateFakeTransactionHash();
    
    console.log('===============================================');
    console.log('SIMULATED Transaction hash:', fakeTxHash);
    console.log('(This is NOT a real blockchain transaction)');
    console.log('===============================================');
    
    return fakeTxHash;
  }, [walletAddress]);

  // UPDATED FUNCTION - checks flag
  const sendPrayTokens = useCallback(async (amount: number): Promise<string> => {
    if (!isWalletReady || !walletAddress) {
      throw new Error('Wallet not ready. Please wait and try again.');
    }

    setSending(true);
    setError(null);

    try {
      // CHECK FLAG - if disabled, simulate
      if (!BLOCKCHAIN_ENABLED) {
        console.log('BLOCKCHAIN_ENABLED = false');
        return await simulateTransaction(amount);
      }

      // REAL TRANSACTION - only when BLOCKCHAIN_ENABLED = true
      console.log('BLOCKCHAIN_ENABLED = true - executing real transaction');
      
      if (!embeddedWallet?.account) {
        throw new Error('Embedded wallet not initialized');
      }

      console.log('Starting PRAY token transfer...');
      console.log('Amount:', amount, 'PRAY');
      console.log('From:', walletAddress);
      console.log('To:', CHARITY_WALLET_ADDRESS);
      console.log('Network: Celo (chainId:', celo.id, ')');

      // Check balances before transaction
      const [nativeBalance, prayBalance] = await Promise.all([
        publicClient.getBalance({ address: walletAddress as `0x${string}` }),
        publicClient.readContract({
          address: PRAY_TOKEN_ADDRESS,
          abi: PRAY_TOKEN_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as `0x${string}`],
        }),
      ]);

      console.log('Native CELO balance:', formatUnits(nativeBalance, 18), 'CELO');
      console.log('PRAY balance:', formatUnits(prayBalance as bigint, 18), 'PRAY');

      const amountInWei = parseUnits(amount.toString(), 18);
      console.log('Amount to send:', amountInWei.toString(), 'wei');

      // Check if there is enough PRAY
      if ((prayBalance as bigint) < amountInWei) {
        throw new Error(`Insufficient PRAY. You have ${formatUnits(prayBalance as bigint, 18)} PRAY.`);
      }

      // Check if there is enough CELO for gas
      if (nativeBalance === 0n) {
        throw new Error('No native CELO for gas. Please add CELO to your wallet.');
      }

      const data = encodeFunctionData({
        abi: PRAY_TOKEN_ABI,
        functionName: 'transfer',
        args: [CHARITY_WALLET_ADDRESS, amountInWei],
      });

      console.log('Encoded transaction data:', data);

      // Get provider
      console.log('Getting provider from embedded wallet...');
      
      const provider = await embeddedWallet.getProvider();
      
      if (!provider) {
        throw new Error('Failed to get provider from embedded wallet');
      }

      console.log('Provider obtained');

      // Switch to Celo network
      try {
        console.log('Switching to Celo network (chainId:', celo.id, ')...');
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${celo.id.toString(16)}` }],
        });
        console.log('Switched to Celo network');
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          console.log('Adding Celo network...');
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${celo.id.toString(16)}`,
              chainName: 'Celo',
              nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
              rpcUrls: ['https://forno.celo.org'],
              blockExplorerUrls: ['https://celoscan.io'],
            }],
          });
        } else {
          console.warn('Chain switch warning:', switchError.message);
        }
      }

      // Estimate gas for the transaction
      console.log('Estimating gas...');
      const estimatedGas = await publicClient.estimateGas({
        account: walletAddress as `0x${string}`,
        to: PRAY_TOKEN_ADDRESS,
        data: data as `0x${string}`,
      });
      
      // Add 20% buffer to estimated gas
      const gasLimit = (estimatedGas * 120n) / 100n;
      console.log('Estimated gas:', estimatedGas.toString(), '| Using:', gasLimit.toString());

      // Get current gas price
      const gasPrice = await publicClient.getGasPrice();
      console.log('Gas price:', gasPrice.toString());

      // Prepare transaction with all parameters
      const txParams = {
        from: walletAddress,
        to: PRAY_TOKEN_ADDRESS,
        data: data,
        value: '0x0',
        gas: `0x${gasLimit.toString(16)}`,
        gasLimit: `0x${gasLimit.toString(16)}`,
        gasPrice: `0x${gasPrice.toString(16)}`,
        chainId: `0x${celo.id.toString(16)}`,
      };

      console.log('Sending transaction...');
      console.log('Transaction params:', JSON.stringify(txParams, null, 2));

      // Send transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });

      console.log('Transaction broadcasted!');
      console.log('Hash:', txHash);
      console.log(`View on explorer: https://celoscan.io/tx/${txHash}`);

      // Wait for confirmation
      console.log('Waiting for confirmation...');
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        confirmations: 1,
      });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction was reverted on blockchain');
      }

      console.log('Transaction confirmed!');
      console.log('Block number:', receipt.blockNumber.toString());
      console.log('Gas used:', receipt.gasUsed.toString());

      return txHash as string;

    } catch (err: any) {
      console.error('Transaction failed:', err);

      let errorMessage = 'Transaction failed';

      if (err.message?.includes('transfer amount exceeds balance')) {
        errorMessage = 'Insufficient PRAY token balance';
      } else if (err.message?.includes('insufficient funds') || err.message?.includes('No native CELO')) {
        errorMessage = err.message.includes('No native CELO') ? err.message : 'Insufficient CELO for gas fees';
      } else if (err.message?.includes('user rejected') || err.message?.includes('User rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (err.message?.includes('Insufficient PRAY')) {
        errorMessage = err.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      throw new Error(errorMessage);

    } finally {
      setSending(false);
    }
  }, [embeddedWallet, walletAddress, isWalletReady, publicClient, simulateTransaction]);

  const getOnChainBalance = useCallback(async (): Promise<string> => {
    if (!walletAddress) {
      return '0';
    }

    // In simulation mode return "unknown"
    if (!BLOCKCHAIN_ENABLED) {
      console.log('SIMULATION MODE - returning mock balance');
      return '∞'; // or you can return any value
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
      console.error('Error fetching balance:', err);
      return '0';
    }
  }, [walletAddress, publicClient]);

  const getNativeBalance = useCallback(async (): Promise<string> => {
    if (!walletAddress) {
      return '0';
    }

    // In simulation mode return "unknown"
    if (!BLOCKCHAIN_ENABLED) {
      console.log('SIMULATION MODE - returning mock native balance');
      return '∞';
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
    isBlockchainEnabled: BLOCKCHAIN_ENABLED,
  };
}