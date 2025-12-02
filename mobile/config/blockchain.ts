import { celo } from 'viem/chains';

export { celo };

export const PRAY_TOKEN_ADDRESS = '0xF0341E12F7Af56925b7f74560E0bCAD298126Eb7' as const;
export const CHARITY_WALLET_ADDRESS = '0xa22fb84c98894aaaa4195005cd6b8dda932c3510' as const;
export const BLOCKCHAIN_ENABLED = process.env.EXPO_PUBLIC_BLOCKCHAIN_ENABLED === 'true';

export const logBlockchainStatus = () => {
  console.log('Blockchain config:');
  console.log('   BLOCKCHAIN_ENABLED:', BLOCKCHAIN_ENABLED);
  console.log('   ENV value:', process.env.EXPO_PUBLIC_BLOCKCHAIN_ENABLED);
  console.log('   Mode:', BLOCKCHAIN_ENABLED ? 'REAL TRANSACTIONS' : 'SIMULATION MODE');
};

export const PRAY_TOKEN_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function'
  }
] as const;