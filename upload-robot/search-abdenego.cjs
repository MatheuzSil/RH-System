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
    trustServerCertilicate: process.env.DB_TRUST_CERT === 'true'
  }
};

async function searchAbdenego() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Procurando ABDENEGO na tabela Funcionario...\n');
    
    // Buscar variações do nome ABDENEGO
    const searches = [
      '%ABDENEGO%',
      '%HENRIQUE%',
      '%SILVA%',
      '%ALBUQUERQUE%',
      '%ABDENEGO%HENRIQUE%',
      '%HENRIQUE%SILVA%',
      '%SILVA%ALBUQUERQUE%'
    ];
    
    for (const search of searches) {
      console.log(`🔎 Buscando por: ${search}`);
      const result = await sql.query(`
        SELECT Id, Nome, Cpf, Matricula, Status 
        FROM Funcionario 
        WHERE Nome LIKE '${search}' 
        ORDER BY Nome
      `);
      
      if (result.recordset.length > 0) {
        console.log(`✅ ENCONTRADO ${result.recordset.length} registro(s):`);
        console.table(result.recordset);
      } else {
        console.log(`❌ Nenhum resultado para: ${search}`);
      }
      console.log('');
    }
    
    // Também vou buscar nomes que começam com A
    console.log('🔍 Funcionários que começam com "A":');
    const aResult = await sql.query(`
      SELECT TOP 10 Id, Nome, Cpf, Matricula, Status 
      FROM Funcionario 
      WHERE Nome LIKE 'A%' 
      ORDER BY Nome
    `);
    console.table(aResult.recordset);
    
    // E vou contar todos os registros para confirmar
    const countResult = await sql.query('SELECT COUNT(*) as total FROM Funcionario');
    console.log(`📊 Total de funcionários na tabela: ${countResult.recordset[0].total}`);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

searchAbdenego();
