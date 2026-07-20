#!/usr/bin/env python3
"""
Quick test script to verify message extraction is working
Run this before full installation to test
"""

import sqlite3
import os
from datetime import datetime

MESSAGES_DB = os.path.expanduser('~/Library/Messages/chat.db')
BANCOLOMBIA_NUMBERS = ['87400', '85540']

def extract_text_from_blob(attributed_body):
    """Extract text from BLOB"""
    if not attributed_body:
        return None
    
    try:
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
        
        texto_completo = attributed_body.decode('utf-8', errors='ignore')
        parts = [p.strip() for p in texto_completo.split('\x00') if len(p.strip()) > 15]
        
        if parts:
            return max(parts, key=len)
        
        return None
    except:
        return None

def test_extraction():
    """Test message extraction"""
    
    print("="*70)
    print("🧪 TESTING MESSAGE EXTRACTION")
    print("="*70)
    print()
    
    if not os.path.exists(MESSAGES_DB):
        print(f"❌ Messages database not found: {MESSAGES_DB}")
        print("\nMake sure:")
        print("1. You're on macOS")
        print("2. Messages app is configured")
        print("3. Messages are synced via iCloud")
        return
    
    print(f"✅ Found Messages database")
    print()
    
    try:
        conn = sqlite3.connect(MESSAGES_DB)
        cursor = conn.cursor()
        
        # Get latest messages from Bancolombia
        query = """
        SELECT 
            message.ROWID,
            handle.id as sender,
            message.text,
            message.attributedBody,
            datetime(message.date/1000000000 + 978307200, 'unixepoch', 'localtime') as date
        FROM message
        JOIN handle ON message.handle_id = handle.ROWID
        WHERE handle.id IN (?, ?)
            AND message.is_from_me = 0
        ORDER BY message.date DESC
        LIMIT 5
        """
        
        cursor.execute(query, BANCOLOMBIA_NUMBERS)
        messages = cursor.fetchall()
        
        conn.close()
        
        if not messages:
            print("⚠️  No messages found from Bancolombia")
            print("\nPossible reasons:")
            print("1. You haven't received messages from these numbers yet")
            print("2. Messages haven't synced from iPhone to Mac")
            print("3. Full Disk Access permission not granted")
            return
        
        print(f"✅ Found {len(messages)} messages from Bancolombia")
        print()
        print("="*70)
        print("SAMPLE MESSAGES:")
        print("="*70)
        print()
        
        for rowid, sender, text, attributed_body, date in messages:
            message_text = text
            
            if not message_text and attributed_body:
                message_text = extract_text_from_blob(attributed_body)
            
            print(f"From: {sender}")
            print(f"Date: {date}")
            
            if message_text:
                print(f"Message: {message_text[:150]}...")
            else:
                print("Message: [Could not extract text]")
            
            print("-" * 70)
            print()
        
        print("="*70)
        print("✅ TEST SUCCESSFUL!")
        print("="*70)
        print()
        print("Next steps:")
        print("1. If you see messages above, extraction is working!")
        print("2. Run: ./install_finance.sh")
        print("3. The system will automatically extract and categorize these transactions")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure you've granted Full Disk Access permission:")
        print("System Settings → Privacy & Security → Full Disk Access → Add Terminal")

if __name__ == "__main__":
    test_extraction()
