/**
 * LIMPEZA URGENTE - LIBERAR ESPAÇO SQL
 * Script direto para limpar fileData sem consultas pesadas
 */

import { getConnection } from '../backend/config/database.js';

async function limpezaUrgente() {
  console.log('🚨 LIMPEZA URGENTE - LIBERANDO ESPAÇO SQL...');
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    console.log('✅ Conectado ao SQL Server');
    console.log('🗑️ Executando limpeza direta do campo fileData...');
    
    // UPDATE direto sem SELECT primeiro
    const updateQuery = `
      UPDATE marh_documents 
      SET fileData = NULL 
      WHERE fileData IS NOT NULL
    `;
    
    console.log('⏳ Executando UPDATE (pode demorar alguns minutos)...');
    const startTime = Date.now();
    
    const result = await request.query(updateQuery);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ UPDATE concluído em ${duration} segundos`);
    console.log(`📊 Registros afetados: ${result.rowsAffected[0] || 'N/A'}`);
    
    console.log('\n🎉 ESPAÇO LIBERADO COM SUCESSO!');
    console.log('✅ Campo fileData limpo');
    console.log('✅ Registros de documentos mantidos');
    console.log('✅ Banco agora tem espaço livre');
    console.log('🚀 Pode rodar o robô FTP normalmente!');
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error.message);
    
    if (error.message.includes('Connection lost')) {
      console.log('\n💡 DICA: Banco muito sobrecarregado.');
      console.log('Tente novamente em alguns minutos ou:');
      console.log('1. Execute via SQL Server Management Studio');
      console.log('2. Execute: UPDATE marh_documents SET fileData = NULL WHERE fileData IS NOT NULL');
    }
    
    throw error;
  }
}

limpezaUrgente();
