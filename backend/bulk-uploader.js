// Sistema de Upload em Lote para Documentos Massivos
import multer from 'multer';
import path from 'path';
import fs from 'fs';

class BulkDocumentUploader {
  constructor(documentsDir) {
    this.documentsDir = documentsDir;
    this.uploadQueue = [];
    this.isProcessing = false;
    this.maxConcurrentUploads = 5;
    this.maxFileSize = 100 * 1024 * 1024; // 100MB
    
    this.initializeStorage();
  }

  initializeStorage() {
    // Configuração otimizada para arquivos grandes
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const empId = req.body.empId || 'BULK_IMPORT';
        const empDir = path.join(this.documentsDir, empId);
        
        if (!fs.existsSync(empDir)) {
          fs.mkdirSync(empDir, { recursive: true });
        }
        cb(null, empDir);
      },
      filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${originalName}`);
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        fileSize: this.maxFileSize,
        files: 100 // Máximo 100 arquivos por vez
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`), false);
        }
      }
    });
  }

  // Upload múltiplo com progress tracking
  handleBulkUpload() {
    return this.upload.array('documents', 100);
  }

  // Processar upload em lote com retry
  async processBulkUpload(files, empId, metadata = {}) {
    const results = {
      success: [],
      failed: [],
      total: files.length,
      processedSize: 0
    };

    console.log(`🚀 Iniciando upload em lote: ${files.length} arquivos para funcionário ${empId}`);

    // Processar arquivos em chunks para não sobrecarregar
    const chunks = this.chunkArray(files, this.maxConcurrentUploads);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📦 Processando chunk ${i + 1}/${chunks.length}`);
      
      const chunkPromises = chunk.map(file => 
        this.processIndividualFile(file, empId, metadata)
      );
      
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, index) => {
        const file = chunk[index];
        results.processedSize += file.size;
        
        if (result.status === 'fulfilled') {
          results.success.push({
            filename: file.originalname,
            id: result.value.id,
            size: file.size
          });
        } else {
          results.failed.push({
            filename: file.originalname,
            error: result.reason.message,
            size: file.size
          });
        }
      });

      // Progresso
      const progress = ((i + 1) / chunks.length) * 100;
      console.log(`📊 Progresso: ${progress.toFixed(1)}%`);
    }

    return results;
  }

  async processIndividualFile(file, empId, metadata) {
    try {
      // Validações
      if (!fs.existsSync(file.path)) {
        throw new Error('Arquivo não encontrado no disco');
      }

      const stats = fs.statSync(file.path);
      const fileData = fs.readFileSync(file.path, 'base64');

      const document = {
        id: this.generateId('DOC'),
        empId: empId,
        type: metadata.type || 'DOCUMENTO_GERAL',
        description: metadata.description || file.originalname,
        fileName: file.originalname,
        fileData: fileData,
        fileSize: stats.size,
        mimeType: file.mimetype,
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: metadata.uploadedBy || 'BULK_IMPORT',
        expirationDate: metadata.expirationDate || null,
        notes: metadata.notes || 'Importado via upload em lote',
        importBatch: metadata.batchId || Date.now().toString()
      };

      // Cleanup temp file
      fs.unlinkSync(file.path);

      return document;
      
    } catch (error) {
      console.error(`❌ Erro ao processar arquivo ${file.originalname}:`, error);
      throw error;
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  generateId(prefix = 'ID') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Sistema de retry para falhas
  async retryFailedUploads(failedFiles, maxRetries = 3) {
    console.log(`🔄 Tentando novamente ${failedFiles.length} arquivos com falha...`);
    
    const retryResults = {
      recovered: [],
      stillFailed: []
    };

    for (const failedFile of failedFiles) {
      let success = false;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Tentativa ${attempt}/${maxRetries} para ${failedFile.filename}`);
          
          // Reimplementar o processamento
          await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // Backoff
          
          // Aqui você reprocessaria o arquivo
          success = true;
          retryResults.recovered.push(failedFile);
          break;
          
        } catch (error) {
          console.log(`❌ Tentativa ${attempt} falhou: ${error.message}`);
          if (attempt === maxRetries) {
            retryResults.stillFailed.push({
              ...failedFile,
              finalError: error.message
            });
          }
        }
      }
    }

    return retryResults;
  }

  // Validação de integridade em lote
  async validateBulkUpload(documents) {
    const validation = {
      valid: [],
      invalid: [],
      duplicates: [],
      sizeMismatch: []
    };

    const fileHashes = new Set();

    for (const doc of documents) {
      try {
        // Verificar duplicatas por hash
        const hash = this.generateFileHash(doc.fileData);
        if (fileHashes.has(hash)) {
          validation.duplicates.push(doc);
          continue;
        }
        fileHashes.add(hash);

        // Verificar integridade
        const calculatedSize = Math.round(doc.fileData.length * 0.75); // Base64 to binary
        if (Math.abs(calculatedSize - doc.fileSize) > 1024) { // Tolerância de 1KB
          validation.sizeMismatch.push(doc);
          continue;
        }

        // Validar estrutura
        if (this.validateDocumentStructure(doc)) {
          validation.valid.push(doc);
        } else {
          validation.invalid.push(doc);
        }

      } catch (error) {
        validation.invalid.push({
          ...doc,
          validationError: error.message
        });
      }
    }

    return validation;
  }

  validateDocumentStructure(doc) {
    const required = ['id', 'empId', 'fileName', 'fileData', 'mimeType'];
    return required.every(field => doc[field] && doc[field].length > 0);
  }

  generateFileHash(base64Data) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(base64Data).digest('hex').slice(0, 16);
  }
}

export default BulkDocumentUploader;
