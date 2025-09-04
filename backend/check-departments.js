import { getConnection, closeConnection } from './config/database.js';

async function checkDepartments() {
  try {
    console.log('🏢 Verificando departamentos...\n');
    
    const pool = await getConnection();
    
    // Verificar departamentos existentes
    const result = await pool.request().query('SELECT id, name FROM marh_departments ORDER BY id');
    
    console.log('📋 Departamentos existentes:');
    if (result.recordset.length === 0) {
      console.log('❌ NENHUM departamento encontrado!');
    } else {
      result.recordset.forEach((dept, index) => {
        console.log(`${index + 1}. ID: ${dept.id} | Nome: ${dept.name}`);
      });
    }
    
    await closeConnection();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkDepartments();
