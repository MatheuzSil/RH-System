/**
 * EXPLORAR ESTRUTURA FTP
 */

import { Client } from 'basic-ftp';

async function exploreFTP() {
  console.log('🔍 Explorando estrutura do FTP...');
  
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
    
    // Listar diretório raiz
    console.log('\n📁 Diretório raiz (/):');
    const rootList = await client.list();
    rootList.forEach(item => {
      const icon = item.type === 2 ? '📁' : '📄';
      console.log(`  ${icon} ${item.name}`);
    });
    
    // Tentar acessar public_html
    try {
      await client.cd('public_html');
      console.log('\n📁 Dentro de /public_html/:');
      
      const publicList = await client.list();
      console.log(`  Encontrados ${publicList.length} itens:`);
      publicList.slice(0, 15).forEach(item => {
        const icon = item.type === 2 ? '📁' : '📄';
        console.log(`    ${icon} ${item.name}`);
      });
      
      // Tentar criar pasta docs dentro de public_html
      try {
        await client.ensureDir('docs');
        console.log('\n✅ Pasta /public_html/docs/ criada/verificada!');
        
        // Testar upload de arquivo
        console.log('📤 Testando upload...');
        const testContent = 'Teste FTP - ' + new Date().toISOString();
        await client.uploadFrom(Buffer.from(testContent), 'docs/test.txt');
        console.log('✅ Upload de teste realizado com sucesso!');
        
        // URL do arquivo
        console.log('🌐 URL: https://grupoworklife.com.br/docs/test.txt');
        
      } catch (error) {
        console.log('❌ Erro ao criar docs:', error.message);
      }
      
    } catch (error) {
      console.log('❌ Não foi possível acessar public_html:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.close();
  }
}

exploreFTP();
