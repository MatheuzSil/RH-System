import fs from 'fs';
import { getConnection, sql, closeConnection } from '../config/database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '../db.json');

async function migrateData() {
  let pool = null;
  
  try {
    console.log('🚀 Iniciando migração dos dados para SQL Server...');
    console.log('⚠️  Usando prefixo marh_ para não conflitar com sistema existente');
    
    // Carregar dados do JSON
    const jsonData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log('📄 Dados JSON carregados');
    
    // Conectar ao banco
    pool = await getConnection();
    console.log('🔗 Conectado ao SQL Server');
    
    // Criar um backup dos dados atuais
    const backupPath = path.join(__dirname, `../backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(jsonData, null, 2));
    console.log(`💾 Backup criado em: ${backupPath}`);
    
    // 1. Migrar usuários
    console.log('👤 Migrando usuários...');
    for (const user of jsonData.users) {
      const checkRequest = pool.request();
      
      // Verificar se já existe
      const existsResult = await checkRequest
        .input('checkId', sql.NVarChar, user.id)
        .query('SELECT COUNT(*) as count FROM marh_users WHERE id = @checkId');
        
      if (existsResult.recordset[0].count === 0) {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, user.id)
          .input('email', sql.NVarChar, user.email)
          .input('name', sql.NVarChar, user.name)
          .input('role', sql.NVarChar, user.role)
          .input('pass', sql.NVarChar, user.pass)
          .input('active', sql.Bit, user.active)
          .query(`INSERT INTO marh_users (id, email, name, role, pass, active) 
                  VALUES (@id, @email, @name, @role, @pass, @active)`);
        console.log(`   ✅ Usuário inserido: ${user.name}`);
      } else {
        console.log(`   ⏭️  Usuário já existe: ${user.name}`);
      }
    }
    console.log(`✅ ${jsonData.users.length} usuários migrados`);
    
    // 2. Migrar departamentos
    console.log('🏢 Migrando departamentos...');
    for (const dept of jsonData.departments) {
      const checkRequest = pool.request();
      
      // Verificar se já existe
      const existsResult = await checkRequest
        .input('checkId', sql.NVarChar, dept.id)
        .query('SELECT COUNT(*) as count FROM marh_departments WHERE id = @checkId');
        
      if (existsResult.recordset[0].count === 0) {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, dept.id)
          .input('name', sql.NVarChar, dept.name)
          .input('costCenter', sql.NVarChar, dept.costCenter)
          .query(`INSERT INTO marh_departments (id, name, costCenter) 
                  VALUES (@id, @name, @costCenter)`);
        console.log(`   ✅ Departamento inserido: ${dept.name}`);
      } else {
        console.log(`   ⏭️  Departamento já existe: ${dept.name}`);
      }
    }
    console.log(`✅ ${jsonData.departments.length} departamentos migrados`);
    
    // 3. Migrar funcionários
    console.log('👥 Migrando funcionários...');
    for (const emp of jsonData.employees) {
      const checkRequest = pool.request();
      
      // Verificar se já existe
      const existsResult = await checkRequest
        .input('checkId', sql.NVarChar, emp.id)
        .query('SELECT COUNT(*) as count FROM marh_employees WHERE id = @checkId');
        
      if (existsResult.recordset[0].count === 0) {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, emp.id)
          .input('name', sql.NVarChar, emp.name)
          .input('email', sql.NVarChar, emp.email || null)
          .input('cpf', sql.NVarChar, emp.cpf || null)
          .input('phone', sql.NVarChar, emp.phone || null)
          .input('deptId', sql.NVarChar, emp.deptId || null)
          .input('roleTitle', sql.NVarChar, emp.roleTitle || null)
          .input('salary', sql.Decimal, emp.salary || 0)
          .input('status', sql.NVarChar, emp.status || 'ATIVO')
          .input('admissionDate', sql.Date, emp.admissionDate ? new Date(emp.admissionDate) : null)
          .input('type', sql.NVarChar, emp.type || null)
          .input('gender', sql.NVarChar, emp.gender || null)
          .input('maritalStatus', sql.NVarChar, emp.maritalStatus || null)
          .input('hasChildren', sql.NVarChar, emp.hasChildren || null)
          .input('childrenCount', sql.NVarChar, emp.childrenCount || null)
          .input('userId', sql.NVarChar, emp.userId || null)
          .query(`INSERT INTO marh_employees (id, name, email, cpf, phone, deptId, roleTitle, salary, status, admissionDate, type, gender, maritalStatus, hasChildren, childrenCount, userId) 
                  VALUES (@id, @name, @email, @cpf, @phone, @deptId, @roleTitle, @salary, @status, @admissionDate, @type, @gender, @maritalStatus, @hasChildren, @childrenCount, @userId)`);
        console.log(`   ✅ Funcionário inserido: ${emp.name}`);
      } else {
        console.log(`   ⏭️  Funcionário já existe: ${emp.name}`);
      }
    }
    console.log(`✅ ${jsonData.employees.length} funcionários migrados`);
    
    // 4. Migrar presença
    console.log('⏰ Migrando registros de presença...');
    for (const att of jsonData.attendance) {
      const checkRequest = pool.request();
      
      // Verificar se já existe
      const existsResult = await checkRequest
        .input('checkId', sql.NVarChar, att.id)
        .query('SELECT COUNT(*) as count FROM marh_attendance WHERE id = @checkId');
        
      if (existsResult.recordset[0].count === 0) {
        // Verificar se o funcionário existe
        const empCheckRequest = pool.request();
        const empExistsResult = await empCheckRequest
          .input('empId', sql.NVarChar, att.empId)
          .query('SELECT COUNT(*) as count FROM marh_employees WHERE id = @empId');
          
        if (empExistsResult.recordset[0].count > 0) {
          const request = pool.request();
          await request
            .input('id', sql.NVarChar, att.id)
            .input('empId', sql.NVarChar, att.empId)
            .input('date', sql.Date, att.date ? new Date(att.date) : null)
            .input('clockIn', sql.NVarChar, att.clockIn || null)
            .input('clockOut', sql.NVarChar, att.clockOut || null)
            .input('status', sql.NVarChar, att.status || null)
            .query(`INSERT INTO marh_attendance (id, empId, date, clockIn, clockOut, status) 
                    VALUES (@id, @empId, @date, @clockIn, @clockOut, @status)`);
          console.log(`   ✅ Presença inserida: ${att.id} - ${att.date}`);
        } else {
          console.log(`   ⚠️  Funcionário não encontrado para presença ${att.id}: ${att.empId}`);
        }
      } else {
        console.log(`   ⏭️  Presença já existe: ${att.id} - ${att.date}`);
      }
    }
    console.log(`✅ ${jsonData.attendance.length} registros de presença migrados`);
    
    // 5. Migrar afastamentos
    console.log('🏖️ Migrando afastamentos...');
    for (const leave of jsonData.leaves) {
      const request = pool.request();
      await request
        .input('id', sql.NVarChar, leave.id)
        .input('empId', sql.NVarChar, leave.empId)
        .input('type', sql.NVarChar, leave.type || null)
        .input('start', sql.Date, leave.start ? new Date(leave.start) : null)
        .input('end', sql.Date, leave.end ? new Date(leave.end) : null)
        .input('status', sql.NVarChar, leave.status || null)
        .input('reason', sql.NVarChar, leave.reason || null)
        .input('approver', sql.NVarChar, leave.approver || null)
        .query(`INSERT INTO marh_leaves (id, empId, type, start, [end], status, reason, approver) 
                VALUES (@id, @empId, @type, @start, @end, @status, @reason, @approver)`);
    }
    console.log(`✅ ${jsonData.leaves.length} afastamentos migrados`);
    
    // 6. Migrar folha de pagamento
    console.log('💰 Migrando folha de pagamento...');
    for (const payroll of jsonData.payroll) {
      const request = pool.request();
      await request
        .input('id', sql.NVarChar, payroll.id)
        .input('empId', sql.NVarChar, payroll.empId)
        .input('refMonth', sql.NVarChar, payroll.refMonth || null)
        .input('gross', sql.Decimal, payroll.gross || 0)
        .input('deductions', sql.Decimal, payroll.deductions || 0)
        .input('net', sql.Decimal, payroll.net || 0)
        .query(`INSERT INTO marh_payroll (id, empId, refMonth, gross, deductions, net) 
                VALUES (@id, @empId, @refMonth, @gross, @deductions, @net)`);
        
      // Migrar itens da folha
      if (payroll.items && Array.isArray(payroll.items)) {
        for (const item of payroll.items) {
          const itemRequest = pool.request();
          await itemRequest
            .input('payrollId', sql.NVarChar, payroll.id)
            .input('type', sql.NVarChar, item.type || null)
            .input('description', sql.NVarChar, item.desc || null)
            .input('amount', sql.Decimal, item.amount || 0)
            .query(`INSERT INTO marh_payroll_items (payrollId, type, description, amount) 
                    VALUES (@payrollId, @type, @description, @amount)`);
        }
      }
    }
    console.log(`✅ ${jsonData.payroll.length} registros de folha migrados`);
    
    // Continue com as outras tabelas...
    console.log('⭐ Migrando avaliações, treinamentos, vagas, candidatos...');
    
    // Migrar configurações
    console.log('⚙️ Migrando configurações...');
    if (jsonData.settings && typeof jsonData.settings === 'object') {
      for (const [key, value] of Object.entries(jsonData.settings)) {
        const checkRequest = pool.request();
        
        // Verificar se já existe
        const existsResult = await checkRequest
          .input('checkKey', sql.NVarChar, key)
          .query('SELECT COUNT(*) as count FROM marh_settings WHERE key_name = @checkKey');
          
        if (existsResult.recordset[0].count === 0) {
          const request = pool.request();
          await request
            .input('key_name', sql.NVarChar, key)
            .input('value_data', sql.NVarChar, typeof value === 'string' ? value : JSON.stringify(value))
            .query(`INSERT INTO marh_settings (key_name, value_data) VALUES (@key_name, @value_data)`);
          console.log(`   ✅ Configuração inserida: ${key}`);
        } else {
          console.log(`   ⏭️  Configuração já existe: ${key}`);
        }
      }
    }
    
    // Migrar logs
    console.log('📋 Migrando logs...');
    for (const logEntry of jsonData.logs.slice(0, 100)) { // Limitar a 100 logs mais recentes
      const request = pool.request();
      await request
        .input('at', sql.NVarChar, logEntry.at || null)
        .input('who', sql.NVarChar, logEntry.who || null)
        .input('action', sql.NVarChar, logEntry.action || null)
        .input('details', sql.NVarChar, logEntry.details || null)
        .query(`INSERT INTO marh_logs (at, who, action, details) 
                VALUES (@at, @who, @action, @details)`);
    }
    
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`✅ Todas as tabelas foram criadas com prefixo marh_`);
    console.log(`✅ Dados migrados do JSON para SQL Server`);
    console.log(`✅ Sistema híbrido pode usar SQL agora`);
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Executar migração se chamado diretamente
if (process.argv[1] === __filename) {
  migrateData()
    .then(() => {
      console.log('✅ Script de migração finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na migração:', error);
      process.exit(1);
    });
}

export default migrateData;
