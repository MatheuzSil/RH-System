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

async function checkMarhEmployeesTable() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Verificando EXATAMENTE qual tabela usar...\n');
    
    console.log('📋 1. TABELA marh_employees:');
    console.log('==================================');
    
    try {
      // Verificar se existe marh_employees
      const marhEmployeesCount = await sql.query('SELECT COUNT(*) as total FROM marh_employees');
      console.log(`   Total de registros: ${marhEmployeesCount.recordset[0].total.toLocaleString()}`);
      
      // Verificar colunas
      const marhEmployeesColumns = await sql.query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'marh_employees'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('   📝 Colunas:');
      marhEmployeesColumns.recordset.forEach(col => {
        console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
      
      // Mostrar dados de exemplo
      const marhEmployeesSample = await sql.query('SELECT TOP 3 * FROM marh_employees');
      console.log('\n   📄 Dados de exemplo:');
      console.table(marhEmployeesSample.recordset);
      
    } catch (err) {
      console.log(`   ❌ Erro: ${err.message}`);
    }
    
    console.log('\n📋 2. TABELA Funcionario:');
    console.log('==================================');
    
    try {
      // Verificar Funcionario
      const funcionarioCount = await sql.query('SELECT COUNT(*) as total FROM Funcionario');
      console.log(`   Total de registros: ${funcionarioCount.recordset[0].total.toLocaleString()}`);
      
      // Verificar colunas
      const funcionarioColumns = await sql.query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Funcionario'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('   📝 Colunas:');
      funcionarioColumns.recordset.forEach(col => {
        console.log(`      - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
      
      // Mostrar dados de exemplo
      const funcionarioSample = await sql.query('SELECT TOP 3 Id, Nome, Cpf, Matricula, Status FROM Funcionario WHERE Nome IS NOT NULL');
      console.log('\n   📄 Dados de exemplo:');
      console.table(funcionarioSample.recordset);
      
    } catch (err) {
      console.log(`   ❌ Erro: ${err.message}`);
    }
    
    console.log('\n🎯 CONCLUSÃO:');
    console.log('================');
    console.log('Qual tabela o robô DEVERIA usar?');
    
  } catch (err) {
    console.error('❌ Erro geral:', err.message);
  } finally {
    await sql.close();
  }
}

checkMarhEmployeesTable();
