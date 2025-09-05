#!/usr/bin/env node

/**
 * Script para executar a migração dos novos campos de funcionários
 * 
 * Uso:
 * npm run add-fields
 * ou
 * node migration/add-employee-fields.js
 */

import addEmployeeFields from './add-employee-fields.js';

console.log('🚀 MARH - Migração de Campos de Funcionários');
console.log('==========================================');
console.log('');
console.log('Este script irá adicionar os novos campos à tabela marh_employees:');
console.log('• chapa - Número da chapa do funcionário');
console.log('• cod_cargo - Código do cargo');
console.log('• cargo - Nome do cargo');  
console.log('• local - Local de trabalho');
console.log('• descricao_folha - Descrição da folha');
console.log('• centro_custo - Centro de custo');
console.log('• cod_situacao - Código da situação');
console.log('• situacao - Situação do funcionário');
console.log('• data_rescisao - Data de rescisão');
console.log('• hireDate - Data de admissão adicional');
console.log('');

addEmployeeFields()
  .then(() => {
    console.log('');
    console.log('🎯 PRÓXIMOS PASSOS:');
    console.log('1. ✅ Migração concluída com sucesso');
    console.log('2. 🔄 Reinicie o servidor backend');
    console.log('3. 🧪 Teste a importação de colaboradores no frontend');
    console.log('4. 📊 Verifique se todos os campos estão sendo salvos');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('💥 ERRO NA MIGRAÇÃO');
    console.error('===================');
    console.error('Detalhes:', error.message);
    console.error('');
    console.error('🔧 SOLUÇÕES POSSÍVEIS:');
    console.error('• Verifique se o SQL Server está rodando');
    console.error('• Confirme as credenciais no arquivo .env');
    console.error('• Execute create-tables.js primeiro se for nova instalação');
    console.error('');
    process.exit(1);
  });
