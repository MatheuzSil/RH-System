/**
 * TESTE SIMPLES FTP
 */

import { Client } from 'basic-ftp';

const client = new Client();
client.ftp.verbose = true;

async function test() {
  try {
    console.log('Conectando...');
    await client.access({
      host: 'ftp.grupoworklife.com.br',
      user: 'grupoworklife', 
      password: 'Marh542165@@'
    });
    
    console.log('✅ Conectado! Listando raiz...');
    const list = await client.list();
    list.forEach(item => console.log(`${item.type === 2 ? '📁' : '📄'} ${item.name}`));
    
    // Testar se public_html existe
    try {
      await client.cd('public_html');
      console.log('✅ public_html existe!');
      
      // Tentar criar pasta docs
      try {
        await client.ensureDir('docs');
        console.log('✅ pasta docs criada/existe em public_html');
      } catch (e) {
        console.log('❌ erro ao criar docs:', e.message);
      }
      
    } catch (e) {
      console.log('❌ public_html não existe:', e.message);
    }
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  } finally {
    client.close();
  }
}

test();
