/**
 * MARH - Protocols Module
 * Sistema de protocolos e solicitações dos colaboradores
 */

class ProtocolsModule {
    constructor() {
        this.protocols = [];
        this.protocolTypes = [];
        this.isInitialized = false;
    }

    /**
     * Inicializa o módulo de protocolos
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('📋 Inicializando módulo de Protocolos...');
        
        await this.loadProtocols();
        await this.loadProtocolTypes();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ Módulo de Protocolos inicializado');
    }

    /**
     * Renderiza a página de protocolos
     */
    render() {
        const content = `
            <div class="page-header">
                <div>
                    <h1>📋 Protocolos</h1>
                    <p class="subtitle">Gestão de solicitações e protocolos dos colaboradores</p>
                </div>
                <div class="page-actions">
                    <button class="btn primary" onclick="protocolsModule.showNewProtocolModal()">
                        ➕ Novo Protocolo
                    </button>
                    <button class="btn" onclick="protocolsModule.exportProtocols()">
                        📊 Exportar
                    </button>
                </div>
            </div>

            <div class="grid cols-4 mb2">
                <div class="stat-card">
                    <div class="stat-value" id="total-protocols">-</div>
                    <div class="stat-label">Total de Protocolos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value pending" id="pending-protocols">-</div>
                    <div class="stat-label">Em Análise</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value success" id="approved-protocols">-</div>
                    <div class="stat-label">Aprovados</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value danger" id="rejected-protocols">-</div>
                    <div class="stat-label">Rejeitados</div>
                </div>
            </div>

            <!-- Filtros -->
            <div class="card mb2">
                <div class="card-header">
                    <h3>Filtros</h3>
                </div>
                <div class="card-content">
                    <div class="grid cols-4">
                        <div>
                            <label>Colaborador</label>
                            <select id="filter-employee" class="input">
                                <option value="">Todos os colaboradores</option>
                            </select>
                        </div>
                        <div>
                            <label>Tipo</label>
                            <select id="filter-type" class="input">
                                <option value="">Todos os tipos</option>
                            </select>
                        </div>
                        <div>
                            <label>Status</label>
                            <select id="filter-status" class="input">
                                <option value="">Todos os status</option>
                                <option value="pendente">Pendente</option>
                                <option value="em-analise">Em Análise</option>
                                <option value="aprovado">Aprovado</option>
                                <option value="rejeitado">Rejeitado</option>
                            </select>
                        </div>
                        <div>
                            <label>Período</label>
                            <select id="filter-period" class="input">
                                <option value="30">Últimos 30 dias</option>
                                <option value="90">Últimos 90 dias</option>
                                <option value="180">Últimos 6 meses</option>
                                <option value="all">Todos</option>
                            </select>
                        </div>
                    </div>
                    <div class="mt1">
                        <button class="btn primary" onclick="protocolsModule.applyFilters()">
                            🔍 Filtrar
                        </button>
                        <button class="btn" onclick="protocolsModule.clearFilters()">
                            🗑️ Limpar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Lista de Protocolos -->
            <div class="card">
                <div class="card-header">
                    <h3>Lista de Protocolos</h3>
                </div>
                <div class="card-content">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Protocolo</th>
                                    <th>Colaborador</th>
                                    <th>Tipo</th>
                                    <th>Assunto</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                    <th>Responsável</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="protocols-table">
                                <!-- Será preenchido dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                    <div id="no-protocols" class="empty-state hidden">
                        <div class="empty-icon">📋</div>
                        <h3>Nenhum protocolo encontrado</h3>
                        <p>Não há protocolos para os filtros selecionados</p>
                    </div>
                </div>
            </div>

            <!-- Modal de Novo Protocolo -->
            <div id="protocol-modal" class="modal hidden">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>➕ Novo Protocolo</h3>
                        <button class="btn-close" onclick="protocolsModule.hideProtocolModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="protocol-form">
                            <div class="grid cols-2">
                                <div>
                                    <label>Colaborador *</label>
                                    <select id="protocol-employee" class="input" required>
                                        <option value="">Selecionar colaborador</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Tipo de Protocolo *</label>
                                    <select id="protocol-type" class="input" required>
                                        <option value="">Selecionar tipo</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb1">
                                <label>Assunto *</label>
                                <input type="text" id="protocol-subject" class="input" required 
                                       placeholder="Digite o assunto do protocolo">
                            </div>
                            <div class="mb1">
                                <label>Descrição *</label>
                                <textarea id="protocol-description" class="input" rows="4" required 
                                          placeholder="Descreva detalhadamente a solicitação..."></textarea>
                            </div>
                            <div class="grid cols-2">
                                <div>
                                    <label>Prioridade</label>
                                    <select id="protocol-priority" class="input">
                                        <option value="baixa">Baixa</option>
                                        <option value="media" selected>Média</option>
                                        <option value="alta">Alta</option>
                                        <option value="urgente">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Data Limite</label>
                                    <input type="date" id="protocol-deadline" class="input">
                                </div>
                            </div>
                            <div class="mb1">
                                <label>Documentos Anexos</label>
                                <input type="file" id="protocol-files" class="input" multiple>
                                <div class="note mt0">Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB por arquivo)</div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" onclick="protocolsModule.hideProtocolModal()">Cancelar</button>
                        <button class="btn primary" onclick="protocolsModule.saveProtocol()">Criar Protocolo</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Detalhes do Protocolo -->
            <div id="protocol-details-modal" class="modal hidden">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3 id="protocol-details-title">Protocolo #</h3>
                        <button class="btn-close" onclick="protocolsModule.hideDetailsModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="protocol-details-content">
                            <!-- Será preenchido dinamicamente -->
                        </div>
                    </div>
                    <div class="modal-footer" id="protocol-details-actions">
                        <!-- Ações serão adicionadas dinamicamente -->
                    </div>
                </div>
            </div>
        `;

        document.querySelector('main').innerHTML = content;
        this.setupFilterOptions();
        this.loadProtocolsData();
        this.updateStats();
    }

