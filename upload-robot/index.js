/**
 * ROBÔ DE UPLOAD MASSIVO DE DOCUMENTOS
 * 
 * Este script processa grandes volumes de documentos (~400GB)
 * e faz o upload para o banco de dados, linkando cada documento
 * ao colaborador correspondente usando algoritmos de matching
 * inteligente baseados em nome, CPF, chapa e conteúdo do arquivo.
 */

console.log('🚀 INICIANDO ROBÔ DE UPLOAD...');
console.log('Args recebidos:', process.argv);

console.log('Importando módulos...');
import { fileURLToPath } from 'url';
import path from 'path';
import minimist from 'minimist';
import fs from 'fs-extra';
console.log('Módulos básicos importados');

import { FileScanner } from './lib/fileScanner.js';
console.log('FileScanner importado');
import { UploadManager } from './lib/uploadManager.js';
console.log('UploadManager importado');
import { ProgressMonitor } from './lib/progressMonitor.js';
console.log('ProgressMonitor importado');
import { loadFromDB, insertToDB } from '../backend/utils/dbHelpers.js';
console.log('Database helpers importado');

console.log('Todos os módulos importados com sucesso!');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração padrão
const DEFAULT_CONFIG = {
  // Diretórios
  documentsPath: './documentos',
  tempPath: './temp',
  
  // Processamento
  batchSize: 10, // arquivos por batch
  maxConcurrent: 5, // uploads simultâneos
  
  // Busca e matching
  search: {
    extensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt'],
    minSimilarity: 0.7, // 70% de similaridade mínima
    searchInContent: true, // buscar dentro do conteúdo dos PDFs
    skipDuplicates: true
  },
  
  // Logging e relatórios
  verbose: true,
  logFile: './logs/upload-robot.log',
  saveReports: true,
  showProgress: true,
  
  // Limites
  maxFileSize: 50 * 1024 * 1024, // 50MB
  timeoutMs: 30000 // 30 segundos por arquivo
};

