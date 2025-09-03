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

async function searchForAbdenego() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Procurando especificamente por ABDENEGO HENRIQUE DA SILVA ALBUQUERQUE...\n');
    
    // Buscar por partes do nome
    const searchTerms = [
      'ABDENEGO',
      'HENRIQUE DA SILVA',
      'SILVA ALBUQUERQUE',
      'ABDENEGO HENRIQUE',
      'HENRIQUE SILVA',
      'SILVA',
      'ALBUQUERQUE'
    ];
    
    for (const term of searchTerms) {
      console.log(`🔎 Buscando por: "${term}"`);
      
      const result = await sql.query(`
        SELECT Id, Nome, Cpf, Matricula, Status, BeneficiarioNome
        FROM Funcionario 
        WHERE Nome LIKE '%${term}%' 
        OR BeneficiarioNome LIKE '%${term}%'
        ORDER BY Nome
      `);
      
      if (result.recordset.length > 0) {
        console.log(`✅ ENCONTRADOS ${result.recordset.length} resultado(s) para "${term}":`);
        console.table(result.recordset);
      } else {
        console.log(`❌ Nenhum resultado para: "${term}"`);
      }
      console.log('');
    }
    
    // Contar todos os registros ativos
    console.log('📊 Contagem de funcionários por status:');
    const statusResult = await sql.query(`
      SELECT Status, COUNT(*) as total 
      FROM Funcionario 
      GROUP BY Status 
      ORDER BY total DESC
    `);
    console.table(statusResult.recordset);
    
    // Mostrar total geral
    const totalResult = await sql.query('SELECT COUNT(*) as total FROM Funcionario');
    console.log(`\n📊 TOTAL GERAL DE FUNCIONÁRIOS: ${totalResult.recordset[0].total.toLocaleString()}`);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

searchForAbdenego();
