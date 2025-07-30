# Modo de Desenvolvimento - Sem Autenticação

## Como usar:

### 1. Adicionar variável de ambiente:
```bash
export SKIP_AUTH=true
```

### 2. Ou criar arquivo .env.local:
```
SKIP_AUTH=true
```

### 3. Reiniciar o servidor:
O sistema detectará automaticamente e usará um usuário mock para desenvolvimento.

## Usuário Mock:
- **ID**: 1
- **Email**: dev@eliano.dev
- **Nome**: Development User
- **Emails por página**: 20

## Quando ativado:
- ✅ Pula toda autenticação
- ✅ Acesso direto ao inbox
- ✅ Todas funcionalidades disponíveis
- ✅ Ideal para desenvolvimento e testes

## Para desativar:
Remova `SKIP_AUTH=true` das variáveis de ambiente.