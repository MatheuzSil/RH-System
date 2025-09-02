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
    console.log('🚀 Iniciando migração dos dados...');
    
    // Carregar dados do JSON
    const jsonData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log('📄 Dados JSON carregados');
    
    // Conectar ao banco
    pool = await getConnection();
    console.log('🔗 Conectado ao SQL Server');
    
    // Criar um backup dos dados atuais (se existir)
    const backupPath = path.join(__dirname, `../backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(jsonData, null, 2));
    console.log(`💾 Backup criado em: ${backupPath}`);
    
    // 1. Migrar usuários
    console.log('👤 Migrando usuários...');
    for (const user of jsonData.users) {
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
    }
    console.log(`✅ ${jsonData.users.length} usuários migrados`);
    
    // 2. Migrar departamentos
    console.log('🏢 Migrando departamentos...');
    for (const dept of jsonData.departments) {
      const request = pool.request();
      await request
        .input('id', sql.NVarChar, dept.id)
        .input('name', sql.NVarChar, dept.name)
        .input('costCenter', sql.NVarChar, dept.costCenter)
        .query(`INSERT INTO marh_departments (id, name, costCenter) 
                VALUES (@id, @name, @costCenter)`);
    }
    console.log(`✅ ${jsonData.departments.length} departamentos migrados`);
    
    // 3. Migrar funcionários
    console.log('👥 Migrando funcionários...');
    for (const emp of jsonData.employees) {
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
        .query(`INSERT INTO employees (id, name, email, cpf, phone, deptId, roleTitle, salary, status, admissionDate, type, gender, maritalStatus, hasChildren, childrenCount, userId) 
                VALUES (@id, @name, @email, @cpf, @phone, @deptId, @roleTitle, @salary, @status, @admissionDate, @type, @gender, @maritalStatus, @hasChildren, @childrenCount, @userId)`);
    }
    console.log(`✅ ${jsonData.employees.length} funcionários migrados`);
    
    // 4. Migrar presença
    console.log('⏰ Migrando registros de presença...');
    for (const att of jsonData.attendance) {
      const request = pool.request();
      await request
        .input('id', sql.NVarChar, att.id)
        .input('empId', sql.NVarChar, att.empId)
        .input('date', sql.Date, att.date ? new Date(att.date) : null)
        .input('clockIn', sql.Time, att.clockIn || null)
        .input('clockOut', sql.Time, att.clockOut || null)
        .input('status', sql.NVarChar, att.status || null)
        .query(`INSERT INTO attendance (id, empId, date, clockIn, clockOut, status) 
                VALUES (@id, @empId, @date, @clockIn, @clockOut, @status)`);
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
        .query(`INSERT INTO leaves (id, empId, type, start, [end], status, reason, approver) 
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
        .query(`INSERT INTO payroll (id, empId, refMonth, gross, deductions, net) 
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
            .query(`INSERT INTO payroll_items (payrollId, type, description, amount) 
                    VALUES (@payrollId, @type, @description, @amount)`);
        }
      }
    }
    console.log(`✅ ${jsonData.payroll.length} registros de folha migrados`);
    
    // 7. Migrar avaliações
    console.log('⭐ Migrando avaliações...');
    for (const review of jsonData.reviews) {
      const request = pool.request();
      await request
        .input('id', sql.NVarChar, review.id)
        .input('empId', sql.NVarChar, review.empId)
        .input('period', sql.NVarChar, review.period || null)
        .input('score', sql.Decimal, review.score || 0)
        .input('notes', sql.NVarChar, review.notes || null)
        .input('reviewer', sql.NVarChar, review.reviewer || null)
        .query(`INSERT INTO reviews (id, empId, period, score, notes, reviewer) 
                VALUES (@id, @empId, @period, @score, @notes, @reviewer)`);
    }
    console.log(`✅ ${jsonData.reviews.length} avaliações migradas`);
    
    // 8. Migrar treinamentos
    console.log('📚 Migrando treinamentos...');
    for (const training of jsonData.trainings) {
      const request = pool.request();
      const enrolledJson = training.enrolled ? JSON.stringify(training.enrolled) : null;
      await request
        .input('id', sql.NVarChar, training.id)
        .input('title', sql.NVarChar, training.title || null)
        .input('date', sql.Date, training.date ? new Date(training.date) : null)
        .input('seats', sql.Int, training.seats || 0)
        .input('enrolled', sql.NVarChar, enrolledJson)
        .query(`INSERT INTO trainings (id, title, date, seats, enrolled) 
                VALUES (@id, @title, @date, @seats, @enrolled)`);
    }
    console.log(`✅ ${jsonData.trainings.length} treinamentos migrados`);
    
    // 9. Migrar vagas
    console.log('💼 Migrando vagas...');
    for (const job of jsonData.jobs) {
      const request = pool.request();
      await request
        .input('id', sql.NVarChar, job.id)
        .input('title', sql.NVarChar, job.title || null)
        .input('deptId', sql.NVarChar, job.deptId || null)
        .input('openings', sql.Int, job.openings || 0)
        .input('status', sql.NVarChar, job.status || null)
        .query(`INSERT INTO jobs (id, title, deptId, openings, status) 
                VALUES (@id, @title, @deptId, @openings, @status)`);
    }
    console.log(`✅ ${jsonData.jobs.length} vagas migradas`);
    
    // 10. Migrar candidatos
    console.log('👔 Migrando candidatos...');
    for (const candidate of jsonData.candidates) {
      const request = pool.request();
      await request
        .input('id', sql.NVarChar, candidate.id)
        .input('name', sql.NVarChar, candidate.name || null)
        .input('email', sql.NVarChar, candidate.email || null)
        .input('jobId', sql.NVarChar, candidate.jobId || null)
        .input('stage', sql.NVarChar, candidate.stage || null)
        .input('notes', sql.NVarChar, candidate.notes || null)
        .query(`INSERT INTO candidates (id, name, email, jobId, stage, notes) 
                VALUES (@id, @name, @email, @jobId, @stage, @notes)`);
    }
    console.log(`✅ ${jsonData.candidates.length} candidatos migrados`);
    
    // 11. Migrar configurações
    console.log('⚙️ Migrando configurações...');
    if (jsonData.settings && typeof jsonData.settings === 'object') {
      for (const [key, value] of Object.entries(jsonData.settings)) {
        if (key !== 'companyName') { // companyName já foi inserido no schema
          const request = pool.request();
          await request
            .input('key_name', sql.NVarChar, key)
            .input('value_data', sql.NVarChar, typeof value === 'string' ? value : JSON.stringify(value))
            .query(`INSERT INTO settings (key_name, value_data) VALUES (@key_name, @value_data)`);
        }
      }
    }
    console.log('✅ Configurações migradas');
    
    // 12. Migrar documentos
    console.log('📄 Migrando documentos...');
    if (jsonData.documents && Array.isArray(jsonData.documents)) {
      for (const doc of jsonData.documents) {
        const request = pool.request();
        await request
          .input('id', sql.NVarChar, doc.id)
          .input('empId', sql.NVarChar, doc.empId)
          .input('type', sql.NVarChar, doc.type || null)
          .input('description', sql.NVarChar, doc.description || null)
          .input('fileName', sql.NVarChar, doc.fileName || null)
          .input('fileData', sql.NVarChar, doc.fileData || null)
          .input('fileSize', sql.BigInt, doc.fileSize || 0)
          .input('mimeType', sql.NVarChar, doc.mimeType || null)
          .input('uploadDate', sql.Date, doc.uploadDate ? new Date(doc.uploadDate) : null)
          .input('expirationDate', sql.Date, doc.expirationDate ? new Date(doc.expirationDate) : null)
          .input('uploadedBy', sql.NVarChar, doc.uploadedBy || null)
          .input('notes', sql.NVarChar, doc.notes || null)
          .query(`INSERT INTO documents (id, empId, type, description, fileName, fileData, fileSize, mimeType, uploadDate, expirationDate, uploadedBy, notes) 
                  VALUES (@id, @empId, @type, @description, @fileName, @fileData, @fileSize, @mimeType, @uploadDate, @expirationDate, @uploadedBy, @notes)`);
      }
      console.log(`✅ ${jsonData.documents.length} documentos migrados`);
    }
    
    // 13. Migrar logs
    console.log('📋 Migrando logs...');
    for (const logEntry of jsonData.logs) {
      const request = pool.request();
      await request
        .input('at', sql.NVarChar, logEntry.at || null)
        .input('who', sql.NVarChar, logEntry.who || null)
        .input('action', sql.NVarChar, logEntry.action || null)
        .input('details', sql.NVarChar, logEntry.details || null)
        .query(`INSERT INTO logs (at, who, action, details) 
                VALUES (@at, @who, @action, @details)`);
    }
    console.log(`✅ ${jsonData.logs.length} logs migrados`);
    
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`📊 Resumo:`);
    console.log(`   - ${jsonData.users.length} usuários`);
    console.log(`   - ${jsonData.departments.length} departamentos`);
    console.log(`   - ${jsonData.employees.length} funcionários`);
    console.log(`   - ${jsonData.attendance.length} registros de presença`);
    console.log(`   - ${jsonData.leaves.length} afastamentos`);
    console.log(`   - ${jsonData.payroll.length} folhas de pagamento`);
    console.log(`   - ${jsonData.reviews.length} avaliações`);
    console.log(`   - ${jsonData.trainings.length} treinamentos`);
    console.log(`   - ${jsonData.jobs.length} vagas`);
    console.log(`   - ${jsonData.candidates.length} candidatos`);
    console.log(`   - ${jsonData.documents?.length || 0} documentos`);
    console.log(`   - ${jsonData.logs.length} logs`);
    
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
