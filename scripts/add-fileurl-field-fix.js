/**
 * ADICIONAR CAMPO fileUrl NO BANCO
 * Usa conexão direta para executar ALTER TABLE
 */

import { getConnection } from '../backend/config/database.js';

async function addFileUrlField() {
  console.log('🔧 Adicionando campo fileUrl na tabela marh_documents...');
  
  try {
    const pool = await getConnection();
    
    // Verificar se o campo já existe
    const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'marh_documents' 
      AND COLUMN_NAME = 'fileUrl'
    `;
    
    const existing = await pool.request().query(checkQuery);
    
    if (existing.recordset.length > 0) {
      console.log('✅ Campo fileUrl já existe na tabela');
      return;
    }
    
    // Adicionar o campo
    const alterQuery = `
      ALTER TABLE marh_documents 
      ADD fileUrl VARCHAR(512) NULL
    `;
    
    await pool.request().query(alterQuery);
    console.log('✅ Campo fileUrl adicionado com sucesso!');
    
    // Verificar se foi adicionado
    const verifyQuery = `
      SELECT TOP 5 id, fileName, fileUrl 
      FROM marh_documents
    `;
    
    const result = await pool.request().query(verifyQuery);
    console.log('📊 Verificação - primeiros 5 documentos:');
    result.recordset.forEach(doc => {
      console.log(`- ${doc.fileName}: URL = ${doc.fileUrl || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campo:', error.message);
    throw error;
  }
}

addFileUrlField();
