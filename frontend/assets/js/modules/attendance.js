/**
 * MARH - Attendance Module
 * Gestão de controle de ponto e frequência dos colaboradores
 */

class AttendanceModule {
    constructor() {
        this.currentRecords = [];
        this.timeRecords = [];
        this.isInitialized = false;
    }

    /**
     * Inicializa o módulo de controle de ponto
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🕒 Inicializando módulo de Controle de Ponto...');
        
        await this.loadAttendanceRecords();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('✅ Módulo de Controle de Ponto inicializado');
    }

    /**
     * Renderiza a página de controle de ponto
     */
    render() {
        const content = `
            <div class="page-header">
                <div>
                    <h1>🕒 Controle de Ponto</h1>
                    <p class="subtitle">Gestão de frequência e horários dos colaboradores</p>
                </div>
                <div class="page-actions">
                    <button class="btn primary" onclick="attendanceModule.showClockInModal()">
                        ⏰ Registrar Ponto
                    </button>
                    <button class="btn" onclick="attendanceModule.exportReport()">
                        📊 Exportar Relatório
                    </button>
                </div>
            </div>

            <div class="grid cols-3 mb2">
                <div class="stat-card">
                    <div class="stat-value" id="present-today">-</div>
                    <div class="stat-label">Presentes Hoje</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="late-today">-</div>
                    <div class="stat-label">Atrasos Hoje</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="absent-today">-</div>
                    <div class="stat-label">Faltas Hoje</div>
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
                            <label>Departamento</label>
                            <select id="filter-department" class="input">
                                <option value="">Todos os departamentos</option>
                            </select>
                        </div>
                        <div>
                            <label>Data Inicial</label>
                            <input type="date" id="filter-start-date" class="input">
                        </div>
                        <div>
                            <label>Data Final</label>
                            <input type="date" id="filter-end-date" class="input">
                        </div>
                    </div>
                    <div class="mt1">
                        <button class="btn primary" onclick="attendanceModule.applyFilters()">
                            🔍 Filtrar
                        </button>
                        <button class="btn" onclick="attendanceModule.clearFilters()">
                            🗑️ Limpar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Registros de Ponto -->
            <div class="card">
                <div class="card-header">
                    <h3>Registros de Ponto</h3>
                </div>
                <div class="card-content">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Colaborador</th>
                                    <th>Departamento</th>
                                    <th>Data</th>
                                    <th>Entrada</th>
                                    <th>Saída Almoço</th>
                                    <th>Volta Almoço</th>
                                    <th>Saída</th>
                                    <th>Horas Trabalhadas</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="attendance-table">
                                <!-- Será preenchido dinamicamente -->
                            </tbody>
                        </table>
                    </div>
                    <div id="no-attendance" class="empty-state hidden">
                        <div class="empty-icon">🕒</div>
                        <h3>Nenhum registro encontrado</h3>
                        <p>Não há registros de ponto para os filtros selecionados</p>
                    </div>
                </div>
            </div>

            <!-- Modal de Registro de Ponto -->
            <div id="clock-modal" class="modal hidden">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>⏰ Registrar Ponto</h3>
                        <button class="btn-close" onclick="attendanceModule.hideClockInModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="clock-form">
                            <div class="mb1">
                                <label>Colaborador *</label>
                                <select id="clock-employee" class="input" required>
                                    <option value="">Selecionar colaborador</option>
                                </select>
                            </div>
                            <div class="grid cols-2">
                                <div>
                                    <label>Data *</label>
                                    <input type="date" id="clock-date" class="input" required>
                                </div>
                                <div>
                                    <label>Tipo de Registro *</label>
                                    <select id="clock-type" class="input" required>
                                        <option value="entrada">Entrada</option>
                                        <option value="saida-almoco">Saída Almoço</option>
                                        <option value="volta-almoco">Volta Almoço</option>
                                        <option value="saida">Saída</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mb1">
                                <label>Horário *</label>
                                <input type="time" id="clock-time" class="input" required>
                            </div>
                            <div class="mb1">
                                <label>Observações</label>
                                <textarea id="clock-notes" class="input" rows="3" placeholder="Observações sobre o registro..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn" onclick="attendanceModule.hideClockInModal()">Cancelar</button>
                        <button class="btn primary" onclick="attendanceModule.saveClockRecord()">Registrar</button>
                    </div>
                </div>
            </div>
        `;

        document.querySelector('main').innerHTML = content;
        this.setupFilterOptions();
        this.loadAttendanceData();
        this.updateStats();
    }

