-- MARH Database Schema - SQL Server
-- Execute este script no seu banco SQL Server
-- IMPORTANTE: Usando prefixo marh_ para não conflitar com tabelas existentes

-- Verificar se as tabelas já existem e excluir
IF OBJECT_ID('marh_payroll_items', 'U') IS NOT NULL DROP TABLE marh_payroll_items;
IF OBJECT_ID('marh_documents', 'U') IS NOT NULL DROP TABLE marh_documents;
IF OBJECT_ID('marh_logs', 'U') IS NOT NULL DROP TABLE marh_logs;
IF OBJECT_ID('marh_reviews', 'U') IS NOT NULL DROP TABLE marh_reviews;
IF OBJECT_ID('marh_payroll', 'U') IS NOT NULL DROP TABLE marh_payroll;
IF OBJECT_ID('marh_leaves', 'U') IS NOT NULL DROP TABLE marh_leaves;
IF OBJECT_ID('marh_attendance', 'U') IS NOT NULL DROP TABLE marh_attendance;
IF OBJECT_ID('marh_candidates', 'U') IS NOT NULL DROP TABLE marh_candidates;
IF OBJECT_ID('marh_jobs', 'U') IS NOT NULL DROP TABLE marh_jobs;
IF OBJECT_ID('marh_trainings', 'U') IS NOT NULL DROP TABLE marh_trainings;
IF OBJECT_ID('marh_employees', 'U') IS NOT NULL DROP TABLE marh_employees;
IF OBJECT_ID('marh_departments', 'U') IS NOT NULL DROP TABLE marh_departments;
IF OBJECT_ID('marh_users', 'U') IS NOT NULL DROP TABLE marh_users;
IF OBJECT_ID('marh_settings', 'U') IS NOT NULL DROP TABLE marh_settings;

-- Tabela de usuários
CREATE TABLE marh_users (
    id NVARCHAR(50) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    name NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) CHECK (role IN ('ADMIN', 'RH', 'GESTOR', 'COLAB')) NOT NULL,
    pass NVARCHAR(255) NOT NULL,
    active BIT DEFAULT 1
);

-- Tabela de departamentos
CREATE TABLE marh_departments (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    costCenter NVARCHAR(50)
);

-- Tabela de funcionários
CREATE TABLE marh_employees (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255),
    cpf NVARCHAR(20),
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
    userId NVARCHAR(50)
);

-- Tabela de presença
CREATE TABLE marh_attendance (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    date DATE,
    clockIn TIME,
    clockOut TIME,
    status NVARCHAR(20)
);

-- Tabela de afastamentos
CREATE TABLE marh_leaves (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    type NVARCHAR(50),
    start DATE,
    [end] DATE,
    status NVARCHAR(20),
    reason NVARCHAR(500),
    approver NVARCHAR(50)
);

-- Tabela de folha de pagamento
CREATE TABLE marh_payroll (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    refMonth NVARCHAR(10),
    gross DECIMAL(10,2),
    deductions DECIMAL(10,2),
    net DECIMAL(10,2)
);

-- Tabela de itens da folha
CREATE TABLE marh_payroll_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    payrollId NVARCHAR(50),
    type NVARCHAR(20),
    description NVARCHAR(255),
    amount DECIMAL(10,2)
);

-- Tabela de avaliações
CREATE TABLE marh_reviews (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    period NVARCHAR(20),
    score DECIMAL(3,1),
    notes NVARCHAR(500),
    reviewer NVARCHAR(50)
);

-- Tabela de treinamentos
CREATE TABLE marh_trainings (
    id NVARCHAR(50) PRIMARY KEY,
    title NVARCHAR(255),
    date DATE,
    seats INT,
    enrolled NVARCHAR(MAX)
);

-- Tabela de vagas
CREATE TABLE marh_jobs (
    id NVARCHAR(50) PRIMARY KEY,
    title NVARCHAR(255),
    deptId NVARCHAR(50),
    openings INT,
    status NVARCHAR(20)
);

-- Tabela de candidatos
CREATE TABLE marh_candidates (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255),
    email NVARCHAR(255),
    jobId NVARCHAR(50),
    stage NVARCHAR(50),
    notes NVARCHAR(500)
);

-- Tabela de configurações
CREATE TABLE marh_settings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    key_name NVARCHAR(100) UNIQUE,
    value_data NVARCHAR(MAX)
);

-- Tabela de documentos
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
);

-- Tabela de logs
CREATE TABLE marh_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    at NVARCHAR(50),
    who NVARCHAR(255),
    action NVARCHAR(100),
    details NVARCHAR(500)
);

-- Inserir configuração inicial
INSERT INTO marh_settings (key_name, value_data) VALUES ('companyName', 'MARH S/A');

-- Adicionar Foreign Keys após criar todas as tabelas
ALTER TABLE marh_employees ADD CONSTRAINT FK_marh_employees_departments 
    FOREIGN KEY (deptId) REFERENCES marh_departments(id);

ALTER TABLE marh_attendance ADD CONSTRAINT FK_marh_attendance_employees 
    FOREIGN KEY (empId) REFERENCES marh_employees(id);

ALTER TABLE marh_leaves ADD CONSTRAINT FK_marh_leaves_employees 
    FOREIGN KEY (empId) REFERENCES marh_employees(id);

ALTER TABLE marh_payroll ADD CONSTRAINT FK_marh_payroll_employees 
    FOREIGN KEY (empId) REFERENCES marh_employees(id);

ALTER TABLE marh_payroll_items ADD CONSTRAINT FK_marh_payrollitems_payroll 
    FOREIGN KEY (payrollId) REFERENCES marh_payroll(id);

ALTER TABLE marh_reviews ADD CONSTRAINT FK_marh_reviews_employees 
    FOREIGN KEY (empId) REFERENCES marh_employees(id);

ALTER TABLE marh_jobs ADD CONSTRAINT FK_marh_jobs_departments 
    FOREIGN KEY (deptId) REFERENCES marh_departments(id);

ALTER TABLE marh_candidates ADD CONSTRAINT FK_marh_candidates_jobs 
    FOREIGN KEY (jobId) REFERENCES marh_jobs(id);

ALTER TABLE marh_documents ADD CONSTRAINT FK_marh_documents_employees 
    FOREIGN KEY (empId) REFERENCES marh_employees(id);

PRINT '✅ Tabelas MARH criadas com sucesso!';
PRINT '✅ Foreign Keys adicionadas!';
PRINT '⚠️  Usando prefixo marh_ para não conflitar com sistema existente';
