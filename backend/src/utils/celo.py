import json
import logging
from pathlib import Path

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account

from src.config import settings

logger = logging.getLogger(__name__)

# Połączenie z Celo (tylko jeśli włączone)
w3 = None
pray_contract = None
treasury_account = None
treasury_address = None

if settings.CELO_ENABLED:
    w3 = Web3(Web3.HTTPProvider(settings.CELO_RPC_URL))
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

    # Wczytanie ABI PRAY
    abi_path = Path(__file__).resolve().parent.parent / "abi" / "pray_token.json"
    with abi_path.open() as f:
        pray_abi = json.load(f)

    pray_contract = w3.eth.contract(
        address=Web3.to_checksum_address(settings.PRAY_CONTRACT_ADDRESS),
        abi=pray_abi,
    )

    # Treasury account (do wysyłania nagród)
    treasury_account = Account.from_key(settings.TREASURY_PRIVATE_KEY)
    treasury_address = treasury_account.address
    
    logger.info(f"✅ Celo initialized: Treasury={treasury_address}, Contract={settings.PRAY_CONTRACT_ADDRESS}")


def send_pray_to_user_wallet(user_wallet_address: str, amount_tokens: int) -> str:
    """
    Wysyła PRAY z treasury na wallet użytkownika.
    
    Args:
        user_wallet_address: Adres portfela użytkownika (z bazy danych - pole wallet_address)
        amount_tokens: Ilość tokenów PRAY do wysłania
        
    Returns:
        tx_hash (hex) lub pusty string jeśli Celo wyłączone
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

        # Pobierz aktualną cenę gazu z sieci
        gas_price = w3.eth.gas_price
        # Dodaj 20% buforu
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
            f"✅ Sent {amount_tokens} PRAY from treasury to {to_address} (tx: {tx_hash.hex()})"
        )

        return tx_hash.hex()
        
    except Exception as e:
        logger.error(f"❌ Failed to send PRAY to {user_wallet_address}: {e}")
        raise


def get_pray_balance(wallet_address: str) -> int:
    """
    Pobiera saldo PRAY dla danego adresu portfela.
    
    Args:
        wallet_address: Adres portfela użytkownika
        
    Returns:
        Saldo w tokenach PRAY (nie wei)
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
    UWAGA: Ta funkcja wymaga, aby użytkownik sam podpisał transakcję!
    W nowej architekturze donacje są obsługiwane przez frontend (useWeb3 hook).
    
    Ta funkcja jest teraz tylko placeholder - faktyczna transakcja
    jest wykonywana przez embedded wallet użytkownika na froncie (Privy).
    """
    logger.warning(
        f"send_pray_back_to_treasury called - donations should be handled by frontend. "
        f"User: {user_wallet_address}, Amount: {amount_tokens}"
    )
    # Zwracamy pusty string - frontend obsługuje tę transakcję
    return ""