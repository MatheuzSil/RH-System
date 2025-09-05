/**
 * EXPLORAR ESTRUTURA FTP
 * Script para ver a estrutura de pastas do FTP
 */

import { Client } from 'basic-ftp';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function exploreFTP() {
  console.log('🔍 Explorando estrutura do FTP...');
  
  const client = new Client();
  
  try {
    await client.access({
      host: 'ftp.grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife',
      password: 'Marh542165@@', // senha que funcionou
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
    
    // Procurar por pastas comuns para web
    const commonPaths = ['public_html', 'www', 'httpdocs', 'html', 'web'];
    
    for (const path of commonPaths) {
      try {
        await client.cd(path);
        console.log(`\n📁 Encontrou pasta: /${path}/`);
        
        const list = await client.list();
        console.log(`  Conteúdo (${list.length} itens):`);
        list.slice(0, 10).forEach(item => {
          const icon = item.type === 2 ? '📁' : '📄';
          console.log(`    ${icon} ${item.name}`);
        });
        
        // Voltar para raiz
        await client.cd('/');
        break;
        
      } catch (error) {
        console.log(`  ❌ /${path}/ não existe`);
      }
    }
    
    // Tentar criar pasta docs diretamente na raiz
    try {
      await client.ensureDir('/docs');
      console.log('\n✅ Pasta /docs/ criada/verificada na raiz');
    } catch (error) {
      console.log('\n❌ Não foi possível criar /docs/ na raiz:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.close();
  }
}

exploreFTP();
