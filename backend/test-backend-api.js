import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testando APIs do backend híbrido...\n');
  
  try {
    // Test 1: Get users
    console.log('🔍 Testando GET /users...');
    const usersResponse = await fetch(`${BASE_URL}/users`);
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      console.log(`✅ Usuários: ${users.length} encontrados`);
      users.forEach(user => console.log(`   - ${user.name} (${user.role})`));
    } else {
      console.log(`❌ Erro ao buscar usuários: ${usersResponse.status}`);
    }
    
    console.log();
    
    // Test 2: Get departments
    console.log('🔍 Testando GET /departments...');
    const deptsResponse = await fetch(`${BASE_URL}/departments`);
    if (deptsResponse.ok) {
      const depts = await deptsResponse.json();
      console.log(`✅ Departamentos: ${depts.length} encontrados`);
      depts.forEach(dept => console.log(`   - ${dept.name}`));
    } else {
      console.log(`❌ Erro ao buscar departamentos: ${deptsResponse.status}`);
    }
    
    console.log();
    
    // Test 3: Get employees
    console.log('🔍 Testando GET /employees...');
    const empResponse = await fetch(`${BASE_URL}/employees`);
    if (empResponse.ok) {
      const employees = await empResponse.json();
      console.log(`✅ Funcionários: ${employees.length} encontrados`);
      employees.forEach(emp => console.log(`   - ${emp.name}`));
    } else {
      console.log(`❌ Erro ao buscar funcionários: ${empResponse.status}`);
    }
    
    console.log();
    
    // Test 4: Get dashboard summary
    console.log('🔍 Testando GET /dashboard/summary...');
    const dashResponse = await fetch(`${BASE_URL}/dashboard/summary`);
    if (dashResponse.ok) {
      const summary = await dashResponse.json();
      console.log(`✅ Dashboard:`, summary);
    } else {
      console.log(`❌ Erro ao buscar dashboard: ${dashResponse.status}`);
    }
    
    console.log('\n🎉 Testes de API concluídos!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
    console.log('\n💡 Certifique-se de que o servidor está rodando com: node server.js');
  }
}

testAPI();
