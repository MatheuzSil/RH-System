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

async function checkMarhEmployees() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Verificando tabela marh_employees...\n');
    
    // Contar total
    const countResult = await sql.query('SELECT COUNT(*) as total FROM marh_employees');
    console.log(`📊 Total de registros: ${countResult.recordset[0].total.toLocaleString()}`);
    
    // Verificar estrutura
    const columnsResult = await sql.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'marh_employees'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📝 Colunas da tabela marh_employees:');
    console.table(columnsResult.recordset);
    
    // Mostrar alguns dados de exemplo
    console.log('\n📄 Exemplos de dados:');
    const sampleResult = await sql.query('SELECT TOP 5 * FROM marh_employees');
    console.table(sampleResult.recordset);
    
    // Buscar por ABDENEGO
    console.log('\n🔍 Buscando ABDENEGO...');
    const abdenegoResult = await sql.query(`
      SELECT * FROM marh_employees 
      WHERE nome LIKE '%ABDENEGO%' 
      OR nome LIKE '%HENRIQUE%SILVA%ALBUQUERQUE%'
    `);
    
    if (abdenegoResult.recordset.length > 0) {
      console.log('✅ ABDENEGO ENCONTRADO!');
      console.table(abdenegoResult.recordset);
    } else {
      console.log('❌ ABDENEGO não encontrado');
      
      // Vamos ver se temos nomes parecidos
      console.log('\n🔍 Buscando nomes que começam com A...');
      const aResult = await sql.query(`
        SELECT TOP 10 * FROM marh_employees 
        WHERE nome LIKE 'A%' 
        ORDER BY nome
      `);
      console.table(aResult.recordset);
    }
    
    // Verificar status distintos
    console.log('\n📊 Status distintos na tabela:');
    const statusResult = await sql.query(`
      SELECT status, COUNT(*) as count 
      FROM marh_employees 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.table(statusResult.recordset);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

checkMarhEmployees();