    /**
     * Carrega os registros de ponto
     */
    async loadAttendanceRecords() {
        try {
            // Simulação de dados - integrar com API real
            this.timeRecords = [
                {
                    id: 1,
                    employeeId: 1,
                    employeeName: 'João Silva',
                    department: 'TI',
                    date: '2024-12-18',
                    clockIn: '08:00',
                    lunchOut: '12:00',
                    lunchIn: '13:00',
                    clockOut: '17:00',
                    totalHours: '8:00',
                    status: 'completo',
                    notes: ''
                },
                {
                    id: 2,
                    employeeId: 2,
                    employeeName: 'Maria Santos',
                    department: 'RH',
                    date: '2024-12-18',
                    clockIn: '08:15',
                    lunchOut: '12:00',
                    lunchIn: '13:00',
                    clockOut: '17:00',
                    totalHours: '7:45',
                    status: 'atraso',
                    notes: 'Atraso justificado - trânsito'
                }
            ];
        } catch (error) {
            console.error('Erro ao carregar registros de ponto:', error);
            UI.showNotification('Erro ao carregar registros de ponto', 'error');
        }
    }

    /**
     * Configura opções dos filtros
     */
    async setupFilterOptions() {
        // Carregar colaboradores
        const employees = await API.get('/employees');
        const employeeSelect = document.getElementById('filter-employee');
        const clockEmployeeSelect = document.getElementById('clock-employee');
        
        employees.forEach(emp => {
            const option1 = new Option(emp.name, emp.id);
            const option2 = new Option(emp.name, emp.id);
            employeeSelect.add(option1);
            clockEmployeeSelect.add(option2);
        });

        // Carregar departamentos
        const departments = await API.get('/departments');
        const deptSelect = document.getElementById('filter-department');
        
        departments.forEach(dept => {
            const option = new Option(dept.name, dept.id);
            deptSelect.add(option);
        });

        // Configurar datas padrão (último mês)
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        
        document.getElementById('filter-start-date').value = lastMonth.toISOString().split('T')[0];
        document.getElementById('filter-end-date').value = today.toISOString().split('T')[0];
        document.getElementById('clock-date').value = today.toISOString().split('T')[0];
        document.getElementById('clock-time').value = new Date().toTimeString().slice(0, 5);
    }