class UploadRobot {
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.employees = [];
    this.fileScanner = null;
    this.uploadManager = null;
    this.progressMonitor = null;
  }

  /**
   * Inicializa o robô
   */
  async initialize() {
    console.log('🚀 Inicializando Robô de Upload Massivo...');
    
    // Criar diretórios necessários
    await this.setupDirectories();
    
    // Conectar ao banco de dados
    await this.connectDatabase();
    
    // Carregar colaboradores
    await this.loadEmployees();
    
    console.log('✅ Robô inicializado com sucesso!');
  }

  /**
   * Cria diretórios necessários
   */
  async setupDirectories() {
    const dirs = [
      path.join(__dirname, 'logs'),
      path.join(__dirname, 'reports'),
      path.join(__dirname, 'temp')
    ];

    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }
  }

  /**
   * Conecta ao banco de dados
   */
  async connectDatabase() {
    try {
      console.log('🔌 Testando conexão com SQL Server...');
      
      // Testar se conseguimos acessar a tabela de funcionários
      const testEmployees = await loadFromDB('employees', '', {});
      console.log('✅ Conexão com SQL Server estabelecida');
      console.log(`📊 Teste inicial: ${testEmployees.length} funcionários encontrados`);
      
    } catch (error) {
      console.error('❌ Erro ao conectar com SQL Server:', error.message);
      console.error('Detalhes do erro:', error);
      throw error;
    }
  }

  /**
   * Carrega lista de colaboradores do banco SQL Server
   */
  async loadEmployees() {
    try {
      console.log('👥 Carregando colaboradores da tabela marh_employees...');
      
      // Usar as funções do dbHelpers que já estão configuradas
      const employees = await loadFromDB('employees');
      
      console.log('✅ Query executada com sucesso, resultado:', employees.length, 'registros');
      
      this.employees = employees.map(emp => ({
        id: emp.id,
        name: emp.name?.trim(),
        cpf: emp.cpf?.replace(/\D/g, ''), // apenas números
        chapa: emp.chapa?.toString().trim(),
        email: emp.email?.toLowerCase().trim(),
        phone: emp.phone,
        // Campos originais também disponíveis
        original: emp
      }));
      
      console.log(`✅ ${this.employees.length} colaboradores carregados do SQL Server`);
      
      if (this.employees.length === 0) {
        console.warn('⚠️ Nenhum colaborador encontrado na tabela marh_employees');
        throw new Error('Nenhum colaborador encontrado no banco de dados SQL Server');
      } else if (this.employees.length > 20000) {
        console.log('🎉 PERFEITO! Encontrados mais de 20k funcionários - conectado na base correta!');
      } else {
        console.log(`📊 Total de ${this.employees.length} funcionários encontrados`);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar colaboradores:', error.message);
      console.error('SQL Error details:', error);
      throw error;
    }
  }

  /**
   * Executa o processo de upload massivo
   */
  async run(documentsPath) {
    try {
      const startTime = Date.now();
      
      // Escanear arquivos
      console.log(`📁 Escaneando arquivos em: ${documentsPath}`);
      this.fileScanner = new FileScanner(this.config);
      const files = await this.fileScanner.scanDirectory(documentsPath);
      
      if (files.length === 0) {
        console.log('⚠️ Nenhum arquivo encontrado para processar');
        return;
      }
      
      console.log(`📊 ${files.length} arquivos encontrados para processar`);
      
      // Inicializar componentes de upload
      this.uploadManager = new UploadManager(this.config, this.employees);
      
      // Inicializar monitor de progresso
      if (this.config.showProgress) {
        this.progressMonitor = new ProgressMonitor(files.length, {
          showDetails: this.config.verbose,
          saveReports: this.config.saveReports,
          updateInterval: 2000 // atualizar a cada 2 segundos
        });
      }
      
      // Processar arquivos com controle de concorrência
      await this.processFilesWithConcurrency(files);
      
      // Finalizar e exibir relatórios
      if (this.progressMonitor) {
        await this.progressMonitor.finish();
      }
      
      await this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Erro durante execução:', error.message);
      throw error;
    }
  }

  /**
   * Processa arquivos com controle de concorrência
   */
  async processFilesWithConcurrency(files) {
    const maxConcurrent = this.config.maxConcurrent;
    let currentIndex = 0;
    
    // Pool de workers
    const workers = [];
    
    // Função worker
    const worker = async () => {
      while (currentIndex < files.length) {
        const fileIndex = currentIndex++;
        const file = files[fileIndex];
        
        try {
          const result = await this.uploadManager.uploadFile(file);
          
          // Atualizar monitor de progresso
          if (this.progressMonitor) {
            this.progressMonitor.update(file, result);
          }
          
          // Log detalhado se habilitado
          if (this.config.verbose) {
            this.logFileResult(file, result);
          }
          
        } catch (error) {
          const result = { success: false, reason: error.message };
          
          if (this.progressMonitor) {
            this.progressMonitor.update(file, result);
          }
          
          console.error(`❌ Erro processando ${file.name}: ${error.message}`);
        }
      }
    };
    
    // Iniciar workers
    for (let i = 0; i < maxConcurrent; i++) {
      workers.push(worker());
    }
    
    // Aguardar conclusão de todos os workers
    await Promise.all(workers);
  }

  /**
   * Log detalhado do resultado de um arquivo
   */
  logFileResult(file, result) {
    if (result.success && result.matched) {
      console.log(`✅ ${file.name} → ${result.employee.name} (${result.matchReason})`);
    } else if (result.success && !result.matched) {
      console.log(`⏭️ ${file.name} → Nenhum match encontrado`);
    } else if (result.reason === 'duplicate') {
      console.log(`🔄 ${file.name} → Duplicado ignorado`);
    } else {
      console.log(`❌ ${file.name} → Erro: ${result.reason}`);
    }
  }

  /**
   * Gera relatório final detalhado
   */
  async generateFinalReport() {
    const stats = this.uploadManager.getStats();
    
    console.log('\n📋 GERANDO RELATÓRIO FINAL...');
    
    // Salvar relatório em arquivo
    if (this.config.saveReports) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(__dirname, 'reports', `final-report-${timestamp}.json`);
      
      const report = {
        timestamp: new Date().toISOString(),
        config: this.config,
        employees: this.employees.length,
        stats: stats,
        summary: {
          totalFiles: stats.processed,
          successRate: stats.processed > 0 ? (stats.uploaded / stats.processed * 100).toFixed(2) : 0,
          matchRate: stats.processed > 0 ? (stats.matched / stats.processed * 100).toFixed(2) : 0,
          errorRate: stats.processed > 0 ? (stats.errors / stats.processed * 100).toFixed(2) : 0
        }
      };
      
      await fs.writeJson(reportPath, report, { spaces: 2 });
      console.log(`📄 Relatório salvo em: ${reportPath}`);
    }
  }

  /**
   * Limpa recursos e fecha conexões
   */
  async cleanup() {
    try {
      if (this.uploadManager) {
        this.uploadManager.cleanup();
      }
      
      console.log('🧹 Recursos limpos com sucesso');
      
    } catch (error) {
      console.error('⚠️ Erro durante limpeza:', error.message);
    }
  }

  /**
   * Retorna estatísticas atuais
   */
  getStats() {
    return this.uploadManager ? this.uploadManager.getStats() : null;
  }
}

