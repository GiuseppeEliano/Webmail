#!/usr/bin/env python3
"""
System checker for Eliano email server setup
Verifies database connectivity and user/alias configuration
"""

import mysql.connector
import sys
import os
from dotenv import load_dotenv

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_status(message, status="info"):
    colors = {
        "success": Colors.GREEN + "✓ ",
        "error": Colors.RED + "✗ ",
        "warning": Colors.YELLOW + "⚠ ",
        "info": Colors.BLUE + "ℹ "
    }
    print(f"{colors.get(status, '')}{message}{Colors.END}")

def check_database_connection():
    """Check database connectivity and configuration"""
    print("\n=== Database Connection Check ===")
    
    # Load environment variables
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'eliano_user'),
        'password': os.getenv('DB_PASSWORD', '061114182830'),
        'database': os.getenv('DB_NAME', 'eliano_mail_production'),
        'charset': 'utf8mb4',
        'ssl_disabled': True,
        'auth_plugin': 'mysql_native_password'
    }
    
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        print_status(f"Connected to MySQL at {db_config['host']}", "success")
        
        # Check if tables exist
        tables = ['users', 'emails', 'aliases']
        for table in tables:
            cursor.execute(f"SHOW TABLES LIKE '{table}'")
            if cursor.fetchone():
                print_status(f"Table '{table}' exists", "success")
            else:
                print_status(f"Table '{table}' missing", "error")
        
        # Check users
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print_status(f"Found {user_count} users in database", "info")
        
        if user_count > 0:
            cursor.execute("SELECT id, email FROM users LIMIT 5")
            users = cursor.fetchall()
            print_status("Sample users:", "info")
            for user_id, email in users:
                print(f"  - ID {user_id}: {email}")
        
        # Check aliases
        cursor.execute("SELECT COUNT(*) FROM aliases WHERE isActive = 1")
        alias_count = cursor.fetchone()[0]
        print_status(f"Found {alias_count} active aliases", "info")
        
        if alias_count > 0:
            cursor.execute("SELECT aliasName, forwardTo, userId FROM aliases WHERE isActive = 1 LIMIT 5")
            aliases = cursor.fetchall()
            print_status("Sample aliases:", "info")
            for alias_name, forward_to, user_id in aliases:
                print(f"  - {alias_name} → {forward_to} (User {user_id})")
        
        conn.close()
        return True
        
    except Exception as e:
        print_status(f"Database connection failed: {str(e)}", "error")
        return False

def check_email_processor():
    """Check email processor configuration"""
    print("\n=== Email Processor Check ===")
    
    processor_path = "server/email-processor.py"
    
    if os.path.exists(processor_path):
        print_status(f"Email processor found at {processor_path}", "success")
        
        # Check if executable
        if os.access(processor_path, os.X_OK):
            print_status("Email processor is executable", "success")
        else:
            print_status("Email processor is not executable", "warning")
            print("  Run: chmod +x server/email-processor.py")
    else:
        print_status("Email processor not found", "error")
        return False
    
    # Check dependencies
    try:
        import mysql.connector
        print_status("mysql.connector available", "success")
    except ImportError:
        print_status("mysql.connector missing", "error")
        print("  Run: pip3 install mysql-connector-python")
    
    try:
        from cryptography.fernet import Fernet
        print_status("cryptography available", "success")
    except ImportError:
        print_status("cryptography missing", "error")
        print("  Run: pip3 install cryptography")
    
    return True

def check_postfix_config():
    """Check Postfix configuration"""
    print("\n=== Postfix Configuration Check ===")
    
    # Check if Postfix is installed
    if os.path.exists("/etc/postfix/main.cf"):
        print_status("Postfix is installed", "success")
        
        # Check if service is running
        result = os.system("systemctl is-active --quiet postfix")
        if result == 0:
            print_status("Postfix service is running", "success")
        else:
            print_status("Postfix service is not running", "warning")
            print("  Run: sudo systemctl start postfix")
    else:
        print_status("Postfix is not installed", "error")
        print("  Run the setup script: ./server/setup-email-server.sh")
    
    return True

def test_email_lookup():
    """Test email address lookup functionality"""
    print("\n=== Email Lookup Test ===")
    
    # Load environment variables
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'user': os.getenv('DB_USER', 'eliano_user'),
        'password': os.getenv('DB_PASSWORD', '061114182830'),
        'database': os.getenv('DB_NAME', 'eliano_mail_production'),
        'charset': 'utf8mb4',
        'ssl_disabled': True,
        'auth_plugin': 'mysql_native_password'
    }
    
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Get sample email addresses to test
        cursor.execute("SELECT email FROM users LIMIT 1")
        user_result = cursor.fetchone()
        
        if user_result:
            test_email = user_result[0]
            print_status(f"Testing user email lookup: {test_email}", "info")
            
            # Test direct user lookup
            cursor.execute("SELECT id FROM users WHERE LOWER(email) = %s", (test_email.lower(),))
            if cursor.fetchone():
                print_status("Direct user lookup: SUCCESS", "success")
            else:
                print_status("Direct user lookup: FAILED", "error")
        
        # Test alias lookup
        cursor.execute("SELECT forwardTo FROM aliases WHERE isActive = 1 LIMIT 1")
        alias_result = cursor.fetchone()
        
        if alias_result:
            test_alias = alias_result[0]
            print_status(f"Testing alias lookup: {test_alias}", "info")
            
            cursor.execute("SELECT userId FROM aliases WHERE LOWER(forwardTo) = %s AND isActive = 1", (test_alias.lower(),))
            if cursor.fetchone():
                print_status("Alias lookup: SUCCESS", "success")
            else:
                print_status("Alias lookup: FAILED", "error")
        else:
            print_status("No active aliases found for testing", "warning")
        
        conn.close()
        
    except Exception as e:
        print_status(f"Email lookup test failed: {str(e)}", "error")

def main():
    """Main system check function"""
    print("🔍 Eliano Email Server System Check")
    print("=" * 50)
    
    all_good = True
    
    # Run all checks
    if not check_database_connection():
        all_good = False
    
    if not check_email_processor():
        all_good = False
    
    if not check_postfix_config():
        all_good = False
    
    test_email_lookup()
    
    # Final status
    print("\n" + "=" * 50)
    if all_good:
        print_status("System check completed - All systems ready!", "success")
        print("\nNext steps:")
        print("1. Run setup script: ./server/setup-email-server.sh")
        print("2. Configure DNS MX records")
        print("3. Test with: ./server/test-email.sh")
    else:
        print_status("System check completed - Issues found", "warning")
        print("Please resolve the issues above before proceeding.")

if __name__ == "__main__":
    main()
