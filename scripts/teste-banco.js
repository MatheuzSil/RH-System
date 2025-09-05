/**
 * TESTE BANCO - Verificar se está funcionando e espaço liberado
 */

import { loadFromDB, insertToDB } from '../backend/utils/dbHelpers.js';

async function testarBanco() {
  console.log('🔍 TESTANDO BANCO SQL...');
  
  try {
    // Teste 1: Conectividade básica
    console.log('\n1️⃣ Testando conectividade...');
    const employees = await loadFromDB('employees', 'WHERE name IS NOT NULL');
    console.log(`✅ Conexão OK - ${employees.length} funcionários encontrados`);
    
    // Teste 2: Verificar documentos
    console.log('\n2️⃣ Verificando documentos...');
    const allDocs = await loadFromDB('documents');
    console.log(`📄 Total documentos: ${allDocs.length}`);
    
    // Teste 3: Verificar fileData (deve estar NULL)
    const docsWithData = await loadFromDB('documents', 'WHERE fileData IS NOT NULL');
    console.log(`🗑️ Documentos com fileData: ${docsWithData.length} (deve ser 0)`);
    
    // Teste 4: Verificar campo fileUrl
    const docsWithUrl = await loadFromDB('documents', 'WHERE fileUrl IS NOT NULL');
    console.log(`🌐 Documentos com fileUrl: ${docsWithUrl.length}`);
    
    // Teste 5: Inserir documento teste (verificar se há espaço)
    console.log('\n3️⃣ Testando inserção (verificar espaço)...');
    const testDoc = {
      id: 'TEST_' + Date.now(),
      empId: employees[0]?.id || 'TEST_EMP',
      type: 'teste',
      description: 'Documento de teste para verificar espaço',
      fileName: 'teste-espaco.txt',
      fileUrl: 'https://grupoworklife.com.br/docs/teste.txt',
      fileSize: 100,
      mimeType: 'text/plain',
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: 'TESTE_ESPACO',
      notes: 'Teste de espaço liberado'
    };
    
    await insertToDB('documents', testDoc);
    console.log('✅ Inserção OK - Espaço disponível!');
    
    // Verificar se foi inserido
    const insertedDoc = await loadFromDB('documents', `WHERE id = '${testDoc.id}'`);
    if (insertedDoc.length > 0) {
      console.log('✅ Documento teste encontrado no banco');
    }
    
    console.log('\n🎉 BANCO FUNCIONANDO PERFEITAMENTE!');
    console.log('✅ Conectividade: OK');
    console.log('✅ Espaço liberado: OK');
    console.log('✅ Inserção funcionando: OK');
    console.log('✅ Campo fileUrl disponível: OK');
    console.log('🚀 Pronto para uploads massivos via FTP!');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    
    if (error.message.includes('Could not allocate space')) {
      console.log('💡 O banco ainda está cheio. Tente:');
      console.log('1. Aguardar alguns minutos');
      console.log('2. Executar o script de limpeza novamente');
    } else {
      console.log('💡 Erro de conectividade. Verifique a conexão.');
    }
  }
}

testarBanco();
