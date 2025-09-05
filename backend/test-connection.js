import { getConnection, closeConnection } from './config/database.js';

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com SQL Server...');
    
    const pool = await getConnection();
    console.log('✅ Conectado com sucesso!');
    
    // Testar uma query simples
    const result = await pool.request().query('SELECT GETDATE() as currentDate, @@VERSION as version');
    console.log('📅 Data atual do servidor:', result.recordset[0].currentDate);
    console.log('🔢 Versão do SQL Server:', result.recordset[0].version.split('\n')[0]);
    
    // Testar se as tabelas existem (opcional)
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    if (tablesResult.recordset.length > 0) {
      console.log('📋 Tabelas encontradas:');
      tablesResult.recordset.forEach(table => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
    } else {
      console.log('⚠️  Nenhuma tabela encontrada. Execute o schema.sql primeiro.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('🔧 Verifique:');
    console.error('   - Se o servidor SQL Server está rodando');
    console.error('   - Se as credenciais estão corretas');
    console.error('   - Se o banco "grupoworklife" existe');
    console.error('   - Se a conexão de rede está funcionando');
  } finally {
    await closeConnection();
  }
}

testConnection();
