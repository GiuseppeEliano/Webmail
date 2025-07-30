#!/bin/bash
"""
Setup completo do servidor de email para Eliano webmail
Configura Postfix + Dovecot com integração MySQL (sem SSL)
"""

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m'

echo -e "${GREEN}=== Eliano Email Server Setup ===${NC}"
echo "Configurando servidor de email integrado com MySQL (sem SSL)"
echo

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Este script deve ser executado como root${NC}"
   echo "Execute: sudo $0"
   exit 1
fi

# Definir diretórios
PROJECT_DIR=$(pwd)
EMAIL_PROCESSOR="$PROJECT_DIR/server/email-processor.py"

echo -e "${YELLOW}Diretório do projeto: $PROJECT_DIR${NC}"
echo -e "${YELLOW}Processador de email: $EMAIL_PROCESSOR${NC}"
echo

# Verificar se o processador existe
if [ ! -f "$EMAIL_PROCESSOR" ]; then
    echo -e "${RED}Erro: email-processor.py não encontrado em $EMAIL_PROCESSOR${NC}"
    exit 1
fi

# Tornar processador executável
chmod +x "$EMAIL_PROCESSOR"

# Obter configuração do usuário
echo -e "${BLUE}Configuração do Sistema${NC}"
echo "========================================"

read -p "Digite seu domínio (ex: eliano.dev): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}Domínio é obrigatório${NC}"
    exit 1
fi

read -p "Digite o hostname do servidor (ex: mail.eliano.dev): " HOSTNAME
if [ -z "$HOSTNAME" ]; then
    HOSTNAME="mail.$DOMAIN_NAME"
fi

# Configuração do banco de dados
echo
echo -e "${YELLOW}Configuração do MySQL:${NC}"
read -p "Host do MySQL [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Usuário do MySQL [eliano_user]: " DB_USER
DB_USER=${DB_USER:-eliano_user}

read -s -p "Senha do MySQL: " DB_PASSWORD
echo
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}Senha do MySQL é obrigatória${NC}"
    exit 1
fi

read -p "Nome do banco [eliano_mail_production]: " DB_NAME
DB_NAME=${DB_NAME:-eliano_mail_production}

# Atualizar sistema
echo
echo -e "${YELLOW}Atualizando sistema...${NC}"
apt-get update

# Instalar pacotes necessários
echo -e "${YELLOW}Instalando pacotes...${NC}"
apt-get install -y postfix postfix-mysql dovecot-core dovecot-imapd dovecot-pop3d \
    dovecot-lmtpd dovecot-mysql mysql-client python3 python3-pip \
    python3-mysql.connector python3-cryptography python3-dotenv

# Instalar dependências Python
echo -e "${YELLOW}Instalando dependências Python...${NC}"
pip3 install mysql-connector-python cryptography python-dotenv

# Criar arquivo de ambiente
echo -e "${YELLOW}Criando configuração de ambiente...${NC}"
cat > "$PROJECT_DIR/server/.env.email" << EOF
# Configuração do processador de email
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
ENCRYPTION_KEY=eliano-default-key-2024
EOF

chmod 600 "$PROJECT_DIR/server/.env.email"

# Configurar Postfix
echo -e "${YELLOW}Configurando Postfix...${NC}"

# Backup da configuração original
cp /etc/postfix/main.cf /etc/postfix/main.cf.backup

# Configuração principal do Postfix
cat > /etc/postfix/main.cf << EOF
# Configuração Postfix para Eliano webmail
smtpd_banner = \$myhostname ESMTP \$mail_name (Eliano)
biff = no
append_dot_mydomain = no

# Configuração básica
myhostname = $HOSTNAME
mydomain = $DOMAIN_NAME
myorigin = \$mydomain
inet_interfaces = all
inet_protocols = all

# Domínios virtuais
virtual_mailbox_domains = $DOMAIN_NAME
virtual_mailbox_maps = mysql:/etc/postfix/mysql-virtual-mailbox-maps.cf
virtual_alias_maps = mysql:/etc/postfix/mysql-virtual-alias-maps.cf

# Entrega via processador customizado
virtual_transport = eliano:

# Restrições SMTP
smtpd_helo_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_invalid_helo_hostname
smtpd_sender_restrictions = permit_mynetworks, permit_sasl_authenticated
smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination

# Limites de tamanho
message_size_limit = 52428800
mailbox_size_limit = 0

# Rede
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
EOF

# Configurar mapas virtuais MySQL
cat > /etc/postfix/mysql-virtual-mailbox-maps.cf << EOF
user = $DB_USER
password = $DB_PASSWORD
hosts = $DB_HOST
dbname = $DB_NAME
query = SELECT CONCAT(SUBSTRING_INDEX(email, '@', 1), '/') FROM users WHERE email = '%s'
EOF

cat > /etc/postfix/mysql-virtual-alias-maps.cf << EOF
user = $DB_USER
password = $DB_PASSWORD
hosts = $DB_HOST
dbname = $DB_NAME
query = SELECT u.email FROM users u JOIN aliases a ON u.email = a.forwardTo WHERE '%s' = a.forwardTo AND a.isActive = 1 UNION SELECT email FROM users WHERE email = '%s' LIMIT 1
EOF

# Definir permissões
chmod 640 /etc/postfix/mysql-*.cf
chown root:postfix /etc/postfix/mysql-*.cf

# Configurar master.cf para transporte customizado
cat >> /etc/postfix/master.cf << EOF

# Eliano email processor transport
eliano    unix  -       n       n       -       -       pipe
  flags=F user=www-data argv=$EMAIL_PROCESSOR
EOF

# Configurar Dovecot
echo -e "${YELLOW}Configurando Dovecot...${NC}"

