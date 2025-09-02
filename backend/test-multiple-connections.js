import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const configs = [
  // Configuração 1 - Servidor principal
  {
    name: "Servidor Principal (sqlserver.grupoworklife.com.br)",
    server: "sqlserver.grupoworklife.com.br",
    database: "grupoworklife",
    user: "grupoworklife",
    password: process.env.DB_PASSWORD,
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 15000,
      requestTimeout: 15000
    }
  },
  
  // Configuração 2 - Servidor alternativo
  {
    name: "Servidor Alternativo (websql3.internetbrasil.net)",
    server: "websql3.internetbrasil.net",
    database: "grupoworklife",
    user: "grupoworklife",
    password: process.env.DB_PASSWORD,
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 15000,
      requestTimeout: 15000
    }
  },
  
  // Configuração 3 - Principal com encrypt
  {
    name: "Principal com Encrypt",
    server: "sqlserver.grupoworklife.com.br",
    database: "grupoworklife",
    user: "grupoworklife",
    password: process.env.DB_PASSWORD,
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 15000,
      requestTimeout: 15000
    }
  },
  
  // Configuração 4 - Alternativo com encrypt
  {
    name: "Alternativo com Encrypt",
    server: "websql3.internetbrasil.net",
    database: "grupoworklife",
    user: "grupoworklife",
    password: process.env.DB_PASSWORD,
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 15000,
      requestTimeout: 15000
    }
  },

  // Configuração 5 - Porta diferente
  {
    name: "Principal porta 14330",
    server: "sqlserver.grupoworklife.com.br",
    database: "grupoworklife",
    user: "grupoworklife",
    password: process.env.DB_PASSWORD,
    port: 14330,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 15000,
      requestTimeout: 15000
    }
  }
];

async function testConfigurations() {
  console.log('🔍 Testando múltiplas configurações de conexão...\n');
  
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`📋 ${i + 1}. ${config.name}:`);
    console.log(`   Server: ${config.server}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user || 'Windows Auth'}`);
    console.log(`   Encrypt: ${config.options.encrypt}`);
    
    try {
      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      
      console.log('   ✅ SUCESSO! Conectado');
      
      // Teste uma query
      const result = await pool.request().query('SELECT GETDATE() as currentDate, DB_NAME() as databaseName');
      console.log(`   📅 Data: ${result.recordset[0].currentDate}`);
      console.log(`   🗃️  Database: ${result.recordset[0].databaseName}`);
      
      await pool.close();
      console.log('   🎉 Esta configuração funciona!\n');
      
      // Salvar configuração que funcionou
      console.log('💾 Salvando configuração que funcionou no .env...');
      return config;
      
    } catch (error) {
      console.log(`   ❌ ERRO: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('😞 Nenhuma configuração funcionou. Possíveis problemas:');
  console.log('   - Servidor não está rodando');
  console.log('   - Credenciais incorretas');
  console.log('   - Firewall bloqueando');
  console.log('   - Database não existe');
  console.log('   - Precisa de VPN ou acesso especial');
  
  return null;
}

testConfigurations()
  .then(workingConfig => {
    if (workingConfig) {
      console.log('\n🎯 Use esta configuração no seu .env:');
      console.log(`DB_SERVER=${workingConfig.server}`);
      console.log(`DB_NAME=${workingConfig.database}`);
      console.log(`DB_USER=${workingConfig.user || ''}`);
      console.log(`DB_ENCRYPT=${workingConfig.options.encrypt}`);
      console.log(`DB_TRUST_CERT=${workingConfig.options.trustServerCertificate}`);
    }
  })
  .catch(error => {
    console.error('❌ Erro geral:', error);
  });
