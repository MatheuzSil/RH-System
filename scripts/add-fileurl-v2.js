/**
 * ADICIONAR CAMPO fileUrl NO BANCO
 */

import { getConnection } from '../backend/config/database.js';

async function addFileUrlField() {
  console.log('🔧 Adicionando campo fileUrl na tabela marh_documents...');
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    // Verificar se o campo já existe
    console.log('🔍 Verificando se campo já existe...');
    const checkQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'marh_documents' 
      AND COLUMN_NAME = 'fileUrl'
    `;
    
    const existing = await request.query(checkQuery);
    
    if (existing.recordset.length > 0) {
      console.log('✅ Campo fileUrl já existe na tabela');
      return;
    }
    
    // Adicionar o campo
    console.log('➕ Adicionando campo fileUrl...');
    const alterQuery = `
      ALTER TABLE marh_documents 
      ADD fileUrl VARCHAR(512) NULL
    `;
    
    await request.query(alterQuery);
    console.log('✅ Campo fileUrl adicionado com sucesso!');
    
    // Verificar se foi adicionado
    console.log('🔍 Verificando resultado...');
    const verifyQuery = `
      SELECT TOP 5 id, fileName, fileUrl 
      FROM marh_documents
    `;
    
    const result = await request.query(verifyQuery);
    console.log('📊 Verificação - primeiros 5 documentos:');
    result.recordset.forEach(doc => {
      console.log(`- ${doc.fileName}: URL = ${doc.fileUrl || 'NULL'}`);
    });
    
    console.log('\n🎉 BANCO PREPARADO PARA URLs!');
    console.log('✅ Campo fileUrl criado');
    console.log('✅ Robô pode agora salvar URLs dos arquivos FTP');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campo:', error.message);
    throw error;
  }
}

addFileUrlField();
