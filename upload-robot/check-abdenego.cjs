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

async function checkAbdenego() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Procurando ABDENEGO na tabela Arquivo...\n');
    
    // Buscar ABDENEGO
    const result = await sql.query(`
      SELECT TOP 10 Id, RegistroId, NomeOriginal, DataHoraCadastro
      FROM Arquivo 
      WHERE NomeOriginal LIKE '%abdenego%' OR NomeOriginal LIKE '%ABDENEGO%'
      ORDER BY DataHoraCadastro DESC
    `);
    
    console.log(`📋 Encontrados ${result.recordset.length} registros do ABDENEGO:`);
    console.table(result.recordset);
    
    // Também verificar se existe na tabela Funcionario
    const funcResult = await sql.query(`
      SELECT * FROM Funcionario 
      WHERE Nome LIKE '%ABDENEGO%' OR Nome LIKE '%abdenego%'
    `);
    
    console.log(`\n👤 ABDENEGO na tabela Funcionario: ${funcResult.recordset.length} registros`);
    if (funcResult.recordset.length > 0) {
      console.table(funcResult.recordset);
    }
    
    // Verificar alguns exemplos de nomes na tabela Arquivo
    console.log('\n📄 Exemplos de nomes na tabela Arquivo:');
    const samplesResult = await sql.query(`
      SELECT TOP 10 DISTINCT 
        SUBSTRING(NomeOriginal, CHARINDEX('_', NomeOriginal) + 1, 
          CHARINDEX('_', NomeOriginal, CHARINDEX('_', NomeOriginal) + 1) - CHARINDEX('_', NomeOriginal) - 1) as NomeColaborador,
        COUNT(*) as QtdArquivos
      FROM Arquivo 
      WHERE NomeOriginal LIKE '%_%_%'
      GROUP BY SUBSTRING(NomeOriginal, CHARINDEX('_', NomeOriginal) + 1, 
          CHARINDEX('_', NomeOriginal, CHARINDEX('_', NomeOriginal) + 1) - CHARINDEX('_', NomeOriginal) - 1)
      ORDER BY COUNT(*) DESC
    `);
    
    console.table(samplesResult.recordset);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

checkAbdenego();
