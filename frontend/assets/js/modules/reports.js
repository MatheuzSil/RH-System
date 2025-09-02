/**
 * MARH - Reports Module
 * Sistema de relatórios e analytics do RH
 */

class ReportsModule {
    constructor() {
        this.reports = [];
        this.templates = [];
        this.scheduledReports = [];
        this.isInitialized = false;
    }

    /**
     * Inicializa o módulo de relatórios
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('📊 Inicializando módulo de Relatórios...');
        
        await this.loadReportTemplates();
        await this.loadScheduledReports();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ Módulo de Relatórios inicializado');
    }

    /**
     * Renderiza a página de relatórios
     */
    render() {
        const content = `
            <div class="page-header">
                <div>
                    <h1>📊 Relatórios</h1>
                    <p class="subtitle">Centro de relatórios e análises de RH</p>
                </div>
                <div class="page-actions">
                    <button class="btn primary" onclick="reportsModule.showReportBuilder()">
                        ➕ Criar Relatório
                    </button>
                    <button class="btn" onclick="reportsModule.showScheduler()">
                        ⏰ Agendar Relatório
                    </button>
                </div>
            </div>

            <!-- Relatórios Rápidos -->
            <div class="card mb2">
                <div class="card-header">
                    <h3>🚀 Relatórios Rápidos</h3>
                </div>
                <div class="card-content">
                    <div class="grid cols-4">
                        <div class="quick-report-card" onclick="reportsModule.generateQuickReport('employees')">
                            <div class="report-icon">👥</div>
                            <div class="report-title">Colaboradores</div>
                            <div class="report-subtitle">Lista completa de funcionários</div>
                        </div>
                        <div class="quick-report-card" onclick="reportsModule.generateQuickReport('attendance')">
                            <div class="report-icon">🕒</div>
                            <div class="report-title">Frequência</div>
                            <div class="report-subtitle">Relatório de ponto mensal</div>
                        </div>
                        <div class="quick-report-card" onclick="reportsModule.generateQuickReport('payroll')">
                            <div class="report-icon">💰</div>
                            <div class="report-title">Folha de Pagamento</div>
                            <div class="report-subtitle">Resumo salarial</div>
                        </div>
                        <div class="quick-report-card" onclick="reportsModule.generateQuickReport('departments')">
                            <div class="report-icon">🏢</div>
                            <div class="report-title">Departamentos</div>
                            <div class="report-subtitle">Estrutura organizacional</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid cols-2">
                <!-- Templates de Relatório -->
                <div class="card">
                    <div class="card-header">
                        <h3>📋 Templates Disponíveis</h3>
                    </div>
                    <div class="card-content">
                        <div class="report-templates" id="report-templates">
                            <!-- Será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>

                <!-- Relatórios Agendados -->
                <div class="card">
                    <div class="card-header">
                        <h3>⏰ Relatórios Agendados</h3>
                    </div>
                    <div class="card-content">
                        <div class="scheduled-reports" id="scheduled-reports">
                            <!-- Será preenchido dinamicamente -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Histórico de Relatórios -->
            <div class="card mt2">
                <div class="card-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>📈 Histórico de Relatórios</h3>
                        <div class="filters-inline">
                            <select id="filter-report-type" class="input sm">
                                <option value="">Todos os tipos</option>
                                <option value="colaboradores">Colaboradores</option>
                                <option value="frequencia">Frequência</option>
                                <option value="financeiro">Financeiro</option>
                                <option value="performance">Performance</option>
                            </select>
                            <button class="btn sm primary" onclick="reportsModule.filterHistory()">Filtrar</button>
                        </div>
                    </div>
                </div>
                <div class="card-content">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Relatório</th>
                                    <th>Tipo</th>
                                    <th>Gerado por</th>
                                    <th>Data</th>
                                    <th>Período</th>
                                    <th>Formato</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="reports-history">
                                <!-- Será preenchido dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal de Construtor de Relatório -->
            <div id="report-builder-modal" class="modal hidden">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h3>📊 Construtor de Relatório</h3>
                        <button class="btn-close" onclick="reportsModule.hideReportBuilder()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="report-builder-steps">
                            <div class="step active" data-step="1">
                                <div class="step-number">1</div>
                                <div class="step-title">Tipo de Relatório</div>
                            </div>
                            <div class="step" data-step="2">
                                <div class="step-number">2</div>
                                <div class="step-title">Filtros e Dados</div>
                            </div>
                            <div class="step" data-step="3">
                                <div class="step-number">3</div>
                                <div class="step-title">Formato e Entrega</div>
                            </div>
                        </div>

                        <form id="report-builder-form">
                            <!-- Passo 1: Tipo de Relatório -->
                            <div class="step-content active" id="step-1">
                                <h4>Selecione o tipo de relatório:</h4>
                                <div class="report-types-grid">
                                    <div class="report-type-option" data-type="employees">
                                        <div class="type-icon">👥</div>
                                        <div class="type-name">Colaboradores</div>
                                        <div class="type-description">Dados dos funcionários</div>
                                    </div>
                                    <div class="report-type-option" data-type="attendance">
                                        <div class="type-icon">🕒</div>
                                        <div class="type-name">Frequência</div>
                                        <div class="type-description">Relatórios de ponto</div>
                                    </div>
                                    <div class="report-type-option" data-type="payroll">
                                        <div class="type-icon">💰</div>
                                        <div class="type-name">Folha de Pagamento</div>
                                        <div class="type-description">Dados salariais</div>
                                    </div>
                                    <div class="report-type-option" data-type="performance">
                                        <div class="type-icon">📈</div>
                                        <div class="type-name">Performance</div>
                                        <div class="type-description">Avaliações e metas</div>
                                    </div>
                                </div>
                                <input type="hidden" id="selected-report-type">
                            </div>

                            <!-- Passo 2: Filtros -->
                            <div class="step-content" id="step-2">
                                <h4>Configure os filtros:</h4>
                                <div class="grid cols-2">
                                    <div>
                                        <label>Período *</label>
                                        <select id="report-period" class="input" required>
                                            <option value="current-month">Mês Atual</option>
                                            <option value="last-month">Mês Anterior</option>
                                            <option value="quarter">Trimestre Atual</option>
                                            <option value="year">Ano Atual</option>
                                            <option value="custom">Período Personalizado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Departamento</label>
                                        <select id="report-department" class="input">
                                            <option value="">Todos os departamentos</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="custom-period hidden" id="custom-period">
                                    <div class="grid cols-2">
                                        <div>
                                            <label>Data Inicial</label>
                                            <input type="date" id="report-start-date" class="input">
                                        </div>
                                        <div>
                                            <label>Data Final</label>
                                            <input type="date" id="report-end-date" class="input">
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label>Colaboradores</label>
                                    <select id="report-employees" class="input" multiple>
                                        <option value="">Todos os colaboradores</option>
                                    </select>
                                    <div class="note">Mantenha pressionado Ctrl para selecionar múltiplos colaboradores</div>
                                </div>

                                <div id="dynamic-filters">
                                    <!-- Filtros específicos por tipo de relatório -->
                                </div>
                            </div>

                            <!-- Passo 3: Formato e Entrega -->
                            <div class="step-content" id="step-3">
                                <h4>Configurações de saída:</h4>
                                <div class="grid cols-2">
                                    <div>
                                        <label>Formato *</label>
                                        <div class="radio-group">
                                            <label class="radio">
                                                <input type="radio" name="report-format" value="pdf" checked>
                                                <span>PDF</span>
                                            </label>
                                            <label class="radio">
                                                <input type="radio" name="report-format" value="excel">
                                                <span>Excel</span>
                                            </label>
                                            <label class="radio">
                                                <input type="radio" name="report-format" value="csv">
                                                <span>CSV</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label>Orientação (PDF)</label>
                                        <select id="report-orientation" class="input">
                                            <option value="portrait">Retrato</option>
                                            <option value="landscape">Paisagem</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label>Título do Relatório</label>
                                    <input type="text" id="report-title" class="input" 
                                           placeholder="Digite o título do relatório">
                                </div>

                                <div>
                                    <label>Observações</label>
                                    <textarea id="report-notes" class="input" rows="3" 
                                              placeholder="Observações ou instruções especiais..."></textarea>
                                </div>

                                <div class="checkbox">
                                    <label>
                                        <input type="checkbox" id="include-charts">
                                        <span>Incluir gráficos e visualizações</span>
                                    </label>
                                </div>

                                <div class="checkbox">
                                    <label>
                                        <input type="checkbox" id="email-report">
                                        <span>Enviar por e-mail após geração</span>
                                    </label>
                                </div>

                                <div class="email-options hidden" id="email-options">
                                    <label>E-mails para envio (separados por vírgula)</label>
                                    <input type="text" id="report-emails" class="input" 
                                           placeholder="email1@empresa.com, email2@empresa.com">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" onclick="reportsModule.hideReportBuilder()">Cancelar</button>
                        <button class="btn" id="btn-previous" onclick="reportsModule.previousStep()">← Anterior</button>
                        <button class="btn primary" id="btn-next" onclick="reportsModule.nextStep()">Próximo →</button>
                        <button class="btn success hidden" id="btn-generate" onclick="reportsModule.generateReport()">🚀 Gerar Relatório</button>
                    </div>
                </div>
            </div>

            <!-- Modal de Progresso -->
            <div id="report-progress-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📊 Gerando Relatório</h3>
                    </div>
                    <div class="modal-body">
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="report-progress-fill"></div>
                            </div>
                            <div class="progress-text" id="report-progress-text">Preparando dados...</div>
                        </div>
                        <div class="progress-details" id="report-progress-details">
                            <div>• Coletando dados dos colaboradores...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('main').innerHTML = content;
        this.loadReportTemplatesData();
        this.loadScheduledReportsData();
        this.loadReportsHistory();
        this.setupReportBuilder();
    }

    /**
     * Carrega os templates de relatório
     */
    async loadReportTemplates() {
        try {
            this.templates = [
                {
                    id: 1,
                    name: 'Relatório Mensal de Colaboradores',
                    description: 'Lista completa de funcionários com dados atualizados',
                    type: 'employees',
                    icon: '👥',
                    frequency: 'Mensal',
                    lastUsed: '2024-12-15'
                },
                {
                    id: 2,
                    name: 'Controle de Ponto Departamental',
                    description: 'Frequência por departamento com estatísticas',
                    type: 'attendance',
                    icon: '🕒',
                    frequency: 'Semanal',
                    lastUsed: '2024-12-12'
                },
                {
                    id: 3,
                    name: 'Análise Salarial',
                    description: 'Relatório de custos e distribuição salarial',
                    type: 'payroll',
                    icon: '💰',
                    frequency: 'Mensal',
                    lastUsed: '2024-12-10'
                }
            ];
        } catch (error) {
            console.error('Erro ao carregar templates:', error);
        }
    }

    /**
     * Carrega os relatórios agendados
     */
    async loadScheduledReports() {
        try {
            this.scheduledReports = [
                {
                    id: 1,
                    name: 'Relatório Semanal de Frequência',
                    type: 'attendance',
                    frequency: 'Semanal',
                    nextRun: '2024-12-23',
                    status: 'ativo',
                    recipients: ['rh@empresa.com']
                },
                {
                    id: 2,
                    name: 'Análise Mensal de Colaboradores',
                    type: 'employees',
                    frequency: 'Mensal',
                    nextRun: '2025-01-01',
                    status: 'ativo',
                    recipients: ['gerencia@empresa.com', 'rh@empresa.com']
                }
            ];
        } catch (error) {
            console.error('Erro ao carregar relatórios agendados:', error);
        }
    }

    /**
     * Carrega os templates na interface
     */
    loadReportTemplatesData() {
        const container = document.getElementById('report-templates');
        
        container.innerHTML = this.templates.map(template => `
            <div class="report-template-item">
                <div class="template-icon">${template.icon}</div>
                <div class="template-info">
                    <div class="template-name">${template.name}</div>
                    <div class="template-description">${template.description}</div>
                    <div class="template-meta">
                        <span class="badge sm">${template.frequency}</span>
                        <span class="note">Usado em ${Helper.formatDate(template.lastUsed)}</span>
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn sm primary" onclick="reportsModule.useTemplate(${template.id})">
                        🚀 Usar
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Carrega os relatórios agendados na interface
     */
    loadScheduledReportsData() {
        const container = document.getElementById('scheduled-reports');
        
        if (this.scheduledReports.length === 0) {
            container.innerHTML = `
                <div class="empty-state sm">
                    <div class="empty-icon">⏰</div>
                    <p>Nenhum relatório agendado</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.scheduledReports.map(report => `
            <div class="scheduled-report-item">
                <div class="report-info">
                    <div class="report-name">${report.name}</div>
                    <div class="report-schedule">${report.frequency} • Próxima execução: ${Helper.formatDate(report.nextRun)}</div>
                    <div class="report-recipients">
                        <span class="note">${report.recipients.length} destinatário(s)</span>
                    </div>
                </div>
                <div class="report-status">
                    <span class="badge ${report.status === 'ativo' ? 'success' : 'secondary'} sm">
                        ${report.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </span>
                </div>
                <div class="report-actions">
                    <button class="btn sm" onclick="reportsModule.editScheduled(${report.id})" title="Editar">✏️</button>
                    <button class="btn sm" onclick="reportsModule.runNow(${report.id})" title="Executar Agora">▶️</button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Carrega o histórico de relatórios
     */
    loadReportsHistory() {
        const tbody = document.getElementById('reports-history');
        
        // Dados simulados
        const history = [
            {
                id: 1,
                name: 'Relatório de Colaboradores - Dezembro 2024',
                type: 'colaboradores',
                generatedBy: 'Maria Santos',
                date: '2024-12-18',
                period: 'Dezembro 2024',
                format: 'PDF',
                status: 'concluido',
                size: '2.3 MB'
            },
            {
                id: 2,
                name: 'Frequência Semanal - Semana 50',
                type: 'frequencia',
                generatedBy: 'Sistema',
                date: '2024-12-16',
                period: '09/12 - 15/12',
                format: 'Excel',
                status: 'concluido',
                size: '856 KB'
            },
            {
                id: 3,
                name: 'Análise Salarial - Q4 2024',
                type: 'financeiro',
                generatedBy: 'Carlos Pereira',
                date: '2024-12-15',
                period: 'Q4 2024',
                format: 'PDF',
                status: 'processando',
                size: '-'
            }
        ];
        
        tbody.innerHTML = history.map(report => `
            <tr>
                <td>${report.name}</td>
                <td>
                    <span class="badge secondary sm">${report.type}</span>
                </td>
                <td>${report.generatedBy}</td>
                <td>${Helper.formatDate(report.date)}</td>
                <td>${report.period}</td>
                <td>${report.format}</td>
                <td>
                    <span class="badge ${this.getReportStatusClass(report.status)} sm">
                        ${this.getReportStatusLabel(report.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        ${report.status === 'concluido' ? `
                            <button class="btn sm" onclick="reportsModule.downloadReport(${report.id})" 
                                    title="Download">📥</button>
                            <button class="btn sm" onclick="reportsModule.shareReport(${report.id})" 
                                    title="Compartilhar">🔗</button>
                        ` : ''}
                        <button class="btn sm danger" onclick="reportsModule.deleteReport(${report.id})" 
                                title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Gera relatório rápido
     */
    async generateQuickReport(type) {
        const reportNames = {
            'employees': 'Relatório de Colaboradores',
            'attendance': 'Relatório de Frequência',
            'payroll': 'Folha de Pagamento',
            'departments': 'Relatório de Departamentos'
        };
        
        UI.showNotification(`Gerando ${reportNames[type]}...`, 'info');
        
        // Mostrar modal de progresso
        this.showProgressModal();
        
        // Simular geração
        const steps = [
            'Coletando dados...',
            'Processando informações...',
            'Gerando visualizações...',
            'Formatando relatório...',
            'Finalizando...'
        ];
        
        for (let i = 0; i < steps.length; i++) {
            const progress = Math.round(((i + 1) / steps.length) * 100);
            this.updateProgress(progress, steps[i]);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.hideProgressModal();
        UI.showNotification(`${reportNames[type]} gerado com sucesso!`, 'success');
        
        // Simular download
        setTimeout(() => {
            this.downloadReport(Date.now());
        }, 500);
    }

    /**
     * Mostra o construtor de relatórios
     */
    showReportBuilder() {
        document.getElementById('report-builder-modal').classList.remove('hidden');
        this.currentStep = 1;
        this.updateBuilderStep();
    }

    /**
     * Esconde o construtor de relatórios
     */
    hideReportBuilder() {
        document.getElementById('report-builder-modal').classList.add('hidden');
        document.getElementById('report-builder-form').reset();
        this.currentStep = 1;
    }

    /**
     * Configura o construtor de relatórios
     */
    setupReportBuilder() {
        // Configurar seleção de tipo de relatório
        document.querySelectorAll('.report-type-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.report-type-option').forEach(o => o.classList.remove('active'));
                option.classList.add('active');
                document.getElementById('selected-report-type').value = option.dataset.type;
            });
        });

        // Configurar período personalizado
        document.getElementById('report-period').addEventListener('change', (e) => {
            const customPeriod = document.getElementById('custom-period');
            if (e.target.value === 'custom') {
                customPeriod.classList.remove('hidden');
            } else {
                customPeriod.classList.add('hidden');
            }
        });

        // Configurar checkbox de e-mail
        document.getElementById('email-report').addEventListener('change', (e) => {
            const emailOptions = document.getElementById('email-options');
            if (e.target.checked) {
                emailOptions.classList.remove('hidden');
            } else {
                emailOptions.classList.add('hidden');
            }
        });

        this.currentStep = 1;
        this.updateBuilderStep();
    }

    /**
     * Próximo passo do construtor
     */
    nextStep() {
        if (this.validateCurrentStep()) {
            this.currentStep++;
            this.updateBuilderStep();
        }
    }

    /**
     * Passo anterior do construtor
     */
    previousStep() {
        this.currentStep--;
        this.updateBuilderStep();
    }

    /**
     * Atualiza o passo atual do construtor
     */
    updateBuilderStep() {
        // Atualizar indicadores de passo
        document.querySelectorAll('.step').forEach((step, index) => {
            if (index + 1 <= this.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Mostrar/ocultar conteúdo dos passos
        document.querySelectorAll('.step-content').forEach((content, index) => {
            if (index + 1 === this.currentStep) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });

        // Atualizar botões
        const btnPrevious = document.getElementById('btn-previous');
        const btnNext = document.getElementById('btn-next');
        const btnGenerate = document.getElementById('btn-generate');

        btnPrevious.classList.toggle('hidden', this.currentStep === 1);
        btnNext.classList.toggle('hidden', this.currentStep === 3);
        btnGenerate.classList.toggle('hidden', this.currentStep !== 3);
    }

    /**
     * Valida o passo atual
     */
    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                const selectedType = document.getElementById('selected-report-type').value;
                if (!selectedType) {
                    UI.showNotification('Selecione um tipo de relatório', 'warning');
                    return false;
                }
                break;
            case 2:
                const period = document.getElementById('report-period').value;
                if (!period) {
                    UI.showNotification('Selecione um período', 'warning');
                    return false;
                }
                if (period === 'custom') {
                    const startDate = document.getElementById('report-start-date').value;
                    const endDate = document.getElementById('report-end-date').value;
                    if (!startDate || !endDate) {
                        UI.showNotification('Informe as datas inicial e final', 'warning');
                        return false;
                    }
                }
                break;
            case 3:
                const format = document.querySelector('input[name="report-format"]:checked').value;
                if (!format) {
                    UI.showNotification('Selecione um formato', 'warning');
                    return false;
                }
                break;
        }
        return true;
    }

    /**
     * Gera o relatório personalizado
     */
    async generateReport() {
        if (!this.validateCurrentStep()) return;

        // Coletar dados do formulário
        const reportData = {
            type: document.getElementById('selected-report-type').value,
            period: document.getElementById('report-period').value,
            department: document.getElementById('report-department').value,
            employees: Array.from(document.getElementById('report-employees').selectedOptions).map(o => o.value),
            format: document.querySelector('input[name="report-format"]:checked').value,
            orientation: document.getElementById('report-orientation').value,
            title: document.getElementById('report-title').value,
            notes: document.getElementById('report-notes').value,
            includeCharts: document.getElementById('include-charts').checked,
            emailReport: document.getElementById('email-report').checked,
            emails: document.getElementById('report-emails').value
        };

        if (reportData.period === 'custom') {
            reportData.startDate = document.getElementById('report-start-date').value;
            reportData.endDate = document.getElementById('report-end-date').value;
        }

        console.log('Gerando relatório com dados:', reportData);

        this.hideReportBuilder();
        this.showProgressModal();

        // Simular geração
        const steps = [
            'Validando parâmetros...',
            'Coletando dados...',
            'Aplicando filtros...',
            'Processando informações...',
            'Gerando visualizações...',
            'Formatando relatório...',
            'Finalizando...'
        ];

        for (let i = 0; i < steps.length; i++) {
            const progress = Math.round(((i + 1) / steps.length) * 100);
            this.updateProgress(progress, steps[i]);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        this.hideProgressModal();

        if (reportData.emailReport && reportData.emails) {
            UI.showNotification('Relatório gerado e enviado por e-mail!', 'success');
        } else {
            UI.showNotification('Relatório gerado com sucesso!', 'success');
            // Simular download
            setTimeout(() => {
                this.downloadReport(Date.now());
            }, 500);
        }

        // Atualizar histórico
        this.loadReportsHistory();
    }

    /**
     * Mostra modal de progresso
     */
    showProgressModal() {
        document.getElementById('report-progress-modal').classList.remove('hidden');
    }

    /**
     * Esconde modal de progresso
     */
    hideProgressModal() {
        document.getElementById('report-progress-modal').classList.add('hidden');
    }

    /**
     * Atualiza o progresso
     */
    updateProgress(percentage, message) {
        const progressFill = document.getElementById('report-progress-fill');
        const progressText = document.getElementById('report-progress-text');
        
        progressFill.style.width = percentage + '%';
        progressText.textContent = message;
    }

    /**
     * Usa um template de relatório
     */
    useTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        // Pré-configurar o construtor com dados do template
        this.showReportBuilder();
        
        // Simular seleção do tipo
        const typeOption = document.querySelector(`[data-type="${template.type}"]`);
        if (typeOption) {
            typeOption.click();
        }

        UI.showNotification(`Template "${template.name}" carregado`, 'info');
    }

    /**
     * Edita um relatório agendado
     */
    editScheduled(reportId) {
        const report = this.scheduledReports.find(r => r.id === reportId);
        if (!report) return;

        // Implementar edição
        console.log('Editando relatório agendado:', report);
        UI.showNotification('Editor de agendamento em desenvolvimento', 'info');
    }

    /**
     * Executa um relatório agendado imediatamente
     */
    async runNow(reportId) {
        const report = this.scheduledReports.find(r => r.id === reportId);
        if (!report) return;

        UI.showNotification(`Executando "${report.name}"...`, 'info');
        
        // Simular execução
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        UI.showNotification(`"${report.name}" executado com sucesso!`, 'success');
    }

    /**
     * Filtra o histórico de relatórios
     */
    filterHistory() {
        const filterType = document.getElementById('filter-report-type').value;
        
        if (filterType) {
            UI.showNotification(`Filtrando por: ${filterType}`, 'info');
        } else {
            UI.showNotification('Mostrando todos os relatórios', 'info');
        }
        
        // Recarregar histórico com filtro
        this.loadReportsHistory();
    }

    /**
     * Faz download de um relatório
     */
    downloadReport(reportId) {
        // Simular download
        const fileName = `relatorio_${reportId}_${Date.now()}.pdf`;
        
        console.log('Download do relatório:', fileName);
        
        // Criar link temporário
        const link = document.createElement('a');
        link.href = '#'; // URL real do arquivo
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        UI.showNotification(`Download iniciado: ${fileName}`, 'success');
    }

    /**
     * Compartilha um relatório
     */
    shareReport(reportId) {
        // Gerar link de compartilhamento
        const shareLink = `${window.location.origin}/reports/share/${reportId}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareLink).then(() => {
                UI.showNotification('Link de compartilhamento copiado!', 'success');
            });
        } else {
            // Fallback
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
     * Exclui um relatório do histórico
     */
    async deleteReport(reportId) {
        if (!confirm('Tem certeza que deseja excluir este relatório?')) return;
        
        try {
            // await API.delete(`/reports/${reportId}`);
            
            this.loadReportsHistory();
            UI.showNotification('Relatório excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir relatório:', error);
            UI.showNotification('Erro ao excluir relatório', 'error');
        }
    }

    /**
     * Mostra o agendador de relatórios
     */
    showScheduler() {
        // Implementar modal de agendamento
        console.log('Abrindo agendador de relatórios...');
        UI.showNotification('Agendador de relatórios em desenvolvimento', 'info');
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Event listeners serão configurados quando o módulo for renderizado
    }

    /**
     * Retorna a classe CSS para o status do relatório
     */
    getReportStatusClass(status) {
        const classes = {
            'concluido': 'success',
            'processando': 'warning',
            'erro': 'danger',
            'agendado': 'info'
        };
        return classes[status] || 'secondary';
    }

    /**
     * Retorna o label para o status do relatório
     */
    getReportStatusLabel(status) {
        const labels = {
            'concluido': 'Concluído',
            'processando': 'Processando',
            'erro': 'Erro',
            'agendado': 'Agendado'
        };
        return labels[status] || status;
    }
}

// Instância global do módulo
window.reportsModule = new ReportsModule();
