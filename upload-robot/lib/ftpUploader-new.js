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
    this.client.ftp.verbose = true;
    this.connected = false;
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
    await this.connect();
    
    // Gerar nome único para o arquivo
    const extension = path.extname(originalFileName);
    const baseName = path.basename(originalFileName, extension);
    const sanitizedName = this.sanitizeFileName(baseName);
    const uniqueFileName = `${employeeId}_${Date.now()}_${sanitizedName}${extension}`;
    
    const remotePath = `${this.config.remotePath}/${uniqueFileName}`;
    const publicUrl = `${this.config.baseUrl}/${uniqueFileName}`;
    
    try {
      // Upload do arquivo
      await this.client.uploadFrom(filePath, remotePath);
      
      const stats = await fs.stat(filePath);
      
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
    if (this.connected) {
      this.client.close();
      this.connected = false;
      console.log('🧹 Desconectado do FTP');
    }
  }
}
