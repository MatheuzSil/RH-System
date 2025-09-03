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

async function checkNames() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Verificando nomes de colaboradores...\n');
    
    // Pegar uma amostra de nomes originais
    const result = await sql.query(`
      SELECT TOP 20 NomeOriginal
      FROM Arquivo 
      WHERE NomeOriginal IS NOT NULL
      AND NomeOriginal LIKE '%-%'
      ORDER BY Id DESC
    `);
    
    console.log(`📋 Exemplos de nomes na tabela Arquivo:`);
    result.recordset.forEach((row, index) => {
      console.log(`${index + 1}. ${row.NomeOriginal}`);
    });
    
    // Verificar se existem PDFs do tipo que você colocou
    const pdfResult = await sql.query(`
      SELECT TOP 10 NomeOriginal
      FROM Arquivo 
      WHERE NomeOriginal LIKE '%abdenego%' 
      OR NomeOriginal LIKE '%ABDENEGO%'
      OR NomeOriginal LIKE '%henrique%'
      OR NomeOriginal LIKE '%HENRIQUE%'
      OR NomeOriginal LIKE '%silva%'
      OR NomeOriginal LIKE '%SILVA%'
      OR NomeOriginal LIKE '%albuquerque%'
      OR NomeOriginal LIKE '%ALBUQUERQUE%'
    `);
    
    console.log(`\n🔍 Procurando por partes do nome ABDENEGO HENRIQUE DA SILVA ALBUQUERQUE:`);
    console.log(`Encontrados ${pdfResult.recordset.length} registros:`);
    pdfResult.recordset.forEach((row, index) => {
      console.log(`${index + 1}. ${row.NomeOriginal}`);
    });
    
    // Mostrar todos os nomes únicos de colaboradores (extraindo do padrão)
    const uniqueNames = await sql.query(`
      SELECT TOP 50 NomeOriginal, COUNT(*) as Quantidade
      FROM Arquivo 
      WHERE NomeOriginal IS NOT NULL
      GROUP BY NomeOriginal
      ORDER BY COUNT(*) DESC
    `);
    
    console.log(`\n📊 Nomes mais frequentes:`);
    uniqueNames.recordset.slice(0, 10).forEach((row, index) => {
      console.log(`${index + 1}. ${row.NomeOriginal} (${row.Quantidade} arquivos)`);
    });
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

checkNames();
