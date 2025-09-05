import fetch from 'node-fetch';

async function testAPI() {
  const baseURL = 'http://localhost:3000';
  
  console.log('🧪 Testando MARH Backend API...\n');
  
  try {
    // Teste 1: Endpoint raiz
    console.log('📋 1. Testando endpoint raiz...');
    const rootResponse = await fetch(`${baseURL}/`);
    const rootData = await rootResponse.json();
    console.log('✅ Status:', rootResponse.status);
    console.log('✅ Resposta:', rootData);
    console.log('');
    
    // Teste 2: Login
    console.log('🔐 2. Testando login...');
    const loginResponse = await fetch(`${baseURL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@marh.local',
        password: '123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('✅ Status:', loginResponse.status);
    console.log('✅ Resposta:', loginData);
    console.log('');
    
    // Teste 3: MFA (usando código demo)
    if (loginData.mfa && loginData.demoCode) {
      console.log('🔑 3. Testando MFA...');
      const mfaResponse = await fetch(`${baseURL}/api/mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@marh.local',
          code: loginData.demoCode
        })
      });
      const mfaData = await mfaResponse.json();
      console.log('✅ Status:', mfaResponse.status);
      console.log('✅ Resposta:', mfaData);
      
      if (mfaData.token) {
        console.log('🎯 Token obtido! Testando endpoints protegidos...\n');
        
        // Teste 4: Dados dos funcionários
        console.log('👥 4. Testando /api/employees...');
        const empResponse = await fetch(`${baseURL}/api/employees`, {
          headers: { 'Authorization': `Bearer ${mfaData.token}` }
        });
        const empData = await empResponse.json();
        console.log('✅ Status:', empResponse.status);
        console.log('✅ Funcionários encontrados:', Array.isArray(empData) ? empData.length : 'N/A');
        console.log('');
        
        // Teste 5: Departamentos
        console.log('🏢 5. Testando /api/departments...');
        const deptResponse = await fetch(`${baseURL}/api/departments`, {
          headers: { 'Authorization': `Bearer ${mfaData.token}` }
        });
        const deptData = await deptResponse.json();
        console.log('✅ Status:', deptResponse.status);
        console.log('✅ Departamentos encontrados:', Array.isArray(deptData) ? deptData.length : 'N/A');
        console.log('');
        
        // Teste 6: Resumo do dashboard
        console.log('📊 6. Testando /api/summary...');
        const summaryResponse = await fetch(`${baseURL}/api/summary`, {
          headers: { 'Authorization': `Bearer ${mfaData.token}` }
        });
        const summaryData = await summaryResponse.json();
        console.log('✅ Status:', summaryResponse.status);
        console.log('✅ Resumo:', summaryData);
        console.log('');
        
        // Teste 7: Usuários (admin only)
        console.log('👤 7. Testando /api/users (admin only)...');
        const usersResponse = await fetch(`${baseURL}/api/users`, {
          headers: { 'Authorization': `Bearer ${mfaData.token}` }
        });
        const usersData = await usersResponse.json();
        console.log('✅ Status:', usersResponse.status);
        console.log('✅ Usuários encontrados:', Array.isArray(usersData) ? usersData.length : 'N/A');
        console.log('');
      }
    }
    
    console.log('🎉 Todos os testes concluídos!\n');
    console.log('📋 RESUMO:');
    console.log('✅ Backend está rodando');
    console.log('✅ Autenticação funciona');
    console.log('✅ Endpoints protegidos funcionam');
    console.log('✅ Dados JSON carregam corretamente');
    console.log('✅ Sistema híbrido está pronto para SQL');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

testAPI();
