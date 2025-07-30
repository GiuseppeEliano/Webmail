#!/bin/bash
"""
Email server setup script for Eliano webmail
Configures Postfix + Dovecot to receive emails and process them via the email-processor.py script
"""

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Eliano Email Server Setup ===${NC}"
echo "This script will configure Postfix and Dovecot for your Eliano webmail application"
echo

# Check if running as root
#if [[ $EUID -eq 0 ]]; then
#   echo -e "${RED}This script should not be run as root${NC}"
#   echo "Please run as a regular user with sudo privileges"
#   exit 1
#fi

# Get project directory
PROJECT_DIR=$(pwd)
EMAIL_PROCESSOR="$PROJECT_DIR/email-processor.py"

echo -e "${YELLOW}Project directory: $PROJECT_DIR${NC}"
echo -e "${YELLOW}Email processor: $EMAIL_PROCESSOR${NC}"
echo

# Check if email processor exists
if [ ! -f "$EMAIL_PROCESSOR" ]; then
    echo -e "${RED}Error: email-processor.py not found at $EMAIL_PROCESSOR${NC}"
    exit 1
fi

# Make email processor executable
chmod +x "$EMAIL_PROCESSOR"

# Get domain name
read -p "Enter your domain name (e.g., eliano.dev): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}Domain name is required${NC}"
    exit 1
fi

# Get database credentials
echo
echo -e "${YELLOW}Database configuration:${NC}"
read -p "MySQL host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "MySQL username [root]: " DB_USER
DB_USER=${DB_USER:-eliano_user}

read -s -p "MySQL password: " DB_PASSWORD
echo

read -p "MySQL database name [eliano_webmail]: " DB_NAME
DB_NAME=${DB_NAME:-eliano_mail_production}

# Create .env file for email processor
echo
echo -e "${YELLOW}Creating environment configuration...${NC}"
cat > "$PROJECT_DIR/.env.email" << EOF
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
EOF

echo -e "${GREEN}✓ Environment configuration created${NC}"

# Install required packages
echo
echo -e "${YELLOW}Installing required packages...${NC}"
sudo apt update
sudo apt install -y postfix dovecot-core dovecot-imapd dovecot-pop3d python3-pip python3-mysql.connector python3-dotenv

echo -e "${GREEN}✓ Packages installed${NC}"

# Install Python dependencies
echo
echo -e "${YELLOW}Installing Python dependencies...${NC}"
sudo pip3 install mysql-connector-python python-dotenv cryptography

echo -e "${GREEN}✓ Python dependencies installed${NC}"

# Configure Postfix
echo
echo -e "${YELLOW}Configuring Postfix...${NC}"

# Backup original configuration
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup

# Create Postfix main configuration
sudo tee /etc/postfix/main.cf > /dev/null << EOF
# Basic configuration
myhostname = mail.$DOMAIN_NAME
mydomain = $DOMAIN_NAME
myorigin = $DOMAIN_NAME
inet_interfaces = all
inet_protocols = ipv4
mydestination = $DOMAIN_NAME, mail.$DOMAIN_NAME, localhost.localdomain, localhost

# Network settings
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128

# Mailbox settings
home_mailbox = Maildir/
mailbox_command = 

# Virtual alias settings
virtual_alias_domains = 
virtual_alias_maps = 

# Security
smtpd_banner = $myhostname ESMTP
disable_vrfy_command = yes
smtpd_helo_required = yes

# Local delivery via our custom script
mailbox_transport = eliano
eliano_destination_recipient_limit = 1
EOF

# Create transport configuration
sudo tee /etc/postfix/master.cf > /dev/null << EOF
# Postfix master process configuration file
smtp      inet  n       -       y       -       -       smtpd
pickup    unix  n       -       y       60      1       pickup
cleanup   unix  n       -       y       -       0       cleanup
qmgr      unix  n       -       n       300     1       qmgr
tlsmgr    unix  -       -       y       1000?   1       tlsmgr
rewrite   unix  -       -       y       -       -       trivial-rewrite
bounce    unix  -       -       y       -       0       bounce
defer     unix  -       -       y       -       0       bounce
trace     unix  -       -       y       -       0       bounce
verify    unix  -       -       y       -       1       verify
flush     unix  n       -       y       1000?   0       flush
proxymap  unix  -       -       n       -       -       proxymap
proxywrite unix -       -       n       -       1       proxymap
smtp      unix  -       -       y       -       -       smtp
relay     unix  -       -       y       -       -       smtp
showq     unix  n       -       y       -       -       showq
error     unix  -       -       y       -       -       error
retry     unix  -       -       y       -       -       error
discard   unix  -       -       y       -       -       discard
local     unix  -       n       n       -       -       local
virtual   unix  -       n       n       -       -       virtual
lmtp      unix  -       -       y       -       -       lmtp
anvil     unix  -       -       y       -       1       anvil
scache    unix  -       -       y       -       1       scache