# Backup da configuração original
cp /etc/dovecot/dovecot.conf /etc/dovecot/dovecot.conf.backup

# Configuração principal do Dovecot
cat > /etc/dovecot/dovecot.conf << EOF
# Configuração Dovecot para Eliano webmail

# Protocolos
protocols = imap pop3 lmtp

# SSL desabilitado (conexão local)
ssl = no

# Autenticação
disable_plaintext_auth = no
auth_mechanisms = plain login

# Localização dos emails
mail_location = maildir:/var/mail/vmail/%d/%n

# Autenticação via MySQL
passdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}

userdb {
  driver = sql
  args = /etc/dovecot/dovecot-sql.conf.ext
}

# Configuração de serviços
service imap-login {
  inet_listener imap {
    port = 143
  }
}

service pop3-login {
  inet_listener pop3 {
    port = 110
  }
}

service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0600
    user = postfix
    group = postfix
  }
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
EOF

# Configurar autenticação MySQL no Dovecot
cat > /etc/dovecot/dovecot-sql.conf.ext << EOF
driver = mysql
connect = host=$DB_HOST dbname=$DB_NAME user=$DB_USER password=$DB_PASSWORD ssl_disabled=yes

default_pass_scheme = PLAIN

password_query = SELECT username, email as user, password FROM users WHERE email = '%u'
user_query = SELECT username, email as user, 'vmail' as uid, 'vmail' as gid, '/var/mail/vmail/%d/%n' as home FROM users WHERE email = '%u'
EOF

chmod 640 /etc/dovecot/dovecot-sql.conf.ext
chown root:dovecot /etc/dovecot/dovecot-sql.conf.ext

# Criar usuário e diretório para emails
useradd -r -s /bin/false vmail 2>/dev/null || true
mkdir -p /var/mail/vmail
chown -R vmail:vmail /var/mail/vmail

# Configurar logs
mkdir -p /var/log
touch /var/log/eliano-email-processor.log
chown www-data:www-data /var/log/eliano-email-processor.log

# Configurar logrotate
cat > /etc/logrotate.d/eliano-email-processor << EOF
/var/log/eliano-email-processor.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
}
EOF

# Testar conexão com banco
echo -e "${YELLOW}Testando conexão com banco de dados...${NC}"
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Conexão com banco funcionando${NC}"
else
    echo -e "${RED}✗ Falha na conexão com banco${NC}"
    echo "Verifique as credenciais e se o banco existe."
    exit 1
fi

# Criar script de teste
echo -e "${YELLOW}Criando script de teste...${NC}"
cat > "$PROJECT_DIR/server/test-email.sh" << EOF
#!/bin/bash
# Script de teste para processar um email

echo "Testando processamento de email..."
echo

echo "From: test@example.com
To: test@$DOMAIN_NAME
Subject: Email de Teste - \$(date)
Date: \$(date -R)
Message-ID: <test-\$(date +%s)@example.com>

Este é um email de teste para verificar se o sistema está funcionando.

Detalhes do teste:
- Data: \$(date)
- Servidor: \$(hostname)
- Domínio: $DOMAIN_NAME

Atenciosamente,
Sistema de Teste Eliano" | python3 "$EMAIL_PROCESSOR"

echo
echo "Teste concluído. Verifique a caixa de entrada da aplicação."
echo "Se o email não aparecer, verifique os logs:"
echo "  - Processador: tail -f /var/log/eliano-email-processor.log"
echo "  - Sistema: tail -f /var/log/mail.log"
EOF

chmod +x "$PROJECT_DIR/server/test-email.sh"

# Reiniciar serviços
echo -e "${YELLOW}Reiniciando serviços...${NC}"
systemctl restart postfix
systemctl restart dovecot

systemctl enable postfix
systemctl enable dovecot

# Testar serviços
echo -e "${YELLOW}Testando serviços...${NC}"
if systemctl is-active --quiet postfix; then
    echo -e "${GREEN}✓ Postfix funcionando${NC}"
else
    echo -e "${RED}✗ Postfix com problema${NC}"
    systemctl status postfix
fi

if systemctl is-active --quiet dovecot; then
    echo -e "${GREEN}✓ Dovecot funcionando${NC}"
else
    echo -e "${RED}✗ Dovecot com problema${NC}"
    systemctl status dovecot
fi

# Instruções finais
echo
echo -e "${GREEN}=== Configuração Concluída! ===${NC}"
echo
echo -e "${YELLOW}Resumo da Configuração:${NC}"
echo "  Domínio: $DOMAIN_NAME"
echo "  Hostname: $HOSTNAME"
echo "  Banco: $DB_NAME @ $DB_HOST"
echo "  SSL: Desabilitado (conexão local)"
echo
echo -e "${YELLOW}Próximos Passos:${NC}"
echo "1. Configurar registro DNS MX:"
echo "   MX 10 $HOSTNAME"
echo
echo "2. Testar processamento:"
echo "   $PROJECT_DIR/server/test-email.sh"
echo
echo "3. Enviar email real para usuário@$DOMAIN_NAME"
echo
echo -e "${YELLOW}Arquivos Importantes:${NC}"
echo "  - Processador: $EMAIL_PROCESSOR"
echo "  - Configuração: $PROJECT_DIR/server/.env.email"
echo "  - Teste: $PROJECT_DIR/server/test-email.sh"
echo
echo -e "${YELLOW}Monitoramento:${NC}"
echo "  - Logs processador: tail -f /var/log/eliano-email-processor.log"
echo "  - Logs sistema: tail -f /var/log/mail.log"
echo "  - Status Postfix: systemctl status postfix"
echo "  - Status Dovecot: systemctl status dovecot"
echo
echo -e "${GREEN}Servidor de email configurado com sucesso!${NC}"
echo "Seu webmail Eliano está pronto para receber emails."