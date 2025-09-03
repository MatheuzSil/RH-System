/**
 * Gerenciador de upload massivo de documentos
 * Otimizado para lidar com grandes volumes de arquivos e matching inteligente
 */

import fs from 'fs-extra';
import path from 'path';
import pdf from 'pdf-parse';
import { extractCandidates, extractIdentifiers } from './nameExtract.js';
import { bestMatch, identifiersMatch } from './similarity.js';
import { sql } from '../../backend/config/database.js';

export class UploadManager {
  constructor(pool, config, employees) {
    this.pool = pool;
    this.config = config;
    this.employees = employees;
    this.uploadedFiles = new Set();
    this.matchCache = new Map();
    this.stats = {
      processed: 0,
      matched: 0,
      uploaded: 0,
      errors: 0,
      duplicates: 0
    };
  }

  /**
   * Faz upload de um arquivo individual
   */
  async uploadFile(fileInfo) {
    try {
      // Verificar se já foi processado
      if (this.uploadedFiles.has(fileInfo.hash)) {
        this.stats.duplicates++;
        return { success: false, reason: 'duplicate', employee: null };
      }

      // Tentar encontrar colaborador correspondente
      const employee = await this.findMatchingEmployee(fileInfo);
      
      if (!employee) {
        console.warn(`⚠️ Nenhum colaborador encontrado para: ${fileInfo.name}`);
        return { success: true, matched: false, employee: null };
      }

      // Fazer upload do documento
      const uploadResult = await this.insertDocument(fileInfo, employee);
      
      if (uploadResult.success) {
        this.uploadedFiles.add(fileInfo.hash);
        this.stats.uploaded++;
        this.stats.matched++;
        
        console.log(`✅ ${fileInfo.name} → ${employee.name} (${uploadResult.matchReason})`);
        return { success: true, matched: true, employee: employee, matchReason: uploadResult.matchReason };
      } else {
        this.stats.errors++;
        return { success: false, reason: uploadResult.error, employee: employee };
      }

    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Erro no upload de ${fileInfo.name}: ${error.message}`);
      return { success: false, reason: error.message, employee: null };
    } finally {
      this.stats.processed++;
    }
  }

  /**
   * Encontra o colaborador correspondente ao arquivo
   */
  async findMatchingEmployee(fileInfo) {
    // Verificar cache primeiro
    const cacheKey = `${fileInfo.name}_${fileInfo.size}`;
    if (this.matchCache.has(cacheKey)) {
      return this.matchCache.get(cacheKey);
    }

    let matchedEmployee = null;
    let matchReason = '';

    try {
      // 1. Tentar por identificadores exatos (CPF, chapa)
      const identifiers = extractIdentifiers('', fileInfo.name);
      for (const identifier of identifiers) {
        const employee = this.employees.find(emp => 
          identifiersMatch(emp.cpf, identifier) || 
          identifiersMatch(emp.chapa, identifier)
        );
        
        if (employee) {
          matchedEmployee = employee;
          matchReason = `ID: ${identifier}`;
          break;
        }
      }

      // 2. Se não encontrou por ID, tentar por nome no arquivo
      if (!matchedEmployee) {
        let content = '';
        
        // Extrair conteúdo se for PDF
        if (fileInfo.extension.toLowerCase() === '.pdf' && this.config.search.searchInContent) {
          try {
            content = await this.extractPdfContent(fileInfo.path);
          } catch (error) {
            console.debug(`Não foi possível extrair conteúdo do PDF ${fileInfo.name}: ${error.message}`);
          }
        }

        // Extrair candidatos a nomes
        const candidates = extractCandidates(content, fileInfo.name);
        
        if (candidates.length > 0) {
          // Buscar melhor match
          const employeeNames = this.employees.map(emp => emp.name);
          const match = bestMatch(candidates, employeeNames, this.config.search.minSimilarity);
          
          if (match) {
            matchedEmployee = this.employees.find(emp => emp.name === match.name);
            matchReason = `Nome: ${match.candidate} → ${match.name} (${(match.score * 100).toFixed(1)}%)`;
          }
        }
      }

      // 3. Tentar por email se estiver no nome do arquivo
      if (!matchedEmployee) {
        const emailMatch = fileInfo.name.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          const email = emailMatch[1].toLowerCase();
          const employee = this.employees.find(emp => 
            emp.email && emp.email.toLowerCase() === email
          );
          
          if (employee) {
            matchedEmployee = employee;
            matchReason = `Email: ${email}`;
          }
        }
      }

    } catch (error) {
      console.warn(`Erro ao buscar match para ${fileInfo.name}: ${error.message}`);
    }

    // Salvar no cache
    this.matchCache.set(cacheKey, matchedEmployee);
    
    if (matchedEmployee) {
      matchedEmployee.matchReason = matchReason;
    }
    
    return matchedEmployee;
  }

  /**
   * Extrai conteúdo de texto de um PDF
   */
  async extractPdfContent(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    return pdfData.text || '';
  }

  /**
   * Insere documento no banco de dados
   */
  async insertDocument(fileInfo, employee) {
    try {
      // Gerar ID único
      const documentId = this.generateId('DOC');
      
      // Verificar se já existe documento com mesmo nome para esse colaborador
      const existingCheck = await this.pool.request()
        .input('empId', sql.NVarChar, employee.id)
        .input('fileName', sql.NVarChar, fileInfo.name)
        .query(`
          SELECT id FROM marh_documents 
          WHERE empId = @empId AND fileName = @fileName
        `);

      if (existingCheck.recordset.length > 0) {
        return { success: false, error: 'Document already exists for this employee' };
      }

      // Ler arquivo em chunks para arquivos grandes
      const fileData = await this.readFileAsBase64(fileInfo.path);
      
      // Determinar tipo de documento baseado no nome do arquivo
      const docType = this.determineDocumentType(fileInfo.name);
      
      // Inserir documento
      await this.pool.request()
        .input('id', sql.NVarChar, documentId)
        .input('empId', sql.NVarChar, employee.id)
        .input('type', sql.NVarChar, docType)
        .input('description', sql.NVarChar, `Documento: ${fileInfo.name}`)
        .input('fileName', sql.NVarChar, fileInfo.name)
        .input('fileData', sql.NVarChar, fileData)
        .input('fileSize', sql.BigInt, fileInfo.size)
        .input('mimeType', sql.NVarChar, this.getMimeType(fileInfo.extension))
        .input('uploadDate', sql.Date, new Date())
        .input('uploadedBy', sql.NVarChar, 'UPLOAD_ROBOT')
        .input('notes', sql.NVarChar, `Upload automático - Match: ${employee.matchReason || 'Não especificado'}`)
        .query(`
          INSERT INTO marh_documents (
            id, empId, type, description, fileName, fileData, fileSize, 
            mimeType, uploadDate, uploadedBy, notes
          ) VALUES (
            @id, @empId, @type, @description, @fileName, @fileData, @fileSize,
            @mimeType, @uploadDate, @uploadedBy, @notes
          )
        `);

      return { success: true, documentId, matchReason: employee.matchReason };

    } catch (error) {
      console.error(`Erro ao inserir documento ${fileInfo.name}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lê arquivo como base64 (com otimização para arquivos grandes)
   */
  async readFileAsBase64(filePath) {
    try {
      const data = await fs.readFile(filePath);
      return data.toString('base64');
    } catch (error) {
      throw new Error(`Erro ao ler arquivo ${filePath}: ${error.message}`);
    }
  }

  /**
   * Determina o tipo de documento baseado no nome do arquivo
   */
  determineDocumentType(fileName) {
    const name = fileName.toLowerCase();
    
    const types = {
      'rg': ['rg', 'identidade', 'cedula'],
      'cpf': ['cpf', 'cadastro'],
      'ctps': ['ctps', 'carteira', 'trabalho'],
      'comprovante_residencia': ['comprovante', 'residencia', 'endereco'],
      'diploma': ['diploma', 'certificado', 'formacao'],
      'contrato': ['contrato', 'termo', 'acordo'],
      'exame_medico': ['exame', 'medico', 'atestado', 'saude'],
      'foto': ['foto', 'imagem'],
      'curriculo': ['curriculo', 'cv', 'resume'],
      'certidao': ['certidao', 'nascimento', 'casamento']
    };

    for (const [type, keywords] of Object.entries(types)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return type;
      }
    }

    return 'outros';
  }

  /**
   * Retorna o MIME type baseado na extensão
   */
  getMimeType(extension) {
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.rtf': 'application/rtf'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Gera ID único
   */
  generateId(prefix = 'ID') {
    return prefix + '_' + Math.random().toString(36).slice(2, 8).toUpperCase() + Date.now().toString(36);
  }

  /**
   * Retorna estatísticas do processo de upload
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Limpa cache e recursos
   */
  cleanup() {
    this.matchCache.clear();
    this.uploadedFiles.clear();
  }

  /**
   * Exporta relatório de matches para análise
   */
  async exportMatchReport(filePath) {
    const report = {
      timestamp: new Date().toISOString(),
      config: {
        minSimilarity: this.config.search.minSimilarity,
        searchInContent: this.config.search.searchInContent
      },
      stats: this.stats,
      employees: this.employees.length,
      cacheSize: this.matchCache.size
    };

    await fs.writeJson(filePath, report, { spaces: 2 });
    console.log(`📊 Relatório de matches exportado para: ${filePath}`);
  }
}

export default UploadManager;
