/**
 * MARH - Documents Module
 * Gestão de documentos dos colaboradores
 */

class DocumentsModule {
    constructor() {
        this.documents = [];
        this.documentTypes = [];
        this.isInitialized = false;
    }

    /**
     * Inicializa o módulo de documentos
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('📂 Inicializando módulo de Documentos...');
        
        await this.loadDocuments();
        await this.loadDocumentTypes();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ Módulo de Documentos inicializado');
    }

    /**
     * Renderiza a página de documentos
     */
    render() {
        const content = `
            <div class="page-header">
                <div>
                    <h1>📂 Documentos</h1>
                    <p class="subtitle">Gestão centralizada de documentos dos colaboradores</p>
                </div>
                <div class="page-actions">
                    <button class="btn primary" onclick="documentsModule.showUploadModal()">
                        ⬆️ Upload Documento
                    </button>
                    <button class="btn" onclick="documentsModule.bulkDownload()">
                        📦 Download em Lote
                    </button>
                </div>
            </div>

            <div class="grid cols-3 mb2">
                <div class="stat-card">
                    <div class="stat-value" id="total-documents">-</div>
                    <div class="stat-label">Total de Documentos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="pending-documents">-</div>
                    <div class="stat-label">Pendentes de Revisão</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="storage-used">-</div>
                    <div class="stat-label">Armazenamento Usado</div>
                </div>
            </div>

            <!-- Filtros -->
            <div class="card mb2">
                <div class="card-header">
                    <h3>Filtros e Busca</h3>
                </div>
                <div class="card-content">
                    <div class="grid cols-4">
                        <div>
                            <label>Buscar Documentos</label>
                            <input type="text" id="search-documents" class="input" 
                                   placeholder="Nome do arquivo, colaborador...">
                        </div>
                        <div>
                            <label>Colaborador</label>
                            <select id="filter-employee" class="input">
                                <option value="">Todos os colaboradores</option>
                            </select>
                        </div>
                        <div>
                            <label>Tipo de Documento</label>
                            <select id="filter-document-type" class="input">
                                <option value="">Todos os tipos</option>
                            </select>
                        </div>
                        <div>
                            <label>Status</label>
                            <select id="filter-status" class="input">
                                <option value="">Todos</option>
                                <option value="ativo">Ativo</option>
                                <option value="vencido">Vencido</option>
                                <option value="pendente">Pendente Revisão</option>
                                <option value="arquivado">Arquivado</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt1">
                        <button class="btn primary" onclick="documentsModule.applyFilters()">
                            🔍 Buscar
                        </button>
                        <button class="btn" onclick="documentsModule.clearFilters()">
                            🗑️ Limpar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Lista de Documentos -->
            <div class="card">
                <div class="card-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>Lista de Documentos</h3>
                        <div class="view-toggle">
                            <button class="btn sm" id="view-grid" onclick="documentsModule.toggleView('grid')" 
                                    title="Visualização em Grade">🔲</button>
                            <button class="btn sm active" id="view-list" onclick="documentsModule.toggleView('list')" 
                                    title="Visualização em Lista">📄</button>
                        </div>
                    </div>
                </div>
                <div class="card-content">
                    <!-- Visualização em Lista -->
                    <div id="documents-list-view">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>
                                            <input type="checkbox" id="select-all" onchange="documentsModule.toggleSelectAll()">
                                        </th>
                                        <th>Nome do Arquivo</th>
                                        <th>Colaborador</th>
                                        <th>Tipo</th>
                                        <th>Tamanho</th>
                                        <th>Data Upload</th>
                                        <th>Validade</th>
                                        <th>Status</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="documents-table">
                                    <!-- Será preenchido dinamicamente -->
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Visualização em Grade -->
                    <div id="documents-grid-view" class="hidden">
                        <div class="documents-grid" id="documents-grid">
                            <!-- Será preenchido dinamicamente -->
                        </div>
                    </div>

                    <div id="no-documents" class="empty-state hidden">
                        <div class="empty-icon">📂</div>
                        <h3>Nenhum documento encontrado</h3>
                        <p>Não há documentos para os filtros selecionados</p>
                    </div>
                </div>
            </div>

            <!-- Modal de Upload -->
            <div id="upload-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>⬆️ Upload de Documento</h3>
                        <button class="btn-close" onclick="documentsModule.hideUploadModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="upload-form">
                            <div class="grid cols-2">
                                <div>
                                    <label>Colaborador *</label>
                                    <select id="upload-employee" class="input" required>
                                        <option value="">Selecionar colaborador</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Tipo de Documento *</label>
                                    <select id="upload-document-type" class="input" required>
                                        <option value="">Selecionar tipo</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb1">
                                <label>Arquivos *</label>
                                <input type="file" id="upload-files" class="input" multiple required 
                                       accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                                <div class="note mt0">Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 25MB por arquivo)</div>
                            </div>
                            <div class="grid cols-2">
                                <div>
                                    <label>Data de Validade</label>
                                    <input type="date" id="upload-expiry" class="input">
                                </div>
                                <div>
                                    <label>Nível de Acesso</label>
                                    <select id="upload-access-level" class="input">
                                        <option value="publico">Público (RH + Colaborador)</option>
                                        <option value="restrito">Restrito (Apenas RH)</option>
                                        <option value="confidencial">Confidencial (Gerência)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb1">
                                <label>Descrição/Observações</label>
                                <textarea id="upload-description" class="input" rows="3" 
                                          placeholder="Descrição ou observações sobre os documentos..."></textarea>
                            </div>
                            <div class="upload-progress hidden" id="upload-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progress-fill"></div>
                                </div>
                                <div class="progress-text" id="progress-text">Preparando upload...</div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" onclick="documentsModule.hideUploadModal()">Cancelar</button>
                        <button class="btn primary" onclick="documentsModule.uploadDocuments()">Fazer Upload</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Visualização -->
            <div id="document-viewer-modal" class="modal hidden">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3 id="document-viewer-title">Visualizar Documento</h3>
                        <button class="btn-close" onclick="documentsModule.hideViewerModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="document-viewer-content">
                            <!-- Conteúdo do visualizador -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" onclick="documentsModule.hideViewerModal()">Fechar</button>
                        <button class="btn primary" id="document-download-btn">📥 Download</button>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('main').innerHTML = content;
        this.setupFilterOptions();
        this.loadDocumentsData();
        this.updateStats();
    }

    /**
     * Carrega os documentos do sistema
     */
    async loadDocuments() {
        try {
            // Simulação de dados - integrar com API real
            this.documents = [
                {
                    id: 1,
                    fileName: 'contrato_joao_silva.pdf',
                    originalName: 'Contrato de Trabalho - João Silva.pdf',
                    employeeId: 1,
                    employeeName: 'João Silva',
                    documentType: 'Contrato de Trabalho',
                    fileSize: '245 KB',
                    uploadDate: '2024-12-10',
                    expiryDate: '2025-12-10',
                    status: 'ativo',
                    accessLevel: 'restrito',
                    uploadedBy: 'Maria Santos',
                    description: 'Contrato de trabalho inicial',
                    fileType: 'pdf',
                    url: '/uploads/documents/contrato_joao_silva.pdf'
                },
                {
                    id: 2,
                    fileName: 'carteira_trabalho_maria.jpg',
                    originalName: 'Carteira de Trabalho - Maria Santos.jpg',
                    employeeId: 2,
                    employeeName: 'Maria Santos',
                    documentType: 'Carteira de Trabalho',
                    fileSize: '1.2 MB',
                    uploadDate: '2024-12-08',
                    expiryDate: null,
                    status: 'ativo',
                    accessLevel: 'publico',
                    uploadedBy: 'Sistema',
                    description: 'Cópia da carteira de trabalho',
                    fileType: 'jpg',
                    url: '/uploads/documents/carteira_trabalho_maria.jpg'
                }
            ];
        } catch (error) {
            console.error('Erro ao carregar documentos:', error);
            UI.showNotification('Erro ao carregar documentos', 'error');
        }
    }

    /**
     * Carrega os tipos de documento
     */
    async loadDocumentTypes() {
        try {
            this.documentTypes = [
                { id: 1, name: 'Contrato de Trabalho', category: 'Contratuais', hasExpiry: true },
                { id: 2, name: 'Carteira de Trabalho', category: 'Pessoais', hasExpiry: false },
                { id: 3, name: 'CPF', category: 'Pessoais', hasExpiry: false },
                { id: 4, name: 'RG', category: 'Pessoais', hasExpiry: true },
                { id: 5, name: 'Comprovante de Residência', category: 'Pessoais', hasExpiry: true },
                { id: 6, name: 'Diploma/Certificado', category: 'Acadêmicos', hasExpiry: false },
                { id: 7, name: 'Atestado Médico', category: 'Saúde', hasExpiry: true },
                { id: 8, name: 'Exame Admissional', category: 'Saúde', hasExpiry: true },
                { id: 9, name: 'Termo de Confidencialidade', category: 'Contratuais', hasExpiry: false },
                { id: 10, name: 'Outros', category: 'Geral', hasExpiry: false }
            ];
        } catch (error) {
            console.error('Erro ao carregar tipos de documento:', error);
        }
    }

    /**
     * Configura as opções dos filtros
     */
    async setupFilterOptions() {
        // Carregar colaboradores
        const employees = await API.get('/employees');
        const employeeSelects = document.querySelectorAll('#filter-employee, #upload-employee');
        
        employeeSelects.forEach(select => {
            employees.forEach(emp => {
                const option = new Option(emp.name, emp.id);
                select.add(option);
            });
        });

        // Carregar tipos de documento
        const typeSelects = document.querySelectorAll('#filter-document-type, #upload-document-type');
        
        typeSelects.forEach(select => {
            this.documentTypes.forEach(type => {
                const option = new Option(type.name, type.name);
                select.add(option);
            });
        });
    }

    /**
     * Carrega e exibe os documentos
     */
    loadDocumentsData() {
        const currentView = document.getElementById('view-list').classList.contains('active') ? 'list' : 'grid';
        
        if (currentView === 'list') {
            this.loadListView();
        } else {
            this.loadGridView();
        }
    }

    /**
     * Carrega a visualização em lista
     */
    loadListView() {
        const tbody = document.getElementById('documents-table');
        const noData = document.getElementById('no-documents');
        
        if (this.documents.length === 0) {
            tbody.innerHTML = '';
            noData.classList.remove('hidden');
            return;
        }
        
        noData.classList.add('hidden');
        
        tbody.innerHTML = this.documents.map(doc => `
            <tr>
                <td>
                    <input type="checkbox" class="document-checkbox" value="${doc.id}">
                </td>
                <td>
                    <div class="file-info">
                        <div class="file-icon">${this.getFileIcon(doc.fileType)}</div>
                        <div>
                            <div class="file-name">${doc.originalName}</div>
                            <div class="file-meta">${doc.description || '-'}</div>
                        </div>
                    </div>
                </td>
                <td>${doc.employeeName}</td>
                <td>${doc.documentType}</td>
                <td>${doc.fileSize}</td>
                <td>${Helper.formatDate(doc.uploadDate)}</td>
                <td>
                    ${doc.expiryDate ? Helper.formatDate(doc.expiryDate) : 'Sem validade'}
                    ${this.isExpired(doc.expiryDate) ? '<span class="badge danger sm">Vencido</span>' : ''}
                </td>
                <td>
                    <span class="badge ${this.getStatusClass(doc.status)}">
                        ${this.getStatusLabel(doc.status)}
                    </span>
                    <span class="badge ${this.getAccessClass(doc.accessLevel)} sm">
                        ${this.getAccessLabel(doc.accessLevel)}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn sm" onclick="documentsModule.viewDocument(${doc.id})" 
                                title="Visualizar">👁️</button>
                        <button class="btn sm" onclick="documentsModule.downloadDocument(${doc.id})" 
                                title="Download">📥</button>
                        <button class="btn sm" onclick="documentsModule.shareDocument(${doc.id})" 
                                title="Compartilhar">🔗</button>
                        <button class="btn sm danger" onclick="documentsModule.deleteDocument(${doc.id})" 
                                title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Carrega a visualização em grade
     */
    loadGridView() {
        const grid = document.getElementById('documents-grid');
        const noData = document.getElementById('no-documents');
        
        if (this.documents.length === 0) {
            grid.innerHTML = '';
            noData.classList.remove('hidden');
            return;
        }
        
        noData.classList.add('hidden');
        
        grid.innerHTML = this.documents.map(doc => `
            <div class="document-card">
                <div class="document-card-header">
                    <input type="checkbox" class="document-checkbox" value="${doc.id}">
                    <div class="document-icon">${this.getFileIcon(doc.fileType)}</div>
                </div>
                <div class="document-card-body">
                    <div class="document-title" title="${doc.originalName}">${doc.originalName}</div>
                    <div class="document-meta">
                        <div>${doc.employeeName}</div>
                        <div>${doc.documentType}</div>
                        <div>${doc.fileSize}</div>
                    </div>
                    <div class="document-status">
                        <span class="badge ${this.getStatusClass(doc.status)} sm">
                            ${this.getStatusLabel(doc.status)}
                        </span>
                        ${this.isExpired(doc.expiryDate) ? '<span class="badge danger sm">Vencido</span>' : ''}
                    </div>
                </div>
                <div class="document-card-actions">
                    <button class="btn sm" onclick="documentsModule.viewDocument(${doc.id})" title="Visualizar">👁️</button>
                    <button class="btn sm" onclick="documentsModule.downloadDocument(${doc.id})" title="Download">📥</button>
                    <button class="btn sm" onclick="documentsModule.shareDocument(${doc.id})" title="Compartilhar">🔗</button>
                    <button class="btn sm danger" onclick="documentsModule.deleteDocument(${doc.id})" title="Excluir">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Atualiza as estatísticas
     */
    updateStats() {
        const stats = {
            total: this.documents.length,
            pending: this.documents.filter(d => d.status === 'pendente').length,
            storage: this.calculateStorageUsed()
        };
        
        document.getElementById('total-documents').textContent = stats.total;
        document.getElementById('pending-documents').textContent = stats.pending;
        document.getElementById('storage-used').textContent = stats.storage;
    }

    /**
     * Calcula o armazenamento usado
     */
    calculateStorageUsed() {
        // Simulação de cálculo
        let totalBytes = 0;
        this.documents.forEach(doc => {
            // Converter tamanho para bytes (aproximado)
            const size = doc.fileSize.toLowerCase();
            if (size.includes('kb')) {
                totalBytes += parseFloat(size) * 1024;
            } else if (size.includes('mb')) {
                totalBytes += parseFloat(size) * 1024 * 1024;
            }
        });
        
        // Converter para formato legível
        if (totalBytes < 1024 * 1024) {
            return Math.round(totalBytes / 1024) + ' KB';
        } else {
            return Math.round(totalBytes / (1024 * 1024)) + ' MB';
        }
    }

    /**
     * Alterna entre visualização em lista e grade
     */
    toggleView(view) {
        const listView = document.getElementById('documents-list-view');
        const gridView = document.getElementById('documents-grid-view');
        const listBtn = document.getElementById('view-list');
        const gridBtn = document.getElementById('view-grid');
        
        if (view === 'grid') {
            listView.classList.add('hidden');
            gridView.classList.remove('hidden');
            listBtn.classList.remove('active');
            gridBtn.classList.add('active');
            this.loadGridView();
        } else {
            gridView.classList.add('hidden');
            listView.classList.remove('hidden');
            gridBtn.classList.remove('active');
            listBtn.classList.add('active');
            this.loadListView();
        }
    }

    /**
     * Aplica os filtros selecionados
     */
    applyFilters() {
        const filters = {
            search: document.getElementById('search-documents').value.toLowerCase(),
            employee: document.getElementById('filter-employee').value,
            documentType: document.getElementById('filter-document-type').value,
            status: document.getElementById('filter-status').value
        };
        
        let filtered = this.documents;
        
        if (filters.search) {
            filtered = filtered.filter(d => 
                d.originalName.toLowerCase().includes(filters.search) ||
                d.employeeName.toLowerCase().includes(filters.search) ||
                d.documentType.toLowerCase().includes(filters.search)
            );
        }
        
        if (filters.employee) {
            filtered = filtered.filter(d => d.employeeId == filters.employee);
        }
        
        if (filters.documentType) {
            filtered = filtered.filter(d => d.documentType === filters.documentType);
        }
        
        if (filters.status) {
            if (filters.status === 'vencido') {
                filtered = filtered.filter(d => this.isExpired(d.expiryDate));
            } else {
                filtered = filtered.filter(d => d.status === filters.status);
            }
        }
        
        // Temporariamente substituir dados para renderizar filtrados
        const originalDocuments = this.documents;
        this.documents = filtered;
        this.loadDocumentsData();
        this.documents = originalDocuments;
        
        UI.showNotification(`${filtered.length} documentos encontrados`, 'success');
    }

    /**
     * Limpa todos os filtros
     */
    clearFilters() {
        document.getElementById('search-documents').value = '';
        document.getElementById('filter-employee').value = '';
        document.getElementById('filter-document-type').value = '';
        document.getElementById('filter-status').value = '';
        
        this.loadDocumentsData();
        UI.showNotification('Filtros limpos', 'info');
    }

    /**
     * Seleciona/deseleciona todos os documentos
     */
    toggleSelectAll() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('.document-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
        });
    }

    /**
     * Mostra o modal de upload
     */
    showUploadModal() {
        document.getElementById('upload-modal').classList.remove('hidden');
    }

    /**
     * Esconde o modal de upload
     */
    hideUploadModal() {
        document.getElementById('upload-modal').classList.add('hidden');
        document.getElementById('upload-form').reset();
        document.getElementById('upload-progress').classList.add('hidden');
    }

    /**
     * Faz upload dos documentos
     */
    async uploadDocuments() {
        const form = document.getElementById('upload-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const files = document.getElementById('upload-files').files;
        if (files.length === 0) {
            UI.showNotification('Selecione pelo menos um arquivo', 'warning');
            return;
        }
        
        const formData = {
            employeeId: document.getElementById('upload-employee').value,
            documentType: document.getElementById('upload-document-type').value,
            expiryDate: document.getElementById('upload-expiry').value,
            accessLevel: document.getElementById('upload-access-level').value,
            description: document.getElementById('upload-description').value
        };
        
        // Mostrar barra de progresso
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressContainer.classList.remove('hidden');
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = Math.round(((i + 1) / files.length) * 100);
                
                progressFill.style.width = progress + '%';
                progressText.textContent = `Enviando ${file.name}... (${i + 1}/${files.length})`;
                
                // Simular upload
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Criar documento na lista (simulação)
                const newDocument = {
                    id: this.documents.length + 1,
                    fileName: `${Date.now()}_${file.name}`,
                    originalName: file.name,
                    ...formData,
                    employeeName: employees.find(emp => emp.id == formData.employeeId)?.name || 'Desconhecido',
                    fileSize: this.formatFileSize(file.size),
                    uploadDate: new Date().toISOString().split('T')[0],
                    status: 'ativo',
                    uploadedBy: 'Usuário Atual',
                    fileType: file.name.split('.').pop().toLowerCase(),
                    url: `/uploads/documents/${Date.now()}_${file.name}`
                };
                
                this.documents.unshift(newDocument);
            }
            
            progressText.textContent = 'Upload concluído!';
            
            setTimeout(() => {
                this.hideUploadModal();
                this.loadDocumentsData();
                this.updateStats();
            }, 1000);
            
            UI.showNotification(`${files.length} documento(s) enviado(s) com sucesso!`, 'success');
        } catch (error) {
            console.error('Erro no upload:', error);
            UI.showNotification('Erro no upload dos documentos', 'error');
            progressContainer.classList.add('hidden');
        }
    }

    /**
     * Visualiza um documento
     */
    viewDocument(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        const modal = document.getElementById('document-viewer-modal');
        const title = document.getElementById('document-viewer-title');
        const content = document.getElementById('document-viewer-content');
        const downloadBtn = document.getElementById('document-download-btn');
        
        title.textContent = doc.originalName;
        
        // Configurar visualizador baseado no tipo de arquivo
        if (doc.fileType === 'pdf') {
            content.innerHTML = `
                <iframe src="${doc.url}" width="100%" height="600px" 
                        style="border: none; border-radius: 4px;">
                    <p>Seu navegador não suporta visualização de PDF. 
                       <a href="${doc.url}" target="_blank">Clique aqui para abrir</a>
                    </p>
                </iframe>
            `;
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(doc.fileType)) {
            content.innerHTML = `
                <div class="image-viewer">
                    <img src="${doc.url}" alt="${doc.originalName}" 
                         style="max-width: 100%; max-height: 600px; object-fit: contain;">
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="document-info">
                    <div class="file-icon large">${this.getFileIcon(doc.fileType)}</div>
                    <h3>${doc.originalName}</h3>
                    <p>Tipo: ${doc.documentType}</p>
                    <p>Tamanho: ${doc.fileSize}</p>
                    <p>Colaborador: ${doc.employeeName}</p>
                    <p>Data de Upload: ${Helper.formatDate(doc.uploadDate)}</p>
                    ${doc.expiryDate ? `<p>Validade: ${Helper.formatDate(doc.expiryDate)}</p>` : ''}
                    <p class="mt1">Este tipo de arquivo não pode ser visualizado online. 
                       Use o botão de download para baixar o arquivo.</p>
                </div>
            `;
        }
        
        downloadBtn.onclick = () => this.downloadDocument(docId);
        modal.classList.remove('hidden');
    }

    /**
     * Esconde o modal de visualização
     */
    hideViewerModal() {
        document.getElementById('document-viewer-modal').classList.add('hidden');
    }

    /**
     * Faz download de um documento
     */
    downloadDocument(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        // Simular download
        console.log('Download do documento:', doc.originalName);
        
        // Criar link temporário para download
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = doc.originalName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.showNotification(`Download iniciado: ${doc.originalName}`, 'success');
    }

    /**
     * Compartilha um documento
     */
    shareDocument(docId) {
        const doc = this.documents.find(d => d.id === docId);
        if (!doc) return;
        
        // Gerar link de compartilhamento
        const shareLink = `${window.location.origin}/documents/share/${doc.id}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareLink).then(() => {
                UI.showNotification('Link de compartilhamento copiado!', 'success');
            });
        } else {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = shareLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            UI.showNotification('Link de compartilhamento copiado!', 'success');
        }
    }

