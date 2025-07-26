-- SQL para atualizar o banco de dados com o campo stayLoggedIn

-- Adicionar coluna stayLoggedIn na tabela users
ALTER TABLE users ADD COLUMN stayLoggedIn TINYINT(1) DEFAULT 0;

-- Atualizar usuários existentes para valor padrão
UPDATE users SET stayLoggedIn = 0 WHERE stayLoggedIn IS NULL;

-- Verificar se a coluna foi adicionada corretamente
DESCRIBE users;