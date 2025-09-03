/**
 * Gerenciador de upload massivo de documentos
 * Otimizado para lidar com grandes volumes de arquivos e matching inteligente
 */

import fs from 'fs-extra';
import path from 'path';
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
      // 1. Tentar por identificadores exatos (CPF, matrícula)
      const identifiers = extractIdentifiers('', fileInfo.name);
      for (const identifier of identifiers) {
        const employee = this.employees.find(emp => 
          identifiersMatch(emp.cpf, identifier) || 
          identifiersMatch(emp.matricula, identifier)
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
          
          // Por enquanto, busca apenas no nome do arquivo (PDF parsing desabilitado temporariamente)
          // Se for PDF e busca em conteúdo estiver habilitada, podemos adicionar parsing futuro
          if (fileInfo.extension.toLowerCase() === '.pdf' && this.config.search.searchInContent) {
            console.debug(`PDF parsing temporariamente desabilitado para ${fileInfo.name}`);
          }

          // Extrair candidatos a nomes apenas do nome do arquivo
          const candidates = extractCandidates(content, fileInfo.name);        if (candidates.length > 0) {
          // Buscar melhor match
          const employeeNames = this.employees.map(emp => emp.name);
          const match = bestMatch(candidates, employeeNames, this.config.search.minSimilarity);
          
          if (match) {
            matchedEmployee = this.employees.find(emp => emp.name === match.name);
            matchReason = `Nome: ${match.candidate} → ${match.name} (${(match.score * 100).toFixed(1)}%)`;
          }
        }
      }

      // 3. Tentar por email se estiver no nome do arquivo (desabilitado pois não temos campo email)
      /*
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
      */

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
   * Extrai conteúdo de texto de um PDF (temporariamente desabilitado)
   */
  async extractPdfContent(filePath) {
    // Por enquanto retorna vazio - PDF parsing será implementado posteriormente
    console.debug(`PDF parsing não disponível para ${path.basename(filePath)}`);
    return '';
  }

  /**
   * Insere documento no banco de dados
   */
  async insertDocument(fileInfo, employee) {
    try {
      // Gerar GUID para o NomeArquivo (seguindo padrão da tabela)
      const arquivoGuid = this.generateGUID();
      
      const request = this.pool.request()
        .input('ClienteId', sql.Int, 1) // Valor padrão observado nos dados
        .input('ModuloId', sql.Int, 130) // Valor padrão observado nos dados  
        .input('ArquivoAreaId', sql.Int, 1) // Valor padrão observado nos dados
        .input('RegistroId', sql.Int, employee.id)
        .input('Ordem', sql.Int, 0)
        .input('Descricao', sql.NVarChar, null)
        .input('Diretorio', sql.NVarChar, '0130\\\\0084\\\\') // Diretório padrão observado
        .input('NomeArquivo', sql.NVarChar, arquivoGuid)
        .input('NomeOriginal', sql.NVarChar, fileInfo.name)
        .input('Extensao', sql.NVarChar, fileInfo.extension.replace('.', ''))
        .input('Tamanho', sql.Numeric(18, 2), fileInfo.size)
        .input('Upload', sql.Bit, true)
        .input('ArquivoAtual', sql.Bit, true)
        .input('ArquivoRestrito', sql.Bit, false)
        .input('UsuarioCadastroId', sql.Int, 1) // ID do robô ou usuário sistema
        .input('DataHoraCadastro', sql.DateTime, new Date());

      const result = await request.query(`
        INSERT INTO Arquivo (
          ClienteId, ModuloId, ArquivoAreaId, RegistroId, Ordem, 
          Descricao, Diretorio, NomeArquivo, NomeOriginal, Extensao, 
          Tamanho, Upload, ArquivoAtual, ArquivoRestrito, 
          UsuarioCadastroId, DataHoraCadastro
        ) VALUES (
          @ClienteId, @ModuloId, @ArquivoAreaId, @RegistroId, @Ordem,
          @Descricao, @Diretorio, @NomeArquivo, @NomeOriginal, @Extensao,
          @Tamanho, @Upload, @ArquivoAtual, @ArquivoRestrito,
          @UsuarioCadastroId, @DataHoraCadastro
        );
        SELECT SCOPE_IDENTITY() as Id;
      `);

      const documentId = result.recordset[0].Id;
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
  /**
   * Gera um GUID único para o arquivo
   */
  generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }
}

export default UploadManager;
