# Robô PDF → SQL (JS puro)

Este robô lê **PDFs**, tenta identificar o **nome do paciente** no conteúdo (com padrões flexíveis)
e insere o PDF **diretamente no banco SQL** (BLOB), vinculando ao **prontuário** correspondente.

Compatível com **MySQL/MariaDB** (padrão) e **SQL Server (MSSQL)**. Preparado para usar o banco do **mco2**.

## Estrutura

```
robot-pdf-prontuario-js/
  ├─ src/
  │  ├─ index.js
  │  └─ lib/
  │     ├─ db.js
  │     ├─ nameExtract.js
  │     └─ similarity.js
  ├─ pdfs/              # coloque seus PDFs aqui
  ├─ .env               # suas credenciais (baseado no .env.example)
  ├─ .env.example
  └─ package.json
```

## Pré-requisitos

- Node.js 18+
- Acesso ao banco de dados (host/porta liberados no mco2)
- Tabelas conforme mapeamento abaixo

## Instalação

```bash
npm install
cp .env.example .env
# edite o .env com as credenciais do seu banco no mco2
```

## Execução

Coloque os PDFs na pasta `./pdfs` e rode:

```bash
npm start
```

## Modelos de Tabelas (DDL)

### MySQL/MariaDB

```sql
CREATE TABLE IF NOT EXISTS prontuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  arquivo LONGBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id)
);
```

### SQL Server (MSSQL)

```sql
CREATE TABLE prontuarios (
  id INT IDENTITY(1,1) PRIMARY KEY,
  nome NVARCHAR(255) NOT NULL
);

CREATE TABLE documentos (
  id INT IDENTITY(1,1) PRIMARY KEY,
  prontuario_id INT NOT NULL,
  nome_arquivo NVARCHAR(255) NOT NULL,
  mime_type NVARCHAR(100) NOT NULL,
  arquivo VARBINARY(MAX) NOT NULL,
  created_at DATETIME2 DEFAULT SYSDATETIME(),
  FOREIGN KEY (prontuario_id) REFERENCES prontuarios(id)
);
```
