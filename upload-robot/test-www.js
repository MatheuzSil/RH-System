/**
 * TESTE WWW
 */

import { Client } from 'basic-ftp';

async function testWWW() {
  console.log('🔍 Testando pasta www...');
  
  const client = new Client();
  
  try {
    await client.access({
      host: 'ftp.grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife',
      password: 'P14vv4WP]Fnr',
      secure: false
    });
    
    console.log('✅ Conectado!');
    
    // Acessar www
    await client.cd('www');
    console.log('✅ Acesso a /www/ funcionou!');
    
    // Listar conteúdo
    const wwwList = await client.list();
    console.log(`📁 Conteúdo de /www/ (${wwwList.length} itens):`);
    wwwList.slice(0, 10).forEach(item => {
      const icon = item.type === 2 ? '📁' : '📄';
      console.log(`  ${icon} ${item.name}`);
    });
    
    // Tentar criar pasta docs
    try {
      await client.ensureDir('docs');
      console.log('✅ Pasta /www/docs/ criada/verificada!');
      
      // Testar upload
      const testContent = 'Teste FTP WWW - ' + new Date().toISOString();
      await client.uploadFrom(Buffer.from(testContent), 'docs/test-www.txt');
      console.log('✅ Upload teste realizado!');
      console.log('🌐 URL: https://grupoworklife.com.br/docs/test-www.txt');
      
    } catch (error) {
      console.log('❌ Erro ao criar/usar docs:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.close();
  }
}

testWWW();