    /**
     * Exclui um documento
     */
    async deleteDocument(docId) {
        if (!confirm('Tem certeza que deseja excluir este documento?')) return;
        
        try {
            // await API.delete(`/documents/${docId}`);
            
            this.documents = this.documents.filter(d => d.id !== docId);
            this.loadDocumentsData();
            this.updateStats();
            
            UI.showNotification('Documento excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir documento:', error);
            UI.showNotification('Erro ao excluir documento', 'error');
        }
    }

    /**
     * Download em lote dos documentos selecionados
     */
    bulkDownload() {
        const selectedIds = Array.from(document.querySelectorAll('.document-checkbox:checked'))
            .map(cb => parseInt(cb.value));
        
        if (selectedIds.length === 0) {
            UI.showNotification('Selecione pelo menos um documento', 'warning');
            return;
        }
        
        const selectedDocs = this.documents.filter(d => selectedIds.includes(d.id));
        
        // Simular download em lote
        console.log('Download em lote:', selectedDocs.map(d => d.originalName));
        
        UI.showNotification(`Download iniciado: ${selectedDocs.length} documento(s)`, 'success');
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Event listeners serão configurados quando o módulo for renderizado
    }

    /**
     * Retorna o ícone baseado no tipo de arquivo
     */
    getFileIcon(fileType) {
        const icons = {
            'pdf': '📄',
            'doc': '📝',
            'docx': '📝',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'png': '🖼️',
            'gif': '🖼️',
            'txt': '📝',
            'xlsx': '📊',
            'xls': '📊',
            'zip': '📦',
            'rar': '📦'
        };
        return icons[fileType.toLowerCase()] || '📎';
    }

