# Melhorias no Sistema de Rascunhos

## Problema Identificado
Ao enviar um email, o sistema estava criando 3 registros na tabela `emails`:
1. Um rascunho vazio
2. O email enviado
3. Outro rascunho vazio

Isso causava duplicação desnecessária e problemas de performance no banco de dados.

## Solução Implementada

### 1. Função `convertDraftToSentEmail`
- **Localização**: `server/storage-production-fixed-temp.ts`
- **Funcionalidade**: Converte um rascunho existente em um email enviado ao invés de criar um novo registro
- **Benefícios**:
  - Elimina duplicação de emails na tabela
  - Mantém o histórico do rascunho original
  - Preserva a criptografia de dados

### 2. Função `cleanupEmptyDrafts`
- **Localização**: `server/storage-production-fixed-temp.ts`
- **Funcionalidade**: Remove rascunhos vazios automaticamente
- **Critérios de limpeza**:
  - Rascunhos com subject vazio
  - Rascunhos com body vazio
  - Não remove rascunhos ativos (isActiveDraft = 1)

### 3. Nova Rota `/api/emails/send`
- **Localização**: `server/routes.ts`
- **Funcionalidade**: Endpoint específico para envio de emails
- **Vantagens**:
  - Lógica separada para criar rascunhos vs enviar emails
  - Força isDraft = 0 e isActiveDraft = 0 ao enviar
  - Usa a nova lógica de conversão de rascunhos

### 4. Melhorias no Frontend
- **Localização**: `client/src/hooks/use-emails.ts`
- **Mudança**: `sendEmailMutation` agora usa `/api/emails/send` ao invés de `/api/emails`
- **Resultado**: Envio de emails usa a nova lógica otimizada

## Arquivos SQL para Limpeza

### Scripts de Manutenção (`database/draft_fixes.sql`)
```sql
-- Remove rascunhos duplicados
DELETE d1 FROM emails d1
INNER JOIN emails d2 
WHERE d1.userId = d2.userId 
  AND d1.isDraft = 1 
  AND d2.isDraft = 1 
  AND d1.id < d2.id;

-- Adiciona índices para performance
ALTER TABLE emails ADD INDEX idx_user_active_draft (userId, isActiveDraft, isDraft);
ALTER TABLE emails ADD INDEX idx_user_draft (userId, isDraft);
ALTER TABLE emails ADD INDEX idx_folder_emails (folderId, isDraft);
```

## Fluxo Otimizado

### Antes (Problemático)
1. Usuário compõe email
2. Sistema cria rascunho ativo
3. Usuário envia email
4. Sistema cria NOVO email na pasta "Enviados"
5. Rascunho original permanece na pasta "Rascunhos"
6. **Resultado**: 2+ emails na tabela para 1 email enviado

### Depois (Otimizado)
1. Usuário compõe email
2. Sistema cria rascunho ativo
3. Usuário envia email
4. Sistema CONVERTE o rascunho existente para email enviado
5. Move para pasta "Enviados" (folderId = 3)
6. **Resultado**: 1 email na tabela para 1 email enviado

## Compatibilidade com Criptografia

A solução mantém total compatibilidade com o sistema de criptografia:
- `convertDraftToSentEmail` usa `encryptEmail()` para todos os campos sensíveis
- `cleanupEmptyDrafts` compara com strings criptografadas vazias
- Não há perda de dados criptografados durante a conversão

## Vantagens da Solução

1. **Performance**: Reduz drasticamente o número de registros duplicados
2. **Integridade**: Mantém histórico consistente de emails
3. **Manutenção**: Limpeza automática de rascunhos vazios
4. **Segurança**: Preserva criptografia de dados
5. **Experiência**: Usuário não vê mais emails duplicados

## Monitoramento

Para verificar se a solução está funcionando, execute:

```sql
-- Verificar rascunhos por usuário
SELECT 
    userId, 
    COUNT(*) as draft_count,
    SUM(CASE WHEN isActiveDraft = 1 THEN 1 ELSE 0 END) as active_drafts
FROM emails 
WHERE isDraft = 1 
GROUP BY userId;

-- Verificar emails enviados hoje
SELECT COUNT(*) as sent_today
FROM emails 
WHERE isDraft = 0 
  AND folderId = 3 
  AND DATE(sentAt) = CURDATE();
```

## Próximos Passos

1. **Execute os scripts SQL** do arquivo `database/draft_fixes.sql`
2. **Monitore os logs** para verificar se a conversão está funcionando
3. **Teste o envio** de alguns emails para confirmar o comportamento
4. **Verifique a tabela** periodicamente para confirmar que não há mais duplicações

A solução foi implementada com foco em manter a compatibilidade total com o sistema existente while eliminando o problema de duplicação de emails.