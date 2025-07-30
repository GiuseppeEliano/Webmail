# Eliano Webmail - Guia de Instalação em Produção

## Pré-requisitos do Servidor Ubuntu

### 1. Atualização do Sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Instalação do MySQL Server
```bash
# Instalar MySQL 8.0
sudo apt install mysql-server -y

# Configurar MySQL
sudo mysql_secure_installation

# Configurar usuário para acesso remoto
sudo mysql -e "CREATE USER 'eliano_user'@'%' IDENTIFIED BY 'sua_senha_segura';"
sudo mysql -e "GRANT ALL PRIVILEGES ON *.* TO 'eliano_user'@'%' WITH GRANT OPTION;"
sudo mysql -e "FLUSH PRIVILEGES;"

# Criar banco de dados
sudo mysql -e "CREATE DATABASE eliano_webmail CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3. Configuração do Firewall MySQL
```bash
# Abrir porta MySQL (apenas se necessário para conexões remotas)
sudo ufw allow 3306/tcp
```

### 4. Instalação do Servidor de Email (Postfix + Dovecot)
```bash
# Instalar Postfix (SMTP Server)
sudo apt install postfix postfix-mysql -y

# Instalar Dovecot (IMAP/POP3 Server)
sudo apt install dovecot-core dovecot-imapd dovecot-mysql -y

# Instalar ferramentas adicionais
sudo apt install mailutils opendkim opendkim-tools -y
```

### 5. Configuração DNS para eliano.dev
Adicione os seguintes registros DNS no seu provedor de domínio:

```dns
# Registro MX para recebimento de emails
eliano.dev.        IN  MX  10  mail.eliano.dev.

# Registro A para o servidor de email
mail.eliano.dev.   IN  A   SEU_IP_DO_SERVIDOR

# Registro A para o webmail
webmail.eliano.dev IN  A   SEU_IP_DO_SERVIDOR

# Registros SPF, DKIM e DMARC para segurança
eliano.dev.        IN  TXT "v=spf1 mx a:mail.eliano.dev ~all"
_dmarc.eliano.dev. IN  TXT "v=DMARC1; p=quarantine; rua=mailto:admin@eliano.dev"
```

## Configuração do Servidor de Email

### 6. Configuração do Postfix (/etc/postfix/main.cf)
```bash
# Configuração básica do Postfix
myhostname = mail.eliano.dev
mydomain = eliano.dev
myorigin = $mydomain
inet_interfaces = all
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain

# Configuração MySQL para usuários virtuais
virtual_mailbox_domains = mysql:/etc/postfix/mysql-virtual-mailbox-domains.cf
virtual_mailbox_maps = mysql:/etc/postfix/mysql-virtual-mailbox-maps.cf
virtual_alias_maps = mysql:/etc/postfix/mysql-virtual-alias-maps.cf
virtual_transport = dovecot
dovecot_destination_recipient_limit = 1

# Configuração de segurança
smtpd_tls_cert_file = /etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file = /etc/ssl/private/ssl-cert-snakeoil.key
smtpd_use_tls = yes
smtpd_tls_auth_only = yes
```

### 7. Arquivos de Configuração MySQL para Postfix

Criar `/etc/postfix/mysql-virtual-mailbox-domains.cf`:
```bash
user = eliano_mail
password = sua_senha_mysql
hosts = localhost
dbname = eliano_mail_production
query = SELECT 1 FROM users WHERE email = '%s' AND email LIKE '%%@%d'
```

Criar `/etc/postfix/mysql-virtual-mailbox-maps.cf`:
```bash
user = eliano_user
password = sua_senha_mysql
hosts = localhost
dbname = eliano_webmail
query = SELECT CONCAT('user_', id, '/') FROM users WHERE email = '%s'
```

Criar `/etc/postfix/mysql-virtual-alias-maps.cf`:
```bash
user = eliano_user
password = sua_senha_mysql
hosts = localhost
dbname = eliano_webmail
query = SELECT forwardTo FROM aliases WHERE aliasName = '%s' AND isActive = 1
```

### 8. Configuração do Dovecot

Editar `/etc/dovecot/dovecot.conf`:
```bash
protocols = imap

# Habilitar autenticação SQL
!include auth-sql.conf.ext

# Configuração de mailbox
mail_location = maildir:/var/mail/vhosts/%d/%n
mail_privileged_group = mail
```

Criar `/etc/dovecot/dovecot-sql.conf.ext`:
```bash
driver = mysql
connect = host=localhost dbname=eliano_webmail user=eliano_user password=sua_senha_mysql

default_pass_scheme = PLAIN

