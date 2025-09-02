-- MARH Database Schema - SQL Server
-- Execute este script no seu banco SQL Server

-- Removed "USE grupoworklife;" for Oracle compatibility

-- Verificar se as tabelas já existem e excluir (cuidado em produção)
-- Ordem inversa das dependências para evitar erros de foreign key

DROP TABLE payroll_items CASCADE CONSTRAINTS;
DROP TABLE documents CASCADE CONSTRAINTS;
DROP TABLE logs CASCADE CONSTRAINTS;
DROP TABLE reviews CASCADE CONSTRAINTS;
DROP TABLE payroll CASCADE CONSTRAINTS;
DROP TABLE leaves CASCADE CONSTRAINTS;
DROP TABLE attendance CASCADE CONSTRAINTS;
DROP TABLE candidates CASCADE CONSTRAINTS;
DROP TABLE jobs CASCADE CONSTRAINTS;
DROP TABLE trainings CASCADE CONSTRAINTS;
DROP TABLE employees CASCADE CONSTRAINTS;
DROP TABLE departments CASCADE CONSTRAINTS;
DROP TABLE users CASCADE CONSTRAINTS;
DROP TABLE settings CASCADE CONSTRAINTS;

-- Tabela de usuários
CREATE TABLE users (
    id NVARCHAR(50) PRIMARY KEY,
    email NVARCHAR(255) UNIQUE NOT NULL,
    name NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) CHECK (role IN ('ADMIN', 'RH', 'GESTOR', 'COLAB')) NOT NULL,
    pass NVARCHAR(255) NOT NULL,
    active BIT DEFAULT 1
);

-- Tabela de departamentos
CREATE TABLE departments (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    costCenter NVARCHAR(50)
);

-- Tabela de funcionários
CREATE TABLE employees (
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
    userId NVARCHAR(50) -- Link para user
);

-- Adicionar foreign keys depois de criar todas as tabelas
-- ALTER TABLE employees ADD CONSTRAINT FK_employees_departments FOREIGN KEY (deptId) REFERENCES departments(id);

-- Tabela de presença
CREATE TABLE attendance (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    date DATE,
    clockIn TIME,
    clockOut TIME,
    status NVARCHAR(20)
);

-- Tabela de afastamentos
CREATE TABLE leaves (
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
CREATE TABLE payroll (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    refMonth NVARCHAR(10),
    gross DECIMAL(10,2),
    deductions DECIMAL(10,2),
    net DECIMAL(10,2)
);

-- Tabela de itens da folha
CREATE TABLE payroll_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    payrollId NVARCHAR(50),
    type NVARCHAR(20),
    description NVARCHAR(255),
    amount DECIMAL(10,2)
);

-- Tabela de avaliações
CREATE TABLE reviews (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    period NVARCHAR(20),
    score DECIMAL(3,1),
    notes NVARCHAR(500),
    reviewer NVARCHAR(50)
);

-- Tabela de treinamentos
CREATE TABLE trainings (
    id NVARCHAR(50) PRIMARY KEY,
    title NVARCHAR(255),
    date DATE,
    seats INT,
    enrolled NVARCHAR(MAX) -- JSON array stored as string
);

-- Tabela de vagas
CREATE TABLE jobs (
    id NVARCHAR(50) PRIMARY KEY,
    title NVARCHAR(255),
    deptId NVARCHAR(50),
    openings INT,
    status NVARCHAR(20)
);

-- Tabela de candidatos
CREATE TABLE candidates (
    id NVARCHAR(50) PRIMARY KEY,
    name NVARCHAR(255),
    email NVARCHAR(255),
    jobId NVARCHAR(50),
    stage NVARCHAR(50),
    notes NVARCHAR(500)
);

-- Tabela de configurações
CREATE TABLE settings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    key_name NVARCHAR(100) UNIQUE,
    value_data NVARCHAR(MAX)
);

-- Tabela de documentos
CREATE TABLE documents (
    id NVARCHAR(50) PRIMARY KEY,
    empId NVARCHAR(50),
    type NVARCHAR(50),
    description NVARCHAR(500),
    fileName NVARCHAR(255),
    fileData NVARCHAR(MAX), -- Base64 data
    fileSize BIGINT,
    mimeType NVARCHAR(100),
    uploadDate DATE,
    expirationDate DATE,
    uploadedBy NVARCHAR(255),
    notes NVARCHAR(500)
);

-- Tabela de logs
CREATE TABLE logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    at NVARCHAR(50),
    who NVARCHAR(255),
    action NVARCHAR(100),
    details NVARCHAR(500)
);

-- Inserir configuração inicial
INSERT INTO settings (key_name, value_data) VALUES ('companyName', 'MARH S/A');

-- Adicionar Foreign Keys após criar todas as tabelas
ALTER TABLE employees ADD CONSTRAINT FK_employees_departments 
    FOREIGN KEY (deptId) REFERENCES departments(id);

ALTER TABLE attendance ADD CONSTRAINT FK_attendance_employees 
    FOREIGN KEY (empId) REFERENCES employees(id);

ALTER TABLE leaves ADD CONSTRAINT FK_leaves_employees 
    FOREIGN KEY (empId) REFERENCES employees(id);

ALTER TABLE payroll ADD CONSTRAINT FK_payroll_employees 
    FOREIGN KEY (empId) REFERENCES employees(id);

ALTER TABLE payroll_items ADD CONSTRAINT FK_payrollitems_payroll 
    FOREIGN KEY (payrollId) REFERENCES payroll(id);

ALTER TABLE reviews ADD CONSTRAINT FK_reviews_employees 
    FOREIGN KEY (empId) REFERENCES employees(id);

ALTER TABLE jobs ADD CONSTRAINT FK_jobs_departments 
    FOREIGN KEY (deptId) REFERENCES departments(id);

ALTER TABLE candidates ADD CONSTRAINT FK_candidates_jobs 
    FOREIGN KEY (jobId) REFERENCES jobs(id);

ALTER TABLE documents ADD CONSTRAINT FK_documents_employees 
    FOREIGN KEY (empId) REFERENCES employees(id);

PRINT '✅ Tabelas criadas com sucesso!';
PRINT '✅ Foreign Keys adicionadas!';
