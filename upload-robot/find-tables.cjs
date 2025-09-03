require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  }
};

async function findAllTables() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Procurando todas as tabelas com muitos registros...\n');
    
    // Listar todas as tabelas do banco
    const tablesResult = await sql.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log(`📊 Encontradas ${tablesResult.recordset.length} tabelas. Verificando registros:\n`);
    
    // Para cada tabela, contar registros
    for (const table of tablesResult.recordset) {
      try {
        const countResult = await sql.query(`SELECT COUNT(*) as total FROM [${table.TABLE_NAME}]`);
        const count = countResult.recordset[0].total;
        
        if (count > 1000) { // Só mostrar tabelas com mais de 1000 registros
          console.log(`📋 ${table.TABLE_NAME}: ${count.toLocaleString()} registros`);
          
          // Se tem mais de 20 mil, vamos ver a estrutura
          if (count > 20000) {
            console.log(`   🎯 CANDIDATA! Verificando estrutura...`);
            const structureResult = await sql.query(`
              SELECT TOP 1 * FROM [${table.TABLE_NAME}]
            `);
            if (structureResult.recordset.length > 0) {
              const columns = Object.keys(structureResult.recordset[0]);
              console.log(`   📝 Colunas: ${columns.join(', ')}`);
              
              // Verificar se tem campos que podem ser nome
              const nameFields = columns.filter(col => 
                col.toLowerCase().includes('nome') || 
                col.toLowerCase().includes('name') ||
                col.toLowerCase().includes('funcionario') ||
                col.toLowerCase().includes('colaborador')
              );
              if (nameFields.length > 0) {
                console.log(`   👤 Campos de nome encontrados: ${nameFields.join(', ')}`);
                
                // Mostrar alguns registros de exemplo
                const sampleResult = await sql.query(`
                  SELECT TOP 3 ${nameFields.join(', ')} FROM [${table.TABLE_NAME}]
                  WHERE ${nameFields[0]} IS NOT NULL
                `);
                console.log('   📄 Exemplos:');
                console.table(sampleResult.recordset);
              }
            }
            console.log('');
          }
        }
      } catch (err) {
        // Ignorar erros de acesso a tabelas específicas
      }
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

findAllTables();
