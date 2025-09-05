/**
 * Teste simples para verificar se o robô consegue conectar no SQL Server
 * e carregar os funcionários
 */

import { loadFromDB } from '../backend/utils/dbHelpers.js';

async function testSQLConnection() {
  console.log('🧪 TESTE DE CONEXÃO SQL SERVER');
  console.log('=' .repeat(50));
  
  try {
    console.log('🔌 Conectando ao SQL Server...');
    
    // Testar carregamento de funcionários
    console.log('👥 Carregando funcionários...');
    const employees = await loadFromDB('employees');
    
    console.log(`✅ SUCESSO! ${employees.length} funcionários carregados`);
    
    if (employees.length > 0) {
      console.log('\n📋 Exemplo dos primeiros 3 funcionários:');
      employees.slice(0, 3).forEach((emp, i) => {
        console.log(`${i+1}. ${emp.name} - CPF: ${emp.cpf} - Chapa: ${emp.chapa}`);
      });
    }
    
    if (employees.length >= 20000) {
      console.log('\n🎉 PERFEITO! Mais de 20k funcionários encontrados!');
      console.log('✅ O robô está conectado na base correta com todos os funcionários!');
    } else if (employees.length > 1000) {
      console.log(`\n📊 ${employees.length} funcionários encontrados - base parcial`);
    } else {
      console.log(`\n⚠️ Apenas ${employees.length} funcionários - verifique a configuração`);
    }
    
  } catch (error) {
    console.error('\n❌ ERRO na conexão:', error.message);
    console.error('Detalhes:', error);
    
    console.log('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Verificar credenciais no .env');
    console.log('2. Verificar se a tabela marh_employees existe');
    console.log('3. Verificar conectividade com o servidor SQL');
  }
}

testSQLConnection();