    /**
     * Verifica se o documento está vencido
     */
    isExpired(expiryDate) {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    }

    /**
     * Formata o tamanho do arquivo
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Retorna a classe CSS para o status
     */
    getStatusClass(status) {
        const classes = {
            'ativo': 'success',
            'vencido': 'danger',
            'pendente': 'warning',
            'arquivado': 'secondary'
        };
        return classes[status] || 'secondary';
    }

    /**
     * Retorna o label para o status
     */
    getStatusLabel(status) {
        const labels = {
            'ativo': 'Ativo',
            'vencido': 'Vencido',
            'pendente': 'Pendente',
            'arquivado': 'Arquivado'
        };
        return labels[status] || status;
    }

    /**
     * Retorna a classe CSS para o nível de acesso
     */
    getAccessClass(accessLevel) {
        const classes = {
            'publico': 'info',
            'restrito': 'warning',
            'confidencial': 'danger'
        };
        return classes[accessLevel] || 'secondary';
    }

    /**
     * Retorna o label para o nível de acesso
     */
    getAccessLabel(accessLevel) {
        const labels = {
            'publico': 'Público',
            'restrito': 'Restrito',
            'confidencial': 'Confidencial'
        };
        return labels[accessLevel] || accessLevel;
    }
}

// Instância global do módulo
window.documentsModule = new DocumentsModule();
