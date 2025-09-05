/**
 * DEBUG FTP - Verificar configurações
 */

import dotenv from 'dotenv';
import { Client } from 'basic-ftp';

// Carregar .env
dotenv.config();

console.log('🔍 DEBUG FTP CONFIGURAÇÕES:');
console.log('FTP_PASSWORD definida:', !!process.env.FTP_PASSWORD);
console.log('Tamanho da senha:', process.env.FTP_PASSWORD?.length || 0);
console.log('Primeiros 3 caracteres:', process.env.FTP_PASSWORD?.substring(0, 3) || 'N/A');

// Teste manual
const client = new Client();
client.ftp.verbose = true;

async function testManual() {
  try {
    console.log('\n🧪 Testando conexão manual...');
    
    await client.access({
      host: 'ftp.grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife',
      password: process.env.FTP_PASSWORD,
      secure: false
    });
    
    console.log('✅ Conectado!');
    console.log('📁 Listando diretórios...');
    
    const list = await client.list();
    console.log(`Encontrados ${list.length} itens:`);
    list.slice(0, 10).forEach(item => {
      console.log(`  ${item.type === 1 ? '📁' : '📄'} ${item.name}`);
    });
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
    
    // Sugestões
    console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Verifique a senha no painel de controle da hospedagem');
    console.log('2. Tente resetar a senha FTP');
    console.log('3. Verifique se o usuário FTP está ativo');
    console.log('4. Confirme se não há bloqueio de IP');
    
  } finally {
    client.close();
  }
}

testManual();
