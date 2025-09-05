/**
 * SCRIPT DE MIGRAÇÃO: BANCO → FTP
 * 
 * Este script exporta todos os documentos do banco SQL Server
 * para o disco web via FTP e atualiza as URLs no banco.
 */

import { loadFromDB, updateInDB } from '../backend/utils/dbHelpers.js';
import { Client } from 'basic-ftp';
import fs from 'fs-extra';
import path from 'path';

// Configurações FTP
const FTP_CONFIG = {
  host: 'ftp.grupoworklife.com.br',
  user: 'grupoworklife', // mesmo usuário mostrado na tela
  password: '', // você precisa fornecer a senha FTP
  secure: false
};

// Configurações de URL
const BASE_URL = 'https://grupoworklife.com.br/docs';
const FTP_DOCS_PATH = '/public_html/docs'; // pasta no FTP onde salvar os documentos

class DocumentMigrator {
  constructor() {
    this.ftpClient = new Client();
    this.migrated = 0;
    this.errors = 0;
  }

  async initialize() {
    console.log('🚀 Iniciando migração de documentos do banco para FTP...');
    
    // Conectar ao FTP
    try {
      await this.ftpClient.access(FTP_CONFIG);
      console.log('✅ Conectado ao FTP');
    } catch (error) {
      console.error('❌ Erro ao conectar FTP:', error.message);
      throw error;
    }

    // Criar pasta de documentos no FTP se não existir
    try {
      await this.ftpClient.ensureDir(FTP_DOCS_PATH);
      console.log('✅ Pasta docs criada/verificada no FTP');
    } catch (error) {
      console.warn('⚠️ Erro ao criar pasta:', error.message);
    }
  }

  async migrateAllDocuments() {
    console.log('📋 Carregando documentos do banco...');
    
    // Carregar todos os documentos que têm fileData
    const documents = await loadFromDB('documents', 'WHERE fileData IS NOT NULL');
    console.log(`📊 Encontrados ${documents.length} documentos para migrar`);

    if (documents.length === 0) {
      console.log('✅ Nenhum documento para migrar');
      return;
    }

    // Migrar cada documento
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`\n📄 Migrando ${i + 1}/${documents.length}: ${doc.fileName}`);
      
      try {
        await this.migrateDocument(doc);
        this.migrated++;
        console.log(`✅ Migrado: ${doc.fileName}`);
      } catch (error) {
        this.errors++;
        console.error(`❌ Erro em ${doc.fileName}: ${error.message}`);
      }
    }

    console.log(`\n📊 MIGRAÇÃO CONCLUÍDA:`);
    console.log(`✅ Migrados: ${this.migrated}`);
    console.log(`❌ Erros: ${this.errors}`);
  }

  async migrateDocument(document) {
    // Gerar nome único para o arquivo
    const sanitizedFileName = this.sanitizeFileName(document.fileName);
    const uniqueFileName = `${document.id}_${sanitizedFileName}`;
    const ftpFilePath = `${FTP_DOCS_PATH}/${uniqueFileName}`;
    const publicUrl = `${BASE_URL}/${uniqueFileName}`;

    // Converter base64 para buffer
    const fileBuffer = Buffer.from(document.fileData, 'base64');

    // Upload para FTP
    await this.ftpClient.uploadFrom(
      Buffer.from(fileBuffer), 
      ftpFilePath
    );

    // Atualizar registro no banco (remover fileData e adicionar URL)
    await updateInDB('documents', 
      { 
        fileUrl: publicUrl,
        fileData: null // limpar o campo fileData para liberar espaço
      }, 
      `WHERE id = '${document.id}'`
    );
  }

  sanitizeFileName(fileName) {
    // Remove caracteres especiais e espaços
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  async cleanup() {
    if (this.ftpClient) {
      this.ftpClient.close();
      console.log('🧹 Conexão FTP fechada');
    }
  }
}

// Script principal
async function main() {
  const migrator = new DocumentMigrator();
  
  try {
    await migrator.initialize();
    await migrator.migrateAllDocuments();
  } catch (error) {
    console.error('💥 ERRO FATAL:', error.message);
    process.exit(1);
  } finally {
    await migrator.cleanup();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`)) {
  main().catch(console.error);
}

export { DocumentMigrator };
