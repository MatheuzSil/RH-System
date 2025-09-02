import { config } from 'dotenv';
import sql from 'mssql';

config();

// Configuração do SQL Server
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

async function testMigration() {
  let pool = null;
  
  try {
    console.log('🔍 Testando dados migrados...\n');
    
    // Conectar ao SQL Server
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado ao SQL Server\n');
    
    // Testar cada tabela
    const tables = [
      'marh_users',
      'marh_departments', 
      'marh_employees',
      'marh_attendance',
      'marh_leaves',
      'marh_payroll',
      'marh_settings',
      'marh_logs'
    ];
    
    for (const table of tables) {
      const result = await pool.request().query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.recordset[0].count;
      console.log(`📊 ${table}: ${count} registros`);
    }
    
    console.log('\n🔍 Testando consultas específicas...\n');
    
    // Testar usuários
    const users = await pool.request().query('SELECT id, name, role FROM marh_users');
    console.log('👤 Usuários:');
    users.recordset.forEach(user => {
      console.log(`   - ${user.name} (${user.role})`);
    });
    
    // Testar departamentos
    const depts = await pool.request().query('SELECT id, name FROM marh_departments');
    console.log('\n🏢 Departamentos:');
    depts.recordset.forEach(dept => {
      console.log(`   - ${dept.name}`);
    });
    
    // Testar funcionários
    const employees = await pool.request().query(`
      SELECT e.id, e.name, d.name as deptName 
      FROM marh_employees e 
      LEFT JOIN marh_departments d ON e.deptId = d.id
    `);
    console.log('\n👥 Funcionários:');
    employees.recordset.forEach(emp => {
      console.log(`   - ${emp.name} (${emp.deptName || 'Sem departamento'})`);
    });
    
    // Testar configurações
    const settings = await pool.request().query('SELECT key_name, value_data FROM marh_settings');
    console.log('\n⚙️  Configurações:');
    settings.recordset.forEach(setting => {
      console.log(`   - ${setting.key_name}: ${setting.value_data}`);
    });
    
    console.log('\n✅ Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexão fechada');
    }
  }
}

// Executar teste
testMigration()
  .then(() => {
    console.log('\n🎉 Sistema SQL Server está funcionando corretamente!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Falha no teste:', error);
    process.exit(1);
  });
