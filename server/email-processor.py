#!/usr/bin/env python3
"""
Email processor for Eliano webmail
Processes incoming emails and stores them in MySQL database
ALIGNED WITH WEBMAIL ENCRYPTION (AES + crypto-js compatible)
"""

import sys
import os
import email
import mysql.connector
from datetime import datetime
from email.utils import parsedate_to_datetime
from email.header import decode_header
import json
import re
from dotenv import load_dotenv
import logging
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import base64
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/eliano-email-processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EmailProcessor:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        
        # Database configuration - SEM SSL para conexão local
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'user': os.getenv('DB_USER', 'eliano_user'),
            'password': os.getenv('DB_PASSWORD'),
            'database': os.getenv('DB_NAME', 'eliano_mail_production'),
            'charset': 'utf8mb4',
            'ssl_disabled': True,  # SSL desabilitado para local
            'auth_plugin': 'mysql_native_password',
            'autocommit': True
        }
        
        # Encryption key - MESMA LÓGICA DO WEBMAIL
        self.encryption_secret = os.getenv('ENCRYPTION_SECRET', 'default-secret')
        
        logger.info("Email processor initialized - AES encryption aligned with webmail")
    
    def get_encryption_key(self, user_id):
        """Generate encryption key IDENTICAL to webmail crypto.ts"""
        # EXATAMENTE IGUAL: eliano-key-{userId}-{secret}
        combined_key = f"eliano-key-{user_id}-{self.encryption_secret}"
        # USAR A STRING DIRETAMENTE como o CryptoJS faz
        return combined_key
    
    def encrypt_content(self, content, user_id):
        """Encrypt content using AES - EXATAMENTE IGUAL ao CryptoJS"""
        try:
            if not content:
                return content
                
            key_string = self.get_encryption_key(user_id)
            
            # Simular o comportamento do CryptoJS.AES.encrypt()
            # CryptoJS gera salt automaticamente
            salt = get_random_bytes(8)
            
            # Derivar chave usando PBKDF2 (como CryptoJS faz internamente)
            key_iv = hashlib.pbkdf2_hmac('sha256', key_string.encode(), salt, 1000, 48)
            key = key_iv[:32]
            iv = key_iv[32:48]
            
            # Criptografar com AES-CBC
            cipher = AES.new(key, AES.MODE_CBC, iv)
            padded_data = pad(content.encode('utf-8'), AES.block_size)
            encrypted_data = cipher.encrypt(padded_data)
            
            # Formato CryptoJS: "Salted__" + salt + dados criptografados
            salted_prefix = b"Salted__"
            combined = salted_prefix + salt + encrypted_data
            
            # Codificar em base64
            encrypted_b64 = base64.b64encode(combined).decode('utf-8')
            
            return encrypted_b64
            
        except Exception as e:
            logger.error(f"Encryption failed for user {user_id}: {str(e)}")
            return content
    
    def decrypt_content(self, encrypted_content, user_id):
        """Decrypt content using AES - EXATAMENTE IGUAL ao CryptoJS"""
        try:
            if not encrypted_content:
                return encrypted_content
                
            key_string = self.get_encryption_key(user_id)
            
            # Decodificar base64
            try:
                combined = base64.b64decode(encrypted_content)
            except:
                return encrypted_content
            
            # Verificar se tem o prefixo "Salted__"
            if not combined.startswith(b"Salted__"):
                return encrypted_content
                
            # Extrair salt e dados criptografados
            salt = combined[8:16]
            encrypted_data = combined[16:]
            
            # Derivar chave usando PBKDF2 (igual ao CryptoJS)
            key_iv = hashlib.pbkdf2_hmac('sha256', key_string.encode(), salt, 1000, 48)
            key = key_iv[:32]
            iv = key_iv[32:48]
            
            # Descriptografar
            cipher = AES.new(key, AES.MODE_CBC, iv)
            padded_data = cipher.decrypt(encrypted_data)
            decrypted_data = unpad(padded_data, AES.block_size)
            
            return decrypted_data.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Decryption failed for user {user_id}: {str(e)}")
            return encrypted_content
    
    def decode_header_value(self, header_value):
        """Decode email header value"""
        if not header_value:
            return ""
        
        try:
            decoded_fragments = decode_header(header_value)
            decoded_string = ""
            for fragment, encoding in decoded_fragments:
                if isinstance(fragment, bytes):
                    if encoding:
                        decoded_string += fragment.decode(encoding)
                    else:
                        decoded_string += fragment.decode('utf-8', errors='ignore')
                else:
                    decoded_string += fragment
            return decoded_string.strip()
        except Exception as e:
            logger.error(f"Header decoding failed: {str(e)}")
            return str(header_value)
    
    def find_user_id(self, email_address):
        """
        Find user ID by email address
        1. Check direct user email (users.email)
        2. Check alias forwarding (aliases.forwardTo)
        """
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            
            # 1. Check direct user email
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s", (email_address.lower(),))
            result = cursor.fetchone()
            
            if result:
                logger.info(f"Found direct user for {email_address}: {result[0]}")
                return result[0]
            
            # 2. Check aliases by forwardTo
            cursor.execute("""
                SELECT userId FROM aliases 
                WHERE LOWER(forwardTo) = %s AND isActive = 1
            """, (email_address.lower(),))
            result = cursor.fetchone()
            
            if result:
                logger.info(f"Found alias user for {email_address}: {result[0]}")
                return result[0]
            
            logger.warning(f"No user found for email: {email_address}")
            return None
            
        except Exception as e:
            logger.error(f"Database error finding user for {email_address}: {str(e)}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()
    
    def get_domain_from_email(self, email_address):
        """Extract domain from email address"""
        if '@' in email_address:
            return email_address.split('@')[1].lower()
        return 'eliano.dev'
    
    def extract_email_addresses(self, address_header):
        """Extract email addresses from header"""
        if not address_header:
            return []
        
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, address_header)
        return emails
    
    def extract_email_body(self, email_message):
        """Extract email body (text and HTML)"""
        text_body = ""
        html_body = ""
        
        if email_message.is_multipart():
            for part in email_message.walk():
                content_type = part.get_content_type()
                
                if content_type == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        text_body += payload.decode('utf-8', errors='ignore')
                
                elif content_type == "text/html":
                    payload = part.get_payload(decode=True)
                    if payload:
                        html_body += payload.decode('utf-8', errors='ignore')
        else:
            payload = email_message.get_payload(decode=True)
            if payload:
                content_type = email_message.get_content_type()
                decoded_payload = payload.decode('utf-8', errors='ignore')
                
                if content_type == "text/html":
                    html_body = decoded_payload
                else:
                    text_body = decoded_payload
        
        return html_body if html_body else text_body
    
    def process_attachments(self, email_message):
        """Process email attachments"""
        attachments = []
        
        for part in email_message.walk():
            if part.get_content_disposition() == 'attachment':
                filename = part.get_filename()
                if filename:
                    filename = self.decode_header_value(filename)
                    content = part.get_payload(decode=True)
                    
                    attachment_info = {
                        'filename': filename,
                        'content_type': part.get_content_type(),
                        'size': len(content) if content else 0
                    }
                    
                    attachments.append(attachment_info)
        
        return attachments
    
    def store_email_in_database(self, user_id, email_data):
        """Store email in MySQL database"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Encrypt content - USANDO NOVA CRIPTOGRAFIA ALINHADA
            encrypted_body = self.encrypt_content(email_data['body'], user_id)
            encrypted_subject = self.encrypt_content(email_data['subject'], user_id)
            
            logger.info(f"Encrypted subject preview: {encrypted_subject[:50]}...")
            logger.info(f"Encrypted body preview: {encrypted_body[:50]}...")
            
            # Insert email
            insert_query = """
                INSERT INTO emails (
                    userId, folderId, messageId, threadId, fromAddress, fromName,
                    toAddress, ccAddress, bccAddress, subject, body, attachments,
                    isRead, isStarred, isDraft, receivedAt
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            
            values = (
                user_id,
                1,  # folderId = 1 (Inbox)
                email_data['message_id'],
                email_data['thread_id'],
                email_data['from_address'],
                email_data['from_name'],
                email_data['to_address'],
                email_data['cc_address'],
                email_data['bcc_address'],
                encrypted_subject,
                encrypted_body,
                json.dumps(email_data['attachments']) if email_data['attachments'] else None,
                0,  # isRead = 0
                0,  # isStarred = 0
                0,  # isDraft = 0
                email_data['received_at']
            )
            
            cursor.execute(insert_query, values)
            conn.commit()
            
            email_id = cursor.lastrowid
            logger.info(f"Email stored successfully with ID: {email_id}")
            
            return email_id
            
        except Exception as e:
            logger.error(f"Database error storing email: {str(e)}")
            return None
        finally:
            if 'conn' in locals():
                conn.close()
    
    def process_email(self, email_content):
        """Process incoming email"""
        try:
            email_message = email.message_from_string(email_content)
            
            # Extract headers
            from_header = email_message.get('From', '')
            to_header = email_message.get('To', '')
            cc_header = email_message.get('Cc', '')
            bcc_header = email_message.get('Bcc', '')
            subject = self.decode_header_value(email_message.get('Subject', ''))
            message_id = email_message.get('Message-ID', '')
            date_header = email_message.get('Date', '')
            
            logger.info(f"Processing email: {subject} from {from_header}")
            
            # Extract email addresses
            from_emails = self.extract_email_addresses(from_header)
            to_emails = self.extract_email_addresses(to_header)
            cc_emails = self.extract_email_addresses(cc_header)
            bcc_emails = self.extract_email_addresses(bcc_header)
            
            # Find recipient user ID
            user_id = None
            
            # Check To, CC, BCC addresses
            for email_addr in to_emails + cc_emails + bcc_emails:
                user_id = self.find_user_id(email_addr)
                if user_id:
                    break
            
            if not user_id:
                logger.warning(f"No user found for email destinations: {to_emails + cc_emails + bcc_emails}")
                return False
            
            # Parse date
            try:
                received_at = parsedate_to_datetime(date_header) if date_header else datetime.now()
            except:
                received_at = datetime.now()
            
            # Extract body and attachments
            body = self.extract_email_body(email_message)
            attachments = self.process_attachments(email_message)
            
            # Prepare email data
            email_data = {
                'message_id': message_id,
                'thread_id': message_id or f"thread-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'from_address': from_emails[0] if from_emails else from_header,
                'from_name': self.decode_header_value(from_header),
                'to_address': ', '.join(to_emails),
                'cc_address': ', '.join(cc_emails) if cc_emails else None,
                'bcc_address': ', '.join(bcc_emails) if bcc_emails else None,
                'subject': subject,
                'body': body,
                'attachments': attachments,
                'received_at': received_at
            }
            
            # Store in database
            email_id = self.store_email_in_database(user_id, email_data)
            
            if email_id:
                logger.info(f"Email processed successfully - ID: {email_id}, User: {user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error processing email: {str(e)}")
            return False

def main():
    """Main function to process email from stdin"""
    try:
        # Read email content from stdin
        email_content = sys.stdin.read()
        
        if not email_content.strip():
            logger.error("No email content received from stdin")
            sys.exit(1)
        
        # Process email
        processor = EmailProcessor()
        success = processor.process_email(email_content)
        
        if success:
            logger.info("Email processing completed successfully")
            sys.exit(0)
        else:
            logger.error("Email processing failed")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Main function error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()