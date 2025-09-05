import { loadFromDB } from './utils/dbHelpers.js';

async function checkDocuments() {
  console.log('🔍 VERIFICANDO DOCUMENTOS NO BANCO...');
  console.log('=' .repeat(50));
  
  try {
    // Verificar total de documentos
    const docs = await loadFromDB('documents');
    console.log(`📊 Total documentos no banco: ${docs.length}`);
    
    if (docs.length > 0) {
      console.log('\n📋 Últimos 5 documentos inseridos:');
      docs.slice(-5).forEach((doc, i) => {
        console.log(`${i+1}. ${doc.fileName}`);
        console.log(`   Funcionário ID: ${doc.empId}`);
        console.log(`   Tipo: ${doc.type}`);
        console.log(`   Data Upload: ${doc.uploadDate}`);
        console.log(`   Tamanho: ${doc.fileSize} bytes`);
        console.log('   ---');
      });
      
      // Verificar se tem documento específico do Abdenego
      const abdenegoDoc = docs.find(doc => 
        doc.fileName.toLowerCase().includes('abdenego') || 
        doc.description.toLowerCase().includes('abdenego')
      );
      
      if (abdenegoDoc) {
        console.log('\n🎯 DOCUMENTO DO ABDENEGO ENCONTRADO:');
        console.log(`   Arquivo: ${abdenegoDoc.fileName}`);
        console.log(`   Funcionário ID: ${abdenegoDoc.empId}`);
        console.log(`   Tipo: ${abdenegoDoc.type}`);
        console.log(`   Data: ${abdenegoDoc.uploadDate}`);
      } else {
        console.log('\n⚠️ Nenhum documento específico do Abdenego encontrado');
      }
    } else {
      console.log('\n❌ Nenhum documento encontrado no banco');
    }
    
  } catch (error) {
    console.error('\n💥 ERRO ao verificar documentos:', error.message);
  }
}

checkDocuments();