    /**
     * Carrega e exibe os dados de ponto na tabela
     */
    loadAttendanceData() {
        const tbody = document.getElementById('attendance-table');
        const noData = document.getElementById('no-attendance');
        
        if (this.timeRecords.length === 0) {
            tbody.innerHTML = '';
            noData.classList.remove('hidden');
            return;
        }
        
        noData.classList.add('hidden');
        
        tbody.innerHTML = this.timeRecords.map(record => `
            <tr>
                <td>${record.employeeName}</td>
                <td>${record.department}</td>
                <td>${Helper.formatDate(record.date)}</td>
                <td>${record.clockIn || '-'}</td>
                <td>${record.lunchOut || '-'}</td>
                <td>${record.lunchIn || '-'}</td>
                <td>${record.clockOut || '-'}</td>
                <td>${record.totalHours}</td>
                <td>
                    <span class="badge ${this.getStatusClass(record.status)}">
                        ${this.getStatusLabel(record.status)}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn sm" onclick="attendanceModule.editRecord(${record.id})" 
                                title="Editar">✏️</button>
                        <button class="btn sm danger" onclick="attendanceModule.deleteRecord(${record.id})" 
                                title="Excluir">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Atualiza as estatísticas do dashboard
     */
    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.timeRecords.filter(r => r.date === today);
        
        const presentCount = todayRecords.length;
        const lateCount = todayRecords.filter(r => r.status === 'atraso').length;
        const absentCount = 0; // Calcular baseado nos colaboradores cadastrados vs presentes
        
        document.getElementById('present-today').textContent = presentCount;
        document.getElementById('late-today').textContent = lateCount;
        document.getElementById('absent-today').textContent = absentCount;
    }

    /**
     * Aplica os filtros selecionados
     */
    applyFilters() {
        const filters = {
            employee: document.getElementById('filter-employee').value,
            department: document.getElementById('filter-department').value,
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value
        };
        
        // Aplicar filtros aos dados
        let filtered = this.timeRecords;
        
        if (filters.employee) {
            filtered = filtered.filter(r => r.employeeId == filters.employee);
        }
        
        if (filters.department) {
            filtered = filtered.filter(r => r.department === filters.department);
        }
        
        if (filters.startDate) {
            filtered = filtered.filter(r => r.date >= filters.startDate);
        }
        
        if (filters.endDate) {
            filtered = filtered.filter(r => r.date <= filters.endDate);
        }
        
        // Temporariamente substituir dados para renderizar filtrados
        const originalRecords = this.timeRecords;
        this.timeRecords = filtered;
        this.loadAttendanceData();
        this.timeRecords = originalRecords;
        
        UI.showNotification(`${filtered.length} registros encontrados`, 'success');
    }

    /**
     * Limpa todos os filtros
     */
    clearFilters() {
        document.getElementById('filter-employee').value = '';
        document.getElementById('filter-department').value = '';
        document.getElementById('filter-start-date').value = '';
        document.getElementById('filter-end-date').value = '';
        
        this.loadAttendanceData();
        UI.showNotification('Filtros limpos', 'info');
    }

    /**
     * Mostra o modal de registro de ponto
     */
    showClockInModal() {
        document.getElementById('clock-modal').classList.remove('hidden');
    }

    /**
     * Esconde o modal de registro de ponto
     */
    hideClockInModal() {
        document.getElementById('clock-modal').classList.add('hidden');
        document.getElementById('clock-form').reset();
    }

    /**
     * Salva um novo registro de ponto
     */
    async saveClockRecord() {
        const form = document.getElementById('clock-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const formData = {
            employeeId: document.getElementById('clock-employee').value,
            date: document.getElementById('clock-date').value,
            type: document.getElementById('clock-type').value,
            time: document.getElementById('clock-time').value,
            notes: document.getElementById('clock-notes').value
        };
        
        try {
            // Simular salvamento
            console.log('Salvando registro de ponto:', formData);
            
            // Aqui integraria com a API
            // await API.post('/attendance/clock', formData);
            
            this.hideClockInModal();
            await this.loadAttendanceRecords();
            this.loadAttendanceData();
            this.updateStats();
            
            UI.showNotification('Registro de ponto salvo com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar registro:', error);
            UI.showNotification('Erro ao salvar registro de ponto', 'error');
        }
    }

    /**
     * Edita um registro de ponto
     */
    editRecord(id) {
        const record = this.timeRecords.find(r => r.id === id);
        if (!record) return;
        
        // Implementar edição
        console.log('Editando registro:', record);
        UI.showNotification('Função de edição em desenvolvimento', 'info');
    }

    /**
     * Exclui um registro de ponto
     */
    async deleteRecord(id) {
        if (!confirm('Tem certeza que deseja excluir este registro?')) return;
        
        try {
            // await API.delete(`/attendance/${id}`);
            
            this.timeRecords = this.timeRecords.filter(r => r.id !== id);
            this.loadAttendanceData();
            this.updateStats();
            
            UI.showNotification('Registro excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
            UI.showNotification('Erro ao excluir registro', 'error');
        }
    }

    /**
     * Exporta relatório de ponto
     */
    exportReport() {
        const filters = {
            startDate: document.getElementById('filter-start-date').value,
            endDate: document.getElementById('filter-end-date').value
        };
        
        // Implementar exportação
        console.log('Exportando relatório com filtros:', filters);
        UI.showNotification('Relatório exportado com sucesso!', 'success');
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
            'completo': 'success',
            'atraso': 'warning',
            'falta': 'danger',
            'incompleto': 'info'
        };
        return classes[status] || 'secondary';
    }

    /**
     * Retorna o label para o status
     */
    getStatusLabel(status) {
        const labels = {
            'completo': 'Completo',
            'atraso': 'Atraso',
            'falta': 'Falta',
            'incompleto': 'Incompleto'
        };
        return labels[status] || status;
    }
}

// Instância global do módulo
window.attendanceModule = new AttendanceModule();
