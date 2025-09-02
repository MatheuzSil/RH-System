// Script para testar se está usando SQL Server
console.log('🔍 Testando se backend está usando SQL Server...\n');

async function testSQLConnection() {
  try {
    // Testar endpoint de usuários
    const response = await fetch('http://SEU_SERVIDOR/api/users', {
      headers: {
        'Authorization': 'Bearer SEU_TOKEN_AQUI'
      }
    });
    
    if (response.ok) {
      const users = await response.json();
      console.log(`✅ Usuários encontrados: ${users.length}`);
      console.log('📊 Dados dos usuários:');
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.role})`);
      });
    } else {
      console.log(`❌ Erro na API: ${response.status}`);
    }

    // Testar logs para ver se está gravando no SQL
    const logsResponse = await fetch('http://SEU_SERVIDOR/api/logs', {
      headers: {
        'Authorization': 'Bearer SEU_TOKEN_AQUI'  
      }
    });
    
    if (logsResponse.ok) {
      const logs = await logsResponse.json();
      console.log(`\n📋 Logs encontrados: ${logs.length}`);
      console.log('🔍 Últimos 3 logs:');
      logs.slice(0, 3).forEach(log => {
        console.log(`   - ${log.action} por ${log.who} em ${log.at}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar:', error.message);
  }
}

testSQLConnection();
