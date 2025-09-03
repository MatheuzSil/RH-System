#!/usr/bin/env node

// Script CLI para importação massiva de documentos
// Uso: node bulk-import.js [diretório] [opções]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import DocumentStorageOptimizer from './storage-optimization.js';
import BulkDocumentUploader from './bulk-uploader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MassiveDocumentImporter {
  constructor() {
    this.optimizer = new DocumentStorageOptimizer();
    this.uploader = new BulkDocumentUploader(path.join(__dirname, '../documents'));
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      totalSize: 0,
      processedSize: 0,
      errors: 0,
      startTime: Date.now(),
      employeesProcessed: new Set()
    };
  }

  async importDirectory(sourceDir, options = {}) {
    console.log('🚀 MARH - Importador Massivo de Documentos');
    console.log('='.repeat(50));
    console.log(`📂 Diretório origem: ${sourceDir}`);
    console.log(`⚙️  Opções: ${JSON.stringify(options, null, 2)}`);
    console.log('');

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Diretório não encontrado: ${sourceDir}`);
    }

    // Fase 1: Análise inicial
    console.log('🔍 Fase 1: Analisando estrutura de arquivos...');
    await this.analyzeDirectory(sourceDir);
    
    // Fase 2: Validação
    console.log('✅ Fase 2: Validando arquivos...');
    const validationResult = await this.validateFiles(sourceDir);
    
    if (validationResult.errors.length > 0 && !options.ignoreErrors) {
      console.error('❌ Erros encontrados na validação:');
      validationResult.errors.forEach(error => console.error(`  - ${error}`));
      throw new Error('Validação falhou. Use --ignore-errors para prosseguir.');
    }

    // Fase 3: Importação
    console.log('📤 Fase 3: Iniciando importação...');
    await this.processImport(sourceDir, options);

    // Fase 4: Relatório final
    this.generateReport();
  }

  async analyzeDirectory(dir) {
    const analyze = (currentDir, level = 0) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Detectar estrutura: /EMP001/, /funcionarios/123/, etc.
          const empId = this.extractEmployeeIdFromPath(itemPath);
          if (empId) {
            this.stats.employeesProcessed.add(empId);
          }
          analyze(itemPath, level + 1);
        } else if (stat.isFile()) {
          this.stats.totalFiles++;
          this.stats.totalSize += stat.size;
        }
      }
    };

    analyze(dir);

    console.log(`📊 Estatísticas iniciais:`);
    console.log(`   📁 Funcionários detectados: ${this.stats.employeesProcessed.size}`);
    console.log(`   📄 Total de arquivos: ${this.stats.totalFiles}`);
    console.log(`   💾 Tamanho total: ${this.formatSize(this.stats.totalSize)}`);
    console.log(`   ⏱️  Tempo estimado: ${this.estimateTime()}`);
    console.log('');
  }

  async validateFiles(dir) {
    const errors = [];
    const warnings = [];
    
    const validate = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          validate(itemPath);
        } else if (stat.isFile()) {
          try {
            // Validar extensão
            const ext = path.extname(item).toLowerCase();
            const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.xls', '.xlsx'];
            
            if (!allowedExtensions.includes(ext)) {
              warnings.push(`Extensão não suportada: ${itemPath}`);
            }

            // Validar tamanho
            if (stat.size > 100 * 1024 * 1024) { // 100MB
              warnings.push(`Arquivo muito grande (${this.formatSize(stat.size)}): ${itemPath}`);
            }

            if (stat.size === 0) {
              errors.push(`Arquivo vazio: ${itemPath}`);
            }

            // Validar nome
            if (item.includes('..') || /[<>:"|?*]/.test(item)) {
              errors.push(`Nome de arquivo inválido: ${itemPath}`);
            }

          } catch (error) {
            errors.push(`Erro ao validar ${itemPath}: ${error.message}`);
          }
        }
      }
    };

    validate(dir);

    console.log(`📋 Validação completa:`);
    console.log(`   ✅ Arquivos válidos: ${this.stats.totalFiles - errors.length}`);
    console.log(`   ❌ Erros: ${errors.length}`);
    console.log(`   ⚠️  Avisos: ${warnings.length}`);
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Avisos encontrados:');
      warnings.slice(0, 10).forEach(warning => console.log(`   ${warning}`));
      if (warnings.length > 10) {
        console.log(`   ... e mais ${warnings.length - 10} avisos`);
      }
    }
    
    console.log('');

    return { errors, warnings };
  }

  async processImport(dir, options) {
    const batchSize = options.batchSize || 50;
    const files = this.getAllFiles(dir);
    const batches = this.createBatches(files, batchSize);
    
    console.log(`🔄 Processando ${files.length} arquivos em ${batches.length} lotes de ${batchSize}...`);
    
    const logFile = path.join(__dirname, `import-log-${Date.now()}.txt`);
    const errorFile = path.join(__dirname, `import-errors-${Date.now()}.txt`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchId = `BATCH_${Date.now()}_${i}`;
      
      console.log(`\n📦 Processando lote ${i + 1}/${batches.length} (${batch.length} arquivos)`);
      
      try {
        const result = await this.processBatch(batch, batchId, options);
        
        // Log de sucesso
        const logEntry = `[${new Date().toISOString()}] Lote ${i + 1}: ${result.success} sucessos, ${result.failed} falhas\n`;
        fs.appendFileSync(logFile, logEntry);
        
        this.stats.processedFiles += batch.length;
        this.updateProgress();
        
        // Pausa entre lotes para não sobrecarregar
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, options.delay || 1000));
        }
        
      } catch (error) {
        console.error(`❌ Erro no lote ${i + 1}:`, error.message);
        this.stats.errors++;
        
        // Log de erro
        const errorEntry = `[${new Date().toISOString()}] Lote ${i + 1} FALHOU: ${error.message}\n`;
        fs.appendFileSync(errorFile, errorEntry);
        
        if (!options.continueOnError) {
          throw error;
        }
      }
    }
    
    console.log(`\n📋 Logs salvos em:`);
    console.log(`   ✅ Sucessos: ${logFile}`);
    console.log(`   ❌ Erros: ${errorFile}`);
  }

  async processBatch(files, batchId, options) {
    let success = 0;
    let failed = 0;
    const documentsToInsert = [];
    
    for (const filePath of files) {
      try {
        const empId = this.extractEmployeeIdFromPath(filePath);
        const stat = fs.statSync(filePath);
        
        // Ler arquivo e converter para base64
        const fileBuffer = fs.readFileSync(filePath);
        const fileData = fileBuffer.toString('base64');
        
        const document = {
          id: this.generateId('DOC'),
          empId: empId,
          fileName: path.basename(filePath),
          fileData: fileData,
          fileSize: stat.size,
          mimeType: this.getMimeType(filePath),
          uploadDate: new Date().toISOString().split('T')[0],
          type: options.defaultType || 'DOCUMENTO_IMPORTADO',
          description: `Importado via CLI - ${path.basename(filePath)}`,
          batchId: batchId,
          uploadedBy: 'CLI_IMPORT',
          importedAt: new Date().toISOString(),
          expirationDate: null,
          notes: `Importação em lote - Arquivo original: ${filePath}`
        };
        
        documentsToInsert.push(document);
        success++;
        this.stats.processedSize += stat.size;
        
        if (options.verbose) {
          console.log(`   ✅ ${path.basename(filePath)} (${empId}) - ${this.formatSize(stat.size)}`);
        }
        
      } catch (error) {
        failed++;
        console.log(`   ❌ ${path.basename(filePath)}: ${error.message}`);
      }
    }
    
    // Inserir todos os documentos do lote no SQL Server
    if (documentsToInsert.length > 0) {
      try {
        console.log(`💾 Salvando ${documentsToInsert.length} documentos no SQL Server...`);
        
        if (options.dryRun) {
          console.log(`🧪 [DRY-RUN] Simularia inserção de ${documentsToInsert.length} documentos`);
        } else {
          // Importar função do dbHelpers
          const { insertDocumentsBulk } = await import('./utils/dbHelpers.js');
          await insertDocumentsBulk(documentsToInsert);
          console.log(`✅ ${documentsToInsert.length} documentos salvos no SQL Server`);
        }
      } catch (error) {
        console.error(`❌ Erro ao salvar lote no SQL Server:`, error.message);
        
        if (!options.continueOnError) {
          throw error;
        }
        
        // Marcar todos como falharam
        failed += success;
        success = 0;
      }
    }
    
    return { success, failed };
  }

  getAllFiles(dir) {
    const files = [];
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scan(itemPath);
        } else if (stat.isFile()) {
          files.push(itemPath);
        }
      }
    };
    
    scan(dir);
    return files;
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  extractEmployeeIdFromPath(filePath) {
    // Tentar extrair ID de diferentes padrões:
    // /path/to/EMP001/documento.pdf -> EMP001
    // /path/to/funcionarios/12345/documento.pdf -> 12345
    // /path/to/12345_nome.pdf -> 12345
    
    const patterns = [
      /[\\/]([A-Z]{3}\d+)[\\/]/,          // EMP001, FUN123, etc.
      /[\\/]funcionarios?[\\/](\d+)[\\/]/,  // /funcionarios/123/
      /[\\/]employees?[\\/](\d+)[\\/]/,     // /employees/123/
      /[\\/](\d+)[\\/]/,                    // /123/
      /^(\d+)_/,                           // 123_documento.pdf
      /([A-Z]\d+)_/                        // A123_documento.pdf
    ];
    
    for (const pattern of patterns) {
      const match = filePath.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    // Fallback: usar nome da pasta pai
    const parentDir = path.basename(path.dirname(filePath));
    return parentDir !== '.' ? parentDir : 'UNKNOWN';
  }

  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  estimateTime() {
    const avgSpeed = 50 * 1024 * 1024; // 50MB/s estimado
    const timeSeconds = this.stats.totalSize / avgSpeed;
    
    if (timeSeconds < 60) return `${Math.round(timeSeconds)}s`;
    if (timeSeconds < 3600) return `${Math.round(timeSeconds / 60)}min`;
    return `${Math.round(timeSeconds / 3600)}h`;
  }

  updateProgress() {
    const progress = (this.stats.processedFiles / this.stats.totalFiles) * 100;
    const sizeProgress = (this.stats.processedSize / this.stats.totalSize) * 100;
    const elapsed = Date.now() - this.stats.startTime;
    const speed = this.stats.processedSize / (elapsed / 1000);
    
    console.log(`📊 Progresso: ${progress.toFixed(1)}% arquivos, ${sizeProgress.toFixed(1)}% dados, ${this.formatSize(speed)}/s`);
  }

  generateReport() {
    const elapsed = Date.now() - this.stats.startTime;
    const avgSpeed = this.stats.processedSize / (elapsed / 1000);
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RELATÓRIO FINAL DA IMPORTAÇÃO');
    console.log('='.repeat(50));
    console.log(`✅ Arquivos processados: ${this.stats.processedFiles}/${this.stats.totalFiles}`);
    console.log(`💾 Dados processados: ${this.formatSize(this.stats.processedSize)}/${this.formatSize(this.stats.totalSize)}`);
    console.log(`👥 Funcionários: ${this.stats.employeesProcessed.size}`);
    console.log(`❌ Erros: ${this.stats.errors}`);
    console.log(`⏱️  Tempo total: ${this.formatTime(elapsed)}`);
    console.log(`🚀 Velocidade média: ${this.formatSize(avgSpeed)}/s`);
    
    if (this.stats.processedFiles === this.stats.totalFiles) {
      console.log('\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
    } else {
      console.log('\n⚠️  IMPORTAÇÃO INCOMPLETA - Verifique os logs de erro');
    }
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}min ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
    return `${seconds}s`;
  }

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
📁 MARH - Importador Massivo de Documentos (SQL Server)

Uso: node bulk-import.js [diretório] [opções]

Opções:
  --batch-size [num]     Arquivos por lote (padrão: 50)
  --delay [ms]          Delay entre lotes em ms (padrão: 1000)
  --default-type [tipo] Tipo padrão dos documentos (padrão: DOCUMENTO_IMPORTADO)
  --ignore-errors       Continuar mesmo com erros
  --continue-on-error   Não parar em erros de lote
  --verbose             Log detalhado
  --dry-run            Simular sem alterar dados (SQL)

Variáveis de Ambiente:
  USE_SQL=true          Usar SQL Server (obrigatório para produção)
  DB_SERVER=servidor    Servidor SQL Server
  DB_USER=usuario       Usuário do banco
  DB_PASSWORD=senha     Senha do banco

Exemplos:
  node bulk-import.js ./documentos
  node bulk-import.js ./documentos --batch-size 100 --verbose
  node bulk-import.js ./documentos --dry-run --default-type CONTRATO
  USE_SQL=true node bulk-import.js ./documentos --batch-size 25
    `);
    return;
  }

  const sourceDir = args[0];
  const options = {
    batchSize: parseInt(args.find(arg => args[args.indexOf(arg) - 1] === '--batch-size')) || 50,
    delay: parseInt(args.find(arg => args[args.indexOf(arg) - 1] === '--delay')) || 1000,
    ignoreErrors: args.includes('--ignore-errors'),
    continueOnError: args.includes('--continue-on-error'),
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run')
  };

  try {
    const importer = new MassiveDocumentImporter();
    await importer.importDirectory(sourceDir, options);
    process.exit(0);
  } catch (error) {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default MassiveDocumentImporter;