// Função principal
async function main() {
  const args = minimist(process.argv.slice(2));
  
  // Mostrar ajuda
  if (args.help || args.h) {
    showHelp();
    process.exit(0);
  }
  
  // Configurar parâmetros
  const config = {
    ...DEFAULT_CONFIG,
    verbose: args.verbose !== false,
    showProgress: args.progress !== false,
    saveReports: args.reports !== false,
    batchSize: args.batch || DEFAULT_CONFIG.batchSize,
    maxConcurrent: args.concurrent || DEFAULT_CONFIG.maxConcurrent,
    search: {
      ...DEFAULT_CONFIG.search,
      minSimilarity: args.similarity || DEFAULT_CONFIG.search.minSimilarity,
      searchInContent: args.content !== false
    }
  };
  
  const documentsPath = args._[0] || config.documentsPath;
  
  // Verificar se diretório existe
  if (!await fs.pathExists(documentsPath)) {
    console.error(`❌ Diretório não encontrado: ${documentsPath}`);
    process.exit(1);
  }
  
  // Validar configurações
  if (config.maxConcurrent < 1) config.maxConcurrent = 1;
  if (config.maxConcurrent > 20) config.maxConcurrent = 20;
  if (config.search.minSimilarity < 0) config.search.minSimilarity = 0;
  if (config.search.minSimilarity > 1) config.search.minSimilarity = 1;
  
  console.log('🤖 ROBÔ DE UPLOAD MASSIVO DE DOCUMENTOS');
  console.log('=' .repeat(60));
  console.log(`📁 Diretório: ${documentsPath}`);
  console.log(`⚡ Concorrência: ${config.maxConcurrent} uploads simultâneos`);
  console.log(`🎯 Similaridade mínima: ${(config.search.minSimilarity * 100).toFixed(0)}%`);
  console.log(`📄 Buscar em conteúdo: ${config.search.searchInContent ? 'Sim' : 'Não'}`);
  console.log(`📊 Salvar relatórios: ${config.saveReports ? 'Sim' : 'Não'}`);
  console.log('=' .repeat(60));
  
  const robot = new UploadRobot(config);
  
  // Handlers para finalização limpa
  const gracefulShutdown = async (signal) => {
    console.log(`\n🛑 Recebido sinal ${signal}...`);
    console.log('⏳ Finalizando uploads em andamento...');
    
    // Dar tempo para uploads terminarem
    setTimeout(async () => {
      await robot.cleanup();
      process.exit(0);
    }, 20000);
  };
  
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  try {
    await robot.initialize();
    await robot.run(documentsPath);
    
  } catch (error) {
    console.error('\n💥 ERRO FATAL:', error.message);
    
    if (config.verbose) {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
    
  } finally {
    await robot.cleanup();
  }
}

function showHelp() {
  console.log(`
🤖 ROBÔ DE UPLOAD MASSIVO DE DOCUMENTOS

DESCRIÇÃO:
  Processa grandes volumes de documentos e faz upload para o banco,
  linkando automaticamente cada arquivo ao colaborador correspondente.

USO:
  node index.js [opções] [diretório]

OPÇÕES:
  --concurrent <n>     Uploads simultâneos (1-20, padrão: 5)
  --similarity <n>     Similaridade mínima 0-1 (padrão: 0.7)
  --no-content         Não buscar dentro dos PDFs
  --no-verbose         Modo silencioso
  --no-progress        Desabilitar monitor de progresso
  --no-reports         Não salvar relatórios
  --help, -h           Mostrar esta ajuda

EXEMPLOS:
  # Básico - processar diretório atual
  node index.js ./documentos

  # Aumentar performance
  node index.js --concurrent 15 --similarity 0.8 ./arquivos

  # Modo rápido (sem busca em conteúdo)
  node index.js --no-content --concurrent 20 /caminho/arquivos

  # Modo silencioso
  node index.js --no-verbose --no-progress ./docs

CARACTERÍSTICAS:
  ✅ Suporte a PDF, DOC, DOCX, JPG, PNG, TXT
  ✅ Matching inteligente por nome, CPF, chapa, email
  ✅ Busca dentro do conteúdo dos PDFs
  ✅ Upload com controle de concorrência
  ✅ Monitor de progresso em tempo real
  ✅ Relatórios detalhados
  ✅ Detecção de duplicatas
  ✅ Recuperação de erros
  ✅ Otimizado para grandes volumes (400GB+)

ALGORITMO DE MATCHING:
  1. Busca por identificadores exatos (CPF, chapa)
  2. Matching por similaridade de nomes
  3. Busca por email no nome do arquivo
  4. Análise de conteúdo em PDFs (se habilitado)
  `);
}

// Executar se chamado diretamente
console.log('Verificando se deve executar main...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// Corrigir o caminho no Windows
const scriptPath = process.argv[1].replace(/\\/g, '/');
const expectedUrl = `file:///${scriptPath}`;
console.log('expectedUrl:', expectedUrl);

if (import.meta.url === expectedUrl) {
  console.log('✅ Executando função main...');
  main().catch(console.error);
} else {
  console.log('❌ Não executando main - condição não atendida');
  console.log('Executando main mesmo assim para debug...');
  main().catch(console.error);
}
