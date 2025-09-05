/**
 * FTP UPLOADER - Módulo para upload de arquivos via FTP
 */

import { Client } from 'basic-ftp';
import path from 'path';
import fs from 'fs-extra';

export class FTPUploader {
  constructor(config) {
    this.config = {
      host: 'ftp.grupoworklife.com.br',
      port: 21,
      user: 'grupoworklife',
      password: 'P14vv4WP]Fnr', // Senha correta
      secure: false,
      baseUrl: 'https://grupoworklife.com.br/docs',
      remotePath: '/www/docs', // Caminho correto: /www/docs
      ...config
    };
    
    this.client = new Client();
    this.client.ftp.verbose = false; // Desabilitar logs para performance
    this.connected = false;
    this.isUploading = false; // Flag para controlar uploads simultâneos
    this.uploadQueue = []; // Fila de uploads
  }

  async connect() {
    if (this.connected) return;
    
    try {
      await this.client.access(this.config);
      await this.client.ensureDir(this.config.remotePath);
      this.connected = true;
      console.log('✅ Conectado ao FTP e pasta criada');
    } catch (error) {
      console.error('❌ Erro ao conectar FTP:', error.message);
      throw error;
    }
  }

  async uploadFile(filePath, employeeId, originalFileName) {
    // Adiciona upload à fila
    return new Promise((resolve, reject) => {
      this.uploadQueue.push({ filePath, employeeId, originalFileName, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return;
    }

    this.isUploading = true;

    try {
      // Garantir conexão única
      if (!this.connected) {
        await this.connect();
      }

      // Processar uploads sequencialmente
      while (this.uploadQueue.length > 0) {
        const { filePath, employeeId, originalFileName, resolve, reject } = this.uploadQueue.shift();
        
        try {
          const result = await this._uploadSingle(filePath, employeeId, originalFileName);
          resolve(result);
        } catch (error) {
          reject(error);
        }

        // Pequena pausa entre uploads para não sobrecarregar o FTP
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      // Rejeitar todos os uploads pendentes
      while (this.uploadQueue.length > 0) {
        const { reject } = this.uploadQueue.shift();
        reject(error);
      }
      
      // Tentar reconectar na próxima vez
      this.connected = false;
      this.client.close();
    } finally {
      this.isUploading = false;
    }
  }

  async _uploadSingle(filePath, employeeId, originalFileName) {
    // Gerar nome único para o arquivo
    const extension = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, extension);
    const sanitizedName = this.sanitizeFileName(baseName);
    const uniqueFileName = `${employeeId}_${Date.now()}_${sanitizedName}${extension}`;
    
    const remotePath = `${this.config.remotePath}/${uniqueFileName}`;
    const publicUrl = `${this.config.baseUrl}/${uniqueFileName}`;
    
    try {
      console.log(`📤 Enviando: ${originalFileName} → ${uniqueFileName}`);
      
      // Upload do arquivo
      await this.client.uploadFrom(filePath, remotePath);
      
      const stats = await fs.stat(filePath);
      
      console.log(`✅ Upload concluído: ${uniqueFileName}`);
      
      return {
        success: true,
        fileName: uniqueFileName,
        url: publicUrl,
        size: stats.size
      };
      
    } catch (error) {
      console.error(`❌ Erro no upload FTP de ${originalFileName}:`, error.message);
      throw error;
    }
  }

  sanitizeFileName(fileName) {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  async disconnect() {
    // Aguardar todos os uploads da fila terminarem
    while (this.uploadQueue.length > 0 || this.isUploading) {
      console.log(`⏳ Aguardando ${this.uploadQueue.length} uploads na fila...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (this.connected) {
      this.client.close();
      this.connected = false;
      console.log('🧹 Desconectado do FTP');
    }
  }
}
