/**
 * TESTE DETALHADO DE FTP
 * Script para testar diferentes configurações FTP
 */

import { Client } from 'basic-ftp';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function testFTPConfigurations() {
  console.log('🧪 Testando diferentes configurações FTP...');
  
  const configurations = [
    {
      name: "Configuração 1: grupoworklife.com.br",
      host: 'grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife',
      password: process.env.FTP_PASSWORD
    },
    {
      name: "Configuração 2: ftp.grupoworklife.com.br", 
      host: 'ftp.grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife',
      password: process.env.FTP_PASSWORD
    },
    {
      name: "Configuração 3: grupoworklife.com.br com usuário completo",
      host: 'grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife@grupoworklife.com.br',
      password: process.env.FTP_PASSWORD
    }
  ];

  for (const config of configurations) {
    console.log(`\n🔧 Testando: ${config.name}`);
    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`User: ${config.user}`);
    console.log(`Password: ${config.password ? '***configurada***' : '❌ NÃO CONFIGURADA'}`);
    
    if (!config.password) {
      console.log('⚠️ Pulando teste - senha não configurada');
      continue;
    }

    const client = new Client();
    client.ftp.verbose = true;
    
    try {
      await client.access({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        secure: false
      });
      
      console.log('✅ CONEXÃO FUNCIONOU!');
      
      // Testar listagem de diretórios
      const list = await client.list();
      console.log(`📁 Diretórios encontrados: ${list.length}`);
      list.slice(0, 5).forEach(item => {
        console.log(`  - ${item.name} (${item.type})`);
      });
      
      client.close();
      break; // Parar no primeiro que funcionar
      
    } catch (error) {
      console.log(`❌ Falhou: ${error.message}`);
      client.close();
    }
  }
}

testFTPConfigurations();
