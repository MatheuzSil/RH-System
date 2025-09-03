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

async function checkStatus() {
  try {
    await sql.connect(dbConfig);
    
    console.log('📊 Verificando valores de Status na tabela Funcionario...');
    const statusResult = await sql.query('SELECT DISTINCT Status, COUNT(*) as count FROM Funcionario GROUP BY Status');
    console.log('Status disponíveis:');
    console.table(statusResult.recordset);
    
    // Verificar se existe ABDENEGO
    const abdenegoResult = await sql.query("SELECT * FROM Funcionario WHERE Nome LIKE '%ABDENEGO%'");
    console.log('\nBusca por ABDENEGO:');
    console.table(abdenegoResult.recordset);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

checkStatus();
