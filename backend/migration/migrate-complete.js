import { config } from 'dotenv';
import sql from 'mssql';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function migrateWithChecks() {
  let pool = null;
  
  try {
    console.log('🚀 Iniciando migração completa com verificações de duplicata...');
    console.log('⚠️  Usando prefixo marh_ para não conflitar com sistema existente\n');
    
    // Carregar dados JSON
    const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, '../db.json'), 'utf8'));
    console.log('📄 Dados JSON carregados');
    
    // Conectar ao SQL Server
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado ao SQL Server');
    
    // Criar backup
    const backupPath = path.join(__dirname, `../backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(jsonData, null, 2));
    console.log(`💾 Backup criado em: ${backupPath}\n`);
    
    // Funções auxiliares
    async function insertIfNotExists(tableName, idField, data, insertQuery, description) {
      const checkRequest = pool.request();
      const existsResult = await checkRequest
        .input('checkId', sql.NVarChar, data[idField])
        .query(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${idField} = @checkId`);
        
      if (existsResult.recordset[0].count === 0) {
        await insertQuery();
        console.log(`   ✅ ${description} inserido: ${data.name || data.id || data[Object.keys(data)[1]] || 'N/A'}`);
        return true;
      } else {
        console.log(`   ⏭️  ${description} já existe: ${data.name || data.id || data[Object.keys(data)[1]] || 'N/A'}`);
        return false;
      }
    }
    
    async function insertSettingIfNotExists(key, value) {
      const checkRequest = pool.request();
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
        return true;
      } else {
        console.log(`   ⏭️  Configuração já existe: ${key}`);
        return false;
      }
    }

    // 1. Migrar usuários
    console.log('👤 Migrando usuários...');
    for (const user of jsonData.users) {
      await insertIfNotExists('marh_users', 'id', user, async () => {
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
      }, 'Usuário');
    }
    console.log(`📊 Total de usuários: ${jsonData.users.length}\n`);

    // 2. Migrar departamentos
    console.log('🏢 Migrando departamentos...');
    for (const dept of jsonData.departments) {
      await insertIfNotExists('marh_departments', 'id', dept, async () => {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, dept.id)
          .input('name', sql.NVarChar, dept.name)
          .input('costCenter', sql.NVarChar, dept.costCenter)
          .query(`INSERT INTO marh_departments (id, name, costCenter) 
                  VALUES (@id, @name, @costCenter)`);
      }, 'Departamento');
    }
    console.log(`📊 Total de departamentos: ${jsonData.departments.length}\n`);

    // 3. Migrar funcionários
    console.log('👥 Migrando funcionários...');
    for (const emp of jsonData.employees) {
      await insertIfNotExists('marh_employees', 'id', emp, async () => {
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
      }, 'Funcionário');
    }
    console.log(`📊 Total de funcionários: ${jsonData.employees.length}\n`);

    // 4. Migrar presença
    console.log('⏰ Migrando registros de presença...');
    let attendanceInserted = 0;
    let attendanceSkipped = 0;
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
          attendanceInserted++;
          console.log(`   ✅ Presença inserida: ${att.id} - ${att.date}`);
        } else {
          attendanceSkipped++;
          console.log(`   ⚠️  Funcionário não encontrado para presença ${att.id}: ${att.empId}`);
        }
      } else {
        attendanceSkipped++;
        console.log(`   ⏭️  Presença já existe: ${att.id} - ${att.date}`);
      }
    }
    console.log(`📊 Presença: ${attendanceInserted} inseridos, ${attendanceSkipped} pulados\n`);

    // 5. Migrar afastamentos
    console.log('🏖️ Migrando afastamentos...');
    for (const leave of jsonData.leaves) {
      await insertIfNotExists('marh_leaves', 'id', leave, async () => {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, leave.id)
          .input('empId', sql.NVarChar, leave.empId)
          .input('leaveType', sql.NVarChar, leave.leaveType)
          .input('startDate', sql.Date, leave.startDate ? new Date(leave.startDate) : null)
          .input('endDate', sql.Date, leave.endDate ? new Date(leave.endDate) : null)
          .input('reason', sql.NVarChar, leave.reason || null)
          .input('status', sql.NVarChar, leave.status || 'PENDENTE')
          .query(`INSERT INTO marh_leaves (id, empId, leaveType, startDate, endDate, reason, status) 
                  VALUES (@id, @empId, @leaveType, @startDate, @endDate, @reason, @status)`);
      }, 'Afastamento');
    }
    console.log(`📊 Total de afastamentos: ${jsonData.leaves.length}\n`);

    // 6. Migrar folha de pagamento
    console.log('💰 Migrando folha de pagamento...');
    for (const payroll of jsonData.payroll) {
      await insertIfNotExists('marh_payroll', 'id', payroll, async () => {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, payroll.id)
          .input('empId', sql.NVarChar, payroll.empId)
          .input('month', sql.NVarChar, payroll.month)
          .input('year', sql.Int, payroll.year)
          .input('baseSalary', sql.Decimal, payroll.baseSalary || 0)
          .input('overtime', sql.Decimal, payroll.overtime || 0)
          .input('deductions', sql.Decimal, payroll.deductions || 0)
          .input('netSalary', sql.Decimal, payroll.netSalary || 0)
          .query(`INSERT INTO marh_payroll (id, empId, month, year, baseSalary, overtime, deductions, netSalary) 
                  VALUES (@id, @empId, @month, @year, @baseSalary, @overtime, @deductions, @netSalary)`);
      }, 'Folha');
    }
    console.log(`📊 Total de folhas: ${jsonData.payroll.length}\n`);

    // 7. Migrar avaliações, treinamentos, vagas, candidatos
    console.log('⭐ Migrando tabelas adicionais...');
    
    // Avaliações
    if (jsonData.evaluations && jsonData.evaluations.length > 0) {
      for (const evaluation of jsonData.evaluations) {
        await insertIfNotExists('marh_evaluations', 'id', evaluation, async () => {
          const request = pool.request();
          await request
            .input('id', sql.NVarChar, evaluation.id)
            .input('empId', sql.NVarChar, evaluation.empId)
            .input('evaluatorId', sql.NVarChar, evaluation.evaluatorId || null)
            .input('period', sql.NVarChar, evaluation.period || null)
            .input('score', sql.Decimal, evaluation.score || 0)
            .input('feedback', sql.NVarChar, evaluation.feedback || null)
            .input('date', sql.Date, evaluation.date ? new Date(evaluation.date) : null)
            .query(`INSERT INTO marh_evaluations (id, empId, evaluatorId, period, score, feedback, date) 
                    VALUES (@id, @empId, @evaluatorId, @period, @score, @feedback, @date)`);
        }, 'Avaliação');
      }
    }

    // Configurações
    console.log('⚙️ Migrando configurações...');
    if (jsonData.settings && typeof jsonData.settings === 'object') {
      let settingsInserted = 0;
      for (const [key, value] of Object.entries(jsonData.settings)) {
        const inserted = await insertSettingIfNotExists(key, value);
        if (inserted) settingsInserted++;
      }
      console.log(`📊 Configurações: ${settingsInserted} inseridas\n`);
    }

    // Logs (limitado aos 100 mais recentes)
    console.log('📋 Migrando logs (últimos 100)...');
    const recentLogs = jsonData.logs.slice(-100);
    let logsInserted = 0;
    for (const logEntry of recentLogs) {
      // Como logs podem não ter ID único, vamos verificar por conteúdo similar
      const logSearchContent = `${logEntry.at}_${logEntry.action}`;
      
      const checkRequest = pool.request();
      const existsResult = await checkRequest
        .input('checkAt', sql.NVarChar, logEntry.at || null)
        .input('checkAction', sql.NVarChar, logEntry.action || null)
        .query('SELECT COUNT(*) as count FROM marh_logs WHERE at = @checkAt AND action = @checkAction');
        
      if (existsResult.recordset[0].count === 0) {
        const request = pool.request();
        await request
          .input('at', sql.NVarChar, logEntry.at || null)
          .input('who', sql.NVarChar, logEntry.who || null)
          .input('action', sql.NVarChar, logEntry.action || null)
          .input('details', sql.NVarChar, logEntry.details || null)
          .query(`INSERT INTO marh_logs (at, who, action, details) 
                  VALUES (@at, @who, @action, @details)`);
        logsInserted++;
      }
    }
    console.log(`📊 Logs: ${logsInserted} inseridos\n`);

    console.log('🎉 Migração concluída com sucesso!');
    console.log('\n📈 RESUMO DA MIGRAÇÃO:');
    console.log(`   👤 Usuários: ${jsonData.users.length}`);
    console.log(`   🏢 Departamentos: ${jsonData.departments.length}`);
    console.log(`   👥 Funcionários: ${jsonData.employees.length}`);
    console.log(`   ⏰ Presença: ${attendanceInserted} inseridos, ${attendanceSkipped} pulados`);
    console.log(`   🏖️  Afastamentos: ${jsonData.leaves.length}`);
    console.log(`   💰 Folha: ${jsonData.payroll.length}`);
    console.log(`   ⚙️  Configurações: migradas`);
    console.log(`   📋 Logs: ${logsInserted} inseridos (últimos 100)`);

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Conexão SQL Server fechada');
    }
  }
}

// Executar migração
migrateWithChecks()
  .then(() => {
    console.log('\n✅ Processo de migração finalizado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Falha na migração:', error);
    process.exit(1);
  });
