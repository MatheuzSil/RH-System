// Sistema JavaScript para Gestão de Documentos em Massa

// Função API helper - compatível com o sistema principal
async function api(path, method = 'GET', body = null) {
  const token = localStorage.getItem('MARH_TOKEN');
  const baseURL = window.API || 'http://localhost:3000/api';
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${baseURL}${path}`, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

class BulkDocumentManager {
  constructor() {
    this.selectedFiles = new Map();
    this.currentPage = 1;
    this.pageSize = 50;
    this.totalDocuments = 0;
    this.isUploading = false;
    this.employees = [];
    this.uploadQueue = [];
    
    this.initializeElements();
    this.attachEventListeners();
    this.loadInitialData();
  }

  initializeElements() {
    // Get DOM elements
    this.dropZone = document.getElementById('bulk-drop-zone');
    this.fileInput = document.getElementById('bulk-file-input');
    this.filePreview = document.getElementById('file-preview');
    this.uploadBtn = document.getElementById('bulk-upload-btn');
    this.progressSection = document.getElementById('upload-progress');
    this.progressFill = document.getElementById('progress-fill');
    this.progressText = document.getElementById('progress-text');
    this.progressSpeed = document.getElementById('progress-speed');
    this.uploadResults = document.getElementById('upload-results');
    
    // Stats elements
    this.totalDocsEl = document.getElementById('total-documents');
    this.totalSizeEl = document.getElementById('total-size');
    this.employeesWithDocsEl = document.getElementById('employees-with-docs');
    this.pendingUploadsEl = document.getElementById('pending-uploads');
    
    // Search and filter elements
    this.docSearch = document.getElementById('doc-search');
    this.filterType = document.getElementById('filter-type');
    this.filterStatus = document.getElementById('filter-status');
    this.docsList = document.getElementById('bulk-docs-list');
    
    // Form elements
    this.employeeSelect = document.getElementById('bulk-employee-select');
    this.docTypeSelect = document.getElementById('bulk-doc-type');
    this.descriptionInput = document.getElementById('bulk-description');
    this.expiryInput = document.getElementById('bulk-expiry');
  }

  attachEventListeners() {
    // File drag and drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropZone.classList.add('drag-over');
    });

    this.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
      this.handleFileSelection(Array.from(e.dataTransfer.files));
    });

    this.dropZone.addEventListener('click', () => {
      this.fileInput.click();
    });

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      this.handleFileSelection(Array.from(e.target.files));
    });

    // Upload button
    this.uploadBtn.addEventListener('click', () => {
      this.startBulkUpload();
    });

    // Clear files button
    document.getElementById('clear-files-btn').addEventListener('click', () => {
      this.clearFileSelection();
    });

    // Search functionality
    this.docSearch.addEventListener('input', debounce(() => {
      this.searchDocuments();
    }, 300));

    // Filter functionality
    this.filterType.addEventListener('change', () => {
      this.applyFilters();
    });

    this.filterStatus.addEventListener('change', () => {
      this.applyFilters();
    });

    // Export and bulk actions
    document.getElementById('export-docs').addEventListener('click', () => {
      this.exportDocumentsList();
    });

    document.getElementById('bulk-delete').addEventListener('click', () => {
      this.bulkDeleteDocuments();
    });

    document.getElementById('refresh-docs').addEventListener('click', () => {
      this.refreshDocumentsList();
    });

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadDocuments();
      }
    });

    document.getElementById('next-page').addEventListener('click', () => {
      const totalPages = Math.ceil(this.totalDocuments / this.pageSize);
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.loadDocuments();
      }
    });

    // CLI Import button
    document.getElementById('start-cli-import').addEventListener('click', () => {
      this.showCLIImportInstructions();
    });
  }

  async loadInitialData() {
    try {
      // Carregar funcionários
      await this.loadEmployees();
      
      // Carregar estatísticas
      await this.loadStatistics();
      
      // Carregar documentos
      await this.loadDocuments();
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados iniciais:', error);
      this.showError('Erro ao carregar dados iniciais');
    }
  }

  async loadEmployees() {
    try {
      const employees = await api('/employees');
      this.employees = employees;
      
      const select = this.employeeSelect;
      select.innerHTML = '<option value="">Selecionar funcionário...</option>';
      
      employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = `${emp.name} (${emp.id})`;
        select.appendChild(option);
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar funcionários:', error);
      this.employeeSelect.innerHTML = '<option value="">Erro ao carregar funcionários</option>';
    }
  }

  async loadStatistics() {
    try {
      const stats = await api('/documents/stats');
      
      this.totalDocsEl.textContent = stats.totalDocuments.toLocaleString();
      this.totalSizeEl.textContent = this.formatFileSize(stats.totalSize);
      this.employeesWithDocsEl.textContent = stats.employeesWithDocs;
      this.pendingUploadsEl.textContent = this.uploadQueue.length;
      
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
    }
  }

  async loadDocuments() {
    try {
      const queryParams = new URLSearchParams({
        page: this.currentPage,
        limit: this.pageSize
      });

      // Aplicar filtros
      const typeFilter = this.filterType?.value;
      const statusFilter = this.filterStatus?.value;
      const searchQuery = this.docSearch?.value;

      if (typeFilter) queryParams.append('type', typeFilter);
      if (statusFilter) queryParams.append('status', statusFilter);
      if (searchQuery) queryParams.append('query', searchQuery);

      const response = await api(`/documents/search?${queryParams}`);
      
      this.renderDocumentsList(response.documents);
      this.updatePagination(response.pagination);
      
    } catch (error) {
      console.error('❌ Erro ao carregar documentos:', error);
      this.docsList.innerHTML = '<tr><td colspan="8">Erro ao carregar documentos</td></tr>';
    }
  }

  handleFileSelection(files) {
    const validFiles = files.filter(file => this.validateFile(file));
    
    if (validFiles.length === 0) {
      this.showError('Nenhum arquivo válido selecionado');
      return;
    }

    // Adicionar aos arquivos selecionados
    validFiles.forEach(file => {
      const fileId = `${file.name}_${file.size}_${file.lastModified}`;
      this.selectedFiles.set(fileId, file);
    });

    this.updateFilePreview();
    this.updateUploadButton();
    
    if (validFiles.length < files.length) {
      this.showWarning(`${files.length - validFiles.length} arquivos foram ignorados (tipo não suportado ou muito grandes)`);
    }
  }

  validateFile(file) {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const maxSize = 100 * 1024 * 1024; // 100MB

    return allowedTypes.includes(file.type) && file.size <= maxSize;
  }

  updateFilePreview() {
    const preview = this.filePreview;
    
    if (this.selectedFiles.size === 0) {
      preview.classList.add('hidden');
      this.dropZone.classList.remove('has-files');
      return;
    }

    preview.classList.remove('hidden');
    this.dropZone.classList.add('has-files');

    const totalSize = Array.from(this.selectedFiles.values())
      .reduce((sum, file) => sum + file.size, 0);

    preview.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <strong>${this.selectedFiles.size} arquivos selecionados (${this.formatFileSize(totalSize)})</strong>
        <button type="button" onclick="bulkDocManager.clearFileSelection()" class="file-remove">✕</button>
      </div>
      <div style="max-height: 150px; overflow-y: auto;">
        ${Array.from(this.selectedFiles.entries()).map(([id, file]) => `
          <div class="file-item">
            <span>${file.name}</span>
            <div>
              <span class="file-size">${this.formatFileSize(file.size)}</span>
              <button type="button" onclick="bulkDocManager.removeFile('${id}')" class="file-remove">×</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  removeFile(fileId) {
    this.selectedFiles.delete(fileId);
    this.updateFilePreview();
    this.updateUploadButton();
  }

  clearFileSelection() {
    this.selectedFiles.clear();
    this.fileInput.value = '';
    this.updateFilePreview();
    this.updateUploadButton();
  }

  updateUploadButton() {
    const hasFiles = this.selectedFiles.size > 0;
    const hasEmployee = this.employeeSelect.value;
    
    this.uploadBtn.disabled = !hasFiles || !hasEmployee || this.isUploading;
    
    if (this.isUploading) {
      this.uploadBtn.textContent = '⏳ Enviando...';
    } else {
      this.uploadBtn.textContent = `📤 Iniciar Upload em Lote (${this.selectedFiles.size} arquivos)`;
    }
  }

  async startBulkUpload() {
    if (this.isUploading) return;
    
    const empId = this.employeeSelect.value;
    if (!empId) {
      this.showError('Selecione um funcionário');
      return;
    }

    if (this.selectedFiles.size === 0) {
      this.showError('Selecione arquivos para upload');
      return;
    }

    this.isUploading = true;
    this.updateUploadButton();
    this.showProgress();

    try {
      const formData = new FormData();
      formData.append('empId', empId);
      formData.append('type', this.docTypeSelect.value);
      formData.append('description', this.descriptionInput.value);
      formData.append('expirationDate', this.expiryInput.value);

      // Adicionar arquivos
      Array.from(this.selectedFiles.values()).forEach(file => {
        formData.append('documents', file);
      });

      const startTime = Date.now();
      const totalSize = Array.from(this.selectedFiles.values())
        .reduce((sum, file) => sum + file.size, 0);

      // Simular progresso (em uma implementação real, você usaria XMLHttpRequest com progress)
      this.simulateProgress(totalSize);

      const token = localStorage.getItem('MARH_TOKEN');
      const baseURL = window.API || 'http://localhost:3000/api';

      const response = await fetch(`${baseURL}/documents/bulk-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro no upload');
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      const speed = totalSize / duration;

      this.showUploadResults(result, duration, speed);
      this.clearFileSelection();
      await this.loadStatistics();
      await this.loadDocuments();

    } catch (error) {
      console.error('❌ Erro no upload em lote:', error);
      this.showError('Erro no upload: ' + error.message);
    } finally {
      this.isUploading = false;
      this.updateUploadButton();
      this.hideProgress();
    }
  }

  simulateProgress(totalSize) {
    let progress = 0;
    const startTime = Date.now();
    
    const updateProgress = () => {
      if (progress < 95 && this.isUploading) {
        progress += Math.random() * 10;
        if (progress > 95) progress = 95;
        
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = (totalSize * progress / 100) / elapsed;
        
        this.updateProgress(progress, speed);
        setTimeout(updateProgress, 500);
      }
    };
    
    updateProgress();
  }

  updateProgress(percent, speed) {
    this.progressFill.style.width = percent + '%';
    this.progressText.textContent = `${percent.toFixed(1)}% concluído`;
    this.progressSpeed.textContent = `${this.formatFileSize(speed)}/s`;
  }

  showProgress() {
    this.progressSection.classList.remove('hidden');
    this.updateProgress(0, 0);
  }

  hideProgress() {
    setTimeout(() => {
      this.progressSection.classList.add('hidden');
    }, 2000);
  }

  showUploadResults(result, duration, speed) {
    this.progressFill.style.width = '100%';
    this.progressText.textContent = 'Upload concluído!';
    this.progressSpeed.textContent = `${this.formatFileSize(speed)}/s`;
    
    this.uploadResults.innerHTML = `
      <div style="margin-top: 1rem;">
        <div style="color: #28a745;"><strong>✅ Upload concluído em ${duration.toFixed(1)}s</strong></div>
        <div>📤 ${result.results.success} arquivos enviados com sucesso</div>
        ${result.results.failed > 0 ? `<div style="color: #dc3545;">❌ ${result.results.failed} arquivos falharam</div>` : ''}
        <div>💾 Total processado: ${this.formatFileSize(result.results.processedSize)}</div>
      </div>
    `;
  }

  async searchDocuments() {
    this.currentPage = 1;
    await this.loadDocuments();
  }

  async applyFilters() {
    this.currentPage = 1;
    await this.loadDocuments();
  }

  renderDocumentsList(documents) {
    if (!documents || documents.length === 0) {
      this.docsList.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhum documento encontrado</td></tr>';
      return;
    }

    this.docsList.innerHTML = documents.map(doc => {
      const isExpired = doc.expirationDate && new Date(doc.expirationDate) < new Date();
      const statusBadge = isExpired ? '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8rem;">Expirado</span>' 
                         : '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8rem;">Válido</span>';

      return `
        <tr>
          <td><input type="checkbox" value="${doc.id}" class="doc-checkbox"></td>
          <td>${doc.employeeName || 'N/A'}</td>
          <td>${doc.fileName}</td>
          <td>${doc.type}</td>
          <td>${this.formatFileSize(doc.fileSize || 0)}</td>
          <td>${new Date(doc.uploadDate || Date.now()).toLocaleDateString()}</td>
          <td>${statusBadge}</td>
          <td>
            <button onclick="viewDocument('${doc.id}')" class="btn" title="Visualizar">👁️</button>
            <button onclick="downloadDocument('${doc.id}')" class="btn" title="Baixar">📥</button>
            <button onclick="deleteDocument('${doc.id}')" class="btn danger" title="Excluir">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  updatePagination(pagination) {
    const pageInfo = document.getElementById('page-info');
    pageInfo.textContent = `Página ${pagination.page} de ${pagination.pages}`;
    
    document.getElementById('prev-page').disabled = pagination.page <= 1;
    document.getElementById('next-page').disabled = pagination.page >= pagination.pages;
  }

  async bulkDeleteDocuments() {
    const checkboxes = document.querySelectorAll('.doc-checkbox:checked');
    
    if (checkboxes.length === 0) {
      this.showError('Selecione documentos para excluir');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir ${checkboxes.length} documentos? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const documentIds = Array.from(checkboxes).map(cb => cb.value);
      
      const token = localStorage.getItem('MARH_TOKEN');
      const baseURL = window.API || 'http://localhost:3000/api';
      
      const response = await fetch(`${baseURL}/documents/bulk-delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ documentIds })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      this.showSuccess(`${result.deleted} documentos excluídos com sucesso`);
      await this.loadDocuments();
      await this.loadStatistics();

    } catch (error) {
      console.error('❌ Erro na exclusão em lote:', error);
      this.showError('Erro na exclusão: ' + error.message);
    }
  }

  async exportDocumentsList() {
    try {
      this.showInfo('Gerando arquivo de exportação...');
      
      // Buscar todos os documentos (sem paginação)
      const response = await api('/documents/search?limit=10000');
      const documents = response.documents;
      
      const csvData = this.generateCSV(documents);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `documentos_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showSuccess('Lista de documentos exportada com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      this.showError('Erro na exportação: ' + error.message);
    }
  }

  generateCSV(documents) {
    const headers = [
      'ID', 'Nome do Funcionário', 'Nome do Arquivo', 'Tipo', 
      'Tamanho', 'Data de Upload', 'Data de Expiração', 'Status'
    ];
    
    const rows = documents.map(doc => [
      doc.id,
      doc.employeeName || '',
      doc.fileName,
      doc.type,
      this.formatFileSize(doc.fileSize || 0),
      new Date(doc.uploadDate || Date.now()).toLocaleDateString(),
      doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : '',
      doc.expirationDate && new Date(doc.expirationDate) < new Date() ? 'Expirado' : 'Válido'
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(';'))
      .join('\n');
  }

  async refreshDocumentsList() {
    await this.loadStatistics();
    await this.loadDocuments();
    this.showSuccess('Lista atualizada!');
  }

  showCLIImportInstructions() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🖥️ Importação via CLI</h3>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="close">×</button>
        </div>
        <div class="modal-body">
          <p>Para volumes muito grandes (400GB+), use o script de linha de comando:</p>
          
          <h4>1. Organize os arquivos:</h4>
          <div class="code-block">
            documentos/<br>
            ├── EMP001/<br>
            │   ├── contrato.pdf<br>
            │   ├── rg.pdf<br>
            │   └── diploma.pdf<br>
            ├── EMP002/<br>
            │   ├── cpf.pdf<br>
            │   └── exame.pdf<br>
            └── EMP003/<br>
                └── certificado.pdf
          </div>
          
          <h4>2. Execute o script:</h4>
          <div class="code-block">
            # Navegar até o diretório do backend<br>
            cd backend<br><br>
            
            # Executar importação<br>
            node bulk-import.js ./documentos<br><br>
            
            # Com opções avançadas<br>
            node bulk-import.js ./documentos --batch-size 100 --verbose<br><br>
            
            # Simulação (sem alterar dados)<br>
            node bulk-import.js ./documentos --dry-run
          </div>
          
          <h4>3. Opções disponíveis:</h4>
          <ul>
            <li><code>--batch-size [num]</code> - Arquivos por lote (padrão: 50)</li>
            <li><code>--delay [ms]</code> - Delay entre lotes (padrão: 1000ms)</li>
            <li><code>--ignore-errors</code> - Continuar mesmo com erros</li>
            <li><code>--verbose</code> - Log detalhado</li>
            <li><code>--dry-run</code> - Simular sem alterar dados</li>
          </ul>
          
          <div class="alert">
            <strong>⚠️ Importante:</strong> Para 400GB de documentos, o processo pode demorar várias horas. 
            Execute em um servidor dedicado e mantenha logs de acompanhamento.
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn">Fechar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showWarning(message) {
    this.showNotification(message, 'warning');
  }

  showInfo(message) {
    this.showNotification(message, 'info');
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      max-width: 400px;
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;
    
    const colors = {
      error: '#dc3545',
      success: '#28a745', 
      warning: '#ffc107',
      info: '#17a2b8'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 4000);
  }
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize when DOM is ready
let bulkDocManager;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bulkDocManager = new BulkDocumentManager();
  });
} else {
  bulkDocManager = new BulkDocumentManager();
}
