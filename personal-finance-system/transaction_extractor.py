#!/usr/bin/env python3
"""
Bancolombia Transaction Extractor
Extracts financial transactions from Messages app and stores them in PostgreSQL
"""

import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import re
from datetime import datetime
import hashlib
import os
import logging
from typing import Optional, Dict, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('transaction_extractor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Constants
BANCOLOMBIA_NUMBERS = ['87400', '85540']
MESSAGES_DB = os.path.expanduser('~/Library/Messages/chat.db')


class TransactionExtractor:
    """Extracts and processes Bancolombia transactions from Messages"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.conn = None
        
    def connect_postgres(self) -> bool:
        """Connect to PostgreSQL database"""
        try:
            self.conn = psycopg2.connect(**self.db_config)
            logger.info("✅ Connected to PostgreSQL")
            return True
        except Exception as e:
            logger.error(f"❌ Error connecting to PostgreSQL: {e}")
            return False
    
    def close_connection(self):
        """Close PostgreSQL connection"""
        if self.conn:
            self.conn.close()
            logger.info("PostgreSQL connection closed")
    
    def extract_text_from_blob(self, attributed_body: bytes) -> Optional[str]:
        """
        Extract text from attributedBody BLOB
        macOS Monterey+ stores messages in binary format
        """
        if not attributed_body:
            return None
        
        try:
            # Method 1: Look for NSString markers
            markers = [b'NSString', b'NSAttributedString', b'NSMutableString']
            
            for marker in markers:
                pos = attributed_body.find(marker)
                if pos != -1:
                    remaining = attributed_body[pos + len(marker):]
                    texto = remaining.decode('utf-8', errors='ignore')
                    texto = ''.join(c for c in texto if c.isprintable() or c in '\n\r\t ')
                    
                    lines = [line.strip() for line in texto.split('\n') if len(line.strip()) > 10]
                    if lines:
                        return lines[0]
            
            # Method 2: Extract all strings and find the longest one
            texto_completo = attributed_body.decode('utf-8', errors='ignore')
            parts = [p.strip() for p in texto_completo.split('\x00') if len(p.strip()) > 15]
            
            if parts:
                texto_limpio = max(parts, key=len)
                texto_limpio = ''.join(c for c in texto_limpio if c.isprintable() or c in '\n\r\t ')
                return texto_limpio if len(texto_limpio) > 20 else None
            
            return None
            
        except Exception as e:
            logger.debug(f"Error extracting text from BLOB: {e}")
            return None
    
    def extract_messages_from_db(self, days_back: int = 30) -> List[tuple]:
        """Extract Bancolombia messages from Messages database"""
        
        if not os.path.exists(MESSAGES_DB):
            logger.error(f"❌ Messages database not found: {MESSAGES_DB}")
            return []
        
        try:
            conn_messages = sqlite3.connect(MESSAGES_DB)
            cursor = conn_messages.cursor()
            
            # Query to get messages from Bancolombia
            query = """
            SELECT 
                message.ROWID,
                handle.id as sender,
                message.text,
                message.attributedBody,
                datetime(message.date/1000000000 + 978307200, 'unixepoch', 'localtime') as date
            FROM message
            JOIN handle ON message.handle_id = handle.ROWID
            WHERE handle.id IN ({})
                AND datetime(message.date/1000000000 + 978307200, 'unixepoch', 'localtime') > datetime('now', '-{} days', 'localtime')
                AND message.is_from_me = 0
            ORDER BY message.date DESC
            """.format(
                ','.join(['?' for _ in BANCOLOMBIA_NUMBERS]),
                days_back
            )
            
            cursor.execute(query, BANCOLOMBIA_NUMBERS)
            messages = cursor.fetchall()
            
            conn_messages.close()
            logger.info(f"📱 Extracted {len(messages)} messages from Bancolombia")
            
            return messages
            
        except Exception as e:
            logger.error(f"❌ Error extracting messages: {e}")
            return []
    
    def generate_message_id(self, text: str, date: str) -> str:
        """Generate unique ID for message to prevent duplicates"""
        content = f"{text}{date}"
        return hashlib.md5(content.encode()).hexdigest()

    def parse_cop_amount(self, amount_str: str) -> float:
        """
        Parse Colombian peso amounts to float.
        Handles multiple formats:
        - COP57.000,00 -> 57000.00
        - $1,185,000.00 -> 1185000.00
        - $6,000 -> 6000.00
        - 43.600,00 -> 43600.00

        Rules:
        - If there's a comma followed by 2 digits at the end, it's decimals
        - Otherwise, commas and periods are thousands separators
        """
        # Remove currency symbols and spaces
        amount_str = amount_str.replace('COP', '').replace('$', '').strip()

        # Check if it ends with comma and 2 digits (European format: decimals with comma)
        if re.search(r',\d{2}$', amount_str):
            # Format: 1.185.000,00 or 57.000,00
            # Remove periods (thousands separator)
            amount_str = amount_str.replace('.', '')
            # Replace comma with period (decimal separator)
            amount_str = amount_str.replace(',', '.')
        else:
            # Format: 1,185,000.00 or 6,000 (US format or thousands only)
            # Remove commas (thousands separator)
            amount_str = amount_str.replace(',', '')
            # Period is already decimal separator

        return float(amount_str)
    
    def parse_transfer_sent(self, text: str) -> Optional[Dict]:
        """
        Parse: Transferiste $6,000 desde tu cuenta *2646 a la cuenta *0158970359 el 24/12/2025 a las 09:10
        """
        patterns = [
            r'Transferiste \$?([\d,\.]+)\s*desde tu cuenta \*?(\d+)\s*a la cuenta \*?(\d+)\s*el (\d{2}/\d{2}/\d{4})\s*a las (\d{2}:\d{2})',
            r'Transferiste \$?([\d,\.]+)\s*desde tu cuenta \*?(\d+)\s*a la cuenta \*?(\d+)\s*el (\d{2}/\d{2}/\d{4})\s*(\d{2}:\d{2})',
            r'Transferiste \$?([\d,\.]+)\s*por QR desde tu cuenta \*?(\d+)\s*a la cuenta \*?(\d+),?\s*el (\d{2}/\d{2}/\d{4})\s*(\d{2}:\d{2})\.?',
            r'Transferiste \$?([\d,\.]+)\s*por QR desde tu cuenta \*?(\d+)\s*a la cuenta \*?(\d+),?\s*el (\d{4}/\d{2}/\d{2})\s*(\d{2}:\d{2})\.?',
        ]

        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text)
            if match:
                amount = self.parse_cop_amount(match.group(1))
                source_account = match.group(2)
                dest_account = match.group(3)
                date_str = f"{match.group(4)} {match.group(5)}"

                # Pattern 3 (index 3) uses YYYY/MM/DD format
                if i == 3:
                    date = datetime.strptime(date_str, '%Y/%m/%d %H:%M')
                else:
                    date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')

                return {
                    'type': 'transfer_sent',
                    'amount': amount,
                    'description': f'Transfer to *{dest_account}',
                    'account_type': 'savings_account',
                    'source_account': source_account,
                    'destination_account': dest_account,
                    'date': date
                }
        return None
    
    def parse_transfer_received(self, text: str) -> Optional[Dict]:
        """
        Parse: Recibiste una transferencia por $20,000,000 de LUIS VALENCIA en tu cuenta **2646, el 27/12/2025 a las 11:55
        """
        pattern = r'Recibiste una transferencia por \$?([\d,\.]+)\s*de ([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)\s*en tu cuenta \*+(\d+),?\s*el (\d{2}/\d{2}/\d{4})\s*a las (\d{2}:\d{2})'
        match = re.search(pattern, text)

        if match:
            amount = self.parse_cop_amount(match.group(1))
            sender_name = match.group(2).strip()
            dest_account = match.group(3)
            date_str = f"{match.group(4)} {match.group(5)}"
            date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')

            return {
                'type': 'transfer_received',
                'amount': amount,
                'description': f'Transfer from {sender_name}',
                'account_type': 'savings_account',
                'source_account': None,
                'destination_account': dest_account,
                'date': date
            }
        return None
    
    def parse_qr_payment(self, text: str) -> Optional[Dict]:
        """
        Parse: JUAN SEBASTIAN VALENCIA JIMENEZ pagaste $4,800.00 por codigo QR desde tu cuenta *2646 a la llave 008712247 el 28/12/2025 a las 07:32
        """
        pattern = r'([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)\s+pagaste \$?([\d,\.]+)\s*por codigo QR desde tu cuenta \*?(\d+)\s*a la llave (\d+)\s*el (\d{2}/\d{2}/\d{4})\s*a las (\d{2}:\d{2})'
        match = re.search(pattern, text)

        if match:
            recipient = match.group(1).strip()
            amount = self.parse_cop_amount(match.group(2))
            source_account = match.group(3)
            key = match.group(4)
            date_str = f"{match.group(5)} {match.group(6)}"
            date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')

            return {
                'type': 'qr_payment',
                'amount': amount,
                'description': f'QR payment to {recipient}',
                'account_type': 'savings_account',
                'source_account': source_account,
                'destination_account': key,
                'date': date
            }
        return None
    
    def parse_merchant_payment(self, text: str) -> Optional[Dict]:
        """
        Parse: Pagaste $100,000.00 a PEXTO COLOMBIA SAS desde tu producto *2646 el 27/12/2025 20:23:55
        """
        patterns = [
            # Pattern 1: Standard format
            r'Pagaste \$?([\d,\.]+)\s*a ([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s]+)\s*desde tu producto \*?(\d+)\s*el (\d{2}/\d{2}/\d{4})\s*(\d{2}:\d{2}:\d{2})',
            # Pattern 2: Credit card format
            r'Pagaste \$?([\d,\.]+)\s*en la tarjeta de credito \*?(\d+)\s*desde la cuenta \*?(\d+),?\s*el (\d{2}/\d{2}/\d{4})\s*(\d{2}:\d{2})',
        ]

        for i, pattern in enumerate(patterns):
            match = re.search(pattern, text)
            if match:
                if i == 0:
                    amount = self.parse_cop_amount(match.group(1))
                    merchant = match.group(2).strip()
                    account = match.group(3)
                    date_str = f"{match.group(4)} {match.group(5)}"
                    date = datetime.strptime(date_str, '%d/%m/%Y %H:%M:%S')
                    account_type = 'savings_account'
                else:  # i == 1, credit card
                    amount = self.parse_cop_amount(match.group(1))
                    merchant = "Credit card payment"
                    account = match.group(2)
                    date_str = f"{match.group(4)} {match.group(5)}"
                    date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')
                    account_type = 'credit_card'

                return {
                    'type': 'merchant_payment',
                    'amount': amount,
                    'description': merchant,
                    'account_type': account_type,
                    'source_account': account,
                    'destination_account': None,
                    'date': date
                }
        return None
    
    def parse_credit_card_purchase(self, text: str) -> Optional[Dict]:
        """
        Parse: Compraste COP30,547,00 en ALMACEN MAC POLLO NO con tu T.Cred *4035, el 28/12/2025 a las 08:58
        Parse: Compraste COP16.379,00 en PWS*COMBUSCOL SABANE con tu T.Cred *4035, el 17/12/2025 a las 06:36
        """
        pattern = r'Compraste COP([\d,\.]+)\s*en ([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s/\*]+)\s*con tu T\.Cred \*?(\d+),?\s*el (\d{2}/\d{2}/\d{4})\s*a las (\d{2}:\d{2})'
        match = re.search(pattern, text)

        if match:
            amount = self.parse_cop_amount(match.group(1))
            merchant = match.group(2).strip()
            card = match.group(3)
            date_str = f"{match.group(4)} {match.group(5)}"
            date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')

            return {
                'type': 'credit_card_purchase',
                'amount': amount,
                'description': merchant,
                'account_type': 'credit_card',
                'source_account': card,
                'destination_account': None,
                'date': date
            }
        return None

    def parse_debit_card_purchase(self, text: str) -> Optional[Dict]:
        """
        Parse: Compraste $43.600,00 en COMCEL/BOTON PAGO CO con tu T.Deb *7433, el 21/12/2025 a las 08:23
        """
        pattern = r'Compraste \$?([\d,\.]+)\s*en ([A-ZÁÉÍÓÚÑa-záéíóúñ0-9\s/\*]+)\s*con tu T\.Deb \*?(\d+),?\s*el (\d{2}/\d{2}/\d{4})\s*a las (\d{2}:\d{2})'
        match = re.search(pattern, text)

        if match:
            amount = self.parse_cop_amount(match.group(1))
            merchant = match.group(2).strip()
            card = match.group(3)
            date_str = f"{match.group(4)} {match.group(5)}"
            date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')

            return {
                'type': 'debit_card_purchase',
                'amount': amount,
                'description': merchant,
                'account_type': 'debit_card',
                'source_account': card,
                'destination_account': None,
                'date': date
            }
        return None

    def parse_atm_withdrawal(self, text: str) -> Optional[Dict]:
        """
        Parse: Retiraste $50.000,00 en SUC_ESTREL4 de tu T.Deb **7433 el 24/12/2025 a las 07:27. Si tienes dudas, llamanos al 6045109095.
        """
        pattern = r'Retiraste \$?([\d,\.]+)\s*en ([A-Z0-9_]+)\s*de tu T\.Deb \*+(\d+)\s*el (\d{2}/\d{2}/\d{4})\s*a las (\d{2}:\d{2})'
        match = re.search(pattern, text)

        if match:
            amount = self.parse_cop_amount(match.group(1))
            location = match.group(2).strip()
            card = match.group(3)
            date_str = f"{match.group(4)} {match.group(5)}"
            date = datetime.strptime(date_str, '%d/%m/%Y %H:%M')

            return {
                'type': 'atm_withdrawal',
                'amount': amount,
                'description': f'ATM withdrawal at {location}',
                'account_type': 'debit_card',
                'source_account': card,
                'destination_account': None,
                'date': date
            }
        return None
    
    def parse_message(self, text: str) -> Optional[Dict]:
        """
        Try to parse message with all available parsers
        Returns parsed transaction data or None
        """
        parsers = [
            self.parse_transfer_sent,
            self.parse_transfer_received,
            self.parse_qr_payment,
            self.parse_merchant_payment,
            self.parse_credit_card_purchase,
            self.parse_debit_card_purchase,
            self.parse_atm_withdrawal
        ]
        
        for parser in parsers:
            result = parser(text)
            if result:
                return result
        
        return None
    
    def message_already_processed(self, message_id: str) -> bool:
        """Check if message was already processed"""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM transactions WHERE message_id = %s",
                (message_id,)
            )
            count = cursor.fetchone()[0]
            cursor.close()
            return count > 0
        except Exception as e:
            logger.error(f"Error checking if message processed: {e}")
            return False
    
    def save_transaction(self, message_id: str, sender: str, raw_message: str, 
                        transaction_data: Dict) -> bool:
        """Save transaction to PostgreSQL"""
        try:
            cursor = self.conn.cursor()
            
            cursor.execute("""
                INSERT INTO transactions 
                (message_id, sender_number, raw_message, transaction_date, description, 
                 amount, type, account_type, source_account, destination_account)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (message_id) DO NOTHING
            """, (
                message_id,
                sender,
                raw_message,
                transaction_data['date'],
                transaction_data['description'],
                transaction_data['amount'],
                transaction_data['type'],
                transaction_data['account_type'],
                transaction_data['source_account'],
                transaction_data['destination_account']
            ))
            
            self.conn.commit()
            cursor.close()
            return True
            
        except Exception as e:
            logger.error(f"Error saving transaction: {e}")
            self.conn.rollback()
            return False
    
    def process_messages(self, days_back: int = 30):
        """Main processing function: extract messages and save transactions"""
        logger.info("🚀 Starting transaction extraction...")
        
        # Extract messages
        messages = self.extract_messages_from_db(days_back)
        
        if not messages:
            logger.info("No messages to process")
            return
        
        # Connect to PostgreSQL
        if not self.connect_postgres():
            return
        
        processed = 0
        new_transactions = 0
        errors = 0
        skipped = 0
        
        for rowid, sender, text, attributed_body, date_message in messages:
            # Extract text (from text field or attributedBody BLOB)
            message_text = text
            
            if not message_text and attributed_body:
                message_text = self.extract_text_from_blob(attributed_body)
            
            if not message_text:
                skipped += 1
                continue
            
            # Generate unique message ID
            message_id = self.generate_message_id(message_text, date_message)
            
            # Check if already processed
            if self.message_already_processed(message_id):
                processed += 1
                continue
            
            # Parse message
            transaction_data = self.parse_message(message_text)
            
            if transaction_data:
                # Save transaction
                if self.save_transaction(message_id, sender, message_text, transaction_data):
                    new_transactions += 1
                    logger.info(f"✅ New transaction: {transaction_data['type']} - ${transaction_data['amount']:,.2f} - {transaction_data['description']}")
                else:
                    errors += 1
            else:
                # Mark as processed even if we couldn't parse it
                logger.warning(f"⚠️  Could not parse: {message_text[:200]}...")
                skipped += 1
        
        self.close_connection()
        
        logger.info(f"""
        📊 Processing Summary:
        - Total messages: {len(messages)}
        - Already processed: {processed}
        - New transactions: {new_transactions}
        - Skipped: {skipped}
        - Errors: {errors}
        """)


def main():
    """Main function"""
    
    # PostgreSQL configuration from environment variables
    DB_CONFIG = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'database': os.getenv('DB_NAME', 'personal_finance'),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'port': int(os.getenv('DB_PORT', '5432'))
    }
    
    # Verify credentials are configured
    if not DB_CONFIG['user'] or not DB_CONFIG['password']:
        logger.error("❌ ERROR: DB_USER and DB_PASSWORD must be configured in .env file")
        logger.error("Copy .env.example to .env and configure your credentials")
        return
    
    # Create extractor
    extractor = TransactionExtractor(DB_CONFIG)
    
    # Process messages from last 30 days
    days_back = int(os.getenv('DAYS_BACK', '30'))
    extractor.process_messages(days_back=days_back)


if __name__ == "__main__":
    main()
