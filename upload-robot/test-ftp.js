/**
 * TESTE DE CONEXÃO FTP
 * Script para testar se a conexão FTP está funcionando
 */

import { FTPUploader } from './lib/ftpUploader.js';
import fs from 'fs-extra';

async function testFTP() {
  console.log('🧪 Testando conexão FTP...');
  
  const uploader = new FTPUploader();
  
  try {
    // Testar conexão
    await uploader.connect();
    console.log('✅ Conexão FTP estabelecida com sucesso!');
    
    // Criar arquivo de teste
    const testFile = './test-file.txt';
    await fs.writeFile(testFile, 'Teste de upload FTP - ' + new Date().toISOString());
    
    // Testar upload
    const result = await uploader.uploadFile(testFile, 'TEST001', 'test-file.txt');
    console.log('✅ Upload de teste realizado:', result.url);
    
    // Limpar arquivo de teste
    await fs.remove(testFile);
    
  } catch (error) {
    console.error('❌ Erro no teste FTP:', error.message);
  } finally {
    await uploader.disconnect();
  }
}

testFTP();
