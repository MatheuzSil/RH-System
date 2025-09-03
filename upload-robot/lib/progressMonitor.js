/**
 * Monitor de progresso para upload massivo
 * Fornece feedback visual e métricas em tempo real
 */

import fs from 'fs-extra';
import path from 'path';

export class ProgressMonitor {
  constructor(totalFiles, config = {}) {
    this.totalFiles = totalFiles;
    this.processedFiles = 0;
    this.startTime = Date.now();
    this.lastUpdateTime = Date.now();
    
    // Configurações
    this.updateInterval = config.updateInterval || 1000; // 1 segundo
    this.logFile = config.logFile || null;
    this.showDetails = config.showDetails !== false;
    this.saveReports = config.saveReports !== false;
    
    // Métricas
    this.metrics = {
      matched: 0,
      uploaded: 0,
      errors: 0,
      duplicates: 0,
      skipped: 0,
      totalSize: 0,
      uploadedSize: 0,
      avgFileSize: 0,
      filesPerSecond: 0,
      estimatedTimeRemaining: 0
    };

    // Relatórios detalhados
    this.detailedResults = [];
    this.errorLog = [];
    this.matchLog = [];
    
    this.initializeDisplay();
  }

  /**
   * Inicializa o display de progresso
   */
  initializeDisplay() {
    console.clear();
    console.log('🚀 ROBÔ DE UPLOAD MASSIVO DE DOCUMENTOS');
    console.log('=' .repeat(60));
    console.log(`📁 Total de arquivos para processar: ${this.totalFiles.toLocaleString()}`);
    console.log('=' .repeat(60));
    console.log('');
  }

