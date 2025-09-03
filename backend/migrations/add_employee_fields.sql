-- Script SQL para adicionar os novos campos na tabela marh_employees
-- Execute este script no SQL Server Management Studio ou Azure Data Studio

-- Verificar se a tabela existe
IF OBJECT_ID('marh_employees', 'U') IS NOT NULL
BEGIN
    PRINT '✅ Tabela marh_employees encontrada. Adicionando novos campos...';
    
    -- Adicionar campo chapa
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'chapa')
    BEGIN
        ALTER TABLE marh_employees ADD chapa NVARCHAR(50) NULL;
        PRINT '✅ Campo chapa adicionado';
    END
    ELSE
        PRINT '⚠️ Campo chapa já existe';
    
    -- Adicionar campo cpf (se não existir)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'cpf')
    BEGIN
        ALTER TABLE marh_employees ADD cpf NVARCHAR(14) NULL;
        PRINT '✅ Campo cpf adicionado';
    END
    ELSE
        PRINT '⚠️ Campo cpf já existe';
    
    -- Adicionar campo cod_cargo
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'cod_cargo')
    BEGIN
        ALTER TABLE marh_employees ADD cod_cargo NVARCHAR(20) NULL;
        PRINT '✅ Campo cod_cargo adicionado';
    END
    ELSE
        PRINT '⚠️ Campo cod_cargo já existe';
    
    -- Adicionar campo cargo
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'cargo')
    BEGIN
        ALTER TABLE marh_employees ADD cargo NVARCHAR(100) NULL;
        PRINT '✅ Campo cargo adicionado';
    END
    ELSE
        PRINT '⚠️ Campo cargo já existe';
    
    -- Adicionar campo local
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'local')
    BEGIN
        ALTER TABLE marh_employees ADD local NVARCHAR(100) NULL;
        PRINT '✅ Campo local adicionado';
    END
    ELSE
        PRINT '⚠️ Campo local já existe';
    
    -- Adicionar campo descricao_folha
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'descricao_folha')
    BEGIN
        ALTER TABLE marh_employees ADD descricao_folha NVARCHAR(200) NULL;
        PRINT '✅ Campo descricao_folha adicionado';
    END
    ELSE
        PRINT '⚠️ Campo descricao_folha já existe';
    
    -- Adicionar campo centro_custo
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'centro_custo')
    BEGIN
        ALTER TABLE marh_employees ADD centro_custo NVARCHAR(50) NULL;
        PRINT '✅ Campo centro_custo adicionado';
    END
    ELSE
        PRINT '⚠️ Campo centro_custo já existe';
    
    -- Adicionar campo cod_situacao
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'cod_situacao')
    BEGIN
        ALTER TABLE marh_employees ADD cod_situacao NVARCHAR(10) NULL;
        PRINT '✅ Campo cod_situacao adicionado';
    END
    ELSE
        PRINT '⚠️ Campo cod_situacao já existe';
    
    -- Adicionar campo situacao
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'situacao')
    BEGIN
        ALTER TABLE marh_employees ADD situacao NVARCHAR(50) NULL;
        PRINT '✅ Campo situacao adicionado';
    END
    ELSE
        PRINT '⚠️ Campo situacao já existe';
    
    -- Adicionar campo data_rescisao
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'data_rescisao')
    BEGIN
        ALTER TABLE marh_employees ADD data_rescisao DATE NULL;
        PRINT '✅ Campo data_rescisao adicionado';
    END
    ELSE
        PRINT '⚠️ Campo data_rescisao já existe';
    
    -- Verificar se o campo hireDate existe (pode estar como admissionDate)
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'hireDate')
       AND NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                       WHERE TABLE_NAME = 'marh_employees' AND COLUMN_NAME = 'admissionDate')
    BEGIN
        ALTER TABLE marh_employees ADD hireDate DATE NULL;
        PRINT '✅ Campo hireDate adicionado';
    END
    ELSE
        PRINT '⚠️ Campo de data de admissão já existe';
    
    PRINT '🎉 Migração concluída! Tabela marh_employees atualizada com todos os novos campos.';
    
    -- Mostrar estrutura atual da tabela
    PRINT '';
    PRINT '📋 Estrutura atual da tabela marh_employees:';
    SELECT 
        COLUMN_NAME as Campo, 
        DATA_TYPE as Tipo, 
        CHARACTER_MAXIMUM_LENGTH as Tamanho, 
        IS_NULLABLE as Permite_Nulo
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'marh_employees'
    ORDER BY ORDINAL_POSITION;
    
END
ELSE
BEGIN
    PRINT '❌ ERRO: Tabela marh_employees não encontrada!';
    PRINT 'Execute primeiro o script de criação das tabelas principais.';
END
