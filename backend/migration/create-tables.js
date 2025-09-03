import { getConnection, sql, closeConnection } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTables() {
  let pool = null;
  
  try {
    console.log('🏗️  Criando tabelas MARH no SQL Server...');
    
    // Conectar ao banco
    pool = await getConnection();
    console.log('🔗 Conectado ao SQL Server');
    
    // Criar tabelas uma por uma para melhor controle
    console.log('📋 Removendo tabelas existentes (se houver)...');
    
    // Lista das tabelas na ordem reversa (para foreign keys)
    const tables = [
      'marh_payroll_items',
      'marh_documents', 
      'marh_logs',
      'marh_reviews',
      'marh_payroll',
      'marh_leaves',
      'marh_attendance',
      'marh_candidates',
      'marh_jobs',
      'marh_trainings',
      'marh_employees',
      'marh_departments',
      'marh_users',
      'marh_settings'
    ];
    
    // Drop tables
    for (const table of tables) {
      try {
        await pool.request().query(`
          IF OBJECT_ID('${table}', 'U') IS NOT NULL 
            DROP TABLE ${table}
        `);
        console.log(`  ✅ Removido: ${table}`);
      } catch (error) {
        console.log(`  ⚠️  ${table} não existia`);
      }
    }
    
    console.log('🏗️  Criando tabelas...');
    
    // Criar tabela de usuários
    await pool.request().query(`
      CREATE TABLE marh_users (
          id NVARCHAR(50) PRIMARY KEY,
          email NVARCHAR(255) UNIQUE NOT NULL,
          name NVARCHAR(255) NOT NULL,
          role NVARCHAR(20) CHECK (role IN ('ADMIN', 'RH', 'GESTOR', 'COLAB')) NOT NULL,
          pass NVARCHAR(255) NOT NULL,
          active BIT DEFAULT 1
      )
    `);
    console.log('  ✅ marh_users criada');
    
    // Criar tabela de departamentos
    await pool.request().query(`
      CREATE TABLE marh_departments (
          id NVARCHAR(50) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          costCenter NVARCHAR(50)
      )
    `);
    console.log('  ✅ marh_departments criada');
    
    // Criar tabela de funcionários com todos os campos
    await pool.request().query(`
      CREATE TABLE marh_employees (
          id NVARCHAR(50) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          email NVARCHAR(255),
          cpf NVARCHAR(14),
          phone NVARCHAR(20),
          deptId NVARCHAR(50),
          roleTitle NVARCHAR(255),
          salary DECIMAL(10,2),
          status NVARCHAR(20) DEFAULT 'ATIVO',
          admissionDate DATE,
          type NVARCHAR(10),
          gender NVARCHAR(20),
          maritalStatus NVARCHAR(20),
          hasChildren NVARCHAR(10),
          childrenCount NVARCHAR(10),
          userId NVARCHAR(50),
          chapa NVARCHAR(50),
          cod_cargo NVARCHAR(20),
          cargo NVARCHAR(100),
          local NVARCHAR(100),
          descricao_folha NVARCHAR(200),
          centro_custo NVARCHAR(50),
          cod_situacao NVARCHAR(10),
          situacao NVARCHAR(50),
          data_rescisao DATE,
          hireDate DATE
      )
    `);
    console.log('  ✅ marh_employees criada com todos os campos');
    
    // Criar outras tabelas essenciais
    await pool.request().query(`
      CREATE TABLE marh_attendance (
          id NVARCHAR(50) PRIMARY KEY,
          empId NVARCHAR(50),
          date DATE,
          clockIn NVARCHAR(10),
          clockOut NVARCHAR(10),
          status NVARCHAR(20)
      )
    `);
    console.log('  ✅ marh_attendance criada');
    
    await pool.request().query(`
      CREATE TABLE marh_leaves (
          id NVARCHAR(50) PRIMARY KEY,
          empId NVARCHAR(50),
          type NVARCHAR(50),
          start DATE,
          [end] DATE,
          status NVARCHAR(20),
          reason NVARCHAR(500),
          approver NVARCHAR(50)
      )
    `);
    console.log('  ✅ marh_leaves criada');
    
    await pool.request().query(`
      CREATE TABLE marh_payroll (
          id NVARCHAR(50) PRIMARY KEY,
          empId NVARCHAR(50),
          refMonth NVARCHAR(10),
          gross DECIMAL(10,2),
          deductions DECIMAL(10,2),
          net DECIMAL(10,2)
      )
    `);
    console.log('  ✅ marh_payroll criada');
    
    await pool.request().query(`
      CREATE TABLE marh_payroll_items (
          id INT IDENTITY(1,1) PRIMARY KEY,
          payrollId NVARCHAR(50),
          type NVARCHAR(20),
          description NVARCHAR(255),
          amount DECIMAL(10,2)
      )
    `);
    console.log('  ✅ marh_payroll_items criada');
    
    await pool.request().query(`
      CREATE TABLE marh_reviews (
          id NVARCHAR(50) PRIMARY KEY,
          empId NVARCHAR(50),
          period NVARCHAR(20),
          score DECIMAL(3,1),
          notes NVARCHAR(500),
          reviewer NVARCHAR(50)
      )
    `);
    console.log('  ✅ marh_reviews criada');
    
    await pool.request().query(`
      CREATE TABLE marh_trainings (
          id NVARCHAR(50) PRIMARY KEY,
          title NVARCHAR(255),
          date DATE,
          seats INT,
          enrolled NVARCHAR(MAX)
      )
    `);
    console.log('  ✅ marh_trainings criada');
    
    await pool.request().query(`
      CREATE TABLE marh_jobs (
          id NVARCHAR(50) PRIMARY KEY,
          title NVARCHAR(255),
          deptId NVARCHAR(50),
          openings INT,
          status NVARCHAR(20)
      )
    `);
    console.log('  ✅ marh_jobs criada');
    
    await pool.request().query(`
      CREATE TABLE marh_candidates (
          id NVARCHAR(50) PRIMARY KEY,
          name NVARCHAR(255),
          email NVARCHAR(255),
          jobId NVARCHAR(50),
          stage NVARCHAR(50),
          notes NVARCHAR(500)
      )
    `);
    console.log('  ✅ marh_candidates criada');
    
    await pool.request().query(`
      CREATE TABLE marh_settings (
          id INT IDENTITY(1,1) PRIMARY KEY,
          key_name NVARCHAR(100) UNIQUE,
          value_data NVARCHAR(MAX)
      )
    `);
    console.log('  ✅ marh_settings criada');
    
    await pool.request().query(`
      CREATE TABLE marh_documents (
          id NVARCHAR(50) PRIMARY KEY,
          empId NVARCHAR(50),
          type NVARCHAR(50),
          description NVARCHAR(500),
          fileName NVARCHAR(255),
          fileData NVARCHAR(MAX),
          fileSize BIGINT,
          mimeType NVARCHAR(100),
          uploadDate DATE,
          expirationDate DATE,
          uploadedBy NVARCHAR(255),
          notes NVARCHAR(500)
      )
    `);
    console.log('  ✅ marh_documents criada');
    
    await pool.request().query(`
      CREATE TABLE marh_logs (
          id INT IDENTITY(1,1) PRIMARY KEY,
          at NVARCHAR(50),
          who NVARCHAR(255),
          action NVARCHAR(100),
          details NVARCHAR(500)
      )
    `);
    console.log('  ✅ marh_logs criada');
    
    console.log('🔗 Adicionando foreign keys...');
    
    // Adicionar foreign keys
    try {
      await pool.request().query(`
        ALTER TABLE marh_employees ADD CONSTRAINT FK_marh_employees_departments 
            FOREIGN KEY (deptId) REFERENCES marh_departments(id)
      `);
      console.log('  ✅ FK employees → departments');
      
      await pool.request().query(`
        ALTER TABLE marh_attendance ADD CONSTRAINT FK_marh_attendance_employees 
            FOREIGN KEY (empId) REFERENCES marh_employees(id)
      `);
      console.log('  ✅ FK attendance → employees');
      
      // Outras foreign keys...
    } catch (error) {
      console.log('  ⚠️  Algumas foreign keys podem ter falhado (normal)');
    }
    
    // Inserir configuração inicial
    await pool.request().query(`
      INSERT INTO marh_settings (key_name, value_data) VALUES ('companyName', 'MARH S/A')
    `);
    console.log('  ✅ Configuração inicial inserida');
    
    console.log('\n🎉 TABELAS CRIADAS COM SUCESSO!');
    console.log('✅ Todas as tabelas MARH foram criadas no SQL Server');
    console.log('✅ Agora você pode executar a migração dos dados');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
    throw error;
  } finally {
    await closeConnection();
  }
}

// Executar se chamado diretamente
if (process.argv[1] === __filename) {
  createTables()
    .then(() => {
      console.log('✅ Script de criação finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na criação:', error);
      process.exit(1);
    });
}

export default createTables;