# Custom transport for Eliano
eliano    unix  -       n       n       -       -       pipe
  user=www-data argv=/usr/bin/python3 $EMAIL_PROCESSOR
EOF

echo -e "${GREEN}✓ Postfix configured${NC}"

# Configure Dovecot (basic configuration)
echo
echo -e "${YELLOW}Configuring Dovecot...${NC}"

sudo tee /etc/dovecot/dovecot.conf > /dev/null << EOF
# Basic configuration
protocols = imap pop3

# Mail location
mail_location = maildir:~/Maildir

# Authentication
auth_mechanisms = plain login

# SSL (disable for testing, enable for production)
ssl = no

# Network settings
listen = *

# Logging
log_path = /var/log/dovecot.log
info_log_path = /var/log/dovecot-info.log
debug_log_path = /var/log/dovecot-debug.log

# Include additional configurations
!include conf.d/*.conf
EOF

echo -e "${GREEN}✓ Dovecot configured${NC}"

# Create virtual user for email processing
echo
echo -e "${YELLOW}Setting up email processing user...${NC}"

# Create user for email processing if it doesn't exist
if ! id "eliano-mail" &>/dev/null; then
    sudo useradd -r -s /bin/false eliano-mail
    echo -e "${GREEN}✓ Email processing user created${NC}"
else
    echo -e "${GREEN}✓ Email processing user already exists${NC}"
fi

# Set permissions for email processor
sudo chown root:root "$EMAIL_PROCESSOR"
sudo chmod 755 "$EMAIL_PROCESSOR"

# Create log directory
sudo mkdir -p /var/log/eliano
sudo chown www-data:www-data /var/log/eliano

echo -e "${GREEN}✓ Permissions configured${NC}"

# Create test script
echo
echo -e "${YELLOW}Creating test script...${NC}"

cat > "$PROJECT_DIR/test-email.sh" << EOF
#!/bin/bash
# Test script to send a test email through the processor

echo "From: test@example.com
To: user@$DOMAIN_NAME
Subject: Test Email
Date: \$(date -R)
Message-ID: <test-\$(date +%s)@example.com>

This is a test email to verify the email processing system is working correctly.

Best regards,
Test System" | python3 $EMAIL_PROCESSOR
EOF

chmod +x "$PROJECT_DIR/test-email.sh"

echo -e "${GREEN}✓ Test script created at $PROJECT_DIR/test-email.sh${NC}"

# Restart services
echo
echo -e "${YELLOW}Restarting services...${NC}"

sudo systemctl restart postfix
sudo systemctl restart dovecot

# Enable services
sudo systemctl enable postfix
sudo systemctl enable dovecot

echo -e "${GREEN}✓ Services restarted and enabled${NC}"

# Final instructions
echo
echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure your DNS MX record to point to this server"
echo "2. Test the email processing with: $PROJECT_DIR/test-email.sh"
echo "3. Send a real email to any user@$DOMAIN_NAME"
echo "4. Check logs: sudo tail -f /var/log/mail.log"
echo
echo -e "${YELLOW}Important files:${NC}"
echo "- Email processor: $EMAIL_PROCESSOR"
echo "- Environment config: $PROJECT_DIR/server/.env.email"
echo "- Test script: $PROJECT_DIR/server/test-email.sh"
echo "- Postfix config: /etc/postfix/main.cf"
echo "- Dovecot config: /etc/dovecot/dovecot.conf"
echo
echo -e "${YELLOW}Logs to monitor:${NC}"
echo "- Mail log: sudo tail -f /var/log/mail.log"
echo "- Postfix log: sudo journalctl -u postfix -f"
echo "- Dovecot log: sudo tail -f /var/log/dovecot.log"
echo
echo -e "${GREEN}Email server setup complete!${NC}"
