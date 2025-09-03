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

async function findRealEmployeeTable() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Procurando a TABELA REAL com 23mil funcionários...\n');
    
    // Primeiro listar todas as tabelas e contar registros
    const tablesResult = await sql.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log(`📊 Verificando ${tablesResult.recordset.length} tabelas...\n`);
    
    const bigTables = [];
    
    for (const table of tablesResult.recordset) {
      try {
        const tableName = table.TABLE_NAME;
        const countResult = await sql.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const count = countResult.recordset[0].total;
        
        if (count > 1000) { // Tabelas com mais de 1000 registros
          bigTables.push({ name: tableName, count: count });
        }
      } catch (err) {
        // Ignorar tabelas com erro
      }
    }
    
    // Ordenar por número de registros
    bigTables.sort((a, b) => b.count - a.count);
    
    console.log('📋 Tabelas com mais de 1000 registros:');
    bigTables.forEach(table => {
      console.log(`   ${table.name}: ${table.count.toLocaleString()} registros`);
    });
    
    console.log('\n🔍 Verificando as maiores tabelas em busca de funcionários...\n');
    
    // Verificar as 5 maiores tabelas
    for (let i = 0; i < Math.min(5, bigTables.length); i++) {
      const table = bigTables[i];
      console.log(`🔎 Analisando ${table.name} (${table.count.toLocaleString()} registros):`);
      
      try {
        // Verificar colunas
        const columnsResult = await sql.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${table.name}'
          ORDER BY ORDINAL_POSITION
        `);
        
        const columns = columnsResult.recordset.map(c => c.COLUMN_NAME);
        console.log(`   📝 Colunas: ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`);
        
        // Verificar se tem colunas típicas de funcionário
        const employeeColumns = ['nome', 'name', 'cpf', 'matricula', 'chapa', 'funcionario'];
        const hasEmployeeColumns = employeeColumns.some(col => 
          columns.some(c => c.toLowerCase().includes(col))
        );
        
        if (hasEmployeeColumns) {
          console.log(`   🎯 POSSÍVEL TABELA DE FUNCIONÁRIOS! Colunas relacionadas encontradas.`);
          
          // Mostrar alguns dados
          const sampleResult = await sql.query(`SELECT TOP 2 * FROM ${table.name}`);
          if (sampleResult.recordset.length > 0) {
            console.log(`   📄 Amostra:`);
            console.table(sampleResult.recordset);
            
            // Buscar por ABDENEGO nesta tabela
            for (const col of columns) {
              if (col.toLowerCase().includes('nome') || col.toLowerCase().includes('name')) {
                try {
                  const searchResult = await sql.query(`
                    SELECT TOP 3 * FROM ${table.name} 
                    WHERE ${col} LIKE '%ABDENEGO%' 
                    OR ${col} LIKE '%HENRIQUE%'
                  `);
                  if (searchResult.recordset.length > 0) {
                    console.log(`   ✅ ABDENEGO ENCONTRADO na coluna ${col}!`);
                    console.table(searchResult.recordset);
                  }
                } catch (searchErr) {
                  // Ignorar erro de busca
                }
              }
            }
          }
        } else {
          console.log(`   ❌ Não parece ser tabela de funcionários.`);
        }
        
      } catch (err) {
        console.log(`   ❌ Erro ao analisar: ${err.message}`);
      }
      
      console.log('');
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

findRealEmployeeTable();
