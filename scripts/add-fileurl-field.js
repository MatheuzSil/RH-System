/**
 * SCRIPT PARA ADICIONAR CAMPO fileUrl NO BANCO
 */

import { runQuery } from '../backend/utils/dbHelpers.js';

async function addFileUrlField() {
  console.log('🔧 Adicionando campo fileUrl na tabela marh_documents...');
  
  try {
    // Verificar se o campo já existe
    const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'marh_documents' 
      AND COLUMN_NAME = 'fileUrl'
    `;
    
    const existing = await runQuery(checkQuery);
    
    if (existing.length > 0) {
      console.log('✅ Campo fileUrl já existe na tabela');
      return;
    }
    
    // Adicionar o campo
    const alterQuery = `
      ALTER TABLE marh_documents 
      ADD fileUrl VARCHAR(512) NULL
    `;
    
    await runQuery(alterQuery);
    console.log('✅ Campo fileUrl adicionado com sucesso!');
    
    // Verificar se foi adicionado
    const verifyQuery = `
      SELECT TOP 5 id, fileName, fileUrl 
      FROM marh_documents
    `;
    
    const result = await runQuery(verifyQuery);
    console.log('📊 Verificação - primeiros 5 documentos:');
    result.forEach(doc => {
      console.log(`- ${doc.fileName}: URL = ${doc.fileUrl || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campo:', error.message);
    throw error;
  }
}

addFileUrlField();
