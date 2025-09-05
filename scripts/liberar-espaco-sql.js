/**
 * SCRIPT PARA LIBERAR ESPAÇO NO BANCO SQL
 * Remove o campo fileData (que contém os arquivos) para liberar espaço
 */

import { loadFromDB } from '../backend/utils/dbHelpers.js';
import { getConnection } from '../backend/config/database.js';

async function liberarEspacoSQL() {
  console.log('🗑️ LIBERANDO ESPAÇO NO BANCO SQL...');
  
  try {
    // Verificar quantos documentos têm fileData
    console.log('📊 Verificando documentos com fileData...');
    const docsWithData = await loadFromDB('documents', 'WHERE fileData IS NOT NULL');
    console.log(`📄 Encontrados ${docsWithData.length} documentos ocupando espaço`);
    
    if (docsWithData.length === 0) {
      console.log('✅ Nenhum documento com fileData encontrado. Espaço já liberado!');
      return;
    }
    
    console.log('🗑️ Removendo dados dos arquivos (apenas fileData, mantendo registros)...');
    
    // Conectar ao banco
    const pool = await getConnection();
    const request = pool.request();
    
    // Limpar campo fileData de todos os documentos
    const updateQuery = `
      UPDATE marh_documents 
      SET fileData = NULL 
      WHERE fileData IS NOT NULL
    `;
    
    const result = await request.query(updateQuery);
    console.log('✅ Campo fileData limpo com sucesso!');
    
    // Verificar resultado
    const remainingDocs = await loadFromDB('documents', 'WHERE fileData IS NOT NULL');
    console.log(`📊 Documentos restantes com fileData: ${remainingDocs.length}`);
    
    // Mostrar total de registros mantidos
    const allDocs = await loadFromDB('documents');
    console.log(`📄 Total de registros de documentos mantidos: ${allDocs.length}`);
    
    console.log('\n🎉 ESPAÇO LIBERADO COM SUCESSO!');
    console.log('📋 O que aconteceu:');
    console.log('  ✅ Arquivos removidos do banco SQL');
    console.log('  ✅ Registros de documentos mantidos (nomes, IDs, etc.)');
    console.log('  ✅ Espaço liberado no banco');
    console.log('  ⚠️ Para acessar arquivos, use o robô FTP agora');
    
  } catch (error) {
    console.error('❌ Erro ao liberar espaço:', error.message);
    throw error;
  }
}

liberarEspacoSQL();
