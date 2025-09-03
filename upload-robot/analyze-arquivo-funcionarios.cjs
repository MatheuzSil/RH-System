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

async function analyzeArquivoTable() {
  try {
    await sql.connect(dbConfig);
    
    console.log('🔍 Analisando se a tabela Arquivo tem TODOS os funcionários...\n');
    
    // 1. Contar funcionários únicos na tabela Arquivo
    console.log('📊 1. Funcionários únicos na tabela Arquivo (pelo RegistroId):');
    const uniqueEmployeesArquivo = await sql.query(`
      SELECT COUNT(DISTINCT RegistroId) as funcionarios_unicos
      FROM Arquivo 
      WHERE RegistroId IS NOT NULL
    `);
    console.log(`   Funcionários únicos no Arquivo: ${uniqueEmployeesArquivo.recordset[0].funcionarios_unicos.toLocaleString()}`);
    
    // 2. Total de funcionários na tabela Funcionario
    console.log('\n📊 2. Total de funcionários na tabela Funcionario:');
    const totalFuncionarios = await sql.query('SELECT COUNT(*) as total FROM Funcionario');
    console.log(`   Total na tabela Funcionario: ${totalFuncionarios.recordset[0].total.toLocaleString()}`);
    
    // 3. Comparar: quantos funcionários da tabela Funcionario têm documentos na tabela Arquivo
    console.log('\n📊 3. Funcionários que têm documentos (JOIN):');
    const funcionariosComDocumentos = await sql.query(`
      SELECT COUNT(DISTINCT f.Id) as funcionarios_com_documentos
      FROM Funcionario f
      INNER JOIN Arquivo a ON f.Id = a.RegistroId
    `);
    console.log(`   Funcionários com documentos: ${funcionariosComDocumentos.recordset[0].funcionarios_com_documentos.toLocaleString()}`);
    
    // 4. Funcionários SEM documentos
    console.log('\n📊 4. Funcionários SEM documentos:');
    const funcionariosSemDocumentos = await sql.query(`
      SELECT COUNT(*) as funcionarios_sem_documentos
      FROM Funcionario f
      LEFT JOIN Arquivo a ON f.Id = a.RegistroId
      WHERE a.RegistroId IS NULL
    `);
    console.log(`   Funcionários SEM documentos: ${funcionariosSemDocumentos.recordset[0].funcionarios_sem_documentos.toLocaleString()}`);
    
    // 5. Mostrar alguns funcionários sem documentos
    console.log('\n👤 5. Exemplos de funcionários SEM documentos:');
    const exemplosSemDocumentos = await sql.query(`
      SELECT TOP 10 f.Id, f.Nome, f.Matricula, f.Status
      FROM Funcionario f
      LEFT JOIN Arquivo a ON f.Id = a.RegistroId
      WHERE a.RegistroId IS NULL
      ORDER BY f.Nome
    `);
    console.table(exemplosSemDocumentos.recordset);
    
    // 6. Verificar se ABDENEGO está na tabela Arquivo
    console.log('\n🔍 6. Buscando ABDENEGO na tabela Arquivo:');
    const abdenegoArquivo = await sql.query(`
      SELECT DISTINCT NomeOriginal 
      FROM Arquivo 
      WHERE NomeOriginal LIKE '%ABDENEGO%'
      OR NomeOriginal LIKE '%HENRIQUE%SILVA%ALBUQUERQUE%'
    `);
    
    if (abdenegoArquivo.recordset.length > 0) {
      console.log('✅ ABDENEGO encontrado nos documentos:');
      console.table(abdenegoArquivo.recordset);
    } else {
      console.log('❌ ABDENEGO NÃO encontrado nos documentos');
    }
    
    // 7. Extrair funcionários únicos do NomeOriginal da tabela Arquivo
    console.log('\n📋 7. Funcionários extraídos dos nomes dos arquivos:');
    const nomesArquivos = await sql.query(`
      SELECT DISTINCT 
        CASE 
          WHEN CHARINDEX('_', NomeOriginal, CHARINDEX('_', NomeOriginal) + 1) > 0 
          THEN SUBSTRING(NomeOriginal, 
                        CHARINDEX('_', NomeOriginal) + 1, 
                        CHARINDEX('_', NomeOriginal, CHARINDEX('_', NomeOriginal) + 1) - CHARINDEX('_', NomeOriginal) - 1)
          ELSE NULL
        END as nome_extraido
      FROM Arquivo 
      WHERE NomeOriginal IS NOT NULL 
      AND NomeOriginal LIKE '%_%_%'
    `);
    
    const nomesLimpos = nomesArquivos.recordset
      .map(r => r.nome_extraido)
      .filter(nome => nome && nome.length > 3)
      .slice(0, 20); // Primeiros 20
    
    console.log('   Exemplos de nomes extraídos dos arquivos:');
    nomesLimpos.forEach((nome, i) => console.log(`   ${i+1}. ${nome}`));
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await sql.close();
  }
}

analyzeArquivoTable();
