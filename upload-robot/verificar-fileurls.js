/**
 * SCRIPT: Verificar se os fileUrls estão sendo criados corretamente
 */

import sql from 'mssql';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function verificarFileUrls() {
  let pool;
  
  try {
    console.log('🔌 Conectando ao SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Conectado!');

    // Verificar documentos com fileUrl (mais recentes)
    console.log('\n📋 ÚLTIMOS DOCUMENTOS COM FILEURL:');
    console.log('=' .repeat(80));
    
    const result = await pool.request().query(`
      SELECT TOP 10 
        d.id,
        d.fileName,
        d.fileUrl,
        d.uploadDate,
        d.fileSize,
        e.name as employeeName,
        e.id as employeeId
      FROM marh_documents d
      LEFT JOIN marh_employees e ON d.employeeId = e.id
      WHERE d.fileUrl IS NOT NULL
      ORDER BY d.uploadDate DESC
    `);

    if (result.recordset.length === 0) {
      console.log('❌ Nenhum documento com fileUrl encontrado!');
      return;
    }

    result.recordset.forEach((doc, index) => {
      console.log(`\n${index + 1}. 📄 ${doc.fileName}`);
      console.log(`   👤 Colaborador: ${doc.employeeName} (ID: ${doc.employeeId})`);
      console.log(`   🔗 URL: ${doc.fileUrl}`);
      console.log(`   📅 Upload: ${doc.uploadDate}`);
      console.log(`   💾 Tamanho: ${(doc.fileSize / 1024).toFixed(1)} KB`);
    });

    // Estatísticas gerais
    console.log('\n📊 ESTATÍSTICAS GERAIS:');
    console.log('=' .repeat(80));
    
    const stats = await pool.request().query(`
      SELECT 
        COUNT(*) as totalDocs,
        COUNT(CASE WHEN fileUrl IS NOT NULL THEN 1 END) as docsComUrl,
        COUNT(CASE WHEN fileData IS NOT NULL THEN 1 END) as docsComData,
        SUM(CASE WHEN fileUrl IS NOT NULL THEN fileSize ELSE 0 END) as sizeComUrl,
        SUM(CASE WHEN fileData IS NOT NULL THEN DATALENGTH(fileData) ELSE 0 END) as sizeComData
      FROM marh_documents
    `);

    const stat = stats.recordset[0];
    console.log(`📄 Total de documentos: ${stat.totalDocs}`);
    console.log(`🔗 Com fileUrl: ${stat.docsComUrl}`);
    console.log(`💾 Com fileData: ${stat.docsComData}`);
    console.log(`📊 Tamanho total (URLs): ${(stat.sizeComUrl / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Tamanho total (Blobs): ${(stat.sizeComData / 1024 / 1024).toFixed(2)} MB`);

    // Verificar se os colaboradores foram associados corretamente
    console.log('\n👥 VERIFICAÇÃO DE ASSOCIAÇÕES:');
    console.log('=' .repeat(80));
    
    const associations = await pool.request().query(`
      SELECT 
        e.name as employeeName,
        COUNT(d.id) as totalDocs
      FROM marh_employees e
      LEFT JOIN marh_documents d ON e.id = d.employeeId AND d.fileUrl IS NOT NULL
      GROUP BY e.id, e.name
      HAVING COUNT(d.id) > 0
      ORDER BY COUNT(d.id) DESC
    `);

    console.log(`✅ ${associations.recordset.length} colaboradores têm documentos com fileUrl`);
    
    if (associations.recordset.length > 0) {
      console.log('\nTop 5 colaboradores com mais documentos:');
      associations.recordset.slice(0, 5).forEach((emp, index) => {
        console.log(`${index + 1}. ${emp.employeeName}: ${emp.totalDocs} documentos`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🧹 Conexão fechada');
    }
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  verificarFileUrls();
}
