import json
import logging
from pathlib import Path

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account

from src.config import settings

logger = logging.getLogger(__name__)

# Connect to Celo (only if enabled)
w3 = None
pray_contract = None
treasury_account = None
treasury_address = None

if settings.CELO_ENABLED:
    w3 = Web3(Web3.HTTPProvider(settings.CELO_RPC_URL))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    # ABI PRAY
    abi_path = Path(__file__).resolve().parent.parent / "abi" / "pray_token.json"
    with abi_path.open() as f:
        pray_abi = json.load(f)

    pray_contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.PRAY_CONTRACT_ADDRESS),
        abi=pray_abi,
    )

    # Treasury account (for sending rewards)
    treasury_account = Account.from_key(settings.TREASURY_PRIVATE_KEY)
    treasury_address = treasury_account.address
    
    logger.info(f"Celo initialized: Treasury={treasury_address}, Contract={settings.PRAY_CONTRACT_ADDRESS}")


def send_pray_to_user_wallet(user_wallet_address: str, amount_tokens: int) -> str:
    """
    Sends PRAY from the treasury to the user's wallet.
    
    Args:
        user_wallet_address: The user's wallet address (from the database - wallet_address field)
        amount_tokens: The amount of PRAY tokens to send
        
    Returns:
        tx_hash (hex) or empty string if Celo is disabled
    """
    if not settings.CELO_ENABLED:
        logger.info(f"CELO_ENABLED=False, skipping on-chain transfer of {amount_tokens} PRAY")
        return ""
    
    if amount_tokens <= 0:
        logger.warning(f"amount_tokens={amount_tokens}, skipping transfer")
        return ""
    
    if not user_wallet_address:
        logger.warning("user_wallet_address is empty, cannot send PRAY on-chain")
        return ""

    try:
        to_address = Web3.to_checksum_address(user_wallet_address)
        amount_wei = amount_tokens * (10 ** 18)

        nonce = w3.eth.get_transaction_count(treasury_address)

        # Get current gas price from network
        gas_price = w3.eth.gas_price
        # Add 20% buffer
        gas_price = int(gas_price * 1.2)

        tx = pray_contract.functions.transfer(to_address, amount_wei).build_transaction({
            "from": treasury_address,
            "nonce": nonce,
            "chainId": settings.CELO_CHAIN_ID,
            "gas": 200_000,
            "gasPrice": gas_price,
        })

        signed = treasury_account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

        logger.info(
            f"Sent {amount_tokens} PRAY from treasury to {to_address} (tx: {tx_hash.hex()})"
        )

        return tx_hash.hex()
        
    except Exception as e:
        logger.error(f"Failed to send PRAY to {user_wallet_address}: {e}")
        raise


def get_pray_balance(wallet_address: str) -> int:
    """
    Retrieves the PRAY balance for a given wallet address.
    
    Args:
        wallet_address: The user's wallet address
        
    Returns:
        PRAY token balance (not in wei)
    """
    if not settings.CELO_ENABLED:
        return 0
    
    if not wallet_address:
        return 0
    
    try:
        address = Web3.to_checksum_address(wallet_address)
        balance_wei = pray_contract.functions.balanceOf(address).call()
        balance_tokens = balance_wei // (10 ** 18)
        return balance_tokens
    except Exception as e:
        logger.error(f"Failed to get PRAY balance for {wallet_address}: {e}")
        return 0


def send_pray_back_to_treasury(user_wallet_address: str, amount_tokens: int) -> str:
    """
    WARNING: This function requires the user to sign the transaction themselves!
    In the new architecture, donations are handled by the frontend (useWeb3 hook).
    
    This function is now just a placeholder - the actual transaction
    is performed by the user's embedded wallet on the frontend (Privy).
    """
    logger.warning(
        f"send_pray_back_to_treasury called - donations should be handled by frontend. "
        f"User: {user_wallet_address}, Amount: {amount_tokens}"
    )
    # Return empty string - frontend handles this transaction
    return ""