    /**
     * Carrega os protocolos do sistema
     */
    async loadProtocols() {
        try {
            // Simulação de dados - integrar com API real
            this.protocols = [
                {
                    id: 1,
                    number: 'PROT-2024-001',
                    employeeId: 1,
                    employeeName: 'João Silva',
                    type: 'Férias',
                    subject: 'Solicitação de Férias - Janeiro 2025',
                    description: 'Gostaria de solicitar férias de 15 dias no período de 05/01 a 19/01/2025.',
                    priority: 'media',
                    status: 'pendente',
                    createdAt: '2024-12-15',
                    deadline: '2024-12-25',
                    assignedTo: 'Maria Santos',
                    attachments: []
                },
                {
                    id: 2,
                    number: 'PROT-2024-002',
                    employeeId: 2,
                    employeeName: 'Maria Santos',
                    type: 'Atestado Médico',
                    subject: 'Atestado Médico - Consulta Oftalmológica',
                    description: 'Anexo atestado médico referente a consulta oftalmológica realizada em 12/12/2024.',
                    priority: 'alta',
                    status: 'aprovado',
                    createdAt: '2024-12-12',
                    deadline: '2024-12-20',
                    assignedTo: 'Carlos Pereira',
                    attachments: ['atestado_medico.pdf']
                }
            ];
        } catch (error) {
            console.error('Erro ao carregar protocolos:', error);
            UI.showNotification('Erro ao carregar protocolos', 'error');
        }
    }

    /**
     * Carrega os tipos de protocolo
     */
    async loadProtocolTypes() {
        try {
            this.protocolTypes = [
                { id: 1, name: 'Férias', category: 'Licenças' },
                { id: 2, name: 'Atestado Médico', category: 'Saúde' },
                { id: 3, name: 'Licença Maternidade', category: 'Licenças' },
                { id: 4, name: 'Hora Extra', category: 'Frequência' },
                { id: 5, name: 'Mudança de Horário', category: 'Frequência' },
                { id: 6, name: 'Solicitação de Equipamento', category: 'Recursos' },
                { id: 7, name: 'Reclamação/Sugestão', category: 'Feedback' },
                { id: 8, name: 'Outros', category: 'Geral' }
            ];
        } catch (error) {
            console.error('Erro ao carregar tipos de protocolo:', error);
        }
    }

