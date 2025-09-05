/**
 * SCRIPT SQL: ADICIONAR CAMPO fileUrl
 * Execute este SQL no seu banco de dados antes de rodar a migração
 */

-- Adicionar campo fileUrl na tabela marh_documents
ALTER TABLE marh_documents 
ADD fileUrl VARCHAR(512) NULL;

-- Verificar se o campo foi adicionado
SELECT TOP 5 id, fileName, fileUrl 
FROM marh_documents;
