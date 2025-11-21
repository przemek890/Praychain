import json
import logging
from pathlib import Path
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from eth_account import Account

from src.config import settings

logger = logging.getLogger(__name__)

# Połączenie z Celo (tylko jeśli włączone)
if settings.CELO_ENABLED:
    try:
        w3 = Web3(Web3.HTTPProvider(settings.CELO_RPC_URL))
        w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        
        contract_path = Path(__file__).parent.parent.parent / "contracts" / "PrayToken.json"
        with open(contract_path) as f:
            contract_json = json.load(f)
        
        pray_contract = w3.eth.contract(
            address=Web3.to_checksum_address(settings.PRAY_CONTRACT_ADDRESS),
            abi=contract_json["abi"]
        )
        
        treasury_account = Account.from_key(settings.TREASURY_PRIVATE_KEY)
        user_account = Account.from_key(settings.USER_PRIVATE_KEY)
        
        logger.info("✅ Celo blockchain connection established")
    except Exception as e:
        logger.error(f"❌ Celo initialization failed: {e}")
        w3 = None
        pray_contract = None
        treasury_account = None
        user_account = None
else:
    logger.info("ℹ️ Celo blockchain disabled")
    w3 = None
    pray_contract = None
    treasury_account = None
    user_account = None


def _send_pray(from_account: Account, to_address: str, amount_tokens: int) -> str:
    """
    Wysyła amount_tokens PRAY z konta `from_account` na `to_address`.
    Zwraca tx_hash (hex).
    """
    if not settings.CELO_ENABLED:
        return ""
    
    if amount_tokens <= 0:
        raise ValueError("amount_tokens must be > 0")

    from_address = from_account.address
    to = Web3.to_checksum_address(to_address)
    amount_wei = amount_tokens * (10 ** 18)

    nonce = w3.eth.get_transaction_count(from_address)

    # Pobierz aktualną cenę gazu z sieci
    gas_price = w3.eth.gas_price
    # Opcjonalnie: dodaj 20% buforu
    gas_price = int(gas_price * 1.2)

    tx = pray_contract.functions.transfer(to, amount_wei).build_transaction({
        "from": from_address,
        "nonce": nonce,
        "chainId": settings.CELO_CHAIN_ID,
        "gas": 200_000,
        "gasPrice": gas_price,
    })

    signed = from_account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)

    logger.info(
        f"Sent {amount_tokens} PRAY from {from_address} to {to} (tx: {tx_hash.hex()}, gasPrice: {gas_price})"
    )

    return tx_hash.hex()


def send_pray_to_user(amount_tokens: int) -> str:
    """
    Bank tokenów (treasury) -> demo user wallet.
    Używane przy nagradzaniu modlitwy.
    """
    if not settings.CELO_ENABLED:
        return ""
    return _send_pray(treasury_account, user_account.address, amount_tokens)


def send_pray_back_to_treasury(amount_tokens: int) -> str:
    """
    Demo user wallet -> bank tokenów (treasury).
    Używane przy donate.
    """
    if not settings.CELO_ENABLED:
        return ""
    return _send_pray(user_account, treasury_account.address, amount_tokens)