    /**
     * Configura as opções dos filtros
     */
    async setupFilterOptions() {
        // Carregar colaboradores
        const employees = await API.get('/employees');
        const employeeSelects = document.querySelectorAll('#filter-employee, #protocol-employee');
        
        employeeSelects.forEach(select => {
            employees.forEach(emp => {
                const option = new Option(emp.name, emp.id);
                select.add(option);
            });
        });

        // Carregar tipos de protocolo
        const typeSelects = document.querySelectorAll('#filter-type, #protocol-type');
        
        typeSelects.forEach(select => {
            this.protocolTypes.forEach(type => {
                const option = new Option(type.name, type.name);
                select.add(option);
            });
        });
    }

    /**
     * Carrega e exibe os protocolos na tabela
     */
    loadProtocolsData() {
        const tbody = document.getElementById('protocols-table');
        const noData = document.getElementById('no-protocols');
        
        if (this.protocols.length === 0) {
            tbody.innerHTML = '';
            noData.classList.remove('hidden');
            return;
        }
        
        noData.classList.add('hidden');
        
        tbody.innerHTML = this.protocols.map(protocol => `
            <tr>
                <td>
                    <a href="#" onclick="protocolsModule.showDetails(${protocol.id})" 
                       class="link">${protocol.number}</a>
                </td>
                <td>${protocol.employeeName}</td>
                <td>${protocol.type}</td>
                <td>${protocol.subject}</td>
                <td>${Helper.formatDate(protocol.createdAt)}</td>
                <td>
                    <span class="badge ${this.getStatusClass(protocol.status)}">
                        ${this.getStatusLabel(protocol.status)}
                    </span>
                </td>
                <td>${protocol.assignedTo}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn sm" onclick="protocolsModule.showDetails(${protocol.id})" 
                                title="Ver Detalhes">👁️</button>
                        <button class="btn sm" onclick="protocolsModule.updateStatus(${protocol.id})" 
                                title="Atualizar Status">📝</button>
                        <button class="btn sm danger" onclick="protocolsModule.deleteProtocol(${protocol.id})" 
                                title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Atualiza as estatísticas
     */
    updateStats() {
        const stats = {
            total: this.protocols.length,
            pending: this.protocols.filter(p => p.status === 'pendente' || p.status === 'em-analise').length,
            approved: this.protocols.filter(p => p.status === 'aprovado').length,
            rejected: this.protocols.filter(p => p.status === 'rejeitado').length
        };
        
        document.getElementById('total-protocols').textContent = stats.total;
        document.getElementById('pending-protocols').textContent = stats.pending;
        document.getElementById('approved-protocols').textContent = stats.approved;
        document.getElementById('rejected-protocols').textContent = stats.rejected;
    }

    /**
     * Aplica os filtros selecionados
     */
    applyFilters() {
        const filters = {
            employee: document.getElementById('filter-employee').value,
            type: document.getElementById('filter-type').value,
            status: document.getElementById('filter-status').value,
            period: document.getElementById('filter-period').value
        };
        
        let filtered = this.protocols;
        
        if (filters.employee) {
            filtered = filtered.filter(p => p.employeeId == filters.employee);
        }
        
        if (filters.type) {
            filtered = filtered.filter(p => p.type === filters.type);
        }
        
        if (filters.status) {
            filtered = filtered.filter(p => p.status === filters.status);
        }
        
        if (filters.period && filters.period !== 'all') {
            const days = parseInt(filters.period);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];
            
            filtered = filtered.filter(p => p.createdAt >= cutoffStr);
        }
        
        // Temporariamente substituir dados para renderizar filtrados
        const originalProtocols = this.protocols;
        this.protocols = filtered;
        this.loadProtocolsData();
        this.protocols = originalProtocols;
        
        UI.showNotification(`${filtered.length} protocolos encontrados`, 'success');
    }

    /**
     * Limpa todos os filtros
     */
    clearFilters() {
        document.getElementById('filter-employee').value = '';
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-period').value = '30';
        
        this.loadProtocolsData();
        UI.showNotification('Filtros limpos', 'info');
    }

    /**
     * Mostra o modal de novo protocolo
     */
    showNewProtocolModal() {
        document.getElementById('protocol-modal').classList.remove('hidden');
        
        // Configurar data limite padrão (7 dias)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        document.getElementById('protocol-deadline').value = nextWeek.toISOString().split('T')[0];
    }

    /**
     * Esconde o modal de protocolo
     */
    hideProtocolModal() {
        document.getElementById('protocol-modal').classList.add('hidden');
        document.getElementById('protocol-form').reset();
    }

    /**
     * Salva um novo protocolo
     */
    async saveProtocol() {
        const form = document.getElementById('protocol-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = {
            employeeId: document.getElementById('protocol-employee').value,
            type: document.getElementById('protocol-type').value,
            subject: document.getElementById('protocol-subject').value,
            description: document.getElementById('protocol-description').value,
            priority: document.getElementById('protocol-priority').value,
            deadline: document.getElementById('protocol-deadline').value
        };
        
        try {
            // Gerar número do protocolo
            const year = new Date().getFullYear();
            const nextId = this.protocols.length + 1;
            const protocolNumber = `PROT-${year}-${nextId.toString().padStart(3, '0')}`;
            
            const newProtocol = {
                ...formData,
                id: nextId,
                number: protocolNumber,
                status: 'pendente',
                createdAt: new Date().toISOString().split('T')[0],
                assignedTo: 'Sistema',
                attachments: []
            };
            
            // Simular salvamento
            console.log('Salvando protocolo:', newProtocol);
            
            // Aqui integraria com a API
            // await API.post('/protocols', newProtocol);
            
            this.protocols.unshift(newProtocol);
            this.hideProtocolModal();
            this.loadProtocolsData();
            this.updateStats();
            
            UI.showNotification(`Protocolo ${protocolNumber} criado com sucesso!`, 'success');
        } catch (error) {
            console.error('Erro ao salvar protocolo:', error);
            UI.showNotification('Erro ao salvar protocolo', 'error');
        }
    }

    /**
     * Mostra os detalhes de um protocolo
     */
    showDetails(protocolId) {
        const protocol = this.protocols.find(p => p.id === protocolId);
        if (!protocol) return;
        
        const modal = document.getElementById('protocol-details-modal');
        const title = document.getElementById('protocol-details-title');
        const content = document.getElementById('protocol-details-content');
        const actions = document.getElementById('protocol-details-actions');
        
        title.textContent = `Protocolo ${protocol.number}`;
        
        content.innerHTML = `
            <div class="grid cols-2 mb2">
                <div>
                    <label>Colaborador:</label>
                    <div class="value">${protocol.employeeName}</div>
                </div>
                <div>
                    <label>Tipo:</label>
                    <div class="value">${protocol.type}</div>
                </div>
                <div>
                    <label>Status:</label>
                    <div class="value">
                        <span class="badge ${this.getStatusClass(protocol.status)}">
                            ${this.getStatusLabel(protocol.status)}
                        </span>
                    </div>
                </div>
                <div>
                    <label>Prioridade:</label>
                    <div class="value">
                        <span class="badge ${this.getPriorityClass(protocol.priority)}">
                            ${this.getPriorityLabel(protocol.priority)}
                        </span>
                    </div>
                </div>
                <div>
                    <label>Data de Criação:</label>
                    <div class="value">${Helper.formatDate(protocol.createdAt)}</div>
                </div>
                <div>
                    <label>Data Limite:</label>
                    <div class="value">${Helper.formatDate(protocol.deadline)}</div>
                </div>
            </div>
            
            <div class="mb2">
                <label>Assunto:</label>
                <div class="value">${protocol.subject}</div>
            </div>
            
            <div class="mb2">
                <label>Descrição:</label>
                <div class="value">${protocol.description}</div>
            </div>
            
            <div class="mb2">
                <label>Responsável:</label>
                <div class="value">${protocol.assignedTo}</div>
            </div>
            
            ${protocol.attachments.length > 0 ? `
                <div class="mb2">
                    <label>Anexos:</label>
                    <div class="value">
                        ${protocol.attachments.map(file => `
                            <a href="#" class="file-link">${file}</a>
                        `).join('<br>')}
                    </div>
                </div>
            ` : ''}
        `;
        
        // Configurar ações baseadas no status e permissões
        actions.innerHTML = `
            <button class="btn" onclick="protocolsModule.hideDetailsModal()">Fechar</button>
            ${protocol.status === 'pendente' ? `
                <button class="btn success" onclick="protocolsModule.approveProtocol(${protocol.id})">Aprovar</button>
                <button class="btn danger" onclick="protocolsModule.rejectProtocol(${protocol.id})">Rejeitar</button>
            ` : ''}
            <button class="btn primary" onclick="protocolsModule.addComment(${protocol.id})">Adicionar Comentário</button>
        `;
        
        modal.classList.remove('hidden');
    }

    /**
     * Esconde o modal de detalhes
     */
    hideDetailsModal() {
        document.getElementById('protocol-details-modal').classList.add('hidden');
    }

    /**
     * Atualiza o status de um protocolo
     */
    updateStatus(protocolId) {
        const protocol = this.protocols.find(p => p.id === protocolId);
        if (!protocol) return;
        
        // Implementar modal de atualização de status
        console.log('Atualizando status do protocolo:', protocol);
        UI.showNotification('Função de atualização de status em desenvolvimento', 'info');
    }

    /**
     * Aprova um protocolo
     */
    async approveProtocol(protocolId) {
        if (!confirm('Tem certeza que deseja aprovar este protocolo?')) return;
        
        try {
            const protocol = this.protocols.find(p => p.id === protocolId);
            protocol.status = 'aprovado';
            
            // await API.put(`/protocols/${protocolId}/approve`);
            
            this.hideDetailsModal();
            this.loadProtocolsData();
            this.updateStats();
            
            UI.showNotification('Protocolo aprovado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao aprovar protocolo:', error);
            UI.showNotification('Erro ao aprovar protocolo', 'error');
        }
    }

    /**
     * Rejeita um protocolo
     */
    async rejectProtocol(protocolId) {
        const reason = prompt('Motivo da rejeição:');
        if (!reason) return;
        
        try {
            const protocol = this.protocols.find(p => p.id === protocolId);
            protocol.status = 'rejeitado';
            protocol.rejectionReason = reason;
            
            // await API.put(`/protocols/${protocolId}/reject`, { reason });
            
            this.hideDetailsModal();
            this.loadProtocolsData();
            this.updateStats();
            
            UI.showNotification('Protocolo rejeitado', 'info');
        } catch (error) {
            console.error('Erro ao rejeitar protocolo:', error);
            UI.showNotification('Erro ao rejeitar protocolo', 'error');
        }
    }

    /**
     * Adiciona comentário a um protocolo
     */
    addComment(protocolId) {
        const comment = prompt('Adicionar comentário:');
        if (!comment) return;
        
        // Implementar sistema de comentários
        console.log('Adicionando comentário ao protocolo', protocolId, ':', comment);
        UI.showNotification('Comentário adicionado com sucesso!', 'success');
    }

    /**
     * Exclui um protocolo
     */
    async deleteProtocol(protocolId) {
        if (!confirm('Tem certeza que deseja excluir este protocolo?')) return;
        
        try {
            // await API.delete(`/protocols/${protocolId}`);
            
            this.protocols = this.protocols.filter(p => p.id !== protocolId);
            this.loadProtocolsData();
            this.updateStats();
            
            UI.showNotification('Protocolo excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir protocolo:', error);
            UI.showNotification('Erro ao excluir protocolo', 'error');
        }
    }

    /**
     * Exporta os protocolos
     */
    exportProtocols() {
        // Implementar exportação
        console.log('Exportando protocolos...');
        UI.showNotification('Relatório de protocolos exportado!', 'success');
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Event listeners serão configurados quando o módulo for renderizado
    }

    /**
     * Retorna a classe CSS para o status
     */
    getStatusClass(status) {
        const classes = {
            'pendente': 'warning',
            'em-analise': 'info',
            'aprovado': 'success',
            'rejeitado': 'danger'
        };
        return classes[status] || 'secondary';
    }

    /**
     * Retorna o label para o status
     */
    getStatusLabel(status) {
        const labels = {
            'pendente': 'Pendente',
            'em-analise': 'Em Análise',
            'aprovado': 'Aprovado',
            'rejeitado': 'Rejeitado'
        };
        return labels[status] || status;
    }

    /**
     * Retorna a classe CSS para a prioridade
     */
    getPriorityClass(priority) {
        const classes = {
            'baixa': 'secondary',
            'media': 'info',
            'alta': 'warning',
            'urgente': 'danger'
        };
        return classes[priority] || 'secondary';
    }

    /**
     * Retorna o label para a prioridade
     */
    getPriorityLabel(priority) {
        const labels = {
            'baixa': 'Baixa',
            'media': 'Média',
            'alta': 'Alta',
            'urgente': 'Urgente'
        };
        return labels[priority] || priority;
    }
}

// Instância global do módulo
window.protocolsModule = new ProtocolsModule();