  /**
   * Atualiza o progresso com resultado de um arquivo
   */
  update(fileInfo, result) {
    this.processedFiles++;
    this.metrics.totalSize += fileInfo.size || 0;
    
    // Atualizar métricas baseadas no resultado
    if (result.success) {
      if (result.matched) {
        this.metrics.matched++;
        this.metrics.uploaded++;
        this.metrics.uploadedSize += fileInfo.size || 0;
        
        // Log de match bem-sucedido
        this.matchLog.push({
          file: fileInfo.name,
          employee: result.employee?.name || 'N/A',
          matchReason: result.matchReason || 'N/A',
          timestamp: new Date().toISOString()
        });
        
      } else {
        this.metrics.skipped++;
      }
    } else {
      if (result.reason === 'duplicate') {
        this.metrics.duplicates++;
      } else {
        this.metrics.errors++;
        
        // Log de erro
        this.errorLog.push({
          file: fileInfo.name,
          error: result.reason || 'Erro desconhecido',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Salvar resultado detalhado
    if (this.saveReports) {
      this.detailedResults.push({
        file: fileInfo.name,
        size: fileInfo.size,
        path: fileInfo.path,
        result: result,
        timestamp: new Date().toISOString()
      });
    }

    // Calcular métricas de velocidade
    this.calculateMetrics();
    
    // Atualizar display se necessário
    if (Date.now() - this.lastUpdateTime >= this.updateInterval) {
      this.displayProgress();
      this.lastUpdateTime = Date.now();
    }
  }

  /**
   * Calcula métricas de desempenho
   */
  calculateMetrics() {
    const elapsedTime = (Date.now() - this.startTime) / 1000; // em segundos
    
    this.metrics.filesPerSecond = this.processedFiles / elapsedTime;
    this.metrics.avgFileSize = this.metrics.totalSize / Math.max(this.processedFiles, 1);
    
    // Estimar tempo restante
    if (this.metrics.filesPerSecond > 0) {
      const remainingFiles = this.totalFiles - this.processedFiles;
      this.metrics.estimatedTimeRemaining = remainingFiles / this.metrics.filesPerSecond;
    } else {
      this.metrics.estimatedTimeRemaining = 0;
    }
  }

  /**
   * Exibe o progresso atual
   */
  displayProgress() {
    const percentage = ((this.processedFiles / this.totalFiles) * 100).toFixed(1);
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    
    // Limpar tela
    process.stdout.write('\x1B[2J\x1B[0f');
    
    // Cabeçalho
    console.log('🚀 ROBÔ DE UPLOAD MASSIVO DE DOCUMENTOS');
    console.log('=' .repeat(60));
    
    // Barra de progresso
    const progressBarLength = 40;
    const filledLength = Math.floor((this.processedFiles / this.totalFiles) * progressBarLength);
    const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength);
    
    console.log(`📊 Progresso: [${progressBar}] ${percentage}%`);
    console.log(`📁 Arquivos: ${this.processedFiles.toLocaleString()}/${this.totalFiles.toLocaleString()}`);
    console.log('');
    
    // Estatísticas principais
    console.log('📈 ESTATÍSTICAS:');
    console.log(`✅ Enviados com sucesso: ${this.metrics.uploaded.toLocaleString()}`);
    console.log(`🎯 Matches encontrados: ${this.metrics.matched.toLocaleString()}`);
    console.log(`⏭️ Ignorados: ${this.metrics.skipped.toLocaleString()}`);
    console.log(`❌ Erros: ${this.metrics.errors.toLocaleString()}`);
    console.log(`🔄 Duplicados: ${this.metrics.duplicates.toLocaleString()}`);
    console.log('');
    
    // Métricas de desempenho
    console.log('⚡ DESEMPENHO:');
    console.log(`🏃 Velocidade: ${this.metrics.filesPerSecond.toFixed(1)} arquivos/seg`);
    console.log(`📏 Tamanho médio: ${this.formatFileSize(this.metrics.avgFileSize)}`);
    console.log(`💾 Dados processados: ${this.formatFileSize(this.metrics.totalSize)}`);
    console.log(`📤 Dados enviados: ${this.formatFileSize(this.metrics.uploadedSize)}`);
    console.log(`⏱️ Tempo decorrido: ${this.formatTime(elapsedTime)}`);
    
    if (this.metrics.estimatedTimeRemaining > 0) {
      console.log(`⏳ Tempo restante estimado: ${this.formatTime(this.metrics.estimatedTimeRemaining)}`);
    }
    
    console.log('');
    
    // Últimas atividades (se habilitado)
    if (this.showDetails && this.matchLog.length > 0) {
      console.log('🔗 ÚLTIMOS MATCHES:');
      const recentMatches = this.matchLog.slice(-3);
      recentMatches.forEach(match => {
        console.log(`   ${match.file} → ${match.employee} (${match.matchReason})`);
      });
      console.log('');
    }
    
    // Últimos erros
    if (this.errorLog.length > 0) {
      console.log('⚠️ ÚLTIMOS ERROS:');
      const recentErrors = this.errorLog.slice(-2);
      recentErrors.forEach(error => {
        console.log(`   ${error.file}: ${error.error}`);
      });
      console.log('');
    }
  }

  /**
   * Finaliza o monitoramento e exibe relatório final
   */
  async finish() {
    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const successRate = ((this.metrics.uploaded / this.totalFiles) * 100).toFixed(1);
    
    // Limpar tela
    process.stdout.write('\x1B[2J\x1B[0f');
    
    console.log('🎉 UPLOAD MASSIVO CONCLUÍDO!');
    console.log('=' .repeat(60));
    console.log('');
    
    // Resumo final
    console.log('📊 RESUMO FINAL:');
    console.log(`📁 Total de arquivos processados: ${this.processedFiles.toLocaleString()}`);
    console.log(`✅ Arquivos enviados com sucesso: ${this.metrics.uploaded.toLocaleString()} (${successRate}%)`);
    console.log(`🎯 Total de matches encontrados: ${this.metrics.matched.toLocaleString()}`);
    console.log(`⏭️ Arquivos ignorados: ${this.metrics.skipped.toLocaleString()}`);
    console.log(`❌ Erros encontrados: ${this.metrics.errors.toLocaleString()}`);
    console.log(`🔄 Arquivos duplicados: ${this.metrics.duplicates.toLocaleString()}`);
    console.log('');
    
    // Estatísticas de dados
    console.log('💾 DADOS PROCESSADOS:');
    console.log(`📏 Tamanho total processado: ${this.formatFileSize(this.metrics.totalSize)}`);
    console.log(`📤 Dados enviados para o banco: ${this.formatFileSize(this.metrics.uploadedSize)}`);
    console.log(`📈 Tamanho médio dos arquivos: ${this.formatFileSize(this.metrics.avgFileSize)}`);
    console.log('');
    
    // Desempenho
    console.log('⚡ DESEMPENHO:');
    console.log(`⏱️ Tempo total de execução: ${this.formatTime(elapsedTime)}`);
    console.log(`🏃 Velocidade média: ${this.metrics.filesPerSecond.toFixed(1)} arquivos/segundo`);
    console.log('');
    
    // Salvar relatórios se configurado
    if (this.saveReports) {
      await this.saveReportsToFile();
    }
  }

  /**
   * Salva relatórios detalhados
   */
  async saveReportsToFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportsDir = path.join(process.cwd(), 'upload-robot', 'reports');
    
    await fs.ensureDir(reportsDir);
    
    try {
      // Relatório geral
      const generalReport = {
        timestamp: new Date().toISOString(),
        summary: {
          totalFiles: this.totalFiles,
          processedFiles: this.processedFiles,
          metrics: this.metrics,
          elapsedTime: (Date.now() - this.startTime) / 1000
        }
      };
      
      await fs.writeJson(
        path.join(reportsDir, `upload-report-${timestamp}.json`), 
        generalReport, 
        { spaces: 2 }
      );
      
      // Relatório de matches
      if (this.matchLog.length > 0) {
        await fs.writeJson(
          path.join(reportsDir, `matches-${timestamp}.json`), 
          this.matchLog, 
          { spaces: 2 }
        );
      }
      
      // Relatório de erros
      if (this.errorLog.length > 0) {
        await fs.writeJson(
          path.join(reportsDir, `errors-${timestamp}.json`), 
          this.errorLog, 
          { spaces: 2 }
        );
      }
      
      // Relatório detalhado (se habilitado)
      if (this.detailedResults.length > 0) {
        await fs.writeJson(
          path.join(reportsDir, `detailed-${timestamp}.json`), 
          this.detailedResults, 
          { spaces: 2 }
        );
      }
      
      console.log(`📋 Relatórios salvos em: ${reportsDir}`);
      
    } catch (error) {
      console.error(`❌ Erro ao salvar relatórios: ${error.message}`);
    }
  }

  /**
   * Formata tamanho de arquivo em formato legível
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  /**
   * Formata tempo em formato legível
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Força atualização do display
   */
  forceUpdate() {
    this.displayProgress();
    this.lastUpdateTime = Date.now();
  }
}

export default ProgressMonitor;
