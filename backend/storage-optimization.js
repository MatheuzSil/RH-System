// Sistema de Otimização de Armazenamento para Documentos
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

class DocumentStorageOptimizer {
  constructor(basePath = './documents') {
    this.basePath = basePath;
    this.maxFileSize = 50 * 1024 * 1024; // 50MB por arquivo
    this.chunkSize = 10 * 1024 * 1024; // 10MB por chunk
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    const dirs = [
      path.join(this.basePath, 'employees'),
      path.join(this.basePath, 'chunks'),
      path.join(this.basePath, 'indexes'),
      path.join(this.basePath, 'temp')
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // Gerar hash único para deduplicação
  generateFileHash(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  // Dividir arquivo grande em chunks
  splitLargeFile(filePath, fileName) {
    const stats = fs.statSync(filePath);
    
    if (stats.size <= this.maxFileSize) {
      return { chunks: [filePath], metadata: { originalSize: stats.size, chunks: 1 } };
    }

    const chunks = [];
    const fileBuffer = fs.readFileSync(filePath);
    const totalChunks = Math.ceil(fileBuffer.length / this.chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, fileBuffer.length);
      const chunk = fileBuffer.slice(start, end);
      
      const chunkPath = path.join(this.basePath, 'chunks', `${fileName}_chunk_${i}`);
      fs.writeFileSync(chunkPath, chunk);
      chunks.push(chunkPath);
    }

    return { 
      chunks, 
      metadata: { 
        originalSize: stats.size, 
        chunks: totalChunks,
        chunkSize: this.chunkSize
      } 
    };
  }

  // Sistema de índices para busca rápida
  createIndex(employeeId, documentId, metadata) {
    const indexPath = path.join(this.basePath, 'indexes', `${employeeId}.json`);
    let index = {};
    
    if (fs.existsSync(indexPath)) {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    }
    
    index[documentId] = {
      ...metadata,
      indexed_at: new Date().toISOString(),
      file_hash: this.generateFileHash(Buffer.from(metadata.fileName))
    };
    
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    return index;
  }

  // Compressão inteligente
  compressDocument(buffer) {
    // Implementar compressão baseada no tipo de arquivo
    // PDF já são comprimidos, mas podemos otimizar metadados
    return buffer; // Placeholder
  }

  // Migração em lote
  async batchMigration(documentsPath, batchSize = 100) {
    const files = fs.readdirSync(documentsPath);
    const batches = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    console.log(`📦 Processando ${files.length} arquivos em ${batches.length} lotes...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`🔄 Processando lote ${i + 1}/${batches.length} (${batch.length} arquivos)`);
      
      await this.processBatch(batch, documentsPath);
      
      // Pausa entre lotes para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Migração em lote concluída!');
  }

  async processBatch(batch, sourcePath) {
    for (const fileName of batch) {
      try {
        const filePath = path.join(sourcePath, fileName);
        const stats = fs.statSync(filePath);
        
        // Extrair ID do funcionário do nome do arquivo ou estrutura de diretório
        const employeeId = this.extractEmployeeId(fileName);
        
        const { chunks, metadata } = this.splitLargeFile(filePath, fileName);
        this.createIndex(employeeId, fileName, {
          ...metadata,
          originalPath: filePath,
          chunks: chunks.length,
          fileSize: stats.size
        });
        
        console.log(`✅ ${fileName} processado (${chunks.length} chunks)`);
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${fileName}:`, error.message);
      }
    }
  }

  extractEmployeeId(fileName) {
    // Implementar lógica para extrair ID do funcionário
    // Exemplos: "EMP001_documento.pdf" -> "EMP001"
    //          "funcionarios/123/contrato.pdf" -> "123"
    const match = fileName.match(/^([A-Z0-9]+)_/) || fileName.match(/\/(\d+)\//);
    return match ? match[1] : 'UNKNOWN';
  }
}

export default DocumentStorageOptimizer;
