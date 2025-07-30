-- SQL para criar a tabela de sessões no MySQL local
-- Execute este comando no seu banco de dados MySQL

CREATE TABLE IF NOT EXISTS sessions (
  session_id varchar(128) COLLATE utf8mb4_bin NOT NULL,
  expires int(11) unsigned NOT NULL,
  data mediumtext COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- Verificar se a tabela foi criada corretamente
-- DESCRIBE sessions;