password_query = SELECT password FROM users WHERE email = '%u'
user_query = SELECT CONCAT('user_', id) as uid, 'mail' as gid, '/var/mail/vhosts/%d/%n' as home FROM users WHERE email = '%u'
```

### 9. Configuração de Diretórios de Email
```bash
sudo mkdir -p /var/mail/vhosts/eliano.dev
sudo chown -R mail:mail /var/mail/vhosts
sudo chmod -R 770 /var/mail/vhosts
```

### 10. Reiniciar Serviços
```bash
sudo systemctl restart postfix
sudo systemctl restart dovecot
sudo systemctl enable postfix
sudo systemctl enable dovecot
```

## Configuração da Aplicação Eliano

### 11. Importar Schema do Banco
```bash
# Importar o schema SQL
mysql -u eliano_mail -p eliano_mail_production < database/production_schema.sql
```

### 12. Configurar Variáveis de Ambiente
Copie `.env.production` para `.env` e configure:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=eliano_user
DB_PASSWORD=sua_senha_mysql
DB_NAME=eliano_webmail

# Email Server Configuration
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@eliano.dev
SMTP_PASS=sua_senha_smtp

IMAP_HOST=localhost
IMAP_PORT=993
IMAP_SECURE=true

# Domain Configuration
DOMAIN=eliano.dev
WEBMAIL_URL=https://webmail.eliano.dev
```

### 13. Configuração SSL/TLS (Opcional mas Recomendado)
```bash
# Instalar Certbot para Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y

# Obter certificados SSL
sudo certbot --nginx -d mail.eliano.dev -d webmail.eliano.dev
```

### 14. Configuração do Nginx (Proxy Reverso)
```bash
# Instalar Nginx
sudo apt install nginx -y

# Configurar site
sudo tee /etc/nginx/sites-available/webmail.eliano.dev << 'EOF'
server {
    listen 80;
    server_name webmail.eliano.dev;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name webmail.eliano.dev;

    ssl_certificate /etc/letsencrypt/live/webmail.eliano.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webmail.eliano.dev/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Habilitar site
sudo ln -s /etc/nginx/sites-available/webmail.eliano.dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Teste de Configuração

### 15. Teste de Conectividade do Banco
```bash
mysql -h localhost -u eliano_user -p eliano_webmail -e "SHOW TABLES;"
```

### 16. Teste de Email (Envio)
```bash
echo "Teste de email" | mail -s "Teste" teste@eliano.dev
```

### 17. Teste de Email (Recebimento)
```bash
# Verificar logs do Postfix
sudo tail -f /var/log/mail.log

# Verificar se emails estão sendo recebidos
sudo find /var/mail/vhosts -name "*" -type f
```

## Resolução de Problemas Comuns

### 18. Problemas de Conectividade MySQL
```bash
# Verificar status do MySQL
sudo systemctl status mysql

# Verificar conexões
sudo netstat -tlnp | grep 3306

# Verificar logs
sudo tail -f /var/log/mysql/error.log
```

### 19. Problemas de Email
```bash
# Verificar status dos serviços
sudo systemctl status postfix
sudo systemctl status dovecot

# Verificar logs
sudo tail -f /var/log/mail.log
sudo tail -f /var/log/dovecot.log

# Testar conexão SMTP
telnet localhost 25

# Testar conexão IMAP
telnet localhost 143
```

### 20. Problemas de Aplicação
```bash
# Verificar logs da aplicação
pm2 logs eliano

# Verificar status
pm2 status

# Reiniciar aplicação
pm2 restart eliano
```

## Segurança Adicional

### 21. Firewall UFW
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp
sudo ufw allow 993/tcp
sudo ufw allow 995/tcp
sudo ufw enable
```

### 22. Fail2Ban (Proteção contra Ataques)
```bash
sudo apt install fail2ban -y

# Configurar jail para SSH e email
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Editar configuração conforme necessário
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Backup e Manutenção

### 23. Script de Backup Automático
```bash
#!/bin/bash
# Backup script para Eliano Webmail

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/eliano"

# Criar diretório de backup
mkdir -p $BACKUP_DIR

# Backup do banco de dados
mysqldump -u eliano_user -p'sua_senha' eliano_webmail > $BACKUP_DIR/db_backup_$DATE.sql

# Backup dos emails
tar -czf $BACKUP_DIR/emails_backup_$DATE.tar.gz /var/mail/vhosts

# Backup dos arquivos de usuário
tar -czf $BACKUP_DIR/user_storage_backup_$DATE.tar.gz /path/to/user_storage

# Limpar backups antigos (manter apenas 7 dias)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 24. Configurar Crontab para Backup
```bash
# Editar crontab
sudo crontab -e

# Adicionar linha para backup diário às 2:00 AM
0 2 * * * /path/to/backup_script.sh
```

## URLs de Acesso

Após a configuração completa, você poderá acessar:

- **Webmail**: https://webmail.eliano.dev
- **Email de teste**: teste@eliano.dev
- **Admin**: admin@eliano.dev (senha: admin123 - ALTERE IMEDIATAMENTE!)

## Próximos Passos

1. ✅ Configure o servidor Ubuntu com MySQL
2. ✅ Configure Postfix e Dovecot para email
3. ✅ Importe o schema do banco de dados
4. ✅ Configure as variáveis de ambiente
5. ✅ Configure SSL/TLS com Let's Encrypt
6. ✅ Configure Nginx como proxy reverso
7. ✅ Teste o envio e recebimento de emails
8. ✅ Configure backup automático
9. ✅ Monitore logs e performance
10. ✅ Altere senha padrão do admin

---

**Importante**: Este é um servidor de email completo. Certifique-se de configurar adequadamente DNS, SPF, DKIM e DMARC para evitar que seus emails sejam marcados como spam.