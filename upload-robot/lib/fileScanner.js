/**
 * Scanner de arquivos para processar grandes volumes de documentos
 * Otimizado para lidar com 400GB+ de arquivos de forma eficiente
 */

import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';

export class FileScanner {
  constructor(config) {
    this.config = config;
    this.allowedExtensions = config.search?.extensions || ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    this.maxFileSize = this.parseFileSize(config.maxFileSize || '50MB');
    this.processedFiles = new Set();
    this.stats = {
      totalFiles: 0,
      validFiles: 0,
      skippedFiles: 0,
      totalSize: 0,
      largestFile: { name: '', size: 0 },
      smallestFile: { name: '', size: Infinity },
      extensionCounts: {}
    };
  }

  /**
   * Escaneia um diretório recursivamente em busca de arquivos válidos
   */
  async scanDirectory(directoryPath) {
    console.log(`🔍 Escaneando diretório: ${directoryPath}`);
    
    const files = [];
    await this.scanRecursive(directoryPath, files);
    
    this.printScanStats();
    return files.sort((a, b) => a.name.localeCompare(b.name)); // Ordenar por nome
  }

  /**
   * Escaneamento recursivo otimizado
   */
  async scanRecursive(dir, files) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      // Processar entradas em lotes para não sobrecarregar a memória
      const batchSize = 100;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Recursão para subdiretórios
            await this.scanRecursive(fullPath, files);
          } else if (entry.isFile()) {
            await this.processFile(fullPath, files);
          }
        }));
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao escanear diretório ${dir}: ${error.message}`);
    }
  }

  /**
   * Processa um arquivo individual
   */
  async processFile(filePath, files) {
    try {
      this.stats.totalFiles++;
      
      // Verificar se já foi processado (evitar duplicatas por links simbólicos)
      let fileHash;
      try {
        fileHash = await this.getFileHash(filePath);
      } catch (err) {
        // Se não conseguir gerar hash, ignora o arquivo
        console.warn(`⚠️ Arquivo ignorado (hash): ${filePath}`);
        this.stats.skippedFiles++;
        return;
      }
      if (this.processedFiles.has(fileHash)) {
        this.stats.skippedFiles++;
        return;
      }
      this.processedFiles.add(fileHash);
      
      let stat;
      try {
        stat = await fs.stat(filePath);
      } catch (err) {
        // Se não conseguir acessar o arquivo, ignora
        console.warn(`⚠️ Arquivo ausente ou inacessível ignorado: ${filePath}`);
        this.stats.skippedFiles++;
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);
      
      // Atualizar estatísticas de extensão
      this.stats.extensionCounts[ext] = (this.stats.extensionCounts[ext] || 0) + 1;
      
      // Verificar extensão permitida
      if (!this.allowedExtensions.includes(ext)) {
        this.stats.skippedFiles++;
        return;
      }
      
      // Verificar tamanho do arquivo
      if (stat.size > this.maxFileSize) {
        console.warn(`⚠️ Arquivo muito grande ignorado: ${fileName} (${this.formatFileSize(stat.size)})`);
        this.stats.skippedFiles++;
        return;
      }
      
      if (stat.size === 0) {
        console.warn(`⚠️ Arquivo vazio ignorado: ${fileName}`);
        this.stats.skippedFiles++;
        return;
      }
      
      // Atualizar estatísticas de tamanho
      this.stats.totalSize += stat.size;
      if (stat.size > this.stats.largestFile.size) {
        this.stats.largestFile = { name: fileName, size: stat.size };
      }
      if (stat.size < this.stats.smallestFile.size) {
        this.stats.smallestFile = { name: fileName, size: stat.size };
      }
      
      // Criar objeto do arquivo
      const fileInfo = {
        path: filePath,
        name: fileName,
        extension: ext,
        size: stat.size,
        sizeFormatted: this.formatFileSize(stat.size),
        modified: stat.mtime,
        hash: fileHash,
        relativePath: path.basename(filePath)
      };
      
      files.push(fileInfo);
      this.stats.validFiles++;
      
      // Log a cada 1000 arquivos para acompanhamento
      if (this.stats.totalFiles % 1000 === 0) {
        console.log(`📊 Progresso: ${this.stats.totalFiles} arquivos escaneados, ${this.stats.validFiles} válidos`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Erro ao processar arquivo ${filePath}: ${error.message}`);
      this.stats.skippedFiles++;
    }
  }

  /**
   * Gera hash único do arquivo baseado no caminho e tamanho (rápido)
   */
  async getFileHash(filePath) {
    try {
      const stat = await fs.stat(filePath);
      return crypto.createHash('md5')
        .update(filePath + stat.size + stat.mtime.getTime())
        .digest('hex');
    } catch (error) {
      return crypto.createHash('md5').update(filePath).digest('hex');
    }
  }

  /**
   * Converte string de tamanho para bytes
   */
  parseFileSize(sizeStr) {
    const units = { 'B': 1, 'KB': 1024, 'MB': 1024**2, 'GB': 1024**3, 'TB': 1024**4 };
    const match = sizeStr.toString().toUpperCase().match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B?)$/);
    
    if (!match) throw new Error(`Formato de tamanho inválido: ${sizeStr}`);
    
    const [, size, unit] = match;
    return Math.floor(parseFloat(size) * (units[unit] || units.B));
  }

  /**
   * Formata bytes em formato legível
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex > 0 ? 2 : 0)} ${units[unitIndex]}`;
  }

  /**
   * Imprime estatísticas do escaneamento
   */
  printScanStats() {
    console.log('\n📊 ESTATÍSTICAS DO ESCANEAMENTO');
    console.log('─'.repeat(50));
    console.log(`📁 Total de arquivos encontrados: ${this.stats.totalFiles}`);
    console.log(`✅ Arquivos válidos: ${this.stats.validFiles}`);
    console.log(`⏭️ Arquivos ignorados: ${this.stats.skippedFiles}`);
    console.log(`💾 Tamanho total: ${this.formatFileSize(this.stats.totalSize)}`);
    
    if (this.stats.largestFile.size > 0) {
      console.log(`📏 Maior arquivo: ${this.stats.largestFile.name} (${this.formatFileSize(this.stats.largestFile.size)})`);
    }
    
    if (this.stats.smallestFile.size < Infinity) {
      console.log(`📐 Menor arquivo: ${this.stats.smallestFile.name} (${this.formatFileSize(this.stats.smallestFile.size)})`);
    }
    
    console.log('\n📋 Arquivos por extensão:');
    Object.entries(this.stats.extensionCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([ext, count]) => {
        const percentage = ((count / this.stats.totalFiles) * 100).toFixed(1);
        console.log(`  ${ext.padEnd(6)}: ${count.toString().padStart(6)} (${percentage}%)`);
      });
    
    console.log('─'.repeat(50));
  }

  /**
   * Filtra arquivos por critérios específicos
   */
  filterFiles(files, criteria = {}) {
    return files.filter(file => {
      // Filtro por extensão
      if (criteria.extensions && !criteria.extensions.includes(file.extension)) {
        return false;
      }
      
      // Filtro por tamanho mínimo/máximo
      if (criteria.minSize && file.size < criteria.minSize) {
        return false;
      }
      if (criteria.maxSize && file.size > criteria.maxSize) {
        return false;
      }
      
      // Filtro por data de modificação
      if (criteria.modifiedAfter && file.modified < criteria.modifiedAfter) {
        return false;
      }
      if (criteria.modifiedBefore && file.modified > criteria.modifiedBefore) {
        return false;
      }
      
      // Filtro por padrão de nome
      if (criteria.namePattern && !criteria.namePattern.test(file.name)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Agrupa arquivos por diretório
   */
  groupByDirectory(files) {
    const groups = {};
    
    files.forEach(file => {
      const dir = path.dirname(file.relativePath);
      if (!groups[dir]) {
        groups[dir] = [];
      }
      groups[dir].push(file);
    });
    
    return groups;
  }

  /**
   * Detecta possíveis duplicatas baseado em nome e tamanho
   */
  findPossibleDuplicates(files) {
    const duplicates = {};
    
    files.forEach(file => {
      const key = `${file.name}_${file.size}`;
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(file);
    });
    
    // Retornar apenas grupos com mais de um arquivo
    return Object.fromEntries(
      Object.entries(duplicates).filter(([, files]) => files.length > 1)
    );
  }
}

export default FileScanner